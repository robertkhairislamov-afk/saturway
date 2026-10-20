import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compareOnSharedScale,
  containsKeyword,
  insightsOf,
  looksLikeSpam,
  parseExplore,
  parseExploreLink,
  parseGeoMap,
  parseGoogleJson,
  parseRelatedQueries,
  parseTimeline,
  parseTopics,
  parseTrending,
  pointDate,
  trendsPageUrl,
  widgetUrl,
} from '../src/trends.js';

// Synthetic answers in the shape Google Trends uses; the values are made up.
const GUARD = ")]}'\n";

test('parseGoogleJson strips the guard and ignores trailing data', () => {
  assert.deepEqual(parseGoogleJson(`${GUARD}{"a":1}`), { a: 1 });
  assert.deepEqual(parseGoogleJson(`${GUARD}{"a":"}"}\n{"b":2}`), { a: '}' });
  assert.throws(() => parseGoogleJson('<html>error</html>'), /Expected JSON/);
});

const widget = (id, request = {}) => ({ id, token: `tok-${id}`, request: { resolution: 'WEEK', ...request } });

test('parseExplore maps single and multiple items to their widgets', () => {
  const single = parseExplore({ widgets: [widget('TIMESERIES'), widget('GEO_MAP'), widget('RELATED_TOPICS'), widget('RELATED_QUERIES')] }, 1);
  assert.equal(single.timeline.id, 'TIMESERIES');
  assert.deepEqual(single.geoMaps.map((w) => w.id), ['GEO_MAP']);
  assert.deepEqual(single.relatedQueries.map((w) => w.id), ['RELATED_QUERIES']);
  const multi = parseExplore({
    widgets: [widget('TIMESERIES'), widget('GEO_MAP'), { id: 'TITLE_0', text: 'a' }, widget('GEO_MAP_0'), widget('RELATED_QUERIES_0'), widget('GEO_MAP_1')],
  }, 2);
  assert.deepEqual(multi.geoMaps.map((w) => w.id), ['GEO_MAP_0', 'GEO_MAP_1']);
  assert.deepEqual(multi.relatedQueries.map((w) => w?.id ?? null), ['RELATED_QUERIES_0', null]);
  assert.throws(() => parseExplore({}, 1), /no explore widgets/);
});

test('widgetUrl picks the data path and may change only the map resolution', () => {
  const url = new URL(widgetUrl(widget('GEO_MAP_1', { resolution: 'REGION' }), { resolution: 'CITY' }));
  assert.equal(url.pathname, '/trends/api/widgetdata/comparedgeo');
  assert.equal(JSON.parse(url.searchParams.get('req')).resolution, 'CITY');
  assert.equal(url.searchParams.get('token'), 'tok-GEO_MAP_1');
  assert.match(widgetUrl(widget('TIMESERIES')), /widgetdata\/multiline\?/);
  assert.match(widgetUrl(widget('RELATED_QUERIES_0')), /widgetdata\/relatedsearches\?/);
});

test('parseTimeline splits values per item, keeps gaps and the partial flag', () => {
  const json = {
    default: {
      timelineData: [
        { time: '1704067200', value: [50, 0], hasData: [true, false] },
        { time: '1704672000', value: [100, 3], hasData: [true, true], isPartial: true },
      ],
    },
  };
  const [a, b] = parseTimeline(json, 2, 'WEEK');
  assert.deepEqual(a, [{ date: '2024-01-01', value: 50, isPartial: false }, { date: '2024-01-08', value: 100, isPartial: true }]);
  assert.equal(b[0].value, null);
  assert.equal(b[1].value, 3);
  assert.equal(pointDate('1704067200', 'HOUR'), '2024-01-01T00:00:00Z');
});

test('parseGeoMap sorts regions, drops regions without data, keeps city coordinates', () => {
  const rows = parseGeoMap({
    default: {
      geoMapData: [
        { geoCode: 'XX-A', geoName: 'Region A', value: [40], hasData: [true] },
        { geoCode: 'XX-B', geoName: 'Region B', value: [100], hasData: [true] },
        { geoCode: 'XX-C', geoName: 'Region C', value: [0], hasData: [false] },
        { coordinates: { lat: 1.5, lng: 2.5 }, geoName: 'Town', value: [7], hasData: [true] },
      ],
    },
  });
  assert.deepEqual(rows.map((r) => r.geoName), ['Region B', 'Region A', 'Town']);
  assert.deepEqual(rows[2], { geoCode: null, geoName: 'Town', value: 7, lat: 1.5, lng: 2.5 });
});

test('parseRelatedQueries reads top and rising lists with flags', () => {
  const related = parseRelatedQueries({
    default: {
      rankedList: [
        { rankedKeyword: [{ query: 'green widget', value: 100, link: '/trends/explore?q=green+widget' }] },
        {
          rankedKeyword: [
            { query: 'widget repair', value: 5000, formattedValue: 'Breakout', link: '/trends/explore?q=widget+repair' },
            { query: 'gardening ideas', value: 300, formattedValue: '+300%' },
            { query: 'widget casino 🇨🇦 example.lol', value: 250, formattedValue: '+250%' },
          ],
        },
      ],
    },
  }, 'widget');
  assert.deepEqual(related.top, [{ query: 'green widget', value: 100, containsKeyword: true, exploreUrl: 'https://trends.google.com/trends/explore?q=green+widget' }]);
  assert.equal(related.rising[0].isBreakout, true);
  assert.equal(related.rising[0].increasePercent, 5000);
  assert.equal(related.rising[1].containsKeyword, false);
  assert.equal(related.rising[1].increase, '+300%');
  assert.equal(related.rising[2].looksLikeSpam, true);
  assert.equal(related.rising[0].looksLikeSpam, false);
});

test('containsKeyword and looksLikeSpam', () => {
  assert.equal(containsKeyword('Café near me', 'cafe'), true);
  assert.equal(containsKeyword('cold brew recipe', 'cold brew coffee'), true);
  assert.equal(containsKeyword('pet care tips', 'coffee'), false);
  assert.equal(containsKeyword('anything', ''), null);
  assert.equal(looksLikeSpam('bitcoin casino ausino.space'), true);
  assert.equal(looksLikeSpam('visit https://x.y'), true);
  assert.equal(looksLikeSpam('node.js tutorial'), false);
  assert.equal(looksLikeSpam('iphone 17 price'), false);
});

test('parseTopics reads autocomplete topics', () => {
  assert.deepEqual(parseTopics({ default: { topics: [{ mid: '/m/0abc', title: 'Widget', type: 'Product' }] } }), [{ id: '/m/0abc', title: 'Widget', type: 'Product' }]);
  assert.deepEqual(parseTopics({}), []);
});

// --- Shared scale -----------------------------------------------------------------------------------

// Hidden "true" search volumes; the fake Google scales each request so its highest point is 100 and
// rounds to whole numbers, like the real one.
function fakeGoogle(truth) {
  let calls = 0;
  const compare = async (items) => {
    calls++;
    assert.ok(items.length <= 5, 'Google compares at most five items');
    const top = Math.max(...items.flatMap((item) => truth[item.keyword]));
    return { series: items.map((item) => truth[item.keyword].map((v, i) => ({ date: `d${i}`, value: Math.round((v / top) * 100), isPartial: false }))) };
  };
  return { compare, calls: () => calls };
}

const wave = (base, n = 30) => Array.from({ length: n }, (_, i) => base * (1 + 0.3 * Math.sin(i / 3)));

test('compareOnSharedScale matches a joint comparison of all items', async () => {
  const truth = {};
  const sizes = [100, 70, 55, 40, 30, 22, 15, 9, 5, 2.5, 1.2, 0.5];
  sizes.forEach((size, i) => { truth[`k${i}`] = wave(size); });
  const items = Object.keys(truth).map((keyword) => ({ keyword }));
  const google = fakeGoogle(truth);
  const { series, sources, requests } = await compareOnSharedScale(items, google.compare);
  assert.equal(requests, google.calls());
  const top = Math.max(...Object.values(truth).flat());
  items.forEach((item, i) => {
    const expected = truth[item.keyword].map((v) => Math.round((v / top) * 100));
    series[i].forEach((point, j) => assert.ok(Math.abs(point.value - expected[j]) <= 1, `${item.keyword} point ${j}: ${point.value} vs ${expected[j]}`));
    assert.ok(sources[i].result && Number.isInteger(sources[i].position));
  });
  assert.equal(Math.max(...series.flatMap((s) => s.map((p) => p.value))), 100);
});

test('refine gives small items decimals close to the truth', async () => {
  const truth = { big: wave(1000), mid: wave(60), small: wave(3), tiny: wave(0.4), none: wave(0) };
  const items = Object.keys(truth).map((keyword) => ({ keyword }));
  const top = Math.max(...Object.values(truth).flat());
  const plain = await compareOnSharedScale(items, fakeGoogle(truth).compare);
  const fine = await compareOnSharedScale(items, fakeGoogle(truth).compare, { refine: true });
  const error = (result, i, key) => {
    const exact = truth[key].map((v) => (v / top) * 100);
    return result.series[i].reduce((sum, p, j) => sum + Math.abs(p.value - exact[j]), 0) / exact.length;
  };
  // "tiny" is below 0.5 on the shared scale: Google shows only zeros; refined values are close.
  assert.ok(plain.series[3].every((p) => p.value === 0));
  assert.ok(fine.series[3].some((p) => p.value > 0));
  assert.ok(error(fine, 3, 'tiny') < 0.01, `tiny error ${error(fine, 3, 'tiny')}`);
  assert.ok(error(fine, 2, 'small') < error(plain, 2, 'small'));
  assert.ok(fine.series[4].every((p) => p.value === 0));
  assert.ok(fine.requests > plain.requests);
});

// --- Insights -----------------------------------------------------------------------------------------

const weekly = (values, start = '2023-01-01') => values.map((value, i) => ({
  date: new Date(Date.parse(`${start}T00:00:00Z`) + i * 7 * 86400000).toISOString().slice(0, 10),
  value,
  isPartial: false,
}));

test('insightsOf finds peak, latest complete point, change and direction', () => {
  const series = weekly([10, 20, 30, 40, 50, 60, 70, 80]);
  series.push({ date: '2023-03-05', value: 5, isPartial: true });
  const out = insightsOf(series, 'WEEK');
  assert.equal(out.peakInterest, 80);
  assert.equal(out.peakDate, series[7].date);
  assert.equal(out.latestInterest, 80);
  assert.equal(out.averageInterest, 45);
  assert.equal(out.recentChangePercent, 160); // (65 - 25) / 25
  assert.equal(out.trendDirection, 'rising');
  assert.equal(out.bestMonth, null);
});

test('insightsOf reads season and year over year from long series', () => {
  // Three years of weekly data with a peak in December and growth in the last year.
  const values = [];
  for (let i = 0; i < 157; i++) {
    const month = new Date(Date.parse('2022-01-02T00:00:00Z') + (i * 7 + 3) * 86400000).getUTCMonth();
    values.push((month === 11 ? 90 : 40) * (i >= 105 ? 1.5 : 1));
  }
  const out = insightsOf(weekly(values, '2022-01-02'), 'WEEK');
  assert.equal(out.bestMonth, 'December');
  assert.ok(out.seasonalityPercent > 50);
  assert.ok(out.yearOverYearPercent > 40 && out.yearOverYearPercent < 60, `yoy ${out.yearOverYearPercent}`);
});

test('insightsOf handles empty and flat series', () => {
  assert.equal(insightsOf([], 'WEEK').averageInterest, null);
  const flat = insightsOf(weekly([0, 0, 0, 0]), 'WEEK');
  assert.equal(flat.averageInterest, 0);
  assert.equal(flat.trendDirection, null);
  assert.equal(flat.recentChangePercent, null);
  assert.equal(insightsOf(weekly([50, 50, 50, 50]), 'WEEK').trendDirection, 'stable');
});

// --- Links --------------------------------------------------------------------------------------------

test('parseExploreLink reads terms, places, dates, category and search type', () => {
  const one = parseExploreLink('https://trends.google.com/trends/explore?date=today%205-y&geo=GB&q=alpha,beta&cat=71&gprop=youtube');
  assert.deepEqual(one, { items: [{ keyword: 'alpha', geo: 'GB' }, { keyword: 'beta', geo: 'GB' }], time: 'today 5-y', category: 71, property: 'youtube' });
  const multi = parseExploreLink('https://trends.google.de/trends/explore?q=alpha,alpha&geo=US,DE');
  assert.deepEqual(multi.items, [{ keyword: 'alpha', geo: 'US' }, { keyword: 'alpha', geo: 'DE' }]);
  assert.equal(multi.time, 'today 12-m');
  assert.throws(() => parseExploreLink('https://example.com/trends/explore?q=a'), /not a Google Trends/);
  assert.throws(() => parseExploreLink('https://trends.google.com/trends/explore?geo=US'), /no search terms/);
  assert.throws(() => parseExploreLink('https://trends.google.com/trends/explore?q=a,b,c,d,e,f'), /at most 5/);
});

test('trendsPageUrl links to the same comparison', () => {
  const url = new URL(trendsPageUrl([{ keyword: 'a', geo: 'US' }, { keyword: 'b', geo: 'GB' }], { time: 'today 3-m', category: 5, property: 'news' }));
  assert.equal(url.searchParams.get('geo'), 'US,GB');
  assert.equal(url.searchParams.get('q'), 'a,b');
  assert.equal(url.searchParams.get('cat'), '5');
  assert.equal(url.searchParams.get('gprop'), 'news');
  assert.equal(new URL(trendsPageUrl([{ keyword: 'a', geo: '' }], { time: 'all' })).searchParams.get('geo'), null);
});

// --- Trending now ---------------------------------------------------------------------------------------

test('parseTrending reads the trending list', () => {
  const rows = [
    ['widget launch', null, 'US', [1700000000], null, null, 200000, null, 1000, ['widget launch', 'widget news'], [18, 3], [[1, 'en', 'US']], 'widget launch'],
    ['old story', null, 'US', [1699990000], [1700001000], null, 500, null, 100, ['old story'], [11], [], 'old story'],
  ];
  const text = `${GUARD}\n${JSON.stringify([['wrb.fr', 'i0OFE', JSON.stringify([null, rows]), null, null, null, 'generic'], ['di', 40]])}\n`;
  const out = parseTrending(text, { geo: 'US', hours: 24 });
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    rank: 1,
    term: 'widget launch',
    searchVolume: 200000,
    searchVolumeText: '200K+',
    increasePercent: 1000,
    startedAt: '2023-11-14T22:13:20.000Z',
    endedAt: null,
    isActive: true,
    categories: ['Technology', 'Business and Finance'],
    relatedSearches: ['widget news'],
    exploreUrl: 'https://trends.google.com/trends/explore?date=now+1-d&geo=US&q=widget+launch&hl=en-US',
  });
  assert.equal(out[1].isActive, false);
  assert.equal(out[1].searchVolumeText, '500+');
  assert.throws(() => parseTrending(`${GUARD}[["di",1]]`, { geo: 'US', hours: 24 }), /no trending/);
});
