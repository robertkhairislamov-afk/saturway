import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  at,
  chartRequestBody,
  nextPageRequestBody,
  parseAppId,
  parseAppPage,
  parseBatchResponse,
  parseChartResponse,
  parseDeveloper,
  parseDeveloperPage,
  parseNextPageResponse,
  parseSearchPage,
} from '../src/play.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('at reads nested paths and fields kept in a trailing object', () => {
  assert.equal(at([1, [2, 3]], [1, 0]), 2);
  assert.equal(at([1, [2, 3]], [5, 0]), undefined);
  assert.equal(at(['a', { 141: 'x' }], [140]), 'x');
  assert.equal(at([null], [0, 1]), undefined);
});

test('parseAppId and parseDeveloper accept names, IDs and links', () => {
  assert.equal(parseAppId('com.spotify.music'), 'com.spotify.music');
  assert.equal(parseAppId('https://play.google.com/store/apps/details?id=com.whatsapp&hl=en'), 'com.whatsapp');
  assert.throws(() => parseAppId('spotify'), /not a Google Play app ID/);
  assert.deepEqual(parseDeveloper('Spotify AB'), { name: 'Spotify AB' });
  assert.deepEqual(parseDeveloper('5700313618786177705'), { id: '5700313618786177705' });
  assert.deepEqual(parseDeveloper('https://play.google.com/store/apps/developer?id=Google+LLC'), { name: 'Google LLC' });
  assert.deepEqual(parseDeveloper('https://play.google.com/store/apps/dev?id=5700313618786177705'), { id: '5700313618786177705' });
});

test('parseAppPage reads a free app with in-app purchases and ads', () => {
  const app = parseAppPage(fixture('app-spotify.html'));
  assert.equal(app.appId, 'com.spotify.music');
  assert.equal(app.title, 'Spotify: Music and Podcasts');
  assert.equal(app.developer, 'Spotify AB');
  assert.equal(app.developerEmail, 'support@spotify.com');
  assert.equal(app.developerUrl, 'https://play.google.com/store/apps/developer?id=Spotify+AB');
  assert.equal(app.genreId, 'MUSIC_AND_AUDIO');
  assert.equal(app.installs, '1,000,000,000+');
  assert.ok(app.maxInstalls > app.minInstalls);
  assert.ok(app.score > 4 && app.score < 5);
  assert.equal(Object.keys(app.histogram).length, 5);
  assert.ok(app.ratingsCount > app.reviewsCount);
  assert.deepEqual([app.free, app.price, app.currency, app.priceText], [true, 0, 'USD', 'Free']);
  assert.equal(app.offersInAppPurchases, true);
  assert.equal(app.containsAds, true);
  assert.equal(app.releasedAt, '2014-05-27');
  assert.match(app.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(app.version, 'Varies with device');
  assert.ok(app.description.startsWith('With the Spotify music and podcast app'));
  assert.equal(app.screenshots.length, 2);
  assert.ok(!('developerAddress' in app));
});

test('parseAppPage reads a paid game with version, video and categories', () => {
  const app = parseAppPage(fixture('app-geometry-dash.html'));
  assert.deepEqual([app.free, app.price, app.currency, app.priceText], [false, 3.99, 'USD', '$3.99']);
  assert.equal(app.version, '2.2.144');
  assert.equal(app.minAndroidVersion, '6.0');
  assert.match(app.videoUrl, /^https:\/\/play\.google\.com\/video\//);
  assert.equal(app.contentRatingDescription, 'Fantasy Violence, Mild Blood');
  assert.deepEqual(app.categories.map((category) => category.id), ['GAME_ACTION', 'GAME_ARCADE']);
  assert.throws(() => parseAppPage('<html></html>'), /no app data/);
});

test('parseSearchPage and parseChartResponse read ranked app lists', () => {
  const results = parseSearchPage(fixture('search.html'));
  assert.equal(results.length, 5);
  assert.equal(results[0].appId, 'musicplayer.musicapps.music.mp3player');
  assert.equal(results[0].summary, null);
  assert.ok(results[0].description.length > 200);
  assert.ok(!results[0].description.includes('<br>'));
  const chart = parseChartResponse(fixture('chart.txt'));
  assert.equal(chart.length, 5);
  for (const app of chart) {
    assert.match(app.appId, /\./);
    assert.ok(app.title && app.developer && app.installs && app.description);
  }
});

test('developer catalogs page with a token', () => {
  const first = parseDeveloperPage(fixture('developer.html'));
  assert.equal(first.apps.length, 3);
  assert.equal(first.apps[0].developer, 'Google LLC');
  assert.ok(first.token.length > 20);
  const next = parseNextPageResponse(fixture('developer-next.txt'));
  assert.equal(next.apps.length, 3);
  assert.ok(next.apps.every((app) => app.appId && app.title && app.developer === 'Google LLC'));
});

test('request bodies carry the chart, category, depth and token', () => {
  const chart = decodeURIComponent(chartRequestBody('topgrossing', 'GAME_PUZZLE', 150).replace(/\+/g, ' '));
  assert.match(chart, /^f\.req=\[\[\["vyAe2"/);
  assert.match(chart, /\[2,\\"topgrossing\\",\\"GAME_PUZZLE\\"\]/);
  assert.match(chart, /\[8,\[20,150\]\]/);
  const page = decodeURIComponent(nextPageRequestBody('TOKEN123').replace(/\+/g, ' '));
  assert.match(page, /qnKhOb/);
  assert.match(page, /\\"TOKEN123\\"/);
  assert.throws(() => parseBatchResponse(')]}\'\n[["wrb.fr","vyAe2",null,null,null,[3],"generic"]]', 'vyAe2'), /rejected/);
});
