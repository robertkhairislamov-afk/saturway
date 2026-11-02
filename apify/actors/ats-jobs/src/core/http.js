// HTTP helper for the job site APIs: retries rate limits, server errors and timeouts with
// backoff and, when a proxy is used, moves to a new proxy session after a failure. Sites that
// limit each address (LinkedIn) use rotating sessions: each serves a few requests in a row and is
// replaced as soon as the site limits or blocks it. Sites that refuse the Apify platform's own
// addresses (Indeed) go through Apify Proxy there.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

// Requests one rotating session serves before a new address is taken.
const ROTATION_USES = 5;
// The cheaper rotating proxy is given up when half of the latest 40 requests, and at least 20, were limited.
const ESCALATION_WINDOW = 40;
const ESCALATION_MIN_LIMITED = 20;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sessionName = () => `ats${Math.random().toString(36).slice(2, 12)}`;

export class HttpError extends Error {
  constructor(message, { status, retryable = true, blocked = false, stopped = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryable = retryable;
    // The site answered, but with a block page or an empty page instead of the data.
    this.blocked = blocked;
    // The run stopped the client (it has all the jobs it may save); nothing went wrong.
    this.stopped = stopped;
  }
}

// `rotatingProxy` creates the proxy for rotating sessions when the input sets no proxy (Apify
// datacenter proxies for LinkedIn), and `rotatingEscalation` the proxy that replaces it for the
// rest of the run once the site limits most of its sessions (Apify residential proxies, about 25
// times dearer); `datacenterProxy` creates the proxy for requests marked `datacenter` (Apify
// Proxy for Indeed). All are created on first use.
export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, rotatingProxy, rotatingEscalation, onEscalate, escalationBudget, onBudgetSpent, datacenterProxy, maxRetries = 5, timeoutMs = 30000, backoffMs = 1000 } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;
  let rotating = null;
  let escalation = null;
  let escalated = false;
  // Set once the escalated proxy has used its budget: rotating requests go back to the cheaper one.
  let budgetSpent = false;
  const tier = () => (escalated && !budgetSpent ? 'dear' : 'cheap');
  // Outcomes of the latest rotating requests before the escalation: true for an answer, false for
  // a limit or a block page.
  const outcomes = [];
  let datacenter = null;
  let datacenterSession = null;
  // Rotating sessions that may serve another request.
  const idle = [];
  // What happened to the requests, for the run log.
  const stats = { requests: 0, retried: 0, limited: 0, blocked: 0, escalatedBytes: 0 };
  // `stop()` ends the requests in progress and refuses new ones, once the run is full.
  const stopper = new AbortController();
  const stoppedError = (url) => new HttpError(`Stopped before ${url}: the run has all the jobs it may save`, { retryable: false, stopped: true });

  async function dispatcherFor() {
    if (!proxy) return envAgent;
    if (!session) session = new ProxyAgent(await proxy.newUrl(sessionName()));
    return session;
  }

  // The first time a site limits direct requests, every later request goes through the fallback proxy.
  async function switchToFallback() {
    if (proxy || fallbackTried || !fallbackProxy) return false;
    fallbackTried = true;
    proxy = await fallbackProxy().catch(() => undefined);
    if (proxy) onFallback?.();
    return Boolean(proxy);
  }

  // Requests marked `datacenter` use the proxy of the input, or else the datacenter proxy. Without
  // either (as in local runs) they go out like any other request.
  async function datacenterDispatcher() {
    if (proxyConfiguration || !datacenterProxy) return dispatcherFor();
    datacenter ??= datacenterProxy().catch(() => null);
    const configuration = await datacenter;
    if (!configuration) return dispatcherFor();
    datacenterSession ??= new ProxyAgent(await configuration.newUrl(sessionName()));
    return datacenterSession;
  }

  function dropSession(agent) {
    if (!agent) return;
    if (session === agent) session = null;
    else if (datacenterSession === agent) datacenterSession = null;
    else return;
    agent.close().catch(() => {});
  }

  function escalate(reason) {
    if (escalated || !rotatingEscalation) return;
    escalated = true;
    for (const session of idle.splice(0)) session.agent.close().catch(() => {});
    onEscalate?.(reason);
  }

  // The site limits most rotating sessions: at least half of the latest 40 requests, and 20 of them.
  function record(ok) {
    if (escalated || !rotatingEscalation || proxyConfiguration) return;
    outcomes.push(ok);
    if (outcomes.length > ESCALATION_WINDOW) outcomes.shift();
    const limited = outcomes.filter((o) => !o).length;
    if (limited >= ESCALATION_MIN_LIMITED && limited / outcomes.length >= 0.5) escalate(`${limited} of the latest ${outcomes.length} requests limited`);
  }

  // The dearer proxy may use `escalationBudget()` bytes (it grows with the results the run earns);
  // after that the run goes on with the cheaper proxy only, slower but without losing money.
  function checkBudget() {
    if (!escalated || budgetSpent || !escalationBudget || stats.escalatedBytes < escalationBudget()) return;
    budgetSpent = true;
    for (const session of idle.splice(0)) session.agent.close().catch(() => {});
    onBudgetSpent?.(stats.escalatedBytes);
  }

  async function rotatingConfiguration() {
    checkBudget();
    if ((!escalated || budgetSpent) && rotatingProxy) {
      rotating ??= rotatingProxy().catch(() => null);
      const configuration = await rotating;
      if (configuration) return configuration;
      if (budgetSpent) return null;
      escalate('the datacenter proxy is not available');
    }
    if (escalated && !budgetSpent) {
      escalation ??= rotatingEscalation().catch(() => null);
      return escalation;
    }
    return null;
  }

  // A rotating session: an idle one, or a new one from the proxy of the input, the rotating proxy
  // (or its escalation) or the fallback proxy, in this order. Without any proxy the request goes
  // out directly.
  async function takeRotating() {
    checkBudget();
    const reused = idle.pop();
    if (reused) return reused;
    let configuration = proxyConfiguration ?? await rotatingConfiguration();
    configuration ??= proxy;
    return configuration ? { agent: new ProxyAgent(await configuration.newUrl(sessionName())), uses: 0, tier: tier() } : null;
  }

  // A session that got a normal answer may serve again, up to ROTATION_USES requests.
  function release(rotated, ok) {
    if (!rotated) return;
    rotated.uses++;
    // Sessions of the cheaper proxy are not used again after the escalation.
    if (ok && rotated.uses < ROTATION_USES && rotated.tier === tier()) idle.push(rotated);
    else rotated.agent.close().catch(() => {});
  }

  // `rotate` takes a rotating session for every attempt. `accept(text)` tells a real answer from a
  // block page that comes with status 200 (such as an empty page or a login wall); a block page
  // is retried like a rate limit.
  async function request(url, { method = 'GET', body, headers = {}, json = true, retries = maxRetries, rotate = false, datacenter: viaDatacenter = false, accept, redirect = 'follow' } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (stopper.signal.aborted) throw stoppedError(url);
      const rotated = rotate ? await takeRotating() : null;
      const dispatcher = rotated?.agent ?? (viaDatacenter ? await datacenterDispatcher() : await dispatcherFor());
      let ok = false;
      stats.requests++;
      try {
        const res = await fetch(url, {
          method,
          body,
          dispatcher,
          redirect,
          signal: AbortSignal.any([AbortSignal.timeout(timeoutMs), stopper.signal]),
          headers: {
            'user-agent': USER_AGENT,
            accept: json ? 'application/json' : 'text/html,application/xhtml+xml,*/*',
            'accept-language': 'en-US,en;q=0.9',
            ...headers,
          },
        });
        const text = await res.text();
        // With redirect "manual", a redirect is an answer of its own: the caller reads where it leads.
        if (redirect === 'manual' && res.status >= 300 && res.status < 400) {
          ok = true;
          throw Object.assign(new HttpError(`Redirected (HTTP ${res.status}) from ${url} to ${res.headers.get('location')}`, { status: res.status, retryable: false }), { location: res.headers.get('location') });
        }
        if (res.status === 404 || res.status === 410) {
          ok = true;
          throw new HttpError(`Not found (HTTP ${res.status}): ${url}`, { status: res.status, retryable: false });
        }
        // LinkedIn answers 999 when it limits an address; like server errors, it is retried. A limit
        // on a rotating session only needs the next session, not the fallback proxy.
        const limited = res.status === 429 || res.status === 403 || res.status === 999;
        if (limited) stats.limited++;
        if (rotated?.tier === 'dear') stats.escalatedBytes += Buffer.byteLength(text);
        if (rotated?.tier === 'cheap') record(!limited && !(res.ok && accept && !accept(text)));
        const switched = limited && !rotated && (await switchToFallback());
        if (res.status === 429 || res.status >= 500 || (res.status === 403 && (Boolean(proxy) || Boolean(rotated) || switched))) {
          throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        }
        if (!res.ok) {
          throw new HttpError(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`, { status: res.status, retryable: false });
        }
        if (accept && !accept(text)) {
          stats.blocked++;
          throw new HttpError(`Blocked or empty page from ${url}`, { status: res.status, blocked: true });
        }
        let data = text;
        if (json) {
          try {
            data = JSON.parse(text);
          } catch {
            throw new HttpError(`Expected JSON from ${url}, got: ${text.slice(0, 120)}`, { status: res.status });
          }
        }
        ok = true;
        return data;
      } catch (error) {
        if (stopper.signal.aborted) throw stoppedError(url);
        // "fetch failed" says nothing; its cause names the network error.
        if (error.message === 'fetch failed' && error.cause) error.message = `fetch failed (${error.cause.code ?? error.cause.message}) for ${url}`;
        lastError = error;
        if (error.retryable === false) break;
        if (!rotated) dropSession(dispatcher === envAgent ? undefined : dispatcher);
        if (attempt < retries) {
          stats.retried++;
          await sleep(Math.min(backoffMs * 2 ** (attempt - 1), 20 * backoffMs) + Math.random() * backoffMs / 2);
        }
      } finally {
        release(rotated, ok);
      }
    }
    throw lastError;
  }

  return {
    stats,
    stop: () => stopper.abort(),
    getJson: (url, options) => request(url, options),
    getText: (url, options) => request(url, { ...options, json: false }),
    postJson: (url, data, options = {}) => request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'content-type': 'application/json', ...options.headers },
    }),
  };
}
