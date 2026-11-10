// Keyword search results and suggestions of the two stores, as ranked app lists.
//
// Google Play: the web search page (up to 30 apps, in store order) and the search box suggestions.
// App Store: the apps.apple.com search page gives the first results in the order the App Store
// shows them (about 11); the public iTunes Search API gives up to 200 more, in an order close to
// it. Ranks from the page are marked "store", ranks after them "api".

import { LOOKUP_BATCH, appsOf, lookupUrl, parseAppId as parseAppleId, searchUrl as itunesSearchUrl } from './appstore.js';
import { at, batchUrl, parseAppId as parsePlayId, parseBatchResponse, parseSearchPage, searchPageUrl } from './play.js';

export const STORES = { googlePlay: 'Google Play', appStore: 'App Store' };
export const GOOGLE_PLAY_DEPTH = 30;
export const APP_STORE_DEPTH = 200;

// Apple storefront codes for the search suggestions, checked one by one with local-language
// keywords (country without a code: no App Store suggestions).
export const APPLE_STOREFRONTS = {
  US: 143441, GB: 143444, DE: 143443, FR: 143442, JP: 143462, BR: 143503, TH: 143475, RU: 143469, IN: 143467, ES: 143454,
  IT: 143450, NL: 143452, KR: 143466, CA: 143455, AU: 143460, MX: 143468, PL: 143478, TR: 143480, ID: 143476, VN: 143471,
  SE: 143456, CN: 143465, TW: 143470, HK: 143463, SG: 143464, PH: 143474, MY: 143473, AE: 143481, SA: 143479, IL: 143491,
  NZ: 143461, IE: 143449, CH: 143459, AT: 143445, BE: 143446, PT: 143453, NO: 143457, DK: 143458, FI: 143447, CZ: 143489,
  UA: 143492, ZA: 143472, AR: 143505, CL: 143483, CO: 143501, EG: 143516, KZ: 143517, HU: 143482, RO: 143487,
};

// "1,000,000+" as a number.
export const installsNumber = (text) => {
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

// A tracked app: App Store links and numeric ids are App Store apps, Google Play links and
// package names Google Play apps.
export function parseTrackedApp(value) {
  const text = String(value).trim();
  if (/apps\.apple\.com|itunes\.apple\.com/i.test(text) || /^(id)?\d{5,}$/i.test(text)) return { store: 'appStore', appId: parseAppleId(text) };
  return { store: 'googlePlay', appId: parsePlayId(text) };
}

// --- Google Play ----------------------------------------------------------------------------

export const playAppUrl = (appId) => `https://play.google.com/store/apps/details?id=${encodeURIComponent(appId)}`;

export function playResults(html) {
  return parseSearchPage(html).slice(0, GOOGLE_PLAY_DEPTH).map((app, i) => ({
    rank: i + 1,
    rankSource: 'store',
    appId: app.appId,
    title: app.title,
    developer: app.developer,
    score: app.score,
    ratingsCount: null,
    installs: app.installs,
    minInstalls: installsNumber(app.installs),
    free: app.free,
    price: app.price,
    currency: app.currency,
    genre: app.genre,
    url: playAppUrl(app.appId),
  }));
}

export const playSearchUrl = (term, locale) => searchPageUrl(term, locale);
export const playSuggestRequest = (term) => `f.req=${encodeURIComponent(JSON.stringify([[['IJ4APc', JSON.stringify([[null, [term], [10], [2], 4]]), null, 'generic']]]))}`;
export const playSuggestUrl = (locale) => batchUrl('IJ4APc', locale);

export function playSuggestions(text) {
  const rows = at(parseBatchResponse(text, 'IJ4APc'), [0, 0]) ?? [];
  return rows.map((row) => (typeof row?.[0] === 'string' ? row[0] : null)).filter(Boolean);
}

// --- App Store ------------------------------------------------------------------------------

export const appleSearchPageUrl = (term, country) => `https://apps.apple.com/${country.toLowerCase()}/iphone/search?term=${encodeURIComponent(term)}`;
export const appleApiSearchUrl = (term, country) => itunesSearchUrl(term, country, APP_STORE_DEPTH);

// App ids in the order the search page shows them.
export function appleWebOrder(html) {
  const m = /<script[^>]*id="serialized-server-data"[^>]*>([\s\S]*?)<\/script>/.exec(String(html));
  if (!m) throw new Error('The page is not an App Store search page.');
  const ids = [];
  for (const [, id] of m[1].matchAll(/"adamId":\s*"?(\d+)/g)) if (!ids.includes(id)) ids.push(id);
  return ids;
}

const appleRow = (app, rank, rankSource) => ({
  rank,
  rankSource,
  appId: app.appId,
  title: app.title,
  developer: app.developer,
  score: app.score,
  ratingsCount: app.ratingsCount,
  installs: null,
  minInstalls: null,
  free: app.free,
  price: app.price,
  currency: app.currency,
  genre: app.genre,
  url: app.url ?? `https://apps.apple.com/app/id${app.appId}`,
});

// The page's order first, then the API's order for the apps after them. Apps the page shows
// but the API did not return are taken from `extra` (a lookup), or kept with their id only.
export function appleResults(webIds, apiAnswer, extra = []) {
  const apps = new Map([...appsOf(apiAnswer), ...extra].map((app) => [app.appId, app]));
  const rows = [];
  const placed = new Set();
  for (const id of webIds) {
    if (placed.has(id)) continue;
    placed.add(id);
    rows.push(appleRow(apps.get(id) ?? { appId: id }, rows.length + 1, 'store'));
  }
  for (const app of appsOf(apiAnswer)) {
    if (placed.has(app.appId)) continue;
    placed.add(app.appId);
    rows.push(appleRow(app, rows.length + 1, 'api'));
  }
  return rows.slice(0, APP_STORE_DEPTH);
}

// Apps by numeric id or bundle id (Apple takes one kind per request), LOOKUP_BATCH at a time.
export async function lookupApple(fetchJson, ids, country) {
  const out = [];
  const numeric = ids.filter((id) => /^\d+$/.test(id));
  const bundles = ids.filter((id) => !/^\d+$/.test(id));
  for (const group of [numeric, bundles]) {
    for (let start = 0; start < group.length; start += LOOKUP_BATCH) {
      out.push(...appsOf(await fetchJson(lookupUrl(group.slice(start, start + LOOKUP_BATCH), country))));
    }
  }
  return out;
}

export const appleHintsUrl = (term) => `https://search.itunes.apple.com/WebObjects/MZSearchHints.woa/wa/hints?clientApplication=Software&term=${encodeURIComponent(term)}`;

// The suggestions of the App Store search box (a property list of terms).
export function appleSuggestions(xml) {
  const out = [];
  for (const [, term] of String(xml).matchAll(/<key>term<\/key>\s*<string>([^<]*)<\/string>/g)) {
    const text = term.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

// --- Competition --------------------------------------------------------------------------

const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// How established the top 10 apps are, from 0 to 100: on Google Play from their installs (1,000 →
// 37, 100,000 → 62, 10 million → 87), on the App Store from their number of ratings (100 → 40,
// 10,000 → 80). An estimate of how hard the keyword is, comparable within one store only.
export function competition(rows, store) {
  const top = rows.slice(0, 10);
  if (store === 'googlePlay') {
    const m = median(top.map((row) => row.minInstalls));
    return { competition: m ? Math.min(100, Math.round(12.5 * Math.log10(m))) : null, top10MedianInstalls: m, top10MedianRatings: null };
  }
  const m = median(top.map((row) => row.ratingsCount));
  return { competition: m != null ? Math.min(100, Math.round(20 * Math.log10(1 + m))) : null, top10MedianInstalls: null, top10MedianRatings: m };
}
