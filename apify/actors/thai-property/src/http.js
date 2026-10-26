// HTTP client for Dot Property: a calm pace (a pause before each request), retries with backoff on
// rate limits, server errors and timeouts, and a new proxy session after a failure. The site is
// read the way a visitor's browser reads it; protection pages are never solved, only retried.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
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

export function createHttpClient({ proxyConfiguration, delayMs = 1000, maxRetries = 4, timeoutMs = 60000 } = {}) {
  let session = null;
  const stats = { requests: 0, retried: 0, limited: 0, bytes: 0 };

  async function dispatcher() {
    if (!proxyConfiguration) return envAgent;
    if (!session) session = new ProxyAgent(await proxyConfiguration.newUrl(`tp${Math.random().toString(36).slice(2, 12)}`));
    return session;
  }
  function dropSession(agent) {
    if (agent && agent === session) {
      session = null;
      agent.close().catch(() => {});
    }
  }

  async function get(url, { binary = false } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      await sleep(delayMs * (0.6 + Math.random() * 0.8));
      const agent = await dispatcher();
      stats.requests++;
      try {
        const res = await fetch(url, {
          dispatcher: agent,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { 'user-agent': USER_AGENT, accept: binary ? 'image/*' : 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9' },
        });
        const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
        stats.bytes += body.length;
        if (res.status === 404 || res.status === 410) throw new HttpError(`Not found (HTTP ${res.status}): ${url}`, { status: res.status, retryable: false });
        if (res.status === 429 || res.status === 403 || res.status === 202 || res.status >= 500) {
          stats.limited += res.status === 429 || res.status === 403 || res.status === 202 ? 1 : 0;
          throw new HttpError(`HTTP ${res.status}: ${url}`, { status: res.status });
        }
        if (!res.ok) throw new HttpError(`HTTP ${res.status}: ${url}`, { status: res.status, retryable: false });
        return body;
      } catch (error) {
        lastError = error;
        if (error instanceof HttpError && !error.retryable) throw error;
        dropSession(agent);
        if (attempt < maxRetries) {
          stats.retried++;
          // A refusal (403, 429) means slow down: wait a minute or two, not seconds.
          const refused = error instanceof HttpError && [403, 429].includes(error.status);
          await sleep(refused ? 60000 * attempt : 2000 * 2 ** (attempt - 1));
        }
      }
    }
    throw lastError;
  }

  return { get, stats };
}

// Runs `worker` over `items` with at most `concurrency` at a time, in order of the items.
export async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}
