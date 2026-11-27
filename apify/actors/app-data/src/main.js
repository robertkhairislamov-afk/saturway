import { Actor, log } from 'apify';

import { CHARTS as APPLE_CHARTS, appsOf, chartUrl, lookupUrl, parseAppId as parseAppleId, parseChart, searchUrl as appleSearchUrl, LOOKUP_BATCH } from './apple/appstore.js';
import { createHttpClient as appleClient } from './apple/http.js';
import { linkStores, sameApp } from './match.js';
import { createHttpClient as playClient } from './play/http.js';
import { NotFoundError, appPageUrl, batchUrl, chartRequestBody, parseAppId as parsePlayId, parseAppPage, parseChartResponse, parseSearchPage, searchPageUrl } from './play/play.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const DETAIL_CONCURRENCY = 6;
const EXAMPLE_INPUT = { searchTerms: ['habit tracker'], maxItemsPerSource: 10 };
// One chart name for both stores.
const CHARTS = { top_free: ['topselling_free', 'top_free'], top_paid: ['topselling_paid', 'top_paid'], top_grossing: ['topgrossing', 'top_grossing'] };

// Every record has the same keys in the same order; missing values are null. No developer emails,
// phones or addresses are saved.
const EMPTY = {
  store: null, appId: null, url: null, title: null, developer: null, developerId: null, genre: null,
  score: null, ratingsCount: null, installs: null, minInstalls: null, free: null, price: null, currency: null,
  contentRating: null, releasedAt: null, updatedAt: null, version: null, summary: null, description: null, icon: null,
  inBothStores: false, otherStoreAppId: null, otherStoreUrl: null, otherStoreTitle: null, otherStoreScore: null,
  source: null, searchTerm: null, chart: null, rank: null, country: null, scrapedAt: null,
};

const toList = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim()).filter(Boolean);
const installsNumber = (t) => { const d = String(t ?? '').replace(/[^\d]/g, ''); return d ? Number(d) : null; };

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const playRecord = (app, extra) => ({
  ...EMPTY,
  store: 'Google Play',
  appId: app.appId,
  url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.appId)}`,
  title: app.title ?? null,
  developer: app.developer ?? null,
  developerId: app.developerId ?? null,
  genre: app.genre ?? null,
  score: app.score ?? null,
  ratingsCount: app.ratingsCount ?? null,
  installs: app.installs ?? null,
  minInstalls: app.minInstalls ?? installsNumber(app.installs),
  free: app.free ?? null,
  price: app.price ?? null,
  currency: app.currency ?? null,
  contentRating: app.contentRating ?? null,
  releasedAt: app.releasedAt ?? null,
  updatedAt: app.updatedAt ?? null,
  version: app.version ?? null,
  summary: app.summary ?? null,
  description: app.description ?? null,
  icon: app.icon ?? null,
  ...extra,
});

const appleRecord = (app, extra) => ({
  ...EMPTY,
  store: 'App Store',
  appId: app.appId,
  url: app.url ?? `https://apps.apple.com/app/id${app.appId}`,
  title: app.title, developer: app.developer, developerId: app.developerId, genre: app.genre,
  score: app.score, ratingsCount: app.ratingsCount, free: app.free, price: app.price, currency: app.currency,
  contentRating: app.contentRating, releasedAt: app.releasedAt, updatedAt: app.updatedAt, version: app.version,
  description: app.description, icon: app.icon,
  ...extra,
});

await Actor.init();
try {
  let raw = (await Actor.getInput()) ?? {};
  if (['searchTerms', 'appIds', 'charts'].every((f) => toList(raw[f]).length === 0)) {
    log.warning('No searches, apps or charts in the input; searching "habit tracker" in both stores as an example.');
    raw = { ...raw, ...EXAMPLE_INPUT };
  }
  const stores = toList(raw.stores).length ? toList(raw.stores) : ['googlePlay', 'appStore'];
  const countries = (toList(raw.countries).length ? toList(raw.countries) : ['US']).map((c) => c.toUpperCase());
  const bad = countries.find((c) => !/^[A-Z]{2}$/.test(c));
  if (bad) throw new Error(`Invalid country "${bad}". Use two-letter codes such as US, GB or DE.`);
  const language = String(raw.language ?? 'en').trim() || 'en';
  const perSource = Math.min(Math.max(Number(raw.maxItemsPerSource ?? 50), 1), 200);
  const chartDepth = Math.min(Math.max(Number(raw.chartDepth ?? 50), 1), 100);
  const charts = toList(raw.charts).filter((c) => CHARTS[c]);
  const playDetails = raw.playDetails !== false;
  const maxItems = Number(raw.maxItems ?? 0);

  const proxy = raw.proxyConfiguration?.useApifyProxy || raw.proxyConfiguration?.proxyUrls?.length ? await Actor.createProxyConfiguration(raw.proxyConfiguration) : undefined;
  const fallbackProxy = () => Actor.createProxyConfiguration({ useApifyProxy: true });
  const fetchText = playClient({ proxyConfiguration: proxy, fallbackProxy, onFallback: () => log.info('Google Play is limiting direct requests; continuing through Apify Proxy.') });
  const fetchJson = appleClient({ proxyConfiguration: proxy, fallbackProxy, onFallback: () => log.info('The App Store is limiting direct requests; continuing through Apify Proxy.') });

  const pages = new Map();
  const playPage = (appId, locale) => {
    const key = `${locale.country}|${appId}`;
    if (!pages.has(key)) {
      pages.set(key, (async () => {
        for (let attempt = 1; ; attempt++) {
          try { return parseAppPage(await fetchText(appPageUrl(appId, locale))); } catch (error) {
            if (!(error instanceof NotFoundError) || attempt === 3) throw error;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      })());
    }
    return pages.get(key);
  };
  const withDetails = async (apps, locale) => mapLimit(apps, DETAIL_CONCURRENCY, async (app) => {
    if (!playDetails && app.title) return app;
    try { return { ...app, ...(await playPage(app.appId, locale)) }; } catch (error) {
      log.warning(`${app.appId} (${locale.country}): ${error.message}`);
      return app.title ? app : null;
    }
  });
  const appleLookup = async (ids, country) => {
    const out = [];
    for (let i = 0; i < ids.length; i += LOOKUP_BATCH) out.push(...appsOf(await fetchJson(lookupUrl(ids.slice(i, i + LOOKUP_BATCH), country))));
    return out;
  };

  const records = [];
  const summary = [];
  const scrapedAt = new Date().toISOString();
  const add = (list) => { for (const r of list) records.push({ ...r, scrapedAt }); return list.length; };
  const step = async (label, fn) => {
    try { const n = await fn(); summary.push({ source: label, saved: n, error: null }); log.info(`${label}: ${n} apps.`); } catch (error) {
      summary.push({ source: label, saved: 0, error: error.message }); log.warning(`${label}: ${error.message}`);
    }
    await Actor.setStatusMessage(`Collected ${records.length} apps; ${summary.length} sources done`);
  };

  for (const country of countries) {
    const locale = { country, language };
    for (const term of toList(raw.searchTerms)) {
      const ctx = { source: 'search', searchTerm: term, country };
      if (stores.includes('googlePlay')) {
        await step(`Google Play search "${term}" (${country})`, async () => {
          const apps = (await withDetails(parseSearchPage(await fetchText(searchPageUrl(term, locale))).slice(0, perSource), locale)).filter(Boolean);
          return add(apps.map((app, i) => playRecord(app, { ...ctx, rank: i + 1 })));
        });
      }
      if (stores.includes('appStore')) {
        await step(`App Store search "${term}" (${country})`, async () => {
          const apps = appsOf(await fetchJson(appleSearchUrl(term, country, perSource))).slice(0, perSource);
          return add(apps.map((app, i) => appleRecord(app, { ...ctx, rank: i + 1 })));
        });
      }
    }
    for (const chart of charts) {
      const ctx = { source: 'chart', chart, country };
      const [playChart, appleChart] = CHARTS[chart];
      if (stores.includes('googlePlay')) {
        await step(`Google Play ${chart} (${country})`, async () => {
          const listed = parseChartResponse(await fetchText(batchUrl('vyAe2', locale), { method: 'POST', body: chartRequestBody(playChart, 'APPLICATION', chartDepth) })).slice(0, chartDepth);
          const apps = (await withDetails(listed, locale)).filter(Boolean);
          return add(apps.map((app, i) => playRecord(app, { ...ctx, rank: i + 1 })));
        });
      }
      if (stores.includes('appStore') && APPLE_CHARTS[appleChart]) {
        await step(`App Store ${chart} (${country})`, async () => {
          const ids = parseChart(await fetchJson(chartUrl(appleChart, 'ALL', country, chartDepth)));
          const byId = new Map((await appleLookup(ids, country)).map((a) => [a.appId, a]));
          return add(ids.map((id) => byId.get(id)).filter(Boolean).map((app, i) => appleRecord(app, { ...ctx, rank: i + 1 })));
        });
      }
    }
    // Apps by link or id: the app in its own store, and the same app found in the other store.
    for (const value of toList(raw.appIds)) {
      const isApple = /apps\.apple\.com|itunes\.apple\.com/i.test(value) || /^(id)?\d{5,}$/i.test(value);
      await step(`app ${value} (${country})`, async () => {
        const ctx = { source: 'app', country };
        let own;
        if (isApple) {
          const [app] = await appleLookup([parseAppleId(value)], country);
          if (!app) throw new Error('not found in the App Store of this country');
          own = appleRecord(app, ctx);
        } else {
          const [app] = (await withDetails([{ appId: parsePlayId(value) }], locale)).filter(Boolean);
          if (!app?.title) throw new Error('not found on Google Play in this country');
          own = playRecord(app, ctx);
        }
        let n = add([own]);
        const query = own.title.split(/\s[-–—:|]\s|:\s/)[0];
        if (isApple && stores.includes('googlePlay')) {
          const hit = parseSearchPage(await fetchText(searchPageUrl(query, locale))).slice(0, 10).find((a) => sameApp(a, own));
          if (hit) { const [app] = (await withDetails([hit], locale)).filter(Boolean); if (app) n += add([playRecord(app, { ...ctx, source: 'other store' })]); }
        } else if (!isApple && stores.includes('appStore')) {
          const hit = appsOf(await fetchJson(appleSearchUrl(query, country, 10))).find((a) => sameApp(a, own));
          if (hit) n += add([appleRecord(hit, { ...ctx, source: 'other store' })]);
        }
        return n;
      });
    }
  }

  linkStores(records);
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  const room = Math.min(maxItems > 0 ? maxItems : Infinity, budget);
  const out = records.slice(0, room);
  if (out.length) await Actor.pushData(out);
  await Actor.setValue('SUMMARY', { saved: out.length, inBothStores: out.filter((r) => r.inBothStores).length, sources: summary });
  const message = `Saved ${out.length} apps (${out.filter((r) => r.store === 'Google Play').length} Google Play, ${out.filter((r) => r.store === 'App Store').length} App Store); ${out.filter((r) => r.inBothStores).length} matched in both stores.`;
  log.info(message);
  await Actor.setStatusMessage(message, { isStatusMessageTerminal: true });
  if (!out.length && summary.every((s) => s.error)) throw new Error(summary[0]?.error ?? 'Nothing could be read.');
  await Actor.exit();
} catch (error) {
  await Actor.fail(error.message);
}
