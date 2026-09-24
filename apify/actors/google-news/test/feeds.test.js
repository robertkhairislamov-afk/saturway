import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { dateWindows, parseEdition, parseFeed, searchFeedUrl, topicFeedUrl } from '../src/feeds.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('parseEdition maps editions to Google locale parameters', () => {
  assert.deepEqual(parseEdition('US:en'), { gl: 'US', hl: 'en-US', ceid: 'US:en' });
  assert.deepEqual(parseEdition('BR:pt-419'), { gl: 'BR', hl: 'pt-BR', ceid: 'BR:pt-419' });
  assert.deepEqual(parseEdition('NG:en'), { gl: 'NG', hl: 'en-NG', ceid: 'NG:en' });
  assert.throws(() => parseEdition('english'), /Invalid edition/);
});

test('searchFeedUrl adds time range or date window operators', () => {
  const locale = parseEdition('US:en');
  assert.equal(
    searchFeedUrl('tesla', locale, { timeRange: '7d' }),
    'https://news.google.com/rss/search?q=tesla%20when%3A7d&hl=en-US&gl=US&ceid=US%3Aen',
  );
  assert.equal(
    searchFeedUrl('tesla', locale, { timeRange: '7d', window: { after: '2026-09-01', before: '2026-09-02' } }),
    'https://news.google.com/rss/search?q=tesla%20after%3A2026-09-01%20before%3A2026-09-02&hl=en-US&gl=US&ceid=US%3Aen',
  );
  assert.equal(
    topicFeedUrl('BUSINESS', parseEdition('DE:de')),
    'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=de&gl=DE&ceid=DE%3Ade',
  );
});

test('dateWindows splits a period into single days', () => {
  assert.deepEqual(dateWindows({}), [null]);
  assert.deepEqual(dateWindows({ dateFrom: '2026-09-01', dateTo: '2026-09-03' }), [
    { after: '2026-09-01', before: '2026-09-02' },
    { after: '2026-09-02', before: '2026-09-03' },
    { after: '2026-09-03', before: '2026-09-04' },
  ]);
  assert.deepEqual(dateWindows({ dateFrom: '2026-09-01', dateTo: '2026-09-03', splitByDay: false }), [
    { after: '2026-09-01', before: '2026-09-04' },
  ]);
  assert.throws(() => dateWindows({ dateFrom: '2026-09-05', dateTo: '2026-09-01' }), /after dateTo/);
});

test('dateWindows understands relative dates for scheduled runs', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  assert.deepEqual(dateWindows({ dateFrom: '2 days' }, now), [
    { after: '2026-09-22', before: '2026-09-23' },
    { after: '2026-09-23', before: '2026-09-24' },
    { after: '2026-09-24', before: '2026-09-25' },
  ]);
  assert.throws(() => dateWindows({ dateFrom: 'yesterday' }, now), /Invalid date/);
});

test('parseFeed extracts clean articles from a search feed', () => {
  const [first, second] = parseFeed(fixture('search.xml'));
  assert.equal(first.title, 'Self-Driving Cars Are Getting Better. The Risks Are Getting Bigger.');
  assert.equal(first.source, 'The New York Times');
  assert.equal(first.sourceUrl, 'https://www.nytimes.com');
  assert.equal(first.publishedAt, '2026-09-24T10:21:39.000Z');
  assert.match(first.googleNewsUrl, /^https:\/\/news\.google\.com\/rss\/articles\/CBMi/);
  assert.match(first.articleId, /^CBMi/);
  assert.equal(first.relatedArticles, undefined);
  assert.equal(second.source, 'CNBC');
  assert.ok(!second.title.endsWith(' - CNBC'));
});

test('parseFeed keeps related coverage of clustered topic stories', () => {
  const [story] = parseFeed(fixture('topic.xml'));
  assert.ok(story.title.length > 0);
  assert.ok(Array.isArray(story.relatedArticles) && story.relatedArticles.length > 0);
  for (const related of story.relatedArticles) {
    assert.ok(related.title.length > 0);
    assert.ok(related.source.length > 0);
    assert.match(related.googleNewsUrl, /^https:\/\/news\.google\.com\//);
    assert.notEqual(related.googleNewsUrl, story.googleNewsUrl);
  }
});

test('parseFeed rejects pages that are not RSS', () => {
  assert.throws(() => parseFeed('<html><body>Sorry</body></html>'), /not a Google News RSS feed/);
});
