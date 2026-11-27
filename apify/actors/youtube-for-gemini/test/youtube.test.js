import assert from 'node:assert/strict';
import { test } from 'node:test';

import { channelRefOf, durationSec, playlistVideoIds, rowOf, uploadsOf, videoIdOf, videoRows } from '../src/youtube.js';

test('video IDs from every kind of link', () => {
  for (const link of ['https://www.youtube.com/watch?v=4se8RTfN144', 'https://youtu.be/4se8RTfN144?t=3', 'youtube.com/shorts/4se8RTfN144', 'https://m.youtube.com/live/4se8RTfN144', '4se8RTfN144']) {
    assert.equal(videoIdOf(link), '4se8RTfN144', link);
  }
  assert.equal(videoIdOf('https://vimeo.com/123'), null);
});

test('channel references', () => {
  assert.deepEqual(channelRefOf('https://www.youtube.com/@SomeBrand/videos'), { handle: '@SomeBrand' });
  assert.deepEqual(channelRefOf('@SomeBrand'), { handle: '@SomeBrand' });
  assert.deepEqual(channelRefOf('https://www.youtube.com/channel/UC1234567890123456789012'), { id: 'UC1234567890123456789012' });
  assert.deepEqual(channelRefOf('https://www.youtube.com/user/oldname'), { username: 'oldname' });
});

test('durations and rows', () => {
  assert.equal(durationSec('PT1H2M3S'), 3723);
  assert.equal(durationSec('PT45S'), 45);
  assert.equal(durationSec('P1DT1S'), 86401);
  const row = rowOf({ id: 'abcdefghijk', snippet: { title: 'T', publishedAt: '2026-11-20T10:00:00Z', description: 'D', channelTitle: 'C', liveBroadcastContent: 'none' }, contentDetails: { duration: 'PT59S' }, statistics: { viewCount: '1234' } });
  assert.deepEqual([row.uploadDate, row.durationSec, row.viewCount, row.url, row.liveBroadcast], ['2026-11-20', 59, 1234, 'https://www.youtube.com/watch?v=abcdefghijk', null]);
});

test('channel uploads are listed page by page, and missing videos get an error row', async () => {
  const calls = [];
  const get = async (path, params) => {
    calls.push([path, params]);
    if (path === 'channels') return { items: [{ id: 'UCx', snippet: { title: 'Brand' }, contentDetails: { relatedPlaylists: { uploads: 'UUx' } } }] };
    if (path === 'playlistItems') {
      const page = params.pageToken ? 2 : 1;
      return { items: Array.from({ length: 50 }, (_, i) => ({ contentDetails: { videoId: `v${page}-${i}` } })), nextPageToken: page === 1 ? 'p2' : undefined };
    }
    if (path === 'videos') return { items: params.id.split(',').filter((id) => id !== 'v1-1').map((id) => ({ id, snippet: { title: id }, contentDetails: { duration: 'PT1M' } })) };
    return {};
  };
  const ch = await uploadsOf(get, { handle: '@Brand' });
  assert.equal(calls[0][1].forHandle, '@Brand');
  const ids = await playlistVideoIds(get, ch.uploads, 60);
  assert.equal(ids.length, 60);
  const rows = await videoRows(get, ids.slice(0, 3));
  assert.deepEqual(rows.map((r) => r.error ?? 'ok'), ['ok', 'video not found, private or removed', 'ok']);
});
