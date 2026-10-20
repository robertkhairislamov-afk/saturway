// HTTP client for Google Trends. Google answers API calls only inside a session: the client first
// opens the explore page (even when that page answers 429 it sets the NID cookie) and sends the
// cookie with every call. When Google limits a session (HTTP 429), the client starts a new one
// from a new proxy address with a new cookie and waits a little longer each time. If the first
// proxy keeps getting limited, it moves to the fallback proxy (residential addresses).

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

import { warmupUrl } from './trends.js';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const BASE_HEADERS = { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' };

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(message, { status, retryable = true } = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.retryable = retryable;
  }
}

// Cookies from a response, as "name=value" pairs keyed by name.
function cookiesOf(res) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return Object.fromEntries(list.map((c) => c.split(';')[0].trim()).filter((c) => c.includes('=')).map((c) => [c.slice(0, c.indexOf('=')), c]));
}

export function createTrendsClient({
  proxyConfiguration,
  fallbackProxy,
  onFallback,
  onLimited,
  maxRetries = 8,
  timeoutMs = 30000,
  backoffMs = 1500,
  fallbackAfter = 3,
} = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;
  let limitedInARow = 0;
  const stats = { requests: 0, limited: 0, sessions: 0 };

  async function openSession() {
    const agent = proxy ? new ProxyAgent(await proxy.newUrl(`gt${Math.random().toString(36).slice(2, 12)}`)) : envAgent;
    const res = await fetch(warmupUrl(), {
      dispatcher: agent,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { ...BASE_HEADERS, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    });
    await res.arrayBuffer().catch(() => {});
    const cookies = cookiesOf(res);
    stats.sessions++;
    if (!cookies.NID) {
      if (agent && agent !== envAgent) agent.close().catch(() => {});
      throw new HttpError(`Google Trends did not start a session (HTTP ${res.status}, no cookie).`, { status: res.status });
    }
    return { agent, cookie: Object.values(cookies).join('; ') };
  }

  function dropSession() {
    if (session?.agent && session.agent !== envAgent) session.agent.close().catch(() => {});
    session = null;
  }

  // After several limited sessions in a row, every later request goes through the fallback proxy.
  async function maybeFallBack() {
    if (fallbackTried || !fallbackProxy || limitedInARow < fallbackAfter) return;
    fallbackTried = true;
    const next = await fallbackProxy().catch(() => undefined);
    if (next) {
      proxy = next;
      dropSession();
      onFallback?.();
    }
  }

  // Loads a Google Trends URL inside a session and returns the response text.
  async function request(url, { method = 'GET', body, accept = 'application/json, text/plain, */*', contentType } = {}) {
    let lastError;
    let serverErrors = 0;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        session ??= await openSession();
        stats.requests++;
        const res = await fetch(url, {
          method,
          body,
          dispatcher: session.agent,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { ...BASE_HEADERS, accept, cookie: session.cookie, ...(contentType ? { 'content-type': contentType } : {}) },
        });
        const text = await res.text();
        if (res.status === 429) {
          stats.limited++;
          limitedInARow++;
          onLimited?.(limitedInARow);
          throw new HttpError('Google Trends limited the session (HTTP 429)', { status: 429 });
        }
        // A server error that repeats is Google refusing this request, not a passing fault.
        if (res.status >= 500) {
          serverErrors++;
          throw new HttpError(`Google Trends answered HTTP ${res.status}`, { status: res.status, retryable: serverErrors < 2 });
        }
        if (!res.ok) {
          throw new HttpError(`Google Trends rejected the request (HTTP ${res.status})`, { status: res.status, retryable: false });
        }
        limitedInARow = 0;
        return text;
      } catch (error) {
        if (error.message === 'fetch failed' && error.cause) error.message = `fetch failed (${error.cause.code ?? error.cause.message})`;
        lastError = error;
        if (error.retryable === false) break;
        dropSession();
        await maybeFallBack();
        if (attempt < maxRetries) await sleep(Math.min(backoffMs * 2 ** (attempt - 1), 30000) * (0.75 + Math.random() / 2));
      }
    }
    throw lastError;
  }

  return { request, stats };
}
