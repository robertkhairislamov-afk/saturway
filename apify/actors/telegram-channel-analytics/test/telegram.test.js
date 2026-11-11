import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { analyze, contactsOf, isAdPost, parseChannelName, parseCount, parseInfoPage, parsePreview, scriptOf } from '../src/telegram.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('channel names from @names, names and links', () => {
  assert.equal(parseChannelName('@durov'), 'durov');
  assert.equal(parseChannelName('https://t.me/s/rian_ru?before=1'), 'rian_ru');
  assert.equal(parseChannelName('t.me/pattayachat/123'), 'pattayachat');
  assert.throws(() => parseChannelName('https://t.me/+AbCdEf'), /private/);
  assert.throws(() => parseChannelName('https://t.me/joinchat/abc'), /not a public channel/);
  assert.throws(() => parseChannelName('ab'), /not a public channel/);
});

test('counts with K and M', () => {
  assert.equal(parseCount('6.83M'), 6830000);
  assert.equal(parseCount('12.3K'), 12300);
  assert.equal(parseCount('845'), 845);
  assert.equal(parseCount(''), null);
});

test('the channel card tells channels, groups and other accounts apart', () => {
  const channel = parseInfoPage(fixture('channel-info.html'));
  assert.deepEqual([channel.kind, channel.title, channel.verified, channel.subscribers], ['channel', 'Pavel Durov', true, 10046319]);
  const group = parseInfoPage(fixture('group-info.html'));
  assert.deepEqual([group.kind, group.members, group.online], ['group', 1789, 251]);
  assert.match(group.description, /Паттайя/);
  assert.equal(parseInfoPage(fixture('bot-info.html')).kind, 'other');
});

test('preview pages: header, posts in order and the link to older posts', () => {
  const page = parsePreview(fixture('preview.html'), 'rian_ru');
  assert.equal(page.header.title, 'РИА Новости');
  assert.equal(page.header.counters.subscribers, 3020000);
  assert.ok(page.posts.length >= 15);
  assert.ok(page.posts.every((post) => post.views > 0 && post.date && post.url.startsWith('https://t.me/rian_ru/')));
  assert.deepEqual(page.posts.map((p) => p.postId), [...page.posts.map((p) => p.postId)].sort((a, b) => a - b));
  assert.ok(page.before > 0 && page.before <= page.posts[0].postId);
  const older = parsePreview(fixture('preview-before.html'), 'rian_ru');
  assert.ok(older.posts.at(-1).postId < page.posts[0].postId);

  const small = parsePreview(fixture('preview-small.html'), 'pattayatours_ru');
  assert.ok(small.posts.some((post) => post.reactions > 0));
  assert.ok(small.posts.every((post) => !post.mentions.includes('pattayatours_ru')));
});

test('ad posts: erid links, ad law labels and hashtags', () => {
  const page = parsePreview(fixture('preview-ads.html'), 'bitkogan');
  assert.ok(page.posts.filter((post) => post.isAd).length >= 2);
  assert.ok(isAdPost('Реклама. ООО «Ромашка», ИНН 7700000000'));
  assert.ok(isAdPost('Лучшие туры #реклама'));
  assert.ok(isAdPost('Скидки', '<a href="https://x.ru/?utm=1&amp;erid=2VtzqwXneJr">'));
  assert.ok(!isAdPost('Новости рекламного рынка'));
});

test('analytics use settled recent posts and estimate the post price', () => {
  const now = Date.parse('2026-11-11T12:00:00Z');
  const day = 86400000;
  const post = (age, views, extra = {}) => ({ postId: 1000 - age, url: '', date: new Date(now - age * day).toISOString(), views, reactions: views / 100, forwardedFrom: null, forwardedFromName: null, isAd: false, text: 'Привет', mentions: [], ...extra });
  const posts = [
    post(400, 900000), // a year old: views of old posts are not comparable
    ...[3, 4, 5, 6, 7, 8].map((age) => post(age, 1000)),
    post(5.5, 1200, { isAd: true }),
    post(2.5, 800, { mentions: ['pattayanews'] }),
    post(0.2, 50), // too young
  ];
  const stats = analyze({ subscribers: 4000, posts, self: 'me', now, cpmUsd: 10 });
  assert.equal(stats.postsAnalyzed, 10);
  assert.equal(stats.statsBasedOnPosts, 8);
  assert.equal(stats.avgViews, 1000);
  assert.equal(stats.reachPercent, 25);
  assert.equal(stats.engagementPercent, 1);
  assert.equal(stats.adPosts, 1);
  assert.equal(stats.estimatedPostPriceUsd, 10);
  assert.equal(stats.script, 'Cyrillic');
  assert.deepEqual(stats.linkedChannels, [{ username: 'pattayanews', mentions: 1 }]);
  assert.equal(stats.active, true);
  const silent = analyze({ subscribers: 4000, posts: [post(90, 5000), post(100, 6000)], self: 'me', now, cpmUsd: 10 });
  assert.equal(silent.active, false);
  assert.equal(silent.estimatedPostPriceUsd, null);
  assert.equal(analyze({ subscribers: 10, posts: [] }), null);
});

test('scripts and contacts', () => {
  assert.equal(scriptOf(['สวัสดีครับ พัทยา']), 'Thai');
  assert.equal(scriptOf(['Hello Pattaya']), 'Latin');
  const contacts = contactsOf('Реклама: @ads_manager, ads@example.com\nhttps://example.com https://t.me/pattaya_ads');
  assert.deepEqual(contacts.usernames, ['@ads_manager']);
  assert.deepEqual(contacts.emails, ['ads@example.com']);
  assert.deepEqual(contacts.websites, ['https://example.com']);
  assert.deepEqual(contacts.links, ['https://t.me/pattaya_ads']);
});
