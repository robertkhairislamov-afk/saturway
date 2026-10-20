// Loads one comparison group from Google Trends and turns it into interest records: the timeline,
// the insights, interest by region and related queries of every keyword and location.

import { EMPTY_REPORT } from './sources.js';
import {
  MAX_COMPARE,
  TIME_RANGES,
  categoryName,
  compareOnSharedScale,
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

// Loads a group and calls `emit(record)` for every item as soon as its record is ready.
export async function loadGroup(request, group, input, { emit, onProgress } = {}) {
  // Keyword lists compared on one scale get the finer values for small items; explore links keep
  // Google's own numbers.
  const { series, sources } = await compareOnSharedScale(group.items, comparer(request, group.options), { onProgress, refine: group.refine === true });
  const scrapedAt = new Date().toISOString();
  for (const [i, item] of group.items.entries()) {
    const warnings = [];
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
    await emit(buildReport({ item, group, series: series[i], resolution: result.resolution, regions, related, warnings, scrapedAt }));
  }
}

export function buildReport({ item, group, series, resolution, regions, related, warnings, scrapedAt }) {
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
    trendsUrl: trendsPageUrl(linkItems, group.options),
    warnings: warnings.length > 0 ? warnings : null,
    scrapedAt,
  };
}
