// Input of the Google Trends Actor: what to compare, where, over which time, and how.

import {
  CATEGORY_NAMES,
  GEO_NAMES,
  MAX_COMPARE,
  PROPERTIES,
  TIME_RANGES,
  TRENDING_CATEGORIES,
  TRENDING_HOURS,
  isTopicId,
  parseExploreLink,
} from './trends.js';

// An empty input (for example the Store's daily health check) runs this example instead of failing.
export const EXAMPLE_INPUT = { keywords: ['coffee'], locations: ['US'], timeRange: 'today 12-m' };

// Every interest record has the same keys in the same order; missing values are null.
export const EMPTY_REPORT = {
  type: 'interest',
  keyword: null, searchedFor: null, topicTitle: null, topicType: null,
  location: null, locationName: null, timeRange: null, timeRangeName: null, startDate: null, endDate: null, resolution: null,
  category: null, categoryName: null, searchType: null, oneScale: null, comparedWith: null, hasData: null,
  averageInterest: null, peakInterest: null, peakDate: null, latestInterest: null, latestDate: null,
  recentChangePercent: null, yearOverYearPercent: null, trendDirection: null, trendPercent: null,
  bestMonth: null, worstMonth: null, seasonalityPercent: null,
  topRegion: null, topRelatedQuery: null, topRisingQuery: null,
  interestOverTime: null, interestByRegion: null, relatedQueriesTop: null, relatedQueriesRising: null,
  trendsUrl: null, warnings: null, scrapedAt: null,
};

export const EMPTY_TRENDING = {
  type: 'trending',
  location: null, locationName: null, hours: null, rank: null, term: null, searchVolume: null, searchVolumeText: null,
  increasePercent: null, startedAt: null, endedAt: null, isActive: null, categories: null, relatedSearches: null,
  exploreUrl: null, scrapedAt: null,
};

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map((item) => String(item).trim())
  .filter(Boolean);

// Country and region names (lower case) to codes; countries win over regions with the same name.
const CODE_BY_NAME = new Map();
for (const [code, name] of Object.entries(GEO_NAMES)) {
  const key = name.toLowerCase();
  if (!CODE_BY_NAME.has(key) || !code.includes('-')) CODE_BY_NAME.set(key, code);
}
const WORLDWIDE = new Set(['', 'worldwide', 'world', 'global', 'all', 'ww']);

// A location as Google's code: "US", "US-CA", "GB-ENG", "US-CA-803" (metro area), or a name such as
// "Germany" or "California". Worldwide is the empty code.
export function parseLocation(value) {
  const text = String(value ?? '').trim();
  if (WORLDWIDE.has(text.toLowerCase())) return '';
  const code = text.toUpperCase();
  if (GEO_NAMES[code]) return code;
  const byName = CODE_BY_NAME.get(text.toLowerCase());
  if (byName) return byName;
  throw new Error(`Unknown location "${text}". Use a country or region code such as US, GB, US-CA or DE-BY, or "Worldwide".`);
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// The time range as Google writes it: "today 12-m", "now 7-d", "all" or "2024-01-01 2024-06-30".
export function parseTimeRange(input) {
  const range = String(input.timeRange ?? 'today 12-m').trim();
  if (range !== 'custom') {
    if (TIME_RANGES[range]) return range;
    const parts = range.split(/\s+/);
    if (parts.length === 2 && parts.every((part) => DATE.test(part))) return checkDates(parts[0], parts[1]);
    throw new Error(`Unknown time range "${range}". Use one of: ${Object.keys(TIME_RANGES).join(', ')}, custom.`);
  }
  const start = String(input.startDate ?? '').trim().slice(0, 10);
  const end = String(input.endDate ?? '').trim().slice(0, 10) || new Date().toISOString().slice(0, 10);
  if (!DATE.test(start)) throw new Error('With the custom time range, "startDate" must be a date such as 2024-01-01.');
  if (!DATE.test(end)) throw new Error('"endDate" must be a date such as 2024-12-31.');
  return checkDates(start, end);
}

function checkDates(start, end) {
  if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) throw new Error(`Invalid date in "${start} ${end}".`);
  if (start < '2004-01-01') throw new Error('Google Trends data starts on 2004-01-01.');
  if (start >= end) throw new Error('The start date must be before the end date.');
  return `${start} ${end}`;
}

export function readInput(raw, warn = () => {}) {
  let input = raw;
  const empty = ['keywords', 'exploreUrls', 'trendingLocations'].every((field) => toList(raw[field]).length === 0);
  if (empty) {
    warn('No keywords, explore links or trending locations in the input; checking "coffee" in the United States as an example.');
    input = { ...raw, ...EXAMPLE_INPUT };
  }
  const keywords = [...new Set(toList(input.keywords))];
  const locations = [...new Set(toList(input.locations).map(parseLocation))];
  if (locations.length === 0) locations.push('');
  const time = parseTimeRange(input);
  const category = String(input.category ?? '0').trim() || '0';
  if (!CATEGORY_NAMES[category]) throw new Error(`Unknown category "${category}". Use a category id of Google Trends, for example 71 (Food & Drink).`);
  const searchType = String(input.searchType ?? 'web');
  if (!(searchType in PROPERTIES)) throw new Error(`Unknown search type "${searchType}". Use one of: ${Object.keys(PROPERTIES).join(', ')}.`);
  const regionResolution = String(input.regionResolution ?? 'default').toUpperCase();
  if (!['DEFAULT', 'CITY', 'DMA'].includes(regionResolution)) throw new Error('"regionResolution" must be default, CITY or DMA.');

  const exploreLinks = [];
  for (const link of toList(input.exploreUrls)) {
    try {
      const parsed = parseExploreLink(link);
      parsed.items = parsed.items.map((item) => ({ ...item, geo: parseLocation(item.geo) }));
      parsed.time = parseTimeRange({ timeRange: parsed.time });
      exploreLinks.push({ link, ...parsed });
    } catch (error) {
      warn(`Skipping explore link "${link}": ${error.message}`);
    }
  }

  const trendingLocations = [...new Set(toList(input.trendingLocations).map(parseLocation))];
  if (trendingLocations.includes('')) throw new Error('"Trending now" needs a country or region, for example US or GB; Google has no worldwide list.');
  const trendingHours = Number(input.trendingHours ?? 24);
  if (!TRENDING_HOURS.includes(trendingHours)) throw new Error(`"trendingHours" must be one of ${TRENDING_HOURS.join(', ')}.`);
  const trendingCategories = toList(input.trendingCategories).map((value) => {
    const id = Object.keys(TRENDING_CATEGORIES).find((key) => key === value || TRENDING_CATEGORIES[key].toLowerCase() === value.toLowerCase());
    if (!id) throw new Error(`Unknown trending category "${value}". Use one of: ${Object.values(TRENDING_CATEGORIES).join(', ')}.`);
    return TRENDING_CATEGORIES[id];
  });
  const maxTrendingPerLocation = Number(input.maxTrendingPerLocation ?? 0);
  if (!Number.isInteger(maxTrendingPerLocation) || maxTrendingPerLocation < 0) throw new Error('"maxTrendingPerLocation" must be a whole number, 0 or more.');

  const searchAsTopic = input.searchAsTopic === true;
  const oneScale = input.compareOnOneScale === true;
  return {
    keywords,
    searchAsTopic,
    locations,
    time,
    category,
    property: PROPERTIES[searchType],
    oneScale,
    includeRegions: input.includeInterestByRegion !== false,
    regionResolution: regionResolution === 'DEFAULT' ? null : regionResolution,
    includeRelated: input.includeRelatedQueries !== false,
    exploreLinks,
    trendingLocations,
    trendingHours,
    trendingCategories,
    trendingActiveOnly: input.trendingActiveOnly === true,
    maxTrendingPerLocation,
    proxyConfiguration: input.proxyConfiguration,
  };
}

// Groups of items that are compared together. Each group shares one 0-100 scale; a group of one
// is a keyword on its own scale. Keywords become items after topic lookup (see main.js).
export function comparisonGroups(input, terms) {
  const groups = [];
  const items = [];
  for (const term of terms) {
    for (const geo of input.locations) items.push({ ...term, geo });
  }
  if (items.length > 0) {
    const options = { time: input.time, category: input.category, property: input.property };
    if (input.oneScale && items.length > 1) {
      groups.push({ label: `${items.length} keyword and location pairs on one scale`, items, options, oneScale: true, refine: true });
    }
    else for (const item of items) groups.push({ label: `"${item.label}" in ${item.geo || 'Worldwide'}`, items: [item], options, oneScale: false });
  }
  for (const link of input.exploreLinks) {
    groups.push({
      label: `explore link ${link.items.map((item) => item.keyword).join(', ')}`,
      items: link.items.map((item) => ({ keyword: item.keyword, label: item.keyword, geo: item.geo })),
      options: { time: link.time, category: link.category, property: link.property },
      oneScale: link.items.length > 1,
    });
  }
  return groups;
}

export const needsTopicLookup = (keyword, input) => input.searchAsTopic && !isTopicId(keyword);
export { MAX_COMPARE };
