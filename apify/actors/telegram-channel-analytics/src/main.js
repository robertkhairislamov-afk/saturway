// Telegram channel analytics for ad buyers and marketers: subscribers, average views per post,
// reach (ERR), engagement, posting frequency, share of ad posts and an estimated price per ad
// post, from the public web pages of each channel. Optionally finds related channels: the ones
// the input channels mention or forward from.

import { Actor, log } from 'apify';

import { createHttpClient } from './http.js';
import { analyze, channelUrl, contactsOf, parseChannelName, parseInfoPage, parsePreview, previewUrl } from './telegram.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const CONCURRENCY = 3;
const PAGE_SIZE = 20;
const MIN_MATURE_POSTS = 10;
const EXAMPLE_INPUT = { channels: ['durov', 'telegram'] };

const toList = (value) => (Array.isArray(value) ? value : value ? String(value).split(/[\s,]+/) : []).map((item) => String(item).trim()).filter(Boolean);
const wholeNumber = (value, fallback, name, min = 0) => {
  const n = Number(value ?? fallback);
  if (!Number.isInteger(n) || n < min) throw new Error(`"${name}" must be a whole number, ${min} or more.`);
  return n;
};

function readInput(raw) {
  const input = toList(raw.channels).length ? raw : { ...raw, ...EXAMPLE_INPUT };
  if (input !== raw) log.warning('No channels in the input; checking @durov and @telegram as an example.');
  const channels = [];
  for (const value of toList(input.channels)) {
    try {
      const name = parseChannelName(value);
      if (!channels.some((c) => c.toLowerCase() === name.toLowerCase())) channels.push(name);
    } catch (error) {
      log.warning(error.message);
    }
  }
  if (!channels.length) throw new Error('None of the channels is a public channel name or t.me link.');
  const cpmUsd = Number(input.cpmUsd ?? 5);
  if (!Number.isFinite(cpmUsd) || cpmUsd < 0) throw new Error('"cpmUsd" must be a number, 0 or more.');
  return {
    channels,
    postsPerChannel: Math.min(wholeNumber(input.postsPerChannel, 50, 'postsPerChannel', 1), 1000),
    cpmUsd,
    discoverRelated: input.discoverRelated === true,
    maxRelatedChannels: wholeNumber(input.maxRelatedChannels, 30, 'maxRelatedChannels'),
    discoveryDepth: Math.min(Math.max(wholeNumber(input.discoveryDepth, 1, 'discoveryDepth', 1), 1), 3),
    minSubscribers: wholeNumber(input.minSubscribers, 0, 'minSubscribers'),
    includeGroups: input.includeGroups !== false,
    includePosts: input.includePosts === true,
    proxyConfiguration: input.proxyConfiguration,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

await Actor.init();

try {
  const input = readInput((await Actor.getInput()) ?? {});
  const proxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const fetchPage = createHttpClient({
    proxyConfiguration: proxy,
    fallbackProxy: () => Actor.createProxyConfiguration({ useApifyProxy: true }),
    onFallback: () => log.info('Telegram is limiting direct requests; continuing through Apify Proxy.'),
  });
  const postsDataset = input.includePosts ? await Actor.openDataset({ alias: 'posts' }) : null;
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  const now = Date.now();
  let saved = 0;
  const summary = { saved: 0, channels: 0, groups: 0, skipped: {}, failed: [] };
  const skip = (reason) => { summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1; };
  const done = new Set();
  const related = new Map();

  // Posts of a channel, newest pages first, until there are enough posts and enough of them are
  // old enough (48 h) for their views to have settled.
  async function readPosts(name) {
    const first = await fetchPage(previewUrl(name));
    if (!/\/s\//.test(new URL(first.url).pathname)) return { header: null, posts: [] };
    let page = parsePreview(first.text, name);
    const header = page.header;
    const posts = [...page.posts];
    const maxPages = Math.ceil(input.postsPerChannel / PAGE_SIZE) + 10;
    const mature = () => posts.filter((post) => post.date && now - Date.parse(post.date) >= 48 * 3600000).length;
    for (let pages = 1; page.before && pages < maxPages && (posts.length < input.postsPerChannel || mature() < MIN_MATURE_POSTS); pages++) {
      page = parsePreview((await fetchPage(previewUrl(name, page.before))).text, name);
      if (!page.posts.length) break;
      posts.unshift(...page.posts);
    }
    const unique = [...new Map(posts.map((post) => [post.postId, post])).values()].sort((a, b) => a.postId - b.postId);
    // Keep the newest requested posts, plus older ones only when the newest are all too young.
    const newest = unique.slice(-input.postsPerChannel);
    const keep = newest.some((post) => post.date && now - Date.parse(post.date) >= 48 * 3600000) ? newest : unique;
    return { header, posts: keep };
  }

  async function check(name, foundBy, depth) {
    if (done.has(name.toLowerCase())) return;
    done.add(name.toLowerCase());
    if (saved >= budget) return skip('maximum charge reached');
    const info = parseInfoPage((await fetchPage(channelUrl(name))).text);
    if (info.kind === 'other') return skip('not a channel or group (user or bot)');
    const isRelated = depth > 0;
    if (info.kind === 'group' && !input.includeGroups) return skip('group (groups turned off)');
    const size = info.subscribers ?? info.members ?? 0;
    if (isRelated && size < input.minSubscribers) return skip('related channel below minimum subscribers');

    const base = {
      recordType: info.kind,
      username: name,
      url: channelUrl(name),
      title: info.title,
      description: info.description,
      verified: info.verified,
      subscribers: info.subscribers,
      members: info.members,
      online: info.online,
    };
    let record;
    if (info.kind === 'channel') {
      const { header, posts } = await readPosts(name);
      const stats = analyze({ subscribers: info.subscribers, posts, self: name, now, cpmUsd: input.cpmUsd });
      record = {
        ...base,
        title: header?.title ?? info.title,
        previewAvailable: Boolean(header),
        mediaCounts: header?.counters ? { photos: header.counters.photos ?? 0, videos: header.counters.videos ?? 0, links: header.counters.links ?? 0, files: header.counters.files ?? header.counters.file ?? 0 } : null,
        ...(stats ?? { postsAnalyzed: 0 }),
        cpmUsd: input.cpmUsd,
        contacts: contactsOf(info.description),
        foundBy,
        checkedAt: new Date(now).toISOString(),
      };
      if (postsDataset && posts.length) await postsDataset.pushData(posts.map((post) => ({ channel: name, ...post })));
      addRelated(name, depth, stats?.linkedChannels ?? []);
      summary.channels++;
    } else {
      record = { ...base, previewAvailable: false, postsAnalyzed: 0, contacts: contactsOf(info.description), foundBy, checkedAt: new Date(now).toISOString() };
      summary.groups++;
    }
    // Channels named in the description (groups often list their sister channels there).
    addRelated(name, depth, record.contacts.usernames.map((handle) => ({ username: handle.slice(1), mentions: 1 })).filter(({ username }) => !/bot$/i.test(username)));
    if (saved >= budget) return skip('maximum charge reached');
    saved++;
    await Actor.pushData(record);
  }

  function addRelated(name, depth, linked) {
    if (!input.discoverRelated || depth >= input.discoveryDepth) return;
    for (const { username, mentions } of linked) {
      if (username.toLowerCase() === name.toLowerCase()) continue;
      const entry = related.get(username.toLowerCase()) ?? { username, mentions: 0, by: new Set(), depth: depth + 1 };
      entry.mentions += mentions;
      entry.by.add(name);
      related.set(username.toLowerCase(), entry);
    }
  }

  const run = async (list) => mapWithConcurrency(list, CONCURRENCY, async ({ name, foundBy, depth }) => {
    try {
      await check(name, foundBy, depth);
    } catch (error) {
      summary.failed.push({ channel: name, error: error.message });
      log.warning(`@${name}: ${error.message}`);
    }
    await Actor.setStatusMessage(`Checked ${done.size} channels; ${saved} saved`);
  });

  log.info(`Checking ${input.channels.length} channels.`);
  await run(input.channels.map((name) => ({ name, foundBy: 'input', depth: 0 })));

  // Related channels, round by round: the ones found in a round can lead to more in the next,
  // up to the discovery depth. The most mentioned are checked first.
  let relatedChecked = 0;
  for (let round = 1; input.discoverRelated && round <= input.discoveryDepth && relatedChecked < input.maxRelatedChannels; round++) {
    const candidates = [...related.values()]
      .filter((entry) => entry.depth === round && !done.has(entry.username.toLowerCase()))
      .sort((a, b) => b.by.size - a.by.size || b.mentions - a.mentions)
      .slice(0, input.maxRelatedChannels - relatedChecked)
      .map((entry) => ({ name: entry.username, depth: round, foundBy: `mentioned ${entry.mentions}× by ${[...entry.by].map((n) => `@${n}`).join(', ')}` }));
    if (!candidates.length) break;
    log.info(`Round ${round}: checking ${candidates.length} related channels.`);
    relatedChecked += candidates.length;
    await run(candidates);
  }

  summary.saved = saved;
  await Actor.setValue('SUMMARY', summary);
  if (!saved && summary.failed.length) throw new Error(`No channel could be read. First error: ${summary.failed[0].error}`);
  const message = `Saved ${saved} channels and groups${summary.failed.length ? ` (${summary.failed.length} failed)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
