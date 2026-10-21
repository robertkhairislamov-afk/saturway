// HTTP client for the Transparency Center. Google sometimes answers an address with its
// "unusual traffic" check page or HTTP 429 instead of data. The client does not solve the check:
// it moves to a new proxy session (a new address) and sends the request again. When Google keeps
// limiting the first proxy (busy datacenter addresses), the Transparency Center requests move to
// the fallback proxy (residential addresses) for the rest of the run; their answers are small.
// The ad previews, which are large, stay on the first proxy.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

import { RPC, SITE, formBody } from './transparency.js';

const BROWSER = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};
const RPC_HEADERS = {
  ...BROWSER,
  accept: '*/*',
  'content-type': 'application/x-www-form-urlencoded',
  origin: SITE,
  referer: `${SITE}/`,
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
};
const PREVIEW_HEADERS = { ...BROWSER, accept: '*/*', referer: `${SITE}/`, 'sec-fetch-dest': 'script', 'sec-fetch-mode': 'no-cors', 'sec-fetch-site': 'cross-site' };

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class RequestError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.name = 'RequestError';
    this.retryable = retryable;
  }
}

export const isCheckPage = (text) => /unusual traffic|captcha-form|\/sorry\/index/i.test(text.slice(0, 5000));

// Why an RPC answer is not data, or null when it is.
export function problemOf({ status, text }) {
  if (status === 429) return { message: 'Google limited the request (HTTP 429)', retryable: true };
  if (isCheckPage(text)) return { message: 'Google showed its unusual-traffic check page', retryable: true };
  if (status >= 500) return { message: `HTTP ${status}`, retryable: true };
  if (status === 400 || status === 404) return { message: `the Transparency Center rejected the request (HTTP ${status})`, retryable: false };
  if (status >= 400) return { message: `HTTP ${status}`, retryable: true };
  if (!/^\s*[{[]/.test(text)) return { message: 'the answer is not data', retryable: true };
  return null;
}

export function createClient({
  proxyConfiguration,
  fallbackProxyConfiguration,
  previewProxyConfiguration = proxyConfiguration,
  limitsBeforeFallback = 3,
  requestsPerSession = 20,
  maxRetries = 8,
  timeoutMs = 30000,
  backoffMs = 1000,
  fetchImpl = fetch,
} = {}) {
  const stats = { requests: 0, checkPages: 0, limited: 0, errors: 0, previews: 0, previewErrors: 0, fallback: false };

  // One rotating session per proxy configuration: a new address every few requests and after a failure.
  // `configOf` is called for every request, so a session can move to another proxy.
  function rotator(configOf, prefix) {
    let agent = null;
    let agentConfig = null;
    let used = 0;
    return {
      async get() {
        const config = configOf();
        if (!config) return envAgent;
        if (!agent || used >= requestsPerSession || agentConfig !== config) {
          this.drop();
          agent = new ProxyAgent(await config.newUrl(`${prefix}${Math.random().toString(36).slice(2, 12)}`));
          agentConfig = config;
          used = 0;
        }
        used++;
        return agent;
      },
      drop() {
        if (agent) agent.close().catch(() => {});
        agent = null;
      },
    };
  }
  const rpcSession = rotator(() => (stats.fallback ? fallbackProxyConfiguration : proxyConfiguration), 'atc');
  const previewSession = rotator(() => previewProxyConfiguration, 'atp');

  async function withRetries(label, session, once) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await once(await session.get());
      } catch (error) {
        if (error.message === 'fetch failed' && error.cause) error.message = `fetch failed (${error.cause.code ?? error.cause.message})`;
        if (error.name === 'TimeoutError') error.message = `timed out after ${timeoutMs / 1000} s`;
        error.message = `${label}: ${error.message}`;
        lastError = error;
        if (error.retryable === false) break;
        session.drop();
        if (attempt < maxRetries) await sleep(Math.min(backoffMs * 2 ** (attempt - 1), 8 * backoffMs) * (proxyConfiguration ? 0.5 : 2) + Math.random() * backoffMs);
      }
    }
    throw lastError;
  }

  // Calls one RPC method ("SearchService/SearchCreatives") and returns its JSON answer.
  async function rpc(method, request) {
    return withRetries(method, rpcSession, async (dispatcher) => {
      stats.requests++;
      try {
        const res = await fetchImpl(`${RPC}/${method}?authuser=`, {
          method: 'POST',
          dispatcher,
          body: formBody(request),
          headers: RPC_HEADERS,
          signal: AbortSignal.timeout(timeoutMs),
        });
        const text = await res.text();
        const problem = problemOf({ status: res.status, text });
        if (problem) {
          if (/check page/.test(problem.message)) stats.checkPages++;
          if (/check page|HTTP 429/.test(problem.message)) {
            stats.limited++;
            if (fallbackProxyConfiguration && !stats.fallback && stats.limited >= limitsBeforeFallback) stats.fallback = true;
          }
          throw new RequestError(problem.message, { retryable: problem.retryable });
        }
        return JSON.parse(text);
      } catch (error) {
        stats.errors++;
        throw error;
      }
    });
  }

  // Loads a preview script; returns its text, or null when it cannot be loaded.
  async function preview(url) {
    try {
      return await withRetries('preview', previewSession, async (dispatcher) => {
        stats.previews++;
        const res = await fetchImpl(url, { dispatcher, headers: PREVIEW_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
        const text = await res.text();
        if (res.status === 404 || res.status === 400) throw new RequestError(`HTTP ${res.status}`, { retryable: false });
        if (res.status >= 400 || isCheckPage(text)) throw new RequestError(`HTTP ${res.status}`);
        return text;
      });
    } catch {
      stats.previewErrors++;
      return null;
    }
  }

  return { rpc, preview, stats };
}

// Runs fn over items with at most `limit` running at once; results keep the order of items.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
