// HTTP helper: retries rate limits, server errors and Google "unusual traffic" pages with
// backoff, and moves to a new proxy session after each failure. Direct requests are the
// fastest; when Google Play starts limiting them, the client switches to a fallback proxy.

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

export function createHttpClient({ proxyConfiguration, fallbackProxy, onFallback, maxRetries = 5, timeoutMs = 30000 } = {}) {
  let proxy = proxyConfiguration;
  let session = null;
  let fallbackTried = false;

  async function dispatcherFor() {
    if (!proxy) return envAgent;
    if (!session) session = new ProxyAgent(await proxy.newUrl(`gp${Math.random().toString(36).slice(2, 12)}`));
    return session;
  }

  // The first time Google Play limits direct requests, every later request goes through the fallback proxy.
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

  return async function fetchText(url, { method = 'GET', body, headers = {} } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const dispatcher = await dispatcherFor();
      try {
        const res = await fetch(url, {
          method,
          body,
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'user-agent': USER_AGENT,
            'accept-language': 'en-US,en;q=0.9',
            ...(body ? { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' } : {}),
            ...headers,
          },
        });
        const text = await res.text();
        if (res.status === 404) throw new HttpError(`Not found (HTTP 404): ${url}`, { status: 404, retryable: false });
        if (res.status === 429 || res.url.includes('google.com/sorry')) {
          await switchToFallback();
          throw new HttpError(`Google Play limited the request (HTTP ${res.status}) for ${url}`, { status: res.status });
        }
        if (res.status >= 500) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        if (!res.ok) throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status, retryable: false });
        return text;
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
