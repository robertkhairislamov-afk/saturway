// Google Play pages and the batchexecute calls behind them: URL builders, request bodies and
// parsers for app pages, search results, top charts and developer catalogs.

import { readFileSync } from 'node:fs';

const BASE = 'https://play.google.com';

export const CHARTS = { topselling_free: 'Top free', topselling_paid: 'Top paid', topgrossing: 'Top grossing' };

export const CATEGORIES = [
  'APPLICATION', 'ANDROID_WEAR', 'ART_AND_DESIGN', 'AUTO_AND_VEHICLES', 'BEAUTY', 'BOOKS_AND_REFERENCE', 'BUSINESS',
  'COMICS', 'COMMUNICATION', 'DATING', 'EDUCATION', 'ENTERTAINMENT', 'EVENTS', 'FINANCE', 'FOOD_AND_DRINK',
  'HEALTH_AND_FITNESS', 'HOUSE_AND_HOME', 'LIBRARIES_AND_DEMO', 'LIFESTYLE', 'MAPS_AND_NAVIGATION', 'MEDICAL',
  'MUSIC_AND_AUDIO', 'NEWS_AND_MAGAZINES', 'PARENTING', 'PERSONALIZATION', 'PHOTOGRAPHY', 'PRODUCTIVITY', 'SHOPPING',
  'SOCIAL', 'SPORTS', 'TOOLS', 'TRAVEL_AND_LOCAL', 'VIDEO_PLAYERS', 'WATCH_FACE', 'WEATHER', 'FAMILY',
  'GAME', 'GAME_ACTION', 'GAME_ADVENTURE', 'GAME_ARCADE', 'GAME_BOARD', 'GAME_CARD', 'GAME_CASINO', 'GAME_CASUAL',
  'GAME_EDUCATIONAL', 'GAME_MUSIC', 'GAME_PUZZLE', 'GAME_RACING', 'GAME_ROLE_PLAYING', 'GAME_SIMULATION',
  'GAME_SPORTS', 'GAME_STRATEGY', 'GAME_TRIVIA', 'GAME_WORD',
];

// Top charts list at most 200 apps.
export const MAX_CHART_DEPTH = 200;

export class NotFoundError extends Error {}

// --- Page data ---------------------------------------------------------------------------

// Play pages embed their data as AF_initDataCallback({key: 'ds:5', ..., data: [...]}) calls.
export function extractDataBlocks(html) {
  const blocks = {};
  const pattern = /AF_initDataCallback\(\{key:\s*'(ds:\d+)',\s*hash:\s*'[^']*',\s*data:([\s\S]*?), sideChannel: \{\}\}\);<\/script>/g;
  for (const [, key, json] of html.matchAll(pattern)) {
    try {
      blocks[key] = JSON.parse(json);
    } catch {
      // A block that is not valid JSON is not one we read.
    }
  }
  return blocks;
}

// Reads a path in Google's array data. Fields with high numbers can sit in an object at the
// end of an array, keyed by field number (index + 1).
export function at(node, path) {
  let current = node;
  for (const key of path) {
    if (current == null || typeof current !== 'object') return undefined;
    if (Array.isArray(current) && current[key] === undefined) {
      const last = current[current.length - 1];
      current = last && typeof last === 'object' && !Array.isArray(last) ? last[String(key + 1)] : undefined;
    } else {
      current = current[key];
    }
  }
  return current ?? undefined;
}

const decodeEntities = (text) => String(text)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&nbsp;/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

export function htmlToText(html) {
  if (!html) return null;
  const text = decodeEntities(String(html).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+\n/g, '\n')
    .trim();
  return text || null;
}

const absoluteUrl = (path) => (path ? new URL(path, BASE).toString() : null);
const numberOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const textOrNull = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

function isoDate(text) {
  if (!text) return null;
  const date = new Date(`${text} UTC`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function priceOf(micros) {
  return typeof micros === 'number' ? micros / 1e6 : null;
}

// --- Inputs ------------------------------------------------------------------------------

const PACKAGE = /^[A-Za-z][\w]*(\.[\w]+)+$/;

// "com.spotify.music" or https://play.google.com/store/apps/details?id=com.spotify.music
export function parseAppId(value) {
  const raw = String(value ?? '').trim();
  if (PACKAGE.test(raw)) return raw;
  try {
    const id = new URL(raw).searchParams.get('id');
    if (id && PACKAGE.test(id)) return id;
  } catch {
    // Not a URL.
  }
  throw new Error(`"${raw}" is not a Google Play app ID or app link. Use a package name such as com.spotify.music.`);
}

// A developer name ("Spotify AB"), a numeric developer ID, or a developer page link.
export function parseDeveloper(value) {
  const raw = String(value ?? '').trim();
  if (!raw) throw new Error('Empty developer.');
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    const id = url.searchParams.get('id');
    if (!id) throw new Error(`"${raw}" is not a Google Play developer link.`);
    return url.pathname.endsWith('/dev') ? { id } : { name: id };
  }
  return /^\d{10,}$/.test(raw) ? { id: raw } : { name: raw };
}

// --- URLs ---------------------------------------------------------------------------------

const localeQuery = ({ language, country }) => `hl=${encodeURIComponent(language)}&gl=${encodeURIComponent(country)}`;

export const appPageUrl = (appId, locale) => `${BASE}/store/apps/details?id=${encodeURIComponent(appId)}&${localeQuery(locale)}`;
export const searchPageUrl = (term, locale) => `${BASE}/store/search?q=${encodeURIComponent(term)}&c=apps&${localeQuery(locale)}`;
export const developerPageUrl = ({ id, name }, locale) => (id
  ? `${BASE}/store/apps/dev?id=${encodeURIComponent(id)}&${localeQuery(locale)}`
  : `${BASE}/store/apps/developer?id=${encodeURIComponent(name)}&${localeQuery(locale)}`);
export const batchUrl = (rpcId, locale) => `${BASE}/_/PlayStoreUi/data/batchexecute?rpcids=${rpcId}&source-path=%2Fstore%2Fapps&${localeQuery(locale)}&soc-app=121&soc-platform=1&soc-device=1&rt=c`;

// --- App pages -----------------------------------------------------------------------------

function histogram(node) {
  if (!Array.isArray(node)) return null;
  const counts = {};
  for (let stars = 1; stars <= 5; stars++) counts[stars] = numberOrNull(at(node, [stars, 1])) ?? 0;
  return counts;
}

function categories(node, found = []) {
  if (!Array.isArray(node)) return found;
  if (node.length >= 3 && typeof node[0] === 'string' && typeof node[2] === 'string') {
    found.push({ id: node[2], name: node[0] });
  } else {
    for (const child of node) categories(child, found);
  }
  return found;
}

// Everything the app page shows, except reviews and the developer's postal address and phone.
export function parseAppPage(html) {
  const app = at(extractDataBlocks(html)['ds:5'], [1, 2]);
  if (!app || !at(app, [0, 0])) throw new NotFoundError('The page has no app data.');
  const descriptionHtml = at(app, [12, 0, 0, 1]) ?? at(app, [72, 0, 1]) ?? null;
  const priceMicros = at(app, [57, 0, 0, 0, 0, 1, 0, 0]);
  const originalMicros = at(app, [57, 0, 0, 0, 0, 1, 1, 0]);
  const developerPath = at(app, [68, 1, 4, 2]);
  const genreId = at(app, [79, 0, 0, 2]) ?? null;
  const iapRange = at(app, [19, 0]);
  const minAndroid = at(app, [140, 1, 1, 0, 0, 1]);
  const updated = at(app, [145, 0, 1, 0]);
  const released = at(app, [10, 0]);
  const found = categories(at(app, [118]));
  return {
    appId: at(app, [77, 0]) ?? null,
    title: textOrNull(at(app, [0, 0])),
    summary: textOrNull(at(app, [73, 0, 1])),
    developer: textOrNull(at(app, [68, 0])),
    developerId: developerPath ? new URL(developerPath, BASE).searchParams.get('id') : null,
    developerUrl: absoluteUrl(developerPath),
    developerEmail: textOrNull(at(app, [69, 1, 0])),
    developerWebsite: textOrNull(at(app, [69, 0, 5, 2])),
    privacyPolicyUrl: textOrNull(at(app, [99, 0, 5, 2])),
    genre: textOrNull(at(app, [79, 0, 0, 0])),
    genreId,
    categories: found.length > 0 ? found : genreId ? [{ id: genreId, name: at(app, [79, 0, 0, 0]) ?? null }] : [],
    score: numberOrNull(at(app, [51, 0, 1])),
    ratingsCount: numberOrNull(at(app, [51, 2, 1])),
    reviewsCount: numberOrNull(at(app, [51, 3, 1])),
    histogram: histogram(at(app, [51, 1])),
    installs: textOrNull(at(app, [13, 0])),
    minInstalls: numberOrNull(at(app, [13, 1])),
    maxInstalls: numberOrNull(at(app, [13, 2])),
    free: priceMicros === 0,
    price: priceOf(priceMicros),
    originalPrice: originalMicros ? priceOf(originalMicros) : null,
    currency: textOrNull(at(app, [57, 0, 0, 0, 0, 1, 0, 1])),
    priceText: textOrNull(at(app, [57, 0, 0, 0, 0, 1, 0, 2])) ?? (priceMicros === 0 ? 'Free' : null),
    offersInAppPurchases: Boolean(iapRange),
    inAppPurchaseRange: textOrNull(iapRange),
    containsAds: Boolean(at(app, [48])),
    contentRating: textOrNull(at(app, [9, 0])),
    contentRatingDescription: textOrNull(at(app, [9, 2, 1])),
    releasedText: textOrNull(released),
    releasedAt: isoDate(released),
    updatedAt: typeof updated === 'number' ? new Date(updated * 1000).toISOString() : null,
    version: textOrNull(at(app, [140, 0, 0, 0])) ?? 'Varies with device',
    minAndroidVersion: textOrNull(minAndroid) ?? 'Varies with device',
    recentChanges: htmlToText(at(app, [144, 1, 1])),
    description: htmlToText(descriptionHtml),
    descriptionHtml,
    icon: textOrNull(at(app, [95, 0, 3, 2])),
    headerImage: textOrNull(at(app, [96, 0, 3, 2])),
    screenshots: (at(app, [78, 0]) ?? []).map((shot) => at(shot, [3, 2])).filter(Boolean),
    videoUrl: textOrNull(at(app, [100, 0, 0, 3, 2])),
    playPass: Boolean(at(app, [62])),
    preregistration: at(app, [18, 0]) === 1,
  };
}

// --- App lists (search, charts, developer pages) --------------------------------------------

const isAppId = (value) => typeof value === 'string' && PACKAGE.test(value);

// Search results, charts and developer pages share one compact app shape, either as the item
// itself or wrapped in a one-element array.
export function parseListItem(item) {
  const app = isAppId(at(item, [0, 0])) ? item : at(item, [0]);
  const appId = at(app, [0, 0]);
  if (!isAppId(appId)) return null;
  const priceMicros = at(app, [8, 1, 0, 0]);
  return {
    appId,
    title: textOrNull(at(app, [3])),
    summary: null,
    description: htmlToText(at(app, [13, 1])),
    developer: textOrNull(at(app, [14])),
    genre: textOrNull(at(app, [5])),
    score: numberOrNull(at(app, [4, 1])),
    installs: textOrNull(at(app, [15])),
    free: priceMicros === 0,
    price: priceOf(priceMicros),
    currency: textOrNull(at(app, [8, 1, 0, 1])),
    priceText: textOrNull(at(app, [8, 1, 0, 2])) ?? (priceMicros === 0 ? 'Free' : null),
    contentRating: textOrNull(at(app, [24, 0])),
    icon: textOrNull(at(app, [1, 3, 2])),
  };
}

// Later pages of a developer catalog use a card shape.
export function parseCardItem(item) {
  const appId = at(item, [12, 0]);
  if (!isAppId(appId)) return null;
  return {
    appId,
    title: textOrNull(at(item, [2])),
    summary: textOrNull(at(item, [4, 1, 1, 1, 1])),
    description: null,
    developer: textOrNull(at(item, [4, 0, 0, 0])),
    genre: null,
    score: numberOrNull(at(item, [6, 0, 2, 1, 1])),
    installs: null,
    free: null,
    price: null,
    currency: null,
    priceText: null,
    contentRating: null,
    icon: textOrNull(at(item, [1, 1, 0, 3, 2])),
  };
}

// The first app list on a page: [0, 1, section, slot, 0] with a paging token in slot[1][3][1].
function firstAppList(block) {
  const sections = at(block, [0, 1]);
  if (!Array.isArray(sections)) return null;
  for (const section of sections) {
    if (!Array.isArray(section)) continue;
    for (const slot of section) {
      const list = at(slot, [0]);
      if (Array.isArray(list) && list.some((item) => parseListItem(item))) {
        return { items: list, token: at(slot, [1, 3, 1]) || null };
      }
    }
  }
  return null;
}

// The block that usually holds the list is checked first, then the others.
function findAppList(blocks, preferred) {
  const ordered = [blocks[preferred], ...Object.entries(blocks).filter(([key]) => key !== preferred).map(([, block]) => block)];
  for (const block of ordered) {
    const list = firstAppList(block);
    if (list) return list;
  }
  return null;
}

export function parseSearchPage(html) {
  const blocks = extractDataBlocks(html);
  const list = findAppList(blocks, 'ds:4');
  if (list) return list.items.map(parseListItem).filter(Boolean);
  if (Object.keys(blocks).length === 0) throw new Error('The response is not a Google Play search page.');
  return [];
}

export function parseDeveloperPage(html) {
  const list = findAppList(extractDataBlocks(html), 'ds:3');
  if (!list) throw new NotFoundError('The page lists no apps.');
  return { apps: list.items.map(parseListItem).filter(Boolean), token: list.token };
}

// --- batchexecute calls ---------------------------------------------------------------------

const CHART_TEMPLATE = JSON.parse(readFileSync(new URL('./chart-request.json', import.meta.url), 'utf8'));

export function chartRequestBody(chart, category, depth) {
  const payload = structuredClone(CHART_TEMPLATE);
  payload[0][1][0][1][1] = depth;
  payload[0][2] = [2, chart, category];
  return new URLSearchParams({ 'f.req': JSON.stringify([[['vyAe2', JSON.stringify(payload), null, 'generic']]]) }).toString();
}

const PAGE_FIELDS = [96, 27, 4, 8, 57, 30, 110, 79, 11, 16, 49, 1, 3, 9, 12, 104, 55, 56, 51, 10, 34, 77];

export function nextPageRequestBody(token, count = 100) {
  const payload = [[null, [[10, [10, count]], true, null, PAGE_FIELDS], null, token]];
  return new URLSearchParams({ 'f.req': JSON.stringify([[['qnKhOb', JSON.stringify(payload), null, 'generic']]]) }).toString();
}

// batchexecute answers with ")]}'" and JSON lines; the result is a JSON string in ["wrb.fr", rpcId, "..."].
export function parseBatchResponse(text, rpcId) {
  for (const line of String(text).split('\n')) {
    if (!line.includes('"wrb.fr"')) continue;
    let rows;
    try {
      rows = JSON.parse(line);
    } catch {
      continue;
    }
    for (const row of rows) {
      if (row?.[0] !== 'wrb.fr' || row[1] !== rpcId) continue;
      if (typeof row[2] !== 'string') throw new Error(`Google Play rejected the ${rpcId} request (error ${JSON.stringify(row[5] ?? null)}).`);
      return JSON.parse(row[2]);
    }
  }
  throw new Error(`The ${rpcId} response has no result.`);
}

export function parseChartResponse(text) {
  const data = parseBatchResponse(text, 'vyAe2');
  return (at(data, [0, 1, 0, 28, 0]) ?? []).map(parseListItem).filter(Boolean);
}

export function parseNextPageResponse(text) {
  const data = parseBatchResponse(text, 'qnKhOb');
  const items = at(data, [0, 0, 0]) ?? [];
  return {
    apps: items.map((item) => parseListItem(item) ?? parseCardItem(item)).filter(Boolean),
    token: at(data, [0, 0, 7, 1]) || null,
  };
}
