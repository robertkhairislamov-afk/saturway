import { Actor, log } from 'apify';

import { createHttpClient } from './http.js';
import {
  CATEGORIES,
  CHARTS,
  MAX_CHART_DEPTH,
  NotFoundError,
  appPageUrl,
  batchUrl,
  chartRequestBody,
  developerPageUrl,
  nextPageRequestBody,
  parseAppId,
  parseAppPage,
  parseChartResponse,
  parseDeveloper,
  parseDeveloperPage,
  parseNextPageResponse,
  parseSearchPage,
  searchPageUrl,
} from './play.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
const DETAIL_CONCURRENCY = 6;
// An empty input (for example the Store's daily health check) scrapes this example instead of failing.
const EXAMPLE_INPUT = { charts: ['topselling_free'], chartCategories: ['APPLICATION'], chartDepth: 50 };

// Every record has the same keys in the same order; missing values are null.
const EMPTY_RECORD = {
  appId: null, url: null, title: null, developer: null, developerId: null, developerUrl: null,
  developerEmail: null, developerWebsite: null, privacyPolicyUrl: null, genre: null, genreId: null, categories: null,
  score: null, ratingsCount: null, reviewsCount: null, histogram: null, installs: null, minInstalls: null,
  maxInstalls: null, free: null, price: null, originalPrice: null, currency: null, priceText: null,
  offersInAppPurchases: null, inAppPurchaseRange: null, containsAds: null, contentRating: null,
  contentRatingDescription: null, releasedAt: null, releasedText: null, updatedAt: null, version: null,
  minAndroidVersion: null, summary: null, description: null, descriptionHtml: null, recentChanges: null,
  icon: null, headerImage: null, screenshots: null, videoUrl: null, playPass: null, preregistration: null,
  source: null, rank: null, searchTerm: null, chart: null, chartCategory: null, developerQuery: null,
  country: null, language: null,
};

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map((item) => String(item).trim())
  .filter(Boolean);

function readInput(raw) {
  let input = raw;
  const empty = ['appIds', 'searchTerms', 'charts', 'developers'].every((field) => toList(raw[field]).length === 0);
  if (empty) {
    log.warning('No apps, searches, charts or developers in the input; scraping the US top free apps chart as an example.');
    input = { ...raw, ...EXAMPLE_INPUT };
  }

  const appIds = [];
  for (const value of toList(input.appIds)) {
    try {
      appIds.push(parseAppId(value));
    } catch (error) {
      log.warning(`Skipping app: ${error.message}`);
    }
  }
  const developers = [];
  for (const value of toList(input.developers)) {
    try {
      developers.push({ query: value, ...parseDeveloper(value) });
    } catch (error) {
      log.warning(`Skipping developer "${value}": ${error.message}`);
    }
  }

  const charts = toList(input.charts);
  const unknownChart = charts.find((chart) => !CHARTS[chart]);
  if (unknownChart) throw new Error(`Unknown chart "${unknownChart}". Use one of: ${Object.keys(CHARTS).join(', ')}.`);
  let chartCategories = toList(input.chartCategories).map((category) => category.toUpperCase());
  if (chartCategories.length === 0) chartCategories = ['APPLICATION'];
  const unknownCategory = chartCategories.find((category) => !CATEGORIES.includes(category));
  if (unknownCategory) throw new Error(`Unknown category "${unknownCategory}". Use one of: ${CATEGORIES.join(', ')}.`);

  const countries = toList(input.countries).map((country) => country.toUpperCase());
  const badCountry = countries.find((country) => !/^[A-Z]{2}$/.test(country));
  if (badCountry) throw new Error(`Invalid country "${badCountry}". Use two-letter codes such as US, GB or DE.`);
  const language = String(input.language ?? 'en').trim() || 'en';
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(language)) throw new Error(`Invalid language "${language}". Use a code such as en, de or pt-BR.`);

  const chartDepth = Number(input.chartDepth ?? 100);
  if (!Number.isInteger(chartDepth) || chartDepth < 1 || chartDepth > MAX_CHART_DEPTH) {
    throw new Error(`"chartDepth" must be a whole number from 1 to ${MAX_CHART_DEPTH}.`);
  }
  const maxItems = Number(input.maxItems ?? 0);
  if (!Number.isInteger(maxItems) || maxItems < 0) throw new Error('"maxItems" must be a whole number, 0 or more.');

  return {
    appIds: [...new Set(appIds)],
    searchTerms: [...new Set(toList(input.searchTerms))],
    charts,
    chartCategories: [...new Set(chartCategories)],
    chartDepth,
    developers,
    countries: countries.length > 0 ? [...new Set(countries)] : ['US'],
    language,
    includeDetails: input.includeDetails !== false,
    maxItems,
    proxyConfiguration: input.proxyConfiguration,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

await Actor.init();

try {
  const input = readInput((await Actor.getInput()) ?? {});
  const proxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const fetchText = createHttpClient({
    proxyConfiguration: proxy,
    fallbackProxy: () => Actor.createProxyConfiguration({ useApifyProxy: true }),
    onFallback: () => log.info('Google Play is limiting direct requests; continuing through Apify Proxy.'),
  });
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);
  const summary = [];

  // Now and then an app page arrives without its data; loading it again usually works.
  async function loadAppPage(appId, locale) {
    for (let attempt = 1; ; attempt++) {
      try {
        return parseAppPage(await fetchText(appPageUrl(appId, locale)));
      } catch (error) {
        if (!(error instanceof NotFoundError) || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }

  // App pages are loaded once per country and language, even if an app appears in several lists.
  const pages = new Map();
  const appDetails = (appId, locale) => {
    const key = `${locale.country}|${locale.language}|${appId}`;
    if (!pages.has(key)) pages.set(key, loadAppPage(appId, locale));
    return pages.get(key);
  };

  // Turns list entries into records, loading app pages when details are on, and saves them.
  async function saveApps(entries, context, locale) {
    const room = roomLeft();
    const chosen = entries.slice(0, Math.max(0, room));
    const scrapedAt = new Date().toISOString();
    const records = await mapWithConcurrency(chosen, DETAIL_CONCURRENCY, async ({ app, rank }) => {
      let data = app;
      if (input.includeDetails || !app.title) {
        try {
          data = { ...app, ...(await appDetails(app.appId, locale)) };
        } catch (error) {
          if (!app.title) {
            log.warning(`${app.appId} (${locale.country}): ${error.status === 404 ? 'not available in this country' : error.message}`);
            return null;
          }
          log.warning(`${app.appId} (${locale.country}): could not load the app page, saving the list data only: ${error.message}`);
        }
      }
      return {
        ...EMPTY_RECORD,
        ...data,
        url: `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.appId)}`,
        ...context,
        rank: rank ?? null,
        country: locale.country,
        language: locale.language,
        scrapedAt,
      };
    });
    const found = records.filter(Boolean).slice(0, Math.max(0, roomLeft()));
    saved += found.length;
    if (found.length > 0) await Actor.pushData(found);
    return found.length;
  }

  async function readDeveloper(developer, locale) {
    let name = developer.name;
    if (!name) {
      // A numeric developer page shows a selection; the full catalog is listed under the name.
      const page = parseDeveloperPage(await fetchText(developerPageUrl({ id: developer.id }, locale)));
      name = page.apps.find((app) => app.developer)?.developer;
      if (!name) return page.apps;
    }
    const first = parseDeveloperPage(await fetchText(developerPageUrl({ name }, locale)));
    const apps = [...first.apps];
    let { token } = first;
    while (token && apps.length < roomLeft()) {
      const next = parseNextPageResponse(await fetchText(batchUrl('qnKhOb', locale), { method: 'POST', body: nextPageRequestBody(token) }));
      if (next.apps.length === 0) break;
      apps.push(...next.apps);
      token = next.token;
    }
    return [...new Map(apps.map((app) => [app.appId, app])).values()];
  }

  // Every source for every country: apps, searches, charts, developers.
  const tasks = [];
  for (const country of input.countries) {
    const locale = { country, language: input.language };
    for (const appId of input.appIds) {
      tasks.push({ label: `app ${appId}`, locale, context: { source: 'app' }, load: async () => [{ appId }] });
    }
    for (const term of input.searchTerms) {
      tasks.push({
        label: `search "${term}"`,
        locale,
        context: { source: 'search', searchTerm: term },
        load: async () => parseSearchPage(await fetchText(searchPageUrl(term, locale))),
      });
    }
    for (const chart of input.charts) {
      for (const category of input.chartCategories) {
        tasks.push({
          label: `${CHARTS[chart]} ${category}`,
          locale,
          context: { source: 'chart', chart, chartCategory: category },
          load: async () => parseChartResponse(await fetchText(batchUrl('vyAe2', locale), {
            method: 'POST',
            body: chartRequestBody(chart, category, input.chartDepth),
          })),
        });
      }
    }
    for (const developer of input.developers) {
      tasks.push({
        label: `developer ${developer.query}`,
        locale,
        context: { source: 'developer', developerQuery: developer.query },
        load: () => readDeveloper(developer, locale),
      });
    }
  }

  log.info(`${tasks.length} source(s) in ${input.countries.length} countr${input.countries.length === 1 ? 'y' : 'ies'}, details ${input.includeDetails ? 'on' : 'off'}.`);
  for (const [index, task] of tasks.entries()) {
    if (roomLeft() <= 0) {
      log.info('Reached the item limit or the maximum charge for this run; stopping.');
      break;
    }
    const where = `${task.label} (${task.locale.country})`;
    try {
      const apps = await task.load();
      const ranked = task.context.source === 'app' ? apps.map((app) => ({ app })) : apps.map((app, i) => ({ app, rank: i + 1 }));
      const count = await saveApps(ranked, task.context, task.locale);
      summary.push({ source: where, found: apps.length, saved: count, error: null });
      log.info(`${where}: ${apps.length} app(s), ${count} saved, ${saved} in total.`);
    } catch (error) {
      summary.push({ source: where, found: 0, saved: 0, error: error.message });
      log.warning(`${where}: ${error.message}`);
    }
    await Actor.setStatusMessage(`Saved ${saved} apps; ${index + 1} of ${tasks.length} sources done`);
  }

  await Actor.setValue('SUMMARY', { saved, sources: summary });
  const failed = summary.filter((row) => row.error);
  if (summary.length > 0 && failed.length === summary.length) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} sources failed. First error: ${failed[0].error}`);
  }
  const message = `Saved ${saved} apps from ${summary.length} source(s)${failed.length > 0 ? ` (${failed.length} failed)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
