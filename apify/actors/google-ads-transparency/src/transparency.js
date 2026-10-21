// Google Ads Transparency Center: the requests its web app sends and the records in its answers.
// The app talks to adstransparency.google.com/anji/_/rpc/<Service>/<Method> with a form field
// f.req holding a JSON object whose keys are protobuf field numbers.

import { REGIONS } from './regions.js';

export const SITE = 'https://adstransparency.google.com';
export const RPC = `${SITE}/anji/_/rpc`;
export const PAGE_SIZE = 100;

// Platforms ("surfaces") and ad formats as the Transparency Center numbers them.
export const PLATFORMS = { PLAY: 1, MAPS: 2, SEARCH: 3, SHOPPING: 4, YOUTUBE: 5 };
export const PLATFORM_NAMES = Object.fromEntries(Object.entries(PLATFORMS).map(([name, id]) => [id, name]));
export const FORMATS = { TEXT: 1, IMAGE: 2, VIDEO: 3 };
export const FORMAT_NAMES = Object.fromEntries(Object.entries(FORMATS).map(([name, id]) => [id, name]));

const REGION_BY_ID = Object.fromEntries(Object.entries(REGIONS).map(([code, [id]]) => [id, code]));

export const regionCode = (id) => REGION_BY_ID[id] ?? null;

// A two-letter code or an English country name to its region ID; "ANYWHERE" (or empty) to null.
export function regionId(value) {
  const text = String(value ?? '').trim();
  if (!text || /^(anywhere|all|any|worldwide|global)$/i.test(text)) return null;
  const upper = text.toUpperCase();
  if (REGIONS[upper]) return REGIONS[upper][0];
  const byName = Object.values(REGIONS).find(([, name]) => name.toLowerCase() === text.toLowerCase());
  if (byName) return byName[0];
  throw new Error(`Unknown region "${text}". Use a two-letter country code such as US, GB or DE, a country name, or ANYWHERE.`);
}

// The context every request carries: {"1":1,"2":30} plus the region when there is one.
const contextOf = (region) => (region ? { 1: 1, 2: 30, 3: region } : { 1: 1, 2: 30 });

export const formBody = (request) => `f.req=${encodeURIComponent(JSON.stringify(request))}`;

export const suggestionsRequest = (query) => ({ 1: query, 2: 10, 3: 10 });

// One page of ads of a domain or of advertiser IDs, with the filters of the input.
export function creativesRequest({ domain, advertiserIds, region, platforms = [], format, startDate, endDate, pageSize = PAGE_SIZE, pageToken }) {
  const filter = {};
  if (format) filter[4] = FORMATS[format];
  if (startDate) filter[6] = dateNumber(startDate);
  if (endDate) filter[7] = dateNumber(endDate);
  if (region) filter[8] = [region];
  if (domain) filter[12] = { 1: domain, 2: true };
  if (advertiserIds?.length) filter[13] = { 1: advertiserIds };
  if (platforms.length) filter[14] = platforms.map((name) => PLATFORMS[name]);
  const request = { 2: pageSize, 3: filter };
  if (pageToken) request[4] = pageToken;
  request[7] = contextOf(region);
  return request;
}

export const creativeRequest = ({ advertiserId, creativeId, region }) => ({ 1: advertiserId, 2: creativeId, 5: contextOf(region) });
export const advertiserRequest = ({ advertiserId, region }) => ({ 1: advertiserId, 3: contextOf(region) });

// 2026-09-01 → 20260901, and back.
export const dateNumber = (date) => Number(String(date).replace(/-/g, ''));
const fromDateNumber = (n) => {
  const s = String(n ?? '');
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null;
};
const fromTimestamp = (t) => (t?.[1] ? new Date(Number(t[1]) * 1000).toISOString() : null);
const int = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

export const normalizeDomain = (value) => String(value).trim().toLowerCase()
  .replace(/^[a-z]+:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, '');

export const isDomain = (value) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(normalizeDomain(value)) && !/\s/.test(String(value).trim());
export const isAdvertiserId = (value) => /^AR\d{10,}$/.test(String(value).trim());

export const adUrl = (advertiserId, creativeId, region) => `${SITE}/advertiser/${advertiserId}/creative/${creativeId}${region ? `?region=${regionCode(region)}` : '?region=anywhere'}`;
export const advertiserUrl = (advertiserId, region) => `${SITE}/advertiser/${advertiserId}${region ? `?region=${regionCode(region)}` : '?region=anywhere'}`;

// A Transparency Center link: an advertiser page, an ad page or a search by website.
export function parseStartUrl(link) {
  let url;
  try {
    url = new URL(String(link).trim());
  } catch {
    throw new Error('not a link');
  }
  if (!/(^|\.)adstransparency\.google\.com$/i.test(url.hostname)) throw new Error('not an Ads Transparency Center link');
  const region = url.searchParams.get('region');
  const ad = /\/advertiser\/(AR\d+)\/creative\/(CR\d+)/.exec(url.pathname);
  if (ad) return { kind: 'creative', advertiserId: ad[1], creativeId: ad[2], region };
  const advertiser = /\/advertiser\/(AR\d+)/.exec(url.pathname);
  if (advertiser) return { kind: 'advertiser', advertiserId: advertiser[1], region };
  const domain = url.searchParams.get('domain');
  if (domain) return { kind: 'domain', domain: normalizeDomain(domain), region };
  throw new Error('the link names no advertiser, ad or website');
}

// SearchSuggestions → advertisers ({ advertiserId, name, country, adCountLow, adCountHigh, verified }) and websites.
export function parseSuggestions(json) {
  const advertisers = [];
  const domains = [];
  for (const entry of json?.[1] ?? []) {
    if (entry[1]) {
      const a = entry[1];
      advertisers.push({
        advertiserId: a[2],
        name: a[1] ?? null,
        country: a[3] ?? null,
        adCountLow: int(a[4]?.[2]?.[1]),
        adCountHigh: int(a[4]?.[2]?.[2]),
        verified: Boolean(a[5]),
      });
    } else if (entry[2]?.[1]) {
      domains.push(entry[2][1]);
    }
  }
  return { advertisers, domains };
}

const words = (text) => String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Whether an advertiser name matches a brand query: the query's words start words of the name,
// in order ("nike" matches "Nike, Inc." and "NIKE SRL", not "Nikena" or "Jan Nikel").
export function nameMatches(name, query) {
  const nameWords = words(name);
  const queryWords = words(query);
  if (queryWords.length === 0) return false;
  for (let start = 0; start + queryWords.length <= nameWords.length; start++) {
    if (queryWords.every((w, i) => (i === queryWords.length - 1 ? nameWords[start + i].startsWith(w) : nameWords[start + i] === w))) {
      if (queryWords.length > 1 || nameWords[start] === queryWords[0]) return true;
    }
  }
  return false;
}

// The advertisers a brand query stands for: names that match, most ads first.
export function pickAdvertisers(suggestions, query, max) {
  return suggestions.advertisers
    .filter((a) => nameMatches(a.name, query))
    .sort((a, b) => (b.adCountHigh ?? 0) - (a.adCountHigh ?? 0) || (b.verified - a.verified))
    .slice(0, max);
}

// The content of an ad or of one of its variations: an image, or a preview script with the ad.
export function contentOf(content) {
  const out = { imageUrl: null, width: null, height: null, previewUrl: null };
  const html = content?.[3]?.[2];
  if (html) {
    out.imageUrl = /src="([^"]+)"/.exec(html)?.[1] ?? null;
    out.width = int(/width="(\d+)"/.exec(html)?.[1]);
    out.height = int(/height="(\d+)"/.exec(html)?.[1]);
  }
  if (content?.[1]?.[4]) out.previewUrl = content[1][4];
  if (!out.imageUrl && content?.[2]?.[4]) out.imageUrl = content[2][4];
  return out;
}

// SearchCreatives → { ads, nextPageToken, totalLow, totalHigh }.
export function parseCreatives(json) {
  return {
    ads: (json?.[1] ?? []).map((c) => ({
      advertiserId: c[1],
      creativeId: c[2],
      advertiserName: c[12] ?? null,
      domain: c[14] ?? null,
      format: FORMAT_NAMES[c[4]] ?? null,
      firstShown: fromTimestamp(c[6]),
      lastShown: fromTimestamp(c[7]),
      shownForDays: int(c[13]),
      ...contentOf(c[3]),
    })),
    nextPageToken: json?.[2] || null,
    totalLow: int(json?.[4]),
    totalHigh: int(json?.[5]),
  };
}

const range = (min, max) => (min === undefined && max === undefined ? null : { min: int(min) ?? 0, max: int(max) });

// GetCreativeById → variations, regions with dates and (in the EU) impressions per platform.
export function parseCreativeDetail(json) {
  const c = json?.[1];
  if (!c) return null;
  const regions = (c[17] ?? []).map((r) => ({
    region: regionCode(r[1]),
    firstShown: fromDateNumber(r[4]),
    lastShown: fromDateNumber(r[5]),
    impressions: range(r[2], r[3]),
    platformImpressions: (r[8] ?? []).map((p) => ({ platform: PLATFORM_NAMES[p[1]] ?? null, impressions: range(p[2], p[3]) })),
  }));
  const total = c[19];
  return {
    advertiserId: c[1],
    creativeId: c[2],
    lastShown: fromTimestamp(c[4]),
    advertiserName: c[22]?.[1] ?? null,
    variations: (c[5] ?? []).map(contentOf),
    regions,
    impressions: total ? range(total[2], total[3]) : null,
    platformImpressions: (total?.[8] ?? []).map((p) => ({ platform: PLATFORM_NAMES[p[1]] ?? null, impressions: range(p[2], p[3]) })),
  };
}

// GetAdvertiserById → { advertiserId, name, country }.
export function parseAdvertiser(json) {
  const a = json?.[1];
  if (!a) return null;
  return { advertiserId: a[1], name: a[2] ?? a[9]?.[1] ?? null, legalName: a[9]?.[2] ?? null, country: a[3] ?? a[11] ?? null };
}
