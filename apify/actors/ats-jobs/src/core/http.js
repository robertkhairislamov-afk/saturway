// HTTP helper for the ATS JSON APIs: retries rate limits, server errors and timeouts with
// backoff and, when a proxy is used, moves to a new proxy session after a failure.

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
    if (!session) {
      const proxyUrl = await proxy.newUrl(`ats${Math.random().toString(36).slice(2, 12)}`);
      session = new ProxyAgent(proxyUrl);
    }
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

  async function request(url, { method = 'GET', body, headers = {}, json = true, retries = maxRetries } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
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
            accept: json ? 'application/json' : 'text/html,application/xhtml+xml,*/*',
            'accept-language': 'en-US,en;q=0.9',
            ...headers,
          },
        });
        const text = await res.text();
        if (res.status === 404 || res.status === 410) {
          throw new HttpError(`Not found (HTTP ${res.status}): ${url}`, { status: res.status, retryable: false });
        }
        const limited = res.status === 429 || res.status === 403;
        const switched = limited && (await switchToFallback());
        if (res.status === 429 || res.status >= 500 || (res.status === 403 && (Boolean(proxy) || switched))) {
          throw new HttpError(`HTTP ${res.status} for ${url}`, { status: res.status });
        }
        if (!res.ok) {
          throw new HttpError(`HTTP ${res.status} for ${url}: ${text.slice(0, 200)}`, { status: res.status, retryable: false });
        }
        if (!json) return text;
        try {
          return JSON.parse(text);
        } catch {
          throw new HttpError(`Expected JSON from ${url}, got: ${text.slice(0, 120)}`, { status: res.status });
        }
      } catch (error) {
        lastError = error;
        if (error.retryable === false) break;
        dropSession(dispatcher === envAgent ? undefined : dispatcher);
        if (attempt < retries) await sleep(Math.min(1000 * 2 ** (attempt - 1), 20000) + Math.random() * 500);
      }
    }
    throw lastError;
  }

  return {
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
