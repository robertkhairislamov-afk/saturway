import { Actor, log } from 'apify';

import { createTrendsClient } from './http.js';
import { loadGroup } from './report.js';
import { EMPTY_TRENDING, comparisonGroups, needsTopicLookup, readInput } from './sources.js';
import { autocompleteUrl, geoName, parseGoogleJson, parseTopics, parseTrending, trendingRequest } from './trends.js';

// Pay-per-event: one event per interest record (keyword and location) and per trending search.
const REPORT_EVENT = 'keyword-report';
const TRENDING_EVENT = 'trending-search';

await Actor.init();

try {
  const input = readInput((await Actor.getInput()) ?? {}, (message) => log.warning(message));
  const useProxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length;
  const proxy = useProxy ? await Actor.createProxyConfiguration(input.proxyConfiguration) : undefined;
  const onResidential = input.proxyConfiguration?.apifyProxyGroups?.includes('RESIDENTIAL');
  const client = createTrendsClient({
    proxyConfiguration: proxy,
    // Direct requests fall back to Apify Proxy; datacenter addresses fall back to residential ones.
    fallbackProxy: onResidential ? undefined : () => Actor.createProxyConfiguration(proxy ? { groups: ['RESIDENTIAL'] } : { useApifyProxy: true }),
    onFallback: () => log.info(`Google Trends keeps limiting these addresses; continuing through ${proxy ? 'residential proxies' : 'Apify Proxy'}.`),
  });
  const request = (url, options) => client.request(url, options);
  const charging = Actor.getChargingManager();
  const roomFor = (event) => charging.calculateMaxEventChargeCountWithinLimit(event);
  const summary = [];
  let reports = 0;
  let trending = 0;
  let stopped = false;
  const status = (text) => Actor.setStatusMessage(`${reports} keyword reports, ${trending} trending searches saved. ${text}`).catch(() => {});

  // Keywords as Google topics when asked: "coffee" becomes the topic "Coffee (Beverage)".
  const terms = [];
  for (const keyword of input.keywords) {
    if (!needsTopicLookup(keyword, input)) {
      terms.push({ keyword, label: keyword });
      continue;
    }
    try {
      const [topic] = parseTopics(parseGoogleJson(await request(autocompleteUrl(keyword))));
      if (topic) {
        terms.push({ keyword: topic.id, label: keyword, topicTitle: topic.title, topicType: topic.type });
        log.info(`"${keyword}" → topic "${topic.title}" (${topic.type}).`);
      } else {
        log.warning(`Google has no topic for "${keyword}"; searching it as a search term.`);
        terms.push({ keyword, label: keyword });
      }
    } catch (error) {
      log.warning(`Topic lookup for "${keyword}" failed (${error.message}); searching it as a search term.`);
      terms.push({ keyword, label: keyword });
    }
  }

  const groups = comparisonGroups(input, terms);
  log.info(`${groups.length} comparison(s), ${input.trendingLocations.length} trending list(s).`);
  for (const [index, group] of groups.entries()) {
    const room = roomFor(REPORT_EVENT);
    if (room <= 0) {
      stopped = true;
      break;
    }
    if (group.items.length > room) {
      log.warning(`Only ${room} more keyword report(s) fit the maximum charge of this run; comparing the first ${room}.`);
      group.items = group.items.slice(0, room);
    }
    let saved = 0;
    try {
      await status(`Comparison ${index + 1} of ${groups.length}: ${group.label}.`);
      await loadGroup(request, group, input, {
        onProgress: (n) => status(`Comparison ${index + 1} of ${groups.length}: ${group.label}, ${n} request(s) so far.`),
        emit: async (record) => {
          if (stopped) return;
          const result = await Actor.pushData(record, REPORT_EVENT);
          if (result?.eventChargeLimitReached) stopped = true;
          saved++;
          reports++;
        },
      });
      summary.push({ source: group.label, saved, error: null });
      if (groups.length <= 20 || (index + 1) % 10 === 0) log.info(`${group.label}: ${saved} record(s), ${reports} in total.`);
    } catch (error) {
      summary.push({ source: group.label, saved, error: error.message });
      log.warning(`${group.label}: ${error.message}`);
    }
    if (stopped) break;
  }

  for (const geo of input.trendingLocations) {
    if (stopped || roomFor(TRENDING_EVENT) <= 0) {
      stopped = true;
      break;
    }
    const label = `trending now in ${geoName(geo)}, past ${input.trendingHours} hours`;
    try {
      await status(`Loading ${label}.`);
      const { url, body } = trendingRequest(geo, input.trendingHours);
      let rows = parseTrending(await request(url, { method: 'POST', body, contentType: 'application/x-www-form-urlencoded;charset=UTF-8' }), { geo, hours: input.trendingHours });
      const found = rows.length;
      if (input.trendingActiveOnly) rows = rows.filter((row) => row.isActive);
      if (input.trendingCategories.length > 0) rows = rows.filter((row) => row.categories.some((name) => input.trendingCategories.includes(name)));
      if (input.maxTrendingPerLocation > 0) rows = rows.slice(0, input.maxTrendingPerLocation);
      rows = rows.slice(0, Math.max(0, roomFor(TRENDING_EVENT)));
      const scrapedAt = new Date().toISOString();
      const records = rows.map((row) => ({ ...EMPTY_TRENDING, location: geo, locationName: geoName(geo), hours: input.trendingHours, ...row, scrapedAt }));
      if (records.length > 0) await Actor.pushData(records, TRENDING_EVENT);
      trending += records.length;
      summary.push({ source: label, saved: records.length, error: null });
      log.info(`${label}: ${found} trending search(es), ${records.length} saved.`);
    } catch (error) {
      summary.push({ source: label, saved: 0, error: error.message });
      log.warning(`${label}: ${error.message}`);
    }
  }
  if (stopped) log.info('Reached the maximum charge for this run; stopping.');

  await Actor.setValue('SUMMARY', { keywordReports: reports, trendingSearches: trending, sources: summary, requests: client.stats });
  const failed = summary.filter((row) => row.error);
  if (summary.length > 0 && failed.length === summary.length) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} comparisons failed. First error: ${failed[0].error}`);
  }
  const parts = [];
  if (groups.length > 0) parts.push(`${reports} keyword report(s)`);
  if (input.trendingLocations.length > 0) parts.push(`${trending} trending search(es)`);
  const message = `Saved ${parts.join(' and ')}${failed.length > 0 ? `; ${failed.length} failed: ${failed.map((row) => row.source).join(', ').slice(0, 300)}` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
