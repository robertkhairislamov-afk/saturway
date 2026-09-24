// Builds Google News RSS feed URLs and parses feed XML into plain article objects.

import { XMLParser } from 'fast-xml-parser';

const RSS_BASE = 'https://news.google.com/rss';

export const TOPICS = ['WORLD', 'NATION', 'BUSINESS', 'TECHNOLOGY', 'ENTERTAINMENT', 'SPORTS', 'SCIENCE', 'HEALTH'];
export const TIME_RANGES = ['any', '1h', '1d', '7d', '30d', '1y'];

// Google News editions ("COUNTRY:language" ceid) with the UI language Google pairs with them.
const EDITION_UI_LANGUAGE = {
  'US:en': 'en-US', 'GB:en': 'en-GB', 'CA:en': 'en-CA', 'AU:en': 'en-AU', 'IN:en': 'en-IN',
  'IE:en': 'en-IE', 'NZ:en': 'en-NZ', 'SG:en': 'en-SG', 'ZA:en': 'en-ZA', 'PH:en': 'en-PH',
  'DE:de': 'de', 'AT:de': 'de-AT', 'CH:de': 'de-CH', 'FR:fr': 'fr', 'CA:fr': 'fr-CA',
  'ES:es': 'es', 'MX:es-419': 'es-419', 'AR:es-419': 'es-419', 'CO:es-419': 'es-419',
  'BR:pt-419': 'pt-BR', 'PT:pt-150': 'pt-PT', 'IT:it': 'it', 'NL:nl': 'nl', 'PL:pl': 'pl',
  'TR:tr': 'tr', 'UA:uk': 'uk', 'JP:ja': 'ja', 'KR:ko': 'ko', 'TW:zh-Hant': 'zh-TW',
  'HK:zh-Hant': 'zh-HK', 'CN:zh-Hans': 'zh-CN', 'ID:id': 'id', 'TH:th': 'th', 'VN:vi': 'vi',
  'IL:he': 'he', 'AE:ar': 'ar', 'SA:ar': 'ar', 'EG:ar': 'ar',
};

export const EDITIONS = Object.keys(EDITION_UI_LANGUAGE);

// "US:en" → { gl: 'US', hl: 'en-US', ceid: 'US:en' }. Unknown editions get a best guess.
export function parseEdition(edition = 'US:en') {
  const match = /^([A-Z]{2}):([A-Za-z]{2,3}(?:-[A-Za-z0-9]+)?)$/.exec(String(edition).trim());
  if (!match) throw new Error(`Invalid edition "${edition}". Use COUNTRY:language, for example US:en or DE:de.`);
  const [, gl, language] = match;
  const ceid = `${gl}:${language}`;
  const hl = EDITION_UI_LANGUAGE[ceid] ?? (language === 'en' ? `en-${gl}` : language);
  return { gl, hl, ceid };
}

const localeParams = ({ hl, gl, ceid }) => `hl=${encodeURIComponent(hl)}&gl=${gl}&ceid=${encodeURIComponent(ceid)}`;

const isoDay = (date) => date.toISOString().slice(0, 10);

function addDays(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDay(date);
}

// Accepts "2026-09-01" or a relative date such as "3 days" (three days before `now`).
export function toIsoDay(value, now = new Date()) {
  const relative = /^(\d+)\s*(day|week|month|year)s?$/i.exec(String(value).trim());
  if (relative) {
    const amount = Number(relative[1]);
    const date = new Date(now);
    const unit = relative[2].toLowerCase();
    if (unit === 'day') date.setUTCDate(date.getUTCDate() - amount);
    if (unit === 'week') date.setUTCDate(date.getUTCDate() - 7 * amount);
    if (unit === 'month') date.setUTCMonth(date.getUTCMonth() - amount);
    if (unit === 'year') date.setUTCFullYear(date.getUTCFullYear() - amount);
    return isoDay(date);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date "${value}". Use YYYY-MM-DD or a relative date like "3 days".`);
  return isoDay(date);
}

// Date windows for a search. Google News returns at most ~100 articles per feed, so
// splitting a long period into single days collects many more articles.
export function dateWindows({ dateFrom, dateTo, splitByDay = true }, now = new Date()) {
  if (!dateFrom && !dateTo) return [null];
  const from = dateFrom ? toIsoDay(dateFrom, now) : null;
  const to = dateTo ? toIsoDay(dateTo, now) : isoDay(now);
  if (!from || !splitByDay) return [{ after: from, before: addDays(to, 1) }];
  if (from > to) throw new Error(`dateFrom (${from}) is after dateTo (${to}).`);
  const windows = [];
  for (let day = from; day <= to; day = addDays(day, 1)) windows.push({ after: day, before: addDays(day, 1) });
  return windows;
}

export function searchFeedUrl(query, locale, { timeRange = 'any', window = null } = {}) {
  let q = query.trim();
  if (window) {
    if (window.after) q += ` after:${window.after}`;
    if (window.before) q += ` before:${window.before}`;
  } else if (timeRange && timeRange !== 'any') {
    q += ` when:${timeRange}`;
  }
  return `${RSS_BASE}/search?q=${encodeURIComponent(q)}&${localeParams(locale)}`;
}

export function topicFeedUrl(topic, locale) {
  return `${RSS_BASE}/headlines/section/topic/${topic}?${localeParams(locale)}`;
}

export function topStoriesFeedUrl(locale) {
  return `${RSS_BASE}?${localeParams(locale)}`;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  htmlEntities: true,
});

function decodeEntities(text) {
  return String(text)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

const textOf = (node) => (node == null ? '' : typeof node === 'object' ? String(node['#text'] ?? '') : String(node));

// Clustered stories carry related coverage as an HTML list in the description.
function relatedArticles(descriptionHtml) {
  const related = [];
  const pattern = /<li>\s*<a href="([^"]+)"[^>]*>(.*?)<\/a>(?:\s|&nbsp;| )*<font[^>]*>(.*?)<\/font>/g;
  for (const [, url, title, source] of descriptionHtml.matchAll(pattern)) {
    related.push({ title: decodeEntities(title).trim(), source: decodeEntities(source).trim(), googleNewsUrl: url });
  }
  return related;
}

export function parseFeed(xml) {
  const doc = parser.parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel) throw new Error('Response is not a Google News RSS feed.');
  const items = [].concat(channel.item ?? []);
  return items.map((item) => {
    const source = textOf(item.source).trim();
    const rawTitle = decodeEntities(textOf(item.title)).trim();
    const suffix = ` - ${source}`;
    const title = source && rawTitle.endsWith(suffix) ? rawTitle.slice(0, -suffix.length) : rawTitle;
    const published = new Date(textOf(item.pubDate));
    const articleId = textOf(item.guid).trim();
    // The coverage list repeats the story itself; keep only the other articles.
    const related = relatedArticles(textOf(item.description))
      .filter((r) => !articleId || !r.googleNewsUrl.includes(`/articles/${articleId}`));
    return {
      articleId,
      title,
      source: source || null,
      sourceUrl: item.source?.['@_url'] ?? null,
      publishedAt: Number.isNaN(published.getTime()) ? null : published.toISOString(),
      googleNewsUrl: textOf(item.link).trim(),
      ...(related.length > 0 ? { relatedArticles: related } : {}),
    };
  });
}
