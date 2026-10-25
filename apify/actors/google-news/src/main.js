import { Actor, log } from 'apify';

import {
  EDITIONS,
  TIME_RANGES,
  TOPICS,
  dateWindows,
  parseEdition,
  parseFeed,
  searchFeedUrl,
  topStoriesFeedUrl,
  topicFeedUrl,
} from './feeds.js';
import { createHttpClient } from './http.js';
import { resolveArticleUrl } from './resolve.js';

// Pay-per-event names. The dataset item event is charged by the platform on every pushData().
const ITEM_EVENT = 'apify-default-dataset-item';
const URL_RESOLVED_EVENT = 'url-resolved';
const RESOLVE_CONCURRENCY = 4;
const DEFAULT_QUERY = 'artificial intelligence';

await Actor.init();

const input = (await Actor.getInput()) ?? {};
const {
  queries = [],
  topics = [],
  includeTopStories = false,
  edition = 'US:en',
  timeRange = 'any',
  dateFrom,
  dateTo,
  splitByDay = true,
  maxItemsPerFeed = 100,
  maxItems = 0,
  resolveUrls = false,
  proxyConfiguration,
} = input;

const searchQueries = queries.map((q) => String(q).trim()).filter(Boolean);
const topicList = topics.map((t) => String(t).trim().toUpperCase()).filter(Boolean);

const unknownTopic = topicList.find((t) => !TOPICS.includes(t));
if (unknownTopic) throw new Error(`Unknown topic "${unknownTopic}". Use one of: ${TOPICS.join(', ')}.`);
if (!TIME_RANGES.includes(timeRange)) throw new Error(`Unknown timeRange "${timeRange}". Use one of: ${TIME_RANGES.join(', ')}.`);
// An empty input (for example the Store's daily health check) runs an example search instead of failing.
if (searchQueries.length === 0 && topicList.length === 0 && !includeTopStories) {
  log.warning(`No search query, topic or top stories selected; searching for "${DEFAULT_QUERY}" as an example.`);
  searchQueries.push(DEFAULT_QUERY);
}
if (!EDITIONS.includes(edition)) log.warning(`Edition "${edition}" is not in the tested list; trying it anyway.`);

const locale = parseEdition(edition);
const proxy = proxyConfiguration?.useApifyProxy || proxyConfiguration?.proxyUrls?.length
  ? await Actor.createProxyConfiguration(proxyConfiguration)
  : undefined;
const fetchText = createHttpClient({ proxyConfiguration: proxy });
const charging = Actor.getChargingManager();

// Every feed to read, in order: search queries (optionally split into date windows), topics, top stories.
const windows = dateWindows({ dateFrom, dateTo, splitByDay });
const feeds = [
  ...searchQueries.flatMap((query) => windows.map((window) => ({
    url: searchFeedUrl(query, locale, { timeRange, window }),
    context: { query, topic: null, dateWindow: window },
  }))),
  ...topicList.map((topic) => ({ url: topicFeedUrl(topic, locale), context: { query: null, topic, dateWindow: null } })),
  ...(includeTopStories ? [{ url: topStoriesFeedUrl(locale), context: { query: null, topic: 'TOP_STORIES', dateWindow: null } }] : []),
];

log.info(`Reading ${feeds.length} Google News feed(s) for edition ${locale.ceid}.`);

const seen = new Set();
const summary = [];
let saved = 0;
let resolved = 0;
let resolveBudgetLeft = true;

async function resolveAll(articles) {
  const queue = [...articles];
  const worker = async () => {
    while (queue.length > 0 && resolveBudgetLeft) {
      const article = queue.shift();
      try {
        const url = await resolveArticleUrl(article.articleId, locale, fetchText);
        if (!url) continue;
        const charge = await Actor.charge({ eventName: URL_RESOLVED_EVENT });
        if (charge.eventChargeLimitReached && charge.chargedCount === 0) {
          resolveBudgetLeft = false;
          break;
        }
        article.url = url;
        resolved++;
      } catch (error) {
        log.debug(`Could not resolve ${article.googleNewsUrl}: ${error.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: RESOLVE_CONCURRENCY }, worker));
}

for (const feed of feeds) {
  const remainingByLimit = maxItems > 0 ? maxItems - saved : Infinity;
  const remainingByBudget = charging.calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  const room = Math.min(remainingByLimit, remainingByBudget, maxItemsPerFeed);
  if (room <= 0) {
    log.info('Reached the item limit or the maximum charge for this run; stopping.');
    break;
  }

  const label = feed.context.query ? `"${feed.context.query}"` : feed.context.topic;
  const row = { feed: label, dateWindow: feed.context.dateWindow, url: feed.url, saved: 0, error: null };
  summary.push(row);

  // A consent or captcha page instead of XML means this proxy session was blocked: retry.
  let articles;
  for (let attempt = 1; attempt <= 3 && !articles; attempt++) {
    try {
      articles = parseFeed(await fetchText(feed.url));
    } catch (error) {
      if (attempt === 3) {
        row.error = error.message;
        log.warning(`Skipping feed ${feed.url}: ${error.message}`);
      }
    }
  }
  if (!articles) continue;

  const fresh = articles
    .map((article, index) => ({ ...article, position: index + 1 }))
    .filter((article) => article.articleId && !seen.has(article.articleId))
    .slice(0, room);
  for (const article of fresh) {
    seen.add(article.articleId);
    article.url = null;
  }

  if (resolveUrls && resolveBudgetLeft) await resolveAll(fresh);

  const scrapedAt = new Date().toISOString();
  const rows = fresh.map((article) => ({
    title: article.title,
    source: article.source,
    sourceUrl: article.sourceUrl,
    publishedAt: article.publishedAt,
    url: article.url,
    googleNewsUrl: article.googleNewsUrl,
    articleId: article.articleId,
    position: article.position,
    query: feed.context.query,
    topic: feed.context.topic,
    dateWindow: feed.context.dateWindow,
    edition: locale.ceid,
    relatedArticles: article.relatedArticles ?? [],
    scrapedAt,
  }));

  if (rows.length > 0) await Actor.pushData(rows);
  saved += rows.length;
  row.saved = rows.length;
  const windowLabel = feed.context.dateWindow ? ` ${feed.context.dateWindow.after ?? ''}..${feed.context.dateWindow.before}` : '';
  log.info(`${label}${windowLabel}: ${rows.length} new article(s), ${saved} in total.`);
}

await Actor.setValue('SUMMARY', { saved, resolved, edition: locale.ceid, feeds: summary });
const failed = summary.filter((row) => row.error);
const message = `Saved ${saved} article(s) from ${summary.length} feed(s)${resolveUrls ? `, resolved ${resolved} publisher URL(s)` : ''}${failed.length ? ` (${failed.length} feed(s) could not be read)` : ''}.`;
log.info(message);
// Every feed failed and nothing was saved: say so instead of finishing with an empty dataset.
if (summary.length > 0 && saved === 0 && failed.length === summary.length) {
  await Actor.fail(`No Google News feed could be read. First error: ${failed[0].error}`);
} else {
  await Actor.exit(message);
}
