// HTTP helper: retries rate limits and server errors with backoff and returns the page with the
// address it ended on. Direct requests first; a fallback proxy only when one is configured.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT = 'Mozilla/5.0 (compatible; UAEPropertyDeals/0.1; +https://apify.com/robertosan16/uae-property-deals)';

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

export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, maxRetries = 5, timeoutMs = 30000, headers: baseHeaders = {} } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;

  async function dispatcherFor() {
    if (!proxy) return envAgent;
    if (!session) session = new ProxyAgent(await proxy.newUrl(`tg${Math.random().toString(36).slice(2, 12)}`));
    return session;
  }

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

  return async function fetchPage(url) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const dispatcher = await dispatcherFor();
      try {
        const res = await fetch(url, {
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9', ...baseHeaders },
        });
        const text = await res.text();
        if (res.status === 404) throw new HttpError(`Not found (HTTP 404): ${url}`, { status: 404, retryable: false });
        if (res.status === 429) {
          await switchToFallback();
          throw new HttpError(`Rate limited (HTTP 429) for ${url}`, { status: 429 });
        }
        if (res.status >= 500) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status, retryable: false });
        return { text, url: res.url || url, status: res.status };
      } catch (error) {
        lastError = error;
        if (error.retryable === false) break;
        dropSession(dispatcher);
        if (attempt < maxRetries) await sleep(Math.min(1000 * 2 ** (attempt - 1), 20000) + Math.random() * 500);
      }
    }
    throw lastError;
  };
}
