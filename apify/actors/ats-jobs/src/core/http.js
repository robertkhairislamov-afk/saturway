// HTTP helper for the job site APIs: retries rate limits, server errors and timeouts with
// backoff and, when a proxy is used, moves to a new proxy session after a failure. Sites that
// limit each address (LinkedIn) use rotating sessions: each serves a few requests in a row and is
// replaced as soon as the site limits or blocks it.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

// Requests one rotating session serves before a new address is taken.
const ROTATION_USES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const sessionName = () => `ats${Math.random().toString(36).slice(2, 12)}`;

export class HttpError extends Error {
  constructor(message, { status, retryable = true, blocked = false } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryable = retryable;
    // The site answered, but with a block page or an empty page instead of the data.
    this.blocked = blocked;
  }
}

// `rotatingProxy` creates the proxy for rotating sessions when the input sets no proxy (Apify
// residential proxies for LinkedIn); it is created on first use.
export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, rotatingProxy, maxRetries = 5, timeoutMs = 30000, backoffMs = 1000 } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;
  let rotating = null;
  // Rotating sessions that may serve another request.
  const idle = [];
  // What happened to the requests, for the run log.
  const stats = { requests: 0, retried: 0, limited: 0, blocked: 0 };

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

  function dropSession(agent) {
    if (agent && session === agent) {
      session = null;
      agent.close().catch(() => {});
    }
  }

  // A rotating session: an idle one, or a new one from the proxy of the input, the rotating proxy
  // or the fallback proxy, in this order. Without any proxy the request goes out directly.
  async function takeRotating() {
    const reused = idle.pop();
    if (reused) return reused;
    let configuration = proxyConfiguration;
    if (!configuration && rotatingProxy) {
      rotating ??= rotatingProxy().catch(() => null);
      configuration = await rotating;
    }
    configuration ??= proxy;
    return configuration ? { agent: new ProxyAgent(await configuration.newUrl(sessionName())), uses: 0 } : null;
  }

  // A session that got a normal answer may serve again, up to ROTATION_USES requests.
  function release(rotated, ok) {
    if (!rotated) return;
    rotated.uses++;
    if (ok && rotated.uses < ROTATION_USES) idle.push(rotated);
    else rotated.agent.close().catch(() => {});
  }

  // `rotate` takes a rotating session for every attempt. `accept(text)` tells a real answer from a
  // block page that comes with status 200 (such as an empty page or a login wall); a block page
  // is retried like a rate limit.
  async function request(url, { method = 'GET', body, headers = {}, json = true, retries = maxRetries, rotate = false, accept } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      const rotated = rotate ? await takeRotating() : null;
      const dispatcher = rotated?.agent ?? await dispatcherFor();
      let ok = false;
      stats.requests++;
      try {
        const res = await fetch(url, {
          method,
          body,
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'user-agent': USER_AGENT,
            accept: json ? 'application/json' : 'text/html,application/xhtml+xml,*/*',
            'accept-language': 'en-US,en;q=0.9',
            ...headers,
          },
        });
        const text = await res.text();
        if (res.status === 404 || res.status === 410) {
          ok = true;
          throw new HttpError(`Not found (HTTP ${res.status}): ${url}`, { status: res.status, retryable: false });
        }
        // LinkedIn answers 999 when it limits an address; like server errors, it is retried. A limit
        // on a rotating session only needs the next session, not the fallback proxy.
        const limited = res.status === 429 || res.status === 403 || res.status === 999;
        if (limited) stats.limited++;
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
