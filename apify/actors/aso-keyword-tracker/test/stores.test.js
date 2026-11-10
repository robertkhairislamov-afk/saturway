import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { APPLE_STOREFRONTS, appleResults, appleSuggestions, appleWebOrder, competition, installsNumber, parseTrackedApp, playResults, playSuggestions } from '../src/stores.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('the store code is the same as in the Google Play and App Store Scrapers', () => {
  const same = [['play.js', 'google-play/src/play.js'], ['chart-request.json', 'google-play/src/chart-request.json'], ['play-http.js', 'google-play/src/http.js'], ['appstore.js', 'app-store/src/appstore.js'], ['apple-http.js', 'app-store/src/http.js']];
  for (const [mine, theirs] of same) {
    assert.equal(readFileSync(new URL(`../src/${mine}`, import.meta.url), 'utf8'), readFileSync(new URL(`../../${theirs}`, import.meta.url), 'utf8'), mine);
  }
});

test('Google Play: ranked search results and search box suggestions', () => {
  const rows = playResults(fixture('play-search.html'));
  assert.ok(rows.length > 0);
  assert.deepEqual(rows.map((row) => row.rank), rows.map((_, i) => i + 1));
  assert.ok(rows.every((row) => row.rankSource === 'store' && row.url.includes(row.appId)));
  assert.equal(installsNumber('1,000,000+'), 1000000);
  const suggestions = playSuggestions(fixture('play-suggest.txt'));
  assert.ok(suggestions.length >= 3 && suggestions.every((s) => s.startsWith('invoice')));
});

test('App Store: the page order first, then the API order; suggestions', () => {
  const webIds = appleWebOrder(fixture('apple-web-search.html'));
  assert.equal(webIds[0], '694831622');
  assert.ok(webIds.length >= 10 && new Set(webIds).size === webIds.length);
  assert.throws(() => appleWebOrder('<html></html>'), /not an App Store search page/);

  const api = JSON.parse(fixture('itunes-search.json'));
  const apiIds = api.results.map((app) => String(app.trackId));
  const rows = appleResults([apiIds[2], 'not-in-api', apiIds[0]], api);
  assert.deepEqual(rows.slice(0, 3).map((row) => [row.appId, row.rank, row.rankSource]), [[apiIds[2], 1, 'store'], ['not-in-api', 2, 'store'], [apiIds[0], 3, 'store']]);
  assert.equal(rows[3].rankSource, 'api');
  assert.equal(new Set(rows.map((row) => row.appId)).size, rows.length);
  assert.equal(rows.find((row) => row.appId === apiIds[2]).title, api.results[2].trackName);

  const hints = appleSuggestions(fixture('apple-hints.xml'));
  assert.deepEqual(hints.slice(0, 2), ['invoice maker', 'invoice fly']);
  assert.equal(APPLE_STOREFRONTS.US, 143441);
});

test('competition: from installs on Google Play and ratings on the App Store', () => {
  assert.deepEqual(competition([{ minInstalls: 1000 }, { minInstalls: 1000 }, { minInstalls: 1e7 }], 'googlePlay'), { competition: 38, top10MedianInstalls: 1000, top10MedianRatings: null });
  assert.equal(competition([{ ratingsCount: 10000 }], 'appStore').competition, 80);
  assert.equal(competition([{ minInstalls: null }], 'googlePlay').competition, null);
});

test('tracked apps: the store follows from the link or id', () => {
  assert.deepEqual(parseTrackedApp('com.zoho.invoice'), { store: 'googlePlay', appId: 'com.zoho.invoice' });
  assert.deepEqual(parseTrackedApp('https://play.google.com/store/apps/details?id=com.calm.android&hl=en'), { store: 'googlePlay', appId: 'com.calm.android' });
  assert.deepEqual(parseTrackedApp('https://apps.apple.com/us/app/invoice-simple/id694831622'), { store: 'appStore', appId: '694831622' });
  assert.deepEqual(parseTrackedApp('id694831622'), { store: 'appStore', appId: '694831622' });
});
