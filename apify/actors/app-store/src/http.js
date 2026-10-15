// HTTP helper: retries rate limits and server errors with backoff, and moves to a new proxy
// session after each failure. Direct requests are the fastest; when Apple starts limiting them
// (its search answers 403 or 429 after about 20 requests a minute from one address), the client
// switches to a fallback proxy, where every retry comes from a new address.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

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

export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, maxRetries = 6, timeoutMs = 30000, backoffMs = 1000 } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;

  async function dispatcherFor() {
    if (!proxy) return envAgent;
    if (!session) session = new ProxyAgent(await proxy.newUrl(`as${Math.random().toString(36).slice(2, 12)}`));
    return session;
  }

  // The first time Apple limits direct requests, every later request goes through the fallback proxy.
  async function switchToFallback() {
    if (proxy || fallbackTried || !fallbackProxy) return;
    fallbackTried = true;
    proxy = await fallbackProxy().catch(() => undefined);
    if (proxy) onFallback?.();
  }

  function dropSession(agent) {
    if (agent && agent !== envAgent && session === agent) {
      session = null;
      agent.close().catch(() => {});
    }
  }

  // Loads a URL and returns its JSON.
  return async function fetchJson(url) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const dispatcher = await dispatcherFor();
      try {
        const res = await fetch(url, {
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'user-agent': USER_AGENT, accept: 'application/json', 'accept-language': 'en-US,en;q=0.9' },
        });
        const text = await res.text();
        if (res.status === 404) throw new HttpError(`Not found (HTTP 404): ${url}`, { status: 404, retryable: false });
        if (res.status === 403 || res.status === 429) {
          await switchToFallback();
          throw new HttpError(`The App Store limited the request (HTTP ${res.status}) for ${url}`, { status: res.status });
        }
        if (res.status >= 500) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status, retryable: false });
        try {
          return JSON.parse(text);
        } catch {
          throw new HttpError(`Expected JSON from ${url}, got: ${text.slice(0, 120)}`, { status: res.status });
        }
      } catch (error) {
        if (error.message === 'fetch failed' && error.cause) error.message = `fetch failed (${error.cause.code ?? error.cause.message}) for ${url}`;
        lastError = error;
        if (error.retryable === false) break;
        dropSession(dispatcher);
        if (attempt < maxRetries) await sleep(Math.min(backoffMs * 2 ** (attempt - 1), 20 * backoffMs) + Math.random() * backoffMs / 2);
      }
    }
    throw lastError;
  };
}
