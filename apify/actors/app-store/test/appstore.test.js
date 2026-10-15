import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { appsOf, chartUrl, developerUrl, lookupUrl, parseAppId, parseChart, parseDeveloperId, searchUrl, toApp } from '../src/appstore.js';
import { EMPTY_RECORD, lookupApps, readInput, tasksOf } from '../src/sources.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

test('app store: apps, developers and links are read in every form', () => {
  assert.equal(parseAppId('389801252'), '389801252');
  assert.equal(parseAppId('id389801252'), '389801252');
  assert.equal(parseAppId('https://apps.apple.com/gb/app/duolingo-language-lessons/id570060128?mt=8'), '570060128');
  assert.equal(parseAppId('com.spotify.client'), 'com.spotify.client');
  assert.throws(() => parseAppId('instagram'), /App Store link/);
  assert.equal(parseDeveloperId('https://apps.apple.com/us/developer/meta-platforms-inc/id284882218'), '284882218');
  assert.equal(parseDeveloperId('284882218'), '284882218');
  assert.throws(() => parseDeveloperId('Meta'), /developer link/);
});

test('app store: request addresses for charts, searches, lookups and developers', () => {
  assert.equal(chartUrl('top_grossing', '6014', 'JP', 150), 'https://itunes.apple.com/jp/rss/topgrossingapplications/limit=100/genre=6014/json');
  assert.equal(chartUrl('top_free', 'ALL', 'US', 50), 'https://itunes.apple.com/us/rss/topfreeapplications/limit=50/json');
  assert.equal(searchUrl('budget planner', 'GB'), 'https://itunes.apple.com/search?term=budget+planner&country=gb&entity=software&limit=200');
  assert.equal(lookupUrl(['1', '2'], 'US'), 'https://itunes.apple.com/lookup?id=1%2C2&country=us&entity=software');
  assert.equal(lookupUrl(['com.a.b'], 'US'), 'https://itunes.apple.com/lookup?bundleId=com.a.b&country=us&entity=software');
  assert.equal(developerUrl('900001', 'DE'), 'https://itunes.apple.com/lookup?id=900001&country=de&entity=software&limit=200');
});

test('app store: apps in the output format', () => {
  const [free, paid] = appsOf(fixture('search.json'));
  assert.deepEqual([free.appId, free.bundleId, free.title, free.developer, free.developerId], ['1000001', 'com.example.app1000001', 'Example App 1000001', 'Example Studio Ltd', '900001']);
  assert.equal(free.url, 'https://apps.apple.com/us/app/example-app/id1000001');
  assert.equal(free.developerUrl, 'https://apps.apple.com/us/developer/example-studio-ltd/id900001');
  assert.deepEqual([free.score, free.ratingsCount, free.scoreCurrentVersion, free.ratingsCountCurrentVersion], [4.61234, 12345, 4.5, 678]);
  assert.deepEqual([free.free, free.price, free.currency, free.priceText], [true, 0, 'USD', 'Free']);
  assert.deepEqual([paid.free, paid.price, paid.priceText, paid.iPadSupport], [false, 2.99, '$2.99', false]);
  assert.deepEqual([free.sizeBytes, free.minIosVersion, free.iPadSupport, free.genreId, free.categories], [123456789, '16.0', true, '6007', ['Productivity', 'Business']]);
  // Every key of a record is one the output declares.
  assert.deepEqual(Object.keys(free).filter((key) => !(key in EMPTY_RECORD)), []);
  // A developer lookup starts with the developer, which is no app.
  assert.deepEqual(appsOf(fixture('developer.json')).map((app) => app.appId), ['1000001']);
  assert.equal(toApp({ trackId: 5, price: '' }).free, null);
});

test('app store: a chart is looked up in its order, apps missing in the country are left out', async () => {
  assert.deepEqual(parseChart(fixture('chart.json')), ['1000002', '1000001', '1000003']);
  assert.deepEqual(parseChart({ feed: { entry: { id: { attributes: { 'im:id': '7' } } } } }), ['7']);
  const urls = [];
  const fetchJson = async (url) => { urls.push(url); return url.includes('bundleId') ? { results: [fixture('search.json').results[1]] } : fixture('search.json'); };
  const apps = await lookupApps(fetchJson, ['1000002', '1000003', 'com.example.APP1000002', '1000001'], 'US');
  assert.deepEqual(apps.map((app) => app.appId), ['1000002', '1000002', '1000001']);
  // Numeric ids and bundle ids go in separate requests; 250 ids take three requests.
  assert.equal(urls.length, 2);
  urls.length = 0;
  await lookupApps(fetchJson, Array.from({ length: 250 }, (_, i) => String(i + 1)), 'US');
  assert.equal(urls.length, 3);
});

test('app store: the input becomes sources for every country, an empty input scrapes the example', async () => {
  const warnings = [];
  const input = readInput({ charts: ['top_free'], chartGenres: ['6014', 'all'], countries: ['us', 'jp'], searchTerms: ['notes', 'notes'], developers: ['284882218', 'Meta'], appIds: ['389801252', 'nope'], chartDepth: 20 }, (text) => warnings.push(text));
  assert.equal(warnings.length, 2);
  assert.deepEqual([input.countries, input.chartGenres, input.searchTerms, input.appIds], [['US', 'JP'], ['6014', 'ALL'], ['notes'], ['389801252']]);
  const urls = [];
  const fetchJson = async (url) => { urls.push(url); return url.includes('/rss/') ? fixture('chart.json') : fixture('search.json'); };
  const tasks = tasksOf(input, fetchJson);
  assert.deepEqual(tasks.map((task) => `${task.country} ${task.context.source}`), ['US app', 'US search', 'US chart', 'US chart', 'US developer', 'JP app', 'JP search', 'JP chart', 'JP chart', 'JP developer']);
  const chart = tasks.find((task) => task.context.source === 'chart');
  assert.deepEqual(chart.context, { source: 'chart', chart: 'top_free', chartGenre: 'Games' });
  assert.deepEqual((await chart.load()).map((app) => app.appId), ['1000002', '1000001']);
  assert.match(urls[0], /\/us\/rss\/topfreeapplications\/limit=20\/genre=6014\/json$/);
  assert.deepEqual(readInput({}, () => {}).charts, ['top_free']);
  assert.throws(() => readInput({ charts: ['top_everything'] }), /Unknown chart/);
  assert.throws(() => readInput({ charts: ['top_free'], chartGenres: ['9999'] }), /Unknown category/);
  assert.throws(() => readInput({ searchTerms: ['x'], countries: ['USA'] }), /Invalid country/);
});
