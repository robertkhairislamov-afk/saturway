import assert from 'node:assert/strict';
import { test } from 'node:test';

import { developerKey, linkStores, sameApp, titleKey } from '../src/match.js';

test('names without subtitles, developers without company words', () => {
  assert.equal(titleKey('HabitNow - Daily Routine & Habits'), 'habitnow');
  assert.equal(titleKey('Habit Tracker: Daily Planner'), 'habit tracker');
  assert.equal(developerKey('Habitify Inc.'), 'habitify');
  assert.equal(developerKey('Spotify AB'), 'spotify');
});

test('the same app in both stores, and different apps kept apart', () => {
  assert.ok(sameApp({ title: 'Spotify: Music and Podcasts', developer: 'Spotify AB' }, { title: 'Spotify - Music and Podcasts', developer: 'Spotify' }));
  assert.ok(sameApp({ title: 'Habitify: Habit Tracker', developer: 'Unstatic Ltd Co' }, { title: 'Habitify - Habit Tracker', developer: 'Unstatic' }));
  assert.ok(!sameApp({ title: 'Habit Tracker', developer: 'A Studio' }, { title: 'Habit Tracker', developer: 'Different Dev' }));
  assert.ok(!sameApp({ title: 'Loop', developer: 'X' }, { title: 'Loop Habit', developer: 'Y' }));
});

test('records of one country are linked both ways', () => {
  const rows = linkStores([
    { store: 'Google Play', appId: 'com.spotify.music', title: 'Spotify: Music', developer: 'Spotify AB', country: 'US', url: 'p', score: 4.4 },
    { store: 'App Store', appId: '324684580', title: 'Spotify - Music', developer: 'Spotify', country: 'US', url: 'a', score: 4.8 },
    { store: 'App Store', appId: '324684580', title: 'Spotify - Music', developer: 'Spotify', country: 'GB', url: 'a2', score: 4.7 },
  ]);
  assert.deepEqual([rows[0].otherStoreAppId, rows[1].otherStoreAppId, rows[2].inBothStores], ['324684580', 'com.spotify.music', false]);
});

test("a developer's different apps are not mixed up", () => {
  const rows = linkStores([
    { store: 'Google Play', appId: 'tiktok', title: 'TikTok - Videos, Shop & LIVE', developer: 'TikTok Pte. Ltd.', country: 'US' },
    { store: 'Google Play', appId: 'tiktokpro', title: 'TikTok Pro - Events', developer: 'TikTok Pte. Ltd.', country: 'US' },
    { store: 'App Store', appId: '1', title: 'TikTok Pro - Events', developer: 'TikTok Ltd.', country: 'US' },
    { store: 'App Store', appId: '2', title: 'TikTok Shop', developer: 'TikTok Ltd.', country: 'US' },
  ]);
  assert.deepEqual(rows.map((r) => r.otherStoreAppId ?? null), [null, '1', 'tiktokpro', null]);
  assert.ok(sameApp({ title: 'Habitify', developer: 'Unstatic' }, { title: 'Habitify Habit Tracker', developer: 'Unstatic Ltd' }) === false);
  assert.ok(sameApp({ title: 'Notion Calendar', developer: 'Notion Labs' }, { title: 'Notion Calendar App', developer: 'Notion Labs, Inc' }));
});
