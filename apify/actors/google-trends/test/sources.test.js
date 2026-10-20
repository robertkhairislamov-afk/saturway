import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_REPORT, EXAMPLE_INPUT, comparisonGroups, parseLocation, parseTimeRange, readInput } from '../src/sources.js';
import { buildReport } from '../src/report.js';

test('parseLocation accepts codes, names and worldwide', () => {
  assert.equal(parseLocation('us'), 'US');
  assert.equal(parseLocation('US-CA'), 'US-CA');
  assert.equal(parseLocation('Germany'), 'DE');
  assert.equal(parseLocation('California'), 'US-CA');
  assert.equal(parseLocation('Worldwide'), '');
  assert.equal(parseLocation(''), '');
  assert.throws(() => parseLocation('Atlantis'), /Unknown location/);
});

test('parseTimeRange accepts presets and custom dates', () => {
  assert.equal(parseTimeRange({}), 'today 12-m');
  assert.equal(parseTimeRange({ timeRange: 'now 7-d' }), 'now 7-d');
  assert.equal(parseTimeRange({ timeRange: 'custom', startDate: '2024-01-01', endDate: '2024-03-31' }), '2024-01-01 2024-03-31');
  assert.equal(parseTimeRange({ timeRange: '2020-01-01 2020-12-31' }), '2020-01-01 2020-12-31');
  assert.throws(() => parseTimeRange({ timeRange: 'custom', startDate: '2003-01-01', endDate: '2004-03-31' }), /2004-01-01/);
  assert.throws(() => parseTimeRange({ timeRange: 'custom', startDate: '2024-05-01', endDate: '2024-03-31' }), /before/);
  assert.throws(() => parseTimeRange({ timeRange: 'yesterday' }), /Unknown time range/);
});

test('readInput falls back to the example and validates fields', () => {
  const warnings = [];
  const input = readInput({}, (message) => warnings.push(message));
  assert.deepEqual(input.keywords, EXAMPLE_INPUT.keywords);
  assert.deepEqual(input.locations, ['US']);
  assert.equal(warnings.length, 1);
  const full = readInput({
    keywords: ['a', 'a', ' b '],
    locations: [],
    category: '71',
    searchType: 'youtube',
    regionResolution: 'city',
    exploreUrls: ['https://trends.google.com/trends/explore?q=x&geo=Germany', 'nope'],
    trendingLocations: ['gb'],
    trendingCategories: ['sports', '18'],
  }, (message) => warnings.push(message));
  assert.deepEqual(full.keywords, ['a', 'b']);
  assert.deepEqual(full.locations, ['']);
  assert.equal(full.property, 'youtube');
  assert.equal(full.regionResolution, 'CITY');
  assert.deepEqual(full.exploreLinks[0].items, [{ keyword: 'x', geo: 'DE' }]);
  assert.equal(full.exploreLinks.length, 1);
  assert.deepEqual(full.trendingLocations, ['GB']);
  assert.deepEqual(full.trendingCategories, ['Sports', 'Technology']);
  assert.throws(() => readInput({ keywords: ['a'], category: '99999' }), /Unknown category/);
  assert.throws(() => readInput({ trendingLocations: ['Worldwide'] }), /needs a country/);
  assert.throws(() => readInput({ trendingLocations: ['US'], trendingHours: 12 }), /trendingHours/);
});

test('comparisonGroups compares each pair alone or all on one scale', () => {
  const terms = [{ keyword: 'a', label: 'a' }, { keyword: '/m/0b', label: 'b', topicTitle: 'B' }];
  const separate = comparisonGroups(readInput({ keywords: ['a', 'b'], locations: ['US', 'GB'] }), terms);
  assert.equal(separate.length, 4);
  assert.ok(separate.every((g) => g.items.length === 1 && !g.oneScale));
  const together = comparisonGroups(readInput({ keywords: ['a', 'b'], locations: ['US', 'GB'], compareOnOneScale: true }), terms);
  assert.equal(together.length, 1);
  assert.equal(together[0].items.length, 4);
  assert.equal(together[0].refine, true);
  const links = comparisonGroups(readInput({ exploreUrls: ['https://trends.google.com/trends/explore?q=x,y&date=all'] }), []);
  assert.equal(links.length, 1);
  assert.equal(links[0].options.time, 'all');
  assert.equal(links[0].oneScale, true);
  assert.notEqual(links[0].refine, true);
});

test('buildReport fills every field in a fixed order', () => {
  const item = { keyword: '/m/0b', label: 'b', topicTitle: 'B', topicType: 'Thing', geo: 'GB' };
  const other = { keyword: 'a', label: 'a', geo: '' };
  const group = { items: [item, other], options: { time: 'today 12-m', category: 0, property: '' }, oneScale: true };
  const series = [{ date: '2024-01-07', value: 10, isPartial: false }, { date: '2024-01-14', value: 20, isPartial: true }];
  const record = buildReport({
    item,
    group,
    series,
    resolution: 'WEEK',
    regions: [{ geoCode: 'GB-ENG', geoName: 'England', value: 100 }],
    related: { top: [{ query: 'b c', value: 100 }], rising: [{ query: 'spam.lol', containsKeyword: false, looksLikeSpam: true }, { query: 'b d', containsKeyword: true, looksLikeSpam: false }] },
    warnings: [],
    scrapedAt: 'now',
  });
  assert.deepEqual(Object.keys(record), Object.keys(EMPTY_REPORT));
  assert.equal(record.locationName, 'United Kingdom');
  assert.deepEqual(record.comparedWith, ['a (Worldwide)']);
  assert.equal(record.latestInterest, 10);
  assert.equal(record.topRegion, 'England');
  assert.equal(record.topRisingQuery, 'b d');
  assert.equal(record.warnings, null);
  assert.equal(record.timeRangeName, 'Past 12 months');
  assert.match(record.trendsUrl, /q=%2Fm%2F0b%2Ca/);
});
