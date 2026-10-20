// Loads one comparison group from Google Trends and turns it into interest records: the timeline,
// the insights, interest by region and related queries of every keyword and location.

import { memoryKeyOf } from './memory.js';
import { EMPTY_REPORT } from './sources.js';
import {
  MAX_COMPARE,
  TIME_RANGES,
  categoryName,
  compareOnSharedScale,
  dailyWindows,
  exploreUrl,
  geoName,
  insightsOf,
  parseExplore,
  parseGeoMap,
  parseGoogleJson,
  parseRelatedQueries,
  parseTimeline,
  propertyName,
  resolutionOf,
  stitchDaily,
  toHundred,
  trendsPageUrl,
  widgetUrl,
} from './trends.js';

// Returns a function that compares up to five items in one explore request and loads their timeline.
export function comparer(request, options) {
  return async (items) => {
    const explore = parseExplore(parseGoogleJson(await request(exploreUrl(items, options))), items.length);
    if (!explore.timeline) throw new Error('Google Trends returned no interest-over-time widget.');
    const resolution = resolutionOf(explore.timeline);
    const series = parseTimeline(parseGoogleJson(await request(widgetUrl(explore.timeline))), items.length, resolution);
    return { series, explore, resolution };
  };
}

const labelOf = (item) => `${item.label} (${item.geo || 'Worldwide'})`;

// Interest by region of one item. A city or metro breakdown Google does not have for the place
// falls back to Google's default breakdown with a warning.
async function loadRegions(request, widget, item, resolution, warnings) {
  if (!widget) {
    warnings.push('Google Trends gave no interest-by-region data for this comparison.');
    return null;
  }
  let wanted = resolution;
  if (wanted === 'DMA' && !item.geo.startsWith('US')) {
    warnings.push('Metro areas (DMA) exist only in the United States; showing the default breakdown.');
    wanted = null;
  }
  if (wanted) {
    const what = wanted === 'CITY' ? 'city' : 'metro area';
    try {
      const rows = parseGeoMap(parseGoogleJson(await request(widgetUrl(widget, { resolution: wanted }))));
      if (rows.length > 0) return rows;
      warnings.push(`Google Trends has too little data for a ${what} breakdown here; showing the default breakdown.`);
    } catch (error) {
      if (error.retryable !== false && error.status !== 500) throw error;
      warnings.push(`Google Trends has no ${what} breakdown here; showing the default breakdown.`);
    }
  }
  return parseGeoMap(parseGoogleJson(await request(widgetUrl(widget))));
}

async function loadRelated(request, widget, item, warnings) {
  if (!widget) {
    warnings.push('Google Trends gave no related queries for this comparison.');
    return null;
  }
  return parseRelatedQueries(parseGoogleJson(await request(widgetUrl(widget))), item.topicTitle ?? item.label);
}

const DAY_MS = 86400000;
const today = () => new Date().toISOString().slice(0, 10);

// The last day a weekly or monthly series covers, but not after today.
function lastDayOf(series, resolution) {
  const last = series[series.length - 1]?.date;
  if (!last) return null;
  const start = Date.parse(`${last}T00:00:00Z`);
  const d = new Date(start);
  const end = resolution === 'MONTH' ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) : start + 6 * DAY_MS;
  const day = new Date(end).toISOString().slice(0, 10);
  return day < today() ? day : today();
}

// Daily data for the weekly or monthly series of a group: each item's days are read in windows and
// tied to its long series. Items compared on one scale stay on one scale.
async function dailySeries(request, group, longSeries, resolution, warnings, onProgress) {
  const stitched = [];
  let requests = 0;
  for (const [i, item] of group.items.entries()) {
    const long = longSeries[i];
    const first = long[0]?.date;
    const last = lastDayOf(long, resolution);
    if (!first || !last) {
      stitched.push(long);
      continue;
    }
    const windows = [];
    for (const time of dailyWindows(first, last)) {
      const result = await comparer(request, { ...group.options, time })([item]);
      requests++;
      onProgress?.(requests);
      if (result.resolution !== 'DAY') throw new Error(`Google Trends answered ${result.resolution} data for ${time}, not days.`);
      windows.push(result.series[0]);
    }
    const { series, approximate } = stitchDaily(long, resolution, windows);
    if (approximate > 0) warnings[i].push(`${approximate} of ${windows.length} daily windows had almost no searches and are placed approximately.`);
    stitched.push(series);
  }
  return group.oneScale ? toHundred(stitched) : stitched.map((series) => toHundred([series])[0]);
}

// Loads a group and calls `emit(record)` for every item as soon as its record is ready. With a
// rising-queries memory, only items with rising queries not seen in earlier runs are emitted;
// `onSkip(item)` hears about the others.
export async function loadGroup(request, group, input, { emit, onProgress, memory, onSkip } = {}) {
  // Keyword lists compared on one scale get the finer values for small items; explore links keep
  // Google's own numbers.
  const shared = await compareOnSharedScale(group.items, comparer(request, group.options), { onProgress, refine: group.refine === true });
  const { sources } = shared;
  let { series } = shared;
  const longResolution = sources[0]?.result.resolution;
  const allWarnings = group.items.map(() => []);
  let daily = false;
  if (input.dailyData && (longResolution === 'WEEK' || longResolution === 'MONTH')) {
    series = await dailySeries(request, group, series, longResolution, allWarnings, (n) => onProgress?.(shared.requests + n));
    daily = true;
  }
  const scrapedAt = new Date().toISOString();
  for (const [i, item] of group.items.entries()) {
    const warnings = allWarnings[i];
    const { result, position } = sources[i];
    let regions = null;
    let related = null;
    // A failure of the extra data keeps the record with its timeline and names what is missing.
    if (input.includeRegions) {
      try {
        regions = await loadRegions(request, result.explore.geoMaps[position], item, input.regionResolution, warnings);
      } catch (error) {
        warnings.push(`Interest by region failed: ${error.message}`);
      }
    }
    if (input.includeRelated) {
      try {
        related = await loadRelated(request, result.explore.relatedQueries[position], item, warnings);
      } catch (error) {
        warnings.push(`Related queries failed: ${error.message}`);
      }
    }
    // Only new rising queries: compare with the queries remembered from earlier runs.
    let newRising = null;
    if (memory && related) {
      const key = memoryKeyOf(item, group.options);
      const seen = await memory.load(key);
      newRising = related.rising.filter((row) => !seen.has(row.query.toLowerCase()));
      await memory.save(key, [...seen, ...related.rising.map((row) => row.query.toLowerCase())]);
      if (newRising.length === 0) {
        onSkip?.(item);
        continue;
      }
    }
    await emit(buildReport({ item, group, series: series[i], resolution: daily ? 'DAY' : result.resolution, regions, related, newRising, warnings, scrapedAt }));
  }
}

export function buildReport({ item, group, series, resolution, regions, related, newRising = null, warnings, scrapedAt }) {
  const { time, category, property } = group.options;
  const others = group.oneScale ? group.items.filter((other) => other !== item).map(labelOf) : null;
  const linkItems = group.items.length <= MAX_COMPARE ? group.items : [item];
  return {
    ...EMPTY_REPORT,
    keyword: item.label,
    searchedFor: item.keyword,
    topicTitle: item.topicTitle ?? null,
    topicType: item.topicType ?? null,
    location: item.geo || null,
    locationName: geoName(item.geo),
    timeRange: time,
    timeRangeName: TIME_RANGES[time] ?? 'Custom dates',
    startDate: series[0]?.date ?? null,
    endDate: series[series.length - 1]?.date ?? null,
    resolution,
    category: Number(category) || 0,
    categoryName: categoryName(category),
    searchType: propertyName(property),
    oneScale: group.oneScale,
    comparedWith: others && others.length > 0 ? others : null,
    hasData: series.some((point) => (point.value ?? 0) > 0),
    ...insightsOf(series, resolution),
    topRegion: regions?.[0]?.geoName ?? null,
    topRelatedQuery: related?.top[0]?.query ?? null,
    // Rising lists carry bot traffic; the headline is the first rising query that names the keyword.
    topRisingQuery: related?.rising.find((row) => row.containsKeyword !== false && !row.looksLikeSpam)?.query ?? null,
    interestOverTime: series,
    interestByRegion: regions,
    relatedQueriesTop: related?.top ?? null,
    relatedQueriesRising: related?.rising ?? null,
    newRisingQueries: newRising,
    trendsUrl: trendsPageUrl(linkItems, group.options),
    warnings: warnings.length > 0 ? warnings : null,
    scrapedAt,
  };
}
