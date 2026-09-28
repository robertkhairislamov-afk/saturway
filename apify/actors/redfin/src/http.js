// HTTP helper for the Redfin APIs: retries rate limits, server errors and timeouts with backoff
// and, when a proxy is used, moves to a new proxy session after a failure. Direct requests are
// the fastest; when Redfin starts limiting them, the client switches to a fallback proxy.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

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

export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, maxRetries = 5, timeoutMs = 60000, backoffMs = 1000 } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;
  // What happened to the requests, for the run log.
  const stats = { requests: 0, retried: 0, limited: 0 };

  async function dispatcherFor() {
    if (!proxy) return envAgent;
    if (!session) session = new ProxyAgent(await proxy.newUrl(`rf${Math.random().toString(36).slice(2, 12)}`));
    return session;
  }

  // The first time Redfin limits direct requests, every later request goes through the fallback proxy.
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

  async function getText(url, { retries = maxRetries } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      const dispatcher = await dispatcherFor();
      stats.requests++;
      try {
        const res = await fetch(url, {
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'user-agent': USER_AGENT,
            accept: 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
          },
        });
        const text = await res.text();
        if (res.status === 404 || res.status === 410) {
          throw new HttpError(`Not found (HTTP ${res.status}): ${url}`, { status: res.status, retryable: false });
        }
        // Redfin answers 403 or 429 when it limits an address, and 202 with an empty page when it
        // wants a browser check. All of them are retried from another address.
        const limited = res.status === 429 || res.status === 403 || res.status === 202;
        if (limited) {
          stats.limited++;
          const switched = await switchToFallback();
          if (res.status === 403 && !proxy && !switched) {
            throw new HttpError(`Redfin refused the request (HTTP 403): ${url}`, { status: 403, retryable: false });
          }
          throw new HttpError(`Redfin limited the request (HTTP ${res.status}) for ${url}`, { status: res.status });
        }
        if (res.status >= 500) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`, { status: res.status, retryable: false });
        return text;
      } catch (error) {
        lastError = error;
        if (error.retryable === false) break;
        dropSession(dispatcher === envAgent ? undefined : dispatcher);
        if (attempt < retries) {
          stats.retried++;
          await sleep(Math.min(backoffMs * 2 ** (attempt - 1), 20 * backoffMs) + Math.random() * backoffMs / 2);
        }
      }
    }
    throw lastError;
  }

  return { stats, getText };
}
