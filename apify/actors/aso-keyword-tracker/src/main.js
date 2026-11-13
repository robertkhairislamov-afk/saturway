// ASO keyword rank tracker for Google Play and the App Store: for every keyword, store and country,
// the ranked search results, where the user's own apps rank, how that changed since the last run,
// the search box suggestions and an estimate of the competition.

import { createHash } from 'node:crypto';

import { Actor, log } from 'apify';

import { createHttpClient as createAppleClient } from './apple-http.js';
import { appPageUrl, parseAppPage } from './play.js';
import { createHttpClient as createPlayClient } from './play-http.js';
import {
  APPLE_STOREFRONTS,
  STORES,
  appleApiSearchUrl,
  appleHintsUrl,
  appleResults,
  appleSearchPageUrl,
  appleSuggestions,
  appleWebOrder,
  competition,
  lookupApple,
  parseTrackedApp,
  playResults,
  playSearchUrl,
  playSuggestRequest,
  playSuggestUrl,
  playSuggestions,
} from './stores.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const CONCURRENCY = 3;
const EXAMPLE_INPUT = { keywords: ['invoice maker'], topN: 10 };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

function readInput(raw) {
  const input = toList(raw.keywords).length ? raw : { ...raw, ...EXAMPLE_INPUT };
  if (input !== raw) log.warning('No keywords in the input; checking "invoice maker" as an example.');
  const stores = toList(input.stores ?? Object.keys(STORES));
  const unknown = stores.find((store) => !STORES[store]);
  if (unknown) throw new Error(`Unknown store "${unknown}". Use googlePlay, appStore or both.`);
  const countries = [...new Set(toList(input.countries).map((country) => country.toUpperCase()))];
  const bad = countries.find((country) => !/^[A-Z]{2}$/.test(country));
  if (bad) throw new Error(`Invalid country "${bad}". Use two-letter codes such as US, GB or DE.`);
  const language = String(input.language ?? 'en').trim() || 'en';
  const tracked = [];
  for (const value of toList(input.trackApps)) {
    try {
      tracked.push(parseTrackedApp(value));
    } catch (error) {
      log.warning(`Skipping tracked app "${value}": ${error.message}`);
    }
  }
  const topN = Number(input.topN ?? 10);
  if (!Number.isInteger(topN) || topN < 0) throw new Error('"topN" must be a whole number, 0 or more.');
  return {
    keywords: [...new Set(toList(input.keywords).map((keyword) => keyword.toLowerCase()))],
    stores,
    countries: countries.length ? countries : ['US'],
    language,
    tracked,
    topN,
    includeSuggestions: input.includeSuggestions !== false,
    historyName: String(input.historyName ?? 'aso-keyword-history').trim() || 'aso-keyword-history',
    proxyConfiguration: input.proxyConfiguration,
  };
}

const historyKey = (store, country, keyword) => `${store}-${country}-${createHash('sha1').update(keyword).digest('hex').slice(0, 16)}`;

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
  const fallbackProxy = () => Actor.createProxyConfiguration({ useApifyProxy: true });
  const fetchPlay = createPlayClient({ proxyConfiguration: proxy, fallbackProxy, onFallback: () => log.info('Google Play is limiting direct requests; continuing through Apify Proxy.') });
  const fetchAppleJson = createAppleClient({ proxyConfiguration: proxy, fallbackProxy, onFallback: () => log.info('The App Store is limiting direct requests; continuing through Apify Proxy.') });
  // Pages and suggestions of the App Store are not JSON; the Google Play client returns text.
  const fetchAppleText = fetchPlay;
  const history = await Actor.openKeyValueStore(input.historyName);
  const keywordsDataset = await Actor.openDataset({ alias: 'keywords' });
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  const summary = [];
  const trackedIn = (store) => input.tracked.filter((app) => app.store === store);

  // App Store apps tracked but not in the results get their title from a lookup, once per country.
  const appleTitles = new Map();
  async function appleTracked(country) {
    if (!appleTitles.has(country)) {
      const ids = trackedIn('appStore').map((app) => app.appId);
      appleTitles.set(country, ids.length ? lookupApple(fetchAppleJson, ids, country).catch(() => []) : Promise.resolve([]));
    }
    return appleTitles.get(country);
  }

  // Google Play apps tracked but not in the results: their page gives the title, once per country.
  const playTitles = new Map();
  async function playTracked(country) {
    if (!playTitles.has(country)) {
      playTitles.set(country, Promise.all(trackedIn('googlePlay').map((app) => fetchPlay(appPageUrl(app.appId, { country, language: input.language }))
        .then(parseAppPage)
        .then((page) => ({ appId: app.appId, title: page.title, developer: page.developer, score: page.score, ratingsCount: page.ratingsCount, installs: page.installs, minInstalls: page.minInstalls, free: page.free, price: page.price, currency: page.currency, genre: page.genre, url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.appId)}` }))
        .catch(() => null))).then((apps) => apps.filter(Boolean)));
    }
    return playTitles.get(country);
  }

  async function check({ keyword, store, country }) {
    const locale = { country, language: input.language };
    let rows;
    let suggestions = null;
    if (store === 'googlePlay') {
      rows = playResults(await fetchPlay(playSearchUrl(keyword, locale)));
      if (input.includeSuggestions) {
        suggestions = await fetchPlay(playSuggestUrl(locale), { method: 'POST', body: playSuggestRequest(keyword) }).then(playSuggestions).catch((error) => {
          log.debug(`Suggestions for "${keyword}" (${country}): ${error.message}`);
          return null;
        });
      }
    } else {
      const [webIds, answer] = await Promise.all([
        fetchAppleText(appleSearchPageUrl(keyword, country)).then(appleWebOrder).catch((error) => {
          log.debug(`App Store page for "${keyword}" (${country}): ${error.message}`);
          return [];
        }),
        fetchAppleJson(appleApiSearchUrl(keyword, country)),
      ]);
      const missing = webIds.filter((id) => !(answer?.results ?? []).some((app) => String(app.trackId) === id));
      const extra = missing.length ? await lookupApple(fetchAppleJson, missing, country).catch(() => []) : [];
      rows = appleResults(webIds, answer, extra);
      const storefront = APPLE_STOREFRONTS[country];
      if (input.includeSuggestions && storefront) {
        suggestions = await fetchAppleText(appleHintsUrl(keyword), { headers: { 'x-apple-store-front': `${storefront}-1,29` } }).then(appleSuggestions).catch(() => null);
      }
    }

    const key = historyKey(store, country, keyword);
    const before = await history.getValue(key);
    const previous = before?.ranks ?? null;
    const checkedAt = new Date().toISOString();
    const withChange = (row) => {
      const previousRank = previous ? previous[row.appId] ?? null : null;
      return {
        ...row,
        previousRank,
        rankChange: previous && row.rank != null && previousRank != null ? previousRank - row.rank : null,
        newInResults: Boolean(previous) && row.rank != null && previousRank == null,
      };
    };

    const trackedHere = trackedIn(store);
    const trackedIds = new Set(trackedHere.map((app) => app.appId));
    const out = rows.slice(0, input.topN).map((row) => ({ ...withChange(row), tracked: trackedIds.has(row.appId) }));
    const trackedRows = [];
    const appleKnown = store === 'appStore' && trackedHere.length ? await appleTracked(country) : [];
    const playKnown = store === 'googlePlay' && trackedHere.length ? await playTracked(country) : [];
    for (const app of trackedHere) {
      const found = rows.find((row) => row.appId === app.appId || (store === 'appStore' && appleKnown.find((a) => a.bundleId?.toLowerCase() === app.appId.toLowerCase())?.appId === row.appId));
      const known = store === 'googlePlay' ? playKnown.find((a) => a.appId === app.appId) : appleKnown.find((a) => a.appId === app.appId || a.bundleId?.toLowerCase() === app.appId.toLowerCase());
      const row = found
        ? { ...withChange(found), tracked: true }
        : withChange({ rank: null, rankSource: null, appId: known?.appId ?? app.appId, title: known?.title ?? null, developer: known?.developer ?? null, score: known?.score ?? null, ratingsCount: known?.ratingsCount ?? null, installs: known?.installs ?? null, minInstalls: known?.minInstalls ?? null, free: known?.free ?? null, price: known?.price ?? null, currency: known?.currency ?? null, genre: known?.genre ?? null, url: known?.url ?? null });
      trackedRows.push({ ...row, tracked: true });
      if (!out.some((r) => r.appId === row.appId)) out.push({ ...row, tracked: true });
    }

    const keywordRecord = {
      recordType: 'keyword',
      keyword,
      store: STORES[store],
      country,
      resultsChecked: rows.length,
      ...competition(rows, store),
      topApps: rows.slice(0, 3).map((row) => row.title).filter(Boolean),
      trackedRanks: trackedRows.map((row) => ({ appId: row.appId, title: row.title, rank: row.rank, previousRank: row.previousRank, rankChange: row.rankChange })),
      suggestions,
      previousCheckAt: before?.checkedAt ?? null,
      checkedAt,
    };
    // Ranks are the paid results (default dataset); the keyword summary goes to its own dataset.
    const rankRecords = out.map((row) => ({ recordType: 'rank', keyword, store: STORES[store], country, ...row, checkedAt })).slice(0, Math.max(0, budget - saved));
    saved += rankRecords.length;
    if (rankRecords.length) await Actor.pushData(rankRecords);
    await keywordsDataset.pushData(keywordRecord);
    await history.setValue(key, { keyword, store, country, checkedAt, ranks: Object.fromEntries(rows.map((row) => [row.appId, row.rank])) });
    return { results: rows.length, saved: rankRecords.length };
  }

  const tasks = [];
  for (const country of input.countries) for (const store of input.stores) for (const keyword of input.keywords) tasks.push({ keyword, store, country });
  log.info(`${tasks.length} keyword checks: ${input.keywords.length} keywords × ${input.stores.length} stores × ${input.countries.length} countries.`);
  let done = 0;
  await mapWithConcurrency(tasks, CONCURRENCY, async (task) => {
    const label = `"${task.keyword}" ${STORES[task.store]} ${task.country}`;
    if (saved >= budget) {
      summary.push({ check: label, results: 0, saved: 0, error: 'maximum charge reached' });
      return;
    }
    try {
      const result = await check(task);
      summary.push({ check: label, ...result, error: null });
    } catch (error) {
      summary.push({ check: label, results: 0, saved: 0, error: error.message });
      log.warning(`${label}: ${error.message}`);
    }
    done++;
    await Actor.setStatusMessage(`Checked ${done} of ${tasks.length} keywords; ${saved} rows saved`);
  });

  await Actor.setValue('SUMMARY', { saved, checks: summary });
  const failed = summary.filter((row) => row.error);
  if (summary.length && failed.length === summary.length) throw new Error(`All checks failed. First error: ${failed[0].error}`);
  const message = `Checked ${summary.length - failed.length} of ${summary.length} keywords; saved ${saved} rows${failed.length ? ` (${failed.length} failed)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(`${error.message} If this looks wrong, please report it in the Issues tab of this Actor and we will fix it quickly.`);
}
