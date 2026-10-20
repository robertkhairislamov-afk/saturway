// HTTP client for AliExpress search pages. AliExpress answers a few pages per address and then
// shows a check page ("slide to verify") instead of results. The client does not solve it: it moves
// to a new proxy session (a new address) and loads the page again. It also moves to a new session
// every few pages, before the check page appears. Some answers replace the results with
// recommendations of other products; such a page is also loaded again, and the answer with the
// most search results is kept.

import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

import { isCheckPage, parseSearchPage, recommendedShare } from './aliexpress.js';

const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

// Without Apify Proxy, respect a proxy from the environment (for example in local runs).
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class PageError extends Error {
  constructor(message, { retryable = true } = {}) {
    super(message);
    this.name = 'PageError';
    this.retryable = retryable;
  }
}

// Why a loaded page has no results, or null when it has them.
export function problemOf({ status, finalUrl, html }) {
  if (status === 404) return { message: 'not found (HTTP 404)', retryable: false };
  if (status === 403 || status === 429) return { message: `AliExpress limited the request (HTTP ${status})`, retryable: true };
  if (status >= 500) return { message: `HTTP ${status}`, retryable: true };
  if (status >= 400) return { message: `HTTP ${status}`, retryable: false };
  // An address in the United States is sent to aliexpress.us, which needs a browser.
  if (finalUrl && /aliexpress\.us/i.test(new URL(finalUrl).hostname)) return { message: 'AliExpress redirected to aliexpress.us', retryable: true };
  if (isCheckPage(html)) return { message: 'AliExpress showed a check page', retryable: true };
  if (!parseSearchPage(html)) return { message: 'the page has no search results data', retryable: true };
  return null;
}

export function createPageClient({
  proxyConfiguration,
  cookie,
  pagesPerSession = 3,
  maxRetries = 8,
  maxReloads = 4,
  acceptedShare = 0.25,
  timeoutMs = 45000,
  backoffMs = 1000,
  fetchImpl = fetch,
} = {}) {
  let session = null;
  let used = 0;
  const stats = { requests: 0, checkPages: 0, redirects: 0, errors: 0, recommendationPages: 0 };

  async function dispatcherFor() {
    if (!proxyConfiguration) return envAgent;
    if (!session || used >= pagesPerSession) {
      dropSession();
      session = new ProxyAgent(await proxyConfiguration.newUrl(`ae${Math.random().toString(36).slice(2, 12)}`));
      used = 0;
    }
    used++;
    return session;
  }

  function dropSession() {
    if (session) session.close().catch(() => {});
    session = null;
  }

  // Loads one search page and returns its parsed data ({ page, pageSize, total, cards }).
  async function loadPage(url) {
    let lastError;
    let best = null;
    let failures = 0;
    let reloads = 0;
    while (failures < maxRetries) {
      const dispatcher = await dispatcherFor();
      try {
        stats.requests++;
        const res = await fetchImpl(url, {
          dispatcher,
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
          headers: { ...HEADERS, cookie },
        });
        const html = await res.text();
        const problem = problemOf({ status: res.status, finalUrl: res.url, html });
        if (problem) {
          if (/check page/.test(problem.message)) stats.checkPages++;
          if (/aliexpress\.us/.test(problem.message)) stats.redirects++;
          throw new PageError(`${problem.message} for ${url}`, { retryable: problem.retryable });
        }
        const page = parseSearchPage(html);
        const share = recommendedShare(page);
        if (!best || share < best.share) best = { page, share };
        if (share <= acceptedShare || reloads >= maxReloads) return best.page;
        // Recommendations instead of results: load the page again from a new address.
        stats.recommendationPages++;
        reloads++;
        dropSession();
      } catch (error) {
        if (error.message === 'fetch failed' && error.cause) error.message = `fetch failed (${error.cause.code ?? error.cause.message}) for ${url}`;
        if (error.name === 'TimeoutError') error.message = `timed out after ${timeoutMs / 1000} s for ${url}`;
        stats.errors++;
        failures++;
        lastError = error;
        if (error.retryable === false) break;
        // A new session is a new address; without a proxy, waiting is all that helps.
        dropSession();
        if (failures < maxRetries) await sleep(Math.min(backoffMs * 2 ** (failures - 1), 8 * backoffMs) * (proxyConfiguration ? 0.5 : 2) + Math.random() * backoffMs);
      }
    }
    if (best) return best.page;
    throw lastError;
  }

  return { loadPage, stats };
}
