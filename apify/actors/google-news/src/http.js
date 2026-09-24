// HTTP helper: every attempt goes through a fresh proxy session, and rate limits or
// Google "unusual traffic" pages are retried with backoff.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const randomSession = () => `gn${Math.random().toString(36).slice(2, 12)}`;

export class BlockedError extends Error {}

export function createHttpClient({ proxyConfiguration, maxRetries = 5, timeoutMs = 30000 } = {}) {
  return async function fetchText(url, { method = 'GET', body, headers = {} } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const proxyUrl = proxyConfiguration ? await proxyConfiguration.newUrl(randomSession()) : undefined;
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : envAgent;
      try {
        const res = await fetch(url, {
          method,
          body,
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9', ...headers },
        });
        const text = await res.text();
        if (res.status === 429 || res.url.includes('google.com/sorry')) {
          throw new BlockedError(`Google rate limit (HTTP ${res.status}) for ${url}`);
        }
        if (res.status >= 500) throw new Error(`HTTP ${res.status} for ${url}`);
        if (!res.ok) {
          const error = new Error(`HTTP ${res.status} for ${url}`);
          error.retryable = false;
          throw error;
        }
        return text;
      } catch (error) {
        lastError = error;
        if (error.retryable === false) break;
        await sleep(Math.min(1000 * 2 ** (attempt - 1), 15000) + Math.random() * 500);
      } finally {
        if (proxyUrl) dispatcher.close().catch(() => {});
      }
    }
    throw lastError;
  };
}
