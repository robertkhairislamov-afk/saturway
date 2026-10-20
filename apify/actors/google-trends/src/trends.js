// Google Trends endpoints and parsers. Everything here is pure: it builds URLs and turns Google's
// answers into records, so it can be tested without the network.

import { readFileSync } from 'node:fs';

const BASE = 'https://trends.google.com';
export const HL = 'en-US';

const dataFile = (name) => JSON.parse(readFileSync(new URL(`./data/${name}`, import.meta.url), 'utf8'));
// Google's own lists from the explore page pickers: every country, region, metro area and category.
export const GEO_NAMES = dataFile('geos.json');
export const CATEGORY_NAMES = dataFile('categories.json');

// Time ranges of the explore page. Google picks the step (minute, hour, day, week, month) from the range.
export const TIME_RANGES = {
  'now 1-H': 'Past hour',
  'now 4-H': 'Past 4 hours',
  'now 1-d': 'Past day',
  'now 7-d': 'Past 7 days',
  'today 1-m': 'Past 30 days',
  'today 3-m': 'Past 90 days',
  'today 12-m': 'Past 12 months',
  'today 5-y': 'Past 5 years',
  all: '2004 to present',
};

// Where people searched: web search (empty), image, news, Google Shopping or YouTube search.
export const PROPERTIES = { web: '', images: 'images', news: 'news', shopping: 'froogle', youtube: 'youtube' };
const PROPERTY_BY_CODE = Object.fromEntries(Object.entries(PROPERTIES).map(([name, code]) => [code, name]));

// Categories of "Trending now" (ids from the trending page).
export const TRENDING_CATEGORIES = {
  1: 'Autos and Vehicles', 2: 'Beauty and Fashion', 3: 'Business and Finance', 4: 'Entertainment', 5: 'Food and Drink',
  6: 'Games', 7: 'Health', 8: 'Hobbies and Leisure', 9: 'Jobs and Education', 10: 'Law and Government', 11: 'Other',
  13: 'Pets and Animals', 14: 'Politics', 15: 'Science', 16: 'Shopping', 17: 'Sports', 18: 'Technology',
  19: 'Travel and Transportation', 20: 'Climate',
};
export const TRENDING_HOURS = [4, 24, 48, 168];

// Google can compare at most five terms (or term and place pairs) in one request.
export const MAX_COMPARE = 5;

export const geoName = (geo) => (geo ? GEO_NAMES[geo] ?? geo : 'Worldwide');
export const categoryName = (id) => CATEGORY_NAMES[String(id)] ?? String(id);
export const propertyName = (code) => PROPERTY_BY_CODE[code] ?? code;
export const isTopicId = (keyword) => /^\/[mgt]\/[0-9a-z_]+$/i.test(keyword);

// Strips the ")]}'" guard Google puts before JSON answers and reads the first JSON value.
export function parseGoogleJson(text) {
  const start = text.search(/[[{]/);
  if (start < 0) throw new Error(`Expected JSON from Google Trends, got: ${text.slice(0, 120)}`);
  const body = text.slice(start);
  try {
    return JSON.parse(body);
  } catch {
    // Some answers carry more than one JSON value; read only the first complete one.
    let depth = 0;
    let inString = false;
    for (let i = 0; i < body.length; i++) {
      const ch = body[i];
      if (inString) {
        if (ch === '\\') i++;
        else if (ch === '"') inString = false;
      } else if (ch === '"') inString = true;
      else if (ch === '{' || ch === '[') depth++;
      else if (ch === '}' || ch === ']') {
        depth--;
        if (depth === 0) return JSON.parse(body.slice(0, i + 1));
      }
    }
    throw new Error(`Could not read the Google Trends answer: ${text.slice(0, 120)}`);
  }
}

// --- Explore ---------------------------------------------------------------------------------------

// The page that sets the session cookie Google Trends wants before it answers API calls.
export const warmupUrl = (geo = 'US') => `${BASE}/trends/explore?geo=${encodeURIComponent(geo || 'US')}&hl=${HL}`;

// One explore request compares up to five items; each item is a keyword (or topic id) in a place.
export function exploreUrl(items, { time, category = 0, property = '' }) {
  const req = {
    comparisonItem: items.map((item) => ({ keyword: item.keyword, geo: item.geo, time })),
    category: Number(category) || 0,
    property,
  };
  return `${BASE}/trends/api/explore?hl=${HL}&tz=0&req=${encodeURIComponent(JSON.stringify(req))}`;
}

const WIDGET_PATHS = [
  ['TIMESERIES', 'multiline'],
  ['GEO_MAP', 'comparedgeo'],
  ['RELATED_QUERIES', 'relatedsearches'],
  ['RELATED_TOPICS', 'relatedsearches'],
];

// Data URL of one explore widget. The token is tied to the widget's request, so only the map
// resolution (country, region, city, metro) may be changed.
export function widgetUrl(widget, { resolution } = {}) {
  const path = WIDGET_PATHS.find(([prefix]) => widget.id.startsWith(prefix))?.[1];
  if (!path) throw new Error(`Unknown Google Trends widget ${widget.id}`);
  const request = resolution ? { ...widget.request, resolution } : widget.request;
  return `${BASE}/trends/api/widgetdata/${path}?hl=${HL}&tz=0&req=${encodeURIComponent(JSON.stringify(request))}&token=${widget.token}`;
}

// Splits the explore answer into the timeline widget and per-item map and related-query widgets.
// With one item Google names them GEO_MAP and RELATED_QUERIES; with several, GEO_MAP_0, GEO_MAP_1...
export function parseExplore(json, itemCount) {
  const widgets = json?.widgets;
  if (!Array.isArray(widgets)) throw new Error('Google Trends returned no explore widgets.');
  const byId = new Map(widgets.filter((w) => w.token).map((w) => [w.id, w]));
  const perItem = (prefix) => Array.from({ length: itemCount }, (_, i) => byId.get(itemCount === 1 ? prefix : `${prefix}_${i}`) ?? null);
  return { timeline: byId.get('TIMESERIES') ?? null, geoMaps: perItem('GEO_MAP'), relatedQueries: perItem('RELATED_QUERIES') };
}

// The step of the timeline, from the widget request ("WEEK", "DAY"...).
export const resolutionOf = (widget) => widget?.request?.resolution ?? null;

// Date of a point: a day for daily, weekly and monthly data, the full UTC time for shorter steps.
const DAY_STEPS = new Set(['DAY', 'WEEK', 'MONTH']);
export function pointDate(seconds, resolution) {
  const iso = new Date(Number(seconds) * 1000).toISOString();
  return DAY_STEPS.has(resolution) ? iso.slice(0, 10) : `${iso.slice(0, 19)}Z`;
}

// Interest over time for each compared item: [{ date, value, isPartial }] in the order of the items.
// Points Google has no data for keep value null.
export function parseTimeline(json, itemCount, resolution) {
  const data = json?.default?.timelineData;
  if (!Array.isArray(data)) throw new Error('Google Trends returned no interest-over-time data.');
  return Array.from({ length: itemCount }, (_, i) => data.map((point) => ({
    date: pointDate(point.time, resolution),
    value: point.hasData?.[i] === false ? null : Number(point.value?.[i] ?? 0),
    isPartial: point.isPartial === true,
  })));
}

// Interest by region of one item, highest first, without regions Google has no data for.
export function parseGeoMap(json) {
  const data = json?.default?.geoMapData;
  if (!Array.isArray(data)) throw new Error('Google Trends returned no interest-by-region data.');
  return data
    .filter((row) => row.hasData?.[0] !== false)
    .map((row) => ({
      geoCode: row.geoCode ?? null,
      geoName: row.geoName ?? null,
      value: Number(row.value?.[0] ?? 0),
      ...(row.coordinates ? { lat: row.coordinates.lat, lng: row.coordinates.lng } : {}),
    }))
    .sort((a, b) => b.value - a.value);
}

// --- Related queries ---------------------------------------------------------------------------------

const fold = (text) => String(text).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const wordsOf = (text) => fold(text).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3 || /^\p{N}+$/u.test(word));

// True when the query repeats a word of the keyword. Rising queries also carry bot traffic
// ("pet care tips" under "coffee"); this flag helps to filter it out.
export function containsKeyword(query, keyword) {
  if (!keyword) return null;
  const q = fold(query);
  if (q.includes(fold(keyword))) return true;
  const words = wordsOf(keyword);
  return words.length > 0 && words.some((word) => q.includes(word));
}

// Spam that reaches rising queries: web addresses and emoji flags ("bitcoin casino 🇨🇦 site.lol").
const DOMAIN = /\b[\p{L}\p{N}-]+\.(?:com|net|org|info|biz|xyz|top|lol|name|blog|space|site|online|club|vip|bet|win|app|shop|pro|fun|live|link|click|io|co|cc|me|tk|ml|ga|cf|gq|ru|cn)\b/iu;
const EMOJI = /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
export const looksLikeSpam = (query) => DOMAIN.test(query) || EMOJI.test(query) || /https?:\/\//i.test(query);

const exploreLinkOf = (link) => (link ? `${BASE}${link}` : null);

// Top and rising related queries of one item.
export function parseRelatedQueries(json, keyword) {
  const lists = json?.default?.rankedList;
  if (!Array.isArray(lists)) throw new Error('Google Trends returned no related-queries data.');
  const [top = [], rising = []] = lists.map((list) => list.rankedKeyword ?? []);
  return {
    top: top.map((row) => ({
      query: row.query,
      value: Number(row.value),
      containsKeyword: containsKeyword(row.query, keyword),
      exploreUrl: exploreLinkOf(row.link),
    })),
    rising: rising.map((row) => ({
      query: row.query,
      increase: row.formattedValue ?? null,
      increasePercent: Number(row.value),
      isBreakout: row.formattedValue === 'Breakout',
      containsKeyword: containsKeyword(row.query, keyword),
      looksLikeSpam: looksLikeSpam(row.query),
      exploreUrl: exploreLinkOf(row.link),
    })),
  };
}

// --- Topics (autocomplete) ----------------------------------------------------------------------------

export const autocompleteUrl = (term) => `${BASE}/trends/api/autocomplete/${encodeURIComponent(term)}?hl=${HL}&tz=0`;

// Google's topics for a search term: [{ id, title, type }], best match first.
export function parseTopics(json) {
  return (json?.default?.topics ?? []).map((topic) => ({ id: topic.mid, title: topic.title, type: topic.type }));
}

// --- One shared scale ---------------------------------------------------------------------------------

const peakOf = (series) => series.reduce((max, point) => Math.max(max, point.value ?? 0), 0);
const sumOf = (series) => series.reduce((sum, point) => sum + (point.value ?? 0), 0);
const chunk = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

// Puts any number of items on one 0-100 scale, as if Google compared all of them at once.
// Google compares at most five, each request on its own scale. So: (1) find the item with the
// highest peak by comparing groups of five and then the winners; (2) compare every other item next
// to that item, four at a time; (3) rescale each group by how the anchor came out in it (sums of
// the anchor's points, which evens out rounding). The anchor tops every group, so the result equals
// Google's own comparison of all items.
// With `refine`, small items then get more precision than Google's whole numbers: they are compared
// again in groups led by an item only a little bigger than them, so they are measured on a finer
// scale, and brought back to the shared scale through the leader's known total. Step by step this
// reaches the smallest items; their values get decimals ("0.37" instead of "0" or "<1").
// `compare(items)` loads up to five items and returns { series: [...], ... } in their order. For
// every item the answer names the request it came from (`sources[i] = { result, position }`).
export const PRECISE_PEAK = 10;
const MAX_REFINE_ROUNDS = 3;
const ROUNDING_SD = 0.29; // spread of the error of rounding to whole numbers
const GUIDE_ERROR = 0.03;

const scaled = (series, factor) => series.map((point) => ({ ...point, value: point.value === null ? null : point.value * factor }));
// Two decimals, or three significant digits below 1 (0.0374).
const tidy = (value) => {
  if (value === null || value === 0) return value;
  if (Math.abs(value) >= 1) return Math.round(value * 100) / 100;
  const digits = 2 - Math.floor(Math.log10(Math.abs(value)));
  return Number(value.toFixed(Math.min(digits, 6)));
};

export async function compareOnSharedScale(items, compare, { onProgress, refine = false } = {}) {
  let requests = 0;
  const run = async (list) => {
    const result = await compare(list);
    requests++;
    onProgress?.(requests);
    return result;
  };
  const series = new Array(items.length);
  const sources = new Array(items.length);
  // The highest value of each item in the request it was measured in: its precision.
  const measuredPeak = new Array(items.length).fill(0);
  const unit = new Array(items.length).fill(1);
  let anchor = null;

  if (items.length <= MAX_COMPARE) {
    const result = await run(items);
    items.forEach((_, i) => {
      series[i] = result.series[i];
      sources[i] = { result, position: i };
      measuredPeak[i] = peakOf(result.series[i]);
    });
  } else {
    let contenders = items.map((_, index) => index);
    let firstRound = null;
    while (contenders.length > 1) {
      const winners = [];
      const round = [];
      for (const group of chunk(contenders, MAX_COMPARE)) {
        const result = await run(group.map((index) => items[index]));
        const peaks = result.series.map(peakOf);
        winners.push(group[peaks.indexOf(Math.max(...peaks))]);
        round.push({ group, result });
      }
      firstRound ??= round;
      contenders = winners;
    }
    anchor = contenders[0];
    // The first-round group won by the anchor is already on the anchor's scale.
    const home = firstRound.find((g) => g.group.includes(anchor));
    home.group.forEach((index, position) => {
      series[index] = home.result.series[position];
      sources[index] = { result: home.result, position };
      measuredPeak[index] = peakOf(series[index]);
    });
    const referenceSum = sumOf(series[anchor]);
    const rest = items.map((_, index) => index).filter((index) => series[index] === undefined);
    for (const group of chunk(rest, MAX_COMPARE - 1)) {
      const result = await run([items[anchor], ...group.map((index) => items[index])]);
      const anchorSum = sumOf(result.series[0]);
      const factor = anchorSum > 0 && referenceSum > 0 ? referenceSum / anchorSum : 1;
      group.forEach((index, i) => {
        series[index] = scaled(result.series[i + 1], factor);
        sources[index] = { result, position: i + 1 };
        measuredPeak[index] = peakOf(result.series[i + 1]);
        unit[index] = factor;
      });
    }
  }

  if (refine && items.length > 1) {
    // Each item's points are Google's whole numbers times unit[i]; a guide's point sum gives a
    // scale factor only as exact as that rounding allows.
    const factorError = (i) => {
      const sum = sumOf(series[i]);
      const points = series[i].filter((point) => point.value !== null).length;
      return sum > 0 ? (ROUNDING_SD * unit[i] * Math.sqrt(points)) / sum : Infinity;
    };
    const done = new Set(items.map((_, i) => i).filter((i) => measuredPeak[i] >= PRECISE_PEAK || series[i].every((point) => point.value === null)));
    for (let round = 0; round < MAX_REFINE_ROUNDS; round++) {
      const todo = items.map((_, i) => i).filter((i) => !done.has(i)).sort((a, b) => peakOf(series[b]) - peakOf(series[a]));
      let improved = false;
      while (todo.length > 0) {
        let guide;
        let group;
        if (factorError(todo[0]) <= GUIDE_ERROR) {
          // The biggest item left leads its own group: it tops the request, and its known sum on the
          // shared scale brings the whole group back to that scale.
          group = todo.splice(0, MAX_COMPARE);
          guide = group[0];
        } else {
          // Too small to lead: borrow the smallest finished item that is still bigger.
          const top = peakOf(series[todo[0]]);
          guide = [...done]
            .filter((i) => peakOf(series[i]) >= top && factorError(i) <= GUIDE_ERROR)
            .sort((a, b) => peakOf(series[a]) - peakOf(series[b]))[0];
          if (guide === undefined) {
            todo.shift();
            continue;
          }
          group = todo.splice(0, MAX_COMPARE - 1);
        }
        const batch = group[0] === guide ? group : [guide, ...group];
        const result = await run(batch.map((index) => items[index]));
        const guideSum = sumOf(result.series[0]);
        if (guideSum <= 0) continue;
        const factor = sumOf(series[guide]) / guideSum;
        batch.forEach((index, k) => {
          if (!group.includes(index)) return;
          const peak = peakOf(result.series[k]);
          if (peak > measuredPeak[index]) {
            series[index] = scaled(result.series[k], factor);
            unit[index] = factor;
            measuredPeak[index] = peak;
            improved = true;
          }
          if (measuredPeak[index] >= PRECISE_PEAK) done.add(index);
        });
      }
      if (!improved) break;
    }
  }

  // Keep the top of the scale at exactly 100.
  const top = Math.max(...series.map(peakOf));
  const factor = top > 0 ? 100 / top : 1;
  for (let i = 0; i < series.length; i++) {
    series[i] = series[i].map((point) => ({ ...point, value: point.value === null ? null : tidy(point.value * factor) }));
  }
  return { series, sources, anchor, requests };
}

// --- Insights -------------------------------------------------------------------------------------------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// One decimal, or two significant digits below 1 (0.042) so small averages do not read as zero.
const round1 = (n) => {
  if (n === null || !Number.isFinite(n)) return null;
  if (n === 0 || Math.abs(n) >= 1) return Math.round(n * 10) / 10;
  return Number(n.toFixed(Math.min(1 - Math.floor(Math.log10(Math.abs(n))), 6)));
};
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const DAY_MS = 86400000;
const timeOf = (date) => Date.parse(date.length === 10 ? `${date}T00:00:00Z` : date);

// Summary of one interest-over-time series. The last, incomplete period is left out.
export function insightsOf(series, resolution) {
  const empty = {
    averageInterest: null, peakInterest: null, peakDate: null, latestInterest: null, latestDate: null,
    recentChangePercent: null, yearOverYearPercent: null, trendDirection: null, trendPercent: null,
    bestMonth: null, worstMonth: null, seasonalityPercent: null,
  };
  const points = series.filter((point) => !point.isPartial && point.value !== null);
  if (points.length === 0) return empty;
  const values = points.map((point) => point.value);
  const average = mean(values);
  const peak = Math.max(...values);
  const latest = points[points.length - 1];
  const out = {
    ...empty,
    averageInterest: round1(average),
    peakInterest: peak,
    peakDate: points[values.indexOf(peak)].date,
    latestInterest: latest.value,
    latestDate: latest.date,
  };
  // Last four periods against the four before them.
  const k = Math.min(4, Math.floor(values.length / 2));
  if (k > 0) {
    const recent = mean(values.slice(-k));
    const before = mean(values.slice(-2 * k, -k));
    out.recentChangePercent = before > 0 ? round1(((recent - before) / before) * 100) : null;
  }
  // The latest 12 months against the 12 months before, when the series covers two years.
  const end = timeOf(latest.date);
  if (DAY_STEPS.has(resolution) && end - timeOf(points[0].date) >= 729 * DAY_MS) {
    const lastYear = mean(points.filter((p) => end - timeOf(p.date) < 365 * DAY_MS).map((p) => p.value));
    const yearBefore = mean(points.filter((p) => end - timeOf(p.date) >= 365 * DAY_MS && end - timeOf(p.date) < 730 * DAY_MS).map((p) => p.value));
    out.yearOverYearPercent = yearBefore > 0 ? round1(((lastYear - yearBefore) / yearBefore) * 100) : null;
  }
  // Trend: the straight line through all points, as a change from start to end in % of the average.
  if (values.length >= 3 && average > 0) {
    const n = values.length;
    const xMean = (n - 1) / 2;
    let num = 0;
    let den = 0;
    values.forEach((v, x) => {
      num += (x - xMean) * (v - average);
      den += (x - xMean) ** 2;
    });
    const trend = ((num / den) * (n - 1) / average) * 100;
    out.trendPercent = round1(trend);
    out.trendDirection = trend >= 15 ? 'rising' : trend <= -15 ? 'falling' : 'stable';
  }
  // Season: the month people search most and least on average. Needs two years, so that one
  // year's growth or fall does not pass for a season.
  if (DAY_STEPS.has(resolution) && end - timeOf(points[0].date) >= 700 * DAY_MS) {
    const byMonth = Array.from({ length: 12 }, () => []);
    for (const p of points) {
      // A week is counted in the month of its middle day.
      const t = timeOf(p.date) + (resolution === 'WEEK' ? 3 * DAY_MS : 0);
      byMonth[new Date(t).getUTCMonth()].push(p.value);
    }
    if (byMonth.every((list) => list.length > 0) && average > 0) {
      const avgs = byMonth.map(mean);
      const best = avgs.indexOf(Math.max(...avgs));
      const worst = avgs.indexOf(Math.min(...avgs));
      out.bestMonth = MONTHS[best];
      out.worstMonth = MONTHS[worst];
      out.seasonalityPercent = round1(((avgs[best] - avgs[worst]) / average) * 100);
    }
  }
  return out;
}

// --- Links ----------------------------------------------------------------------------------------------

// The Google Trends page that shows the same comparison.
export function trendsPageUrl(items, { time, category = 0, property = '' }) {
  const params = new URLSearchParams();
  params.set('date', time);
  const geos = [...new Set(items.map((item) => item.geo))];
  if (geos.length === 1) {
    if (geos[0]) params.set('geo', geos[0]);
  } else {
    params.set('geo', items.map((item) => item.geo).join(','));
  }
  params.set('q', items.map((item) => item.keyword).join(','));
  if (Number(category)) params.set('cat', String(category));
  if (property) params.set('gprop', property);
  params.set('hl', HL);
  return `${BASE}/trends/explore?${params.toString()}`;
}

// Reads a Google Trends explore link: its keywords, places, time range, category and search type.
export function parseExploreLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error('not a valid link');
  }
  if (!/(^|\.)trends\.google\.[a-z.]+$/.test(url.hostname) || !url.pathname.includes('/explore')) {
    throw new Error('not a Google Trends explore link');
  }
  const keywords = (url.searchParams.get('q') ?? '').split(',').map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) throw new Error('the link has no search terms (q=)');
  if (keywords.length > MAX_COMPARE) throw new Error(`Google compares at most ${MAX_COMPARE} terms in one link`);
  const geoParam = (url.searchParams.get('geo') ?? '').split(',').map((g) => g.trim().toUpperCase());
  const geos = keywords.map((_, i) => (geoParam.length === keywords.length ? geoParam[i] : geoParam[0] ?? ''));
  const time = url.searchParams.get('date') || 'today 12-m';
  return {
    items: keywords.map((keyword, i) => ({ keyword, geo: geos[i] })),
    time,
    category: Number(url.searchParams.get('cat') ?? 0) || 0,
    property: url.searchParams.get('gprop') ?? '',
  };
}

// --- Trending now --------------------------------------------------------------------------------------

// The "Trending now" list of a country or region for the past 4, 24, 48 or 168 hours.
export const trendingRequest = (geo, hours) => ({
  url: `${BASE}/_/TrendsUi/data/batchexecute?rpcids=i0OFE&hl=${HL}`,
  body: `f.req=${encodeURIComponent(JSON.stringify([[['i0OFE', JSON.stringify([null, null, geo, 0, HL, hours, 1]), null, 'generic']]]))}`,
});

const volumeText = (n) => (n >= 1e6 ? `${n / 1e6}M+` : n >= 1e3 ? `${n / 1e3}K+` : `${n}+`);
const isoOf = (seconds) => (Array.isArray(seconds) && seconds[0] ? new Date(seconds[0] * 1000).toISOString() : null);

// Parses the "Trending now" answer: one record per trending search, in Google's order.
export function parseTrending(text, { geo, hours }) {
  const outer = parseGoogleJson(text);
  const call = outer.find((row) => Array.isArray(row) && row[1] === 'i0OFE');
  if (!call || typeof call[2] !== 'string') throw new Error('Google Trends returned no trending searches.');
  const rows = JSON.parse(call[2])?.[1];
  if (!Array.isArray(rows)) return [];
  return rows.map((row, i) => {
    const keyword = row[12] || row[0];
    const volume = Number(row[6]) || null;
    return {
      rank: i + 1,
      term: row[0],
      searchVolume: volume,
      searchVolumeText: volume ? volumeText(volume) : null,
      increasePercent: Number(row[8]) || null,
      startedAt: isoOf(row[3]),
      endedAt: isoOf(row[4]),
      isActive: !row[4],
      categories: (row[10] ?? []).map((id) => TRENDING_CATEGORIES[id] ?? String(id)),
      relatedSearches: Array.isArray(row[9]) ? row[9].filter((q) => q !== row[0]) : [],
      exploreUrl: trendsPageUrl([{ keyword, geo: row[2] ?? geo }], { time: hours <= 4 ? 'now 4-H' : hours <= 24 ? 'now 1-d' : 'now 7-d' }),
    };
  });
}
