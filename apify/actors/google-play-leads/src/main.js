// Google Play developer leads: finds apps by keyword, top charts, given apps or developers (and
// optionally the apps Google shows as similar), groups them by developer and saves one lead per
// developer with the public business contact from an app page. See leads.js for the rules.

import { Actor, log } from 'apify';

import { createHttpClient } from './http.js';
import { buildLead, groupByDeveloper, leadApp, passes } from './leads.js';
import {
  CATEGORIES,
  CHARTS,
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
  similarAppsPath,
} from './play.js';

// Pay-per-event: the platform charges this event for every lead pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
const PAGE_CONCURRENCY = 6;
const CHART_DEPTH = 200;
// Apps are collected until there are this many developers for each lead wanted: filters (most
// often "individual developer" and "no email") leave out a good part of them.
const DEVELOPERS_PER_LEAD = 4;
// An empty input (for example the Store's daily health check) runs this example instead of failing.
const EXAMPLE_INPUT = { searchTerms: ['invoice maker'], maxLeads: 20 };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const wholeNumber = (value, field) => {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0) throw new Error(`"${field}" must be a whole number, 0 or more.`);
  return number;
};

function readInput(raw) {
  let input = raw;
  if (['searchTerms', 'categories', 'appIds', 'developers'].every((field) => toList(raw[field]).length === 0)) {
    log.warning('No keywords, categories, apps or developers in the input; finding leads for "invoice maker" as an example.');
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
  const categories = [...new Set(toList(input.categories).map((category) => category.toUpperCase()))];
  const unknownCategory = categories.find((category) => !CATEGORIES.includes(category));
  if (unknownCategory) throw new Error(`Unknown category "${unknownCategory}". Use one of: ${CATEGORIES.join(', ')}.`);
  const charts = toList(input.charts ?? ['topselling_free', 'topgrossing']);
  const unknownChart = charts.find((chart) => !CHARTS[chart]);
  if (unknownChart) throw new Error(`Unknown chart "${unknownChart}". Use one of: ${Object.keys(CHARTS).join(', ')}.`);
  const countries = [...new Set(toList(input.countries).map((country) => country.toUpperCase()))];
  const badCountry = countries.find((country) => !/^[A-Z]{2}$/.test(country));
  if (badCountry) throw new Error(`Invalid country "${badCountry}". Use two-letter codes such as US, GB or DE.`);
  const language = String(input.language ?? 'en').trim() || 'en';
  if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(language)) throw new Error(`Invalid language "${language}". Use a code such as en, de or pt-BR.`);
  return {
    searchTerms: [...new Set(toList(input.searchTerms))],
    categories,
    charts,
    appIds: [...new Set(appIds)],
    developers,
    includeSimilarApps: input.includeSimilarApps !== false,
    countries: countries.length > 0 ? countries : ['US'],
    language,
    filters: {
      companiesOnly: input.companiesOnly !== false,
      requireEmail: input.requireEmail !== false,
      requireWebsite: input.requireWebsite === true,
      minInstalls: wholeNumber(input.minInstalls, 'minInstalls'),
      maxInstalls: wholeNumber(input.maxInstalls, 'maxInstalls'),
      updatedWithinDays: wholeNumber(input.updatedWithinDays, 'updatedWithinDays'),
    },
    maxLeads: wholeNumber(input.maxLeads ?? 100, 'maxLeads'),
    proxyConfiguration: input.proxyConfiguration,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
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
  const wanted = Math.min(input.maxLeads > 0 ? input.maxLeads : Infinity, budget);
  const sources = [];

  // --- 1. Apps, from every source and country ---------------------------------------------
  const found = [];
  const developersSoFar = () => new Set(found.map(({ app }) => app.developer?.toLowerCase())).size;
  const enough = () => developersSoFar() >= wanted * DEVELOPERS_PER_LEAD;

  async function readList(firstHtml, locale, limit = 500) {
    const first = parseDeveloperPage(firstHtml);
    const apps = [...first.apps];
    let { token } = first;
    while (token && apps.length < limit) {
      const next = parseNextPageResponse(await fetchText(batchUrl('qnKhOb', locale), { method: 'POST', body: nextPageRequestBody(token) }));
      if (next.apps.length === 0) break;
      apps.push(...next.apps);
      token = next.token;
    }
    return [...new Map(apps.map((app) => [app.appId, app])).values()];
  }

  async function readSimilar(appId, locale) {
    const path = similarAppsPath(await fetchText(appPageUrl(appId, locale)));
    if (!path) return [];
    const url = new URL(path, 'https://play.google.com');
    url.searchParams.set('hl', locale.language);
    url.searchParams.set('gl', locale.country);
    return (await readList(await fetchText(url.href), locale, 100)).filter((app) => app.appId !== appId);
  }

  async function readDeveloper(developer, locale) {
    let name = developer.name;
    if (!name) {
      const page = parseDeveloperPage(await fetchText(developerPageUrl({ id: developer.id }, locale)));
      name = page.apps.find((app) => app.developer)?.developer;
      if (!name) return page.apps;
    }
    return readList(await fetchText(developerPageUrl({ name }, locale)), locale);
  }

  const add = (apps, source, country) => {
    for (const app of apps) if (app?.appId) found.push({ app, source, country });
  };

  for (const country of input.countries) {
    const locale = { country, language: input.language };
    const tasks = [];
    for (const appId of input.appIds) tasks.push({ label: `app ${appId}`, similar: true, load: async () => [{ appId, developer: null }] });
    for (const developer of input.developers) tasks.push({ label: `developer ${developer.query}`, load: () => readDeveloper(developer, locale) });
    for (const term of input.searchTerms) tasks.push({ label: `search "${term}"`, similar: true, load: async () => parseSearchPage(await fetchText(searchPageUrl(term, locale))) });
    for (const category of input.categories) {
      for (const chart of input.charts) {
        tasks.push({
          label: `${CHARTS[chart]} ${category}`,
          load: async () => parseChartResponse(await fetchText(batchUrl('vyAe2', locale), { method: 'POST', body: chartRequestBody(chart, category, CHART_DEPTH) })),
        });
      }
    }
    // Every source is read (one request each); only the similar-apps expansion stops early.
    for (const task of tasks) {
      const where = `${task.label} (${country})`;
      try {
        let apps = await task.load();
        // An app given by ID has no developer name yet: its page gives it.
        apps = await Promise.all(apps.map(async (app) => (app.developer ? app : { ...app, ...(await parseAppPage(await fetchText(appPageUrl(app.appId, locale)))) })));
        add(apps, task.label, country);
        let similar = 0;
        if (input.includeSimilarApps && task.similar) {
          await mapWithConcurrency(apps, PAGE_CONCURRENCY, async (app) => {
            if (enough()) return;
            try {
              const more = await readSimilar(app.appId, locale);
              similar += more.length;
              add(more, `${task.label}, similar to ${app.title ?? app.appId}`, country);
            } catch (error) {
              log.debug(`Similar apps of ${app.appId}: ${error.message}`);
            }
          });
        }
        sources.push({ source: where, apps: apps.length, similarApps: similar, error: null });
        log.info(`${where}: ${apps.length} apps${similar ? ` and ${similar} similar apps` : ''}; ${developersSoFar()} developers so far.`);
      } catch (error) {
        sources.push({ source: where, apps: 0, similarApps: 0, error: error.message });
        log.warning(`${where}: ${error.message}`);
      }
      await Actor.setStatusMessage(`Found ${found.length} apps of ${developersSoFar()} developers`);
    }
  }

  // --- 2. One lead per developer ----------------------------------------------------------
  const groups = groupByDeveloper(found);
  log.info(`${groups.length} developers found; reading their contacts (up to ${Number.isFinite(wanted) ? wanted : 'all'} leads).`);
  const rejected = {};
  const seenIds = new Set();
  let saved = 0;
  let checked = 0;
  const pages = new Map();
  const loadPage = async (appId, locale) => {
    const key = `${locale.country}|${appId}`;
    if (!pages.has(key)) {
      pages.set(key, (async () => {
        for (let attempt = 1; ; attempt++) {
          try {
            return parseAppPage(await fetchText(appPageUrl(appId, locale)));
          } catch (error) {
            if (!(error instanceof NotFoundError) || attempt === 3) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          }
        }
      })());
    }
    return pages.get(key);
  };

  await mapWithConcurrency(groups, PAGE_CONCURRENCY, async (group) => {
    if (saved >= wanted) return;
    const app = leadApp(group);
    const locale = { country: [...group.countries][0] ?? input.countries[0], language: input.language };
    try {
      const page = app.developerEmail !== undefined && app.updatedAt !== undefined ? app : await loadPage(app.appId, locale);
      checked++;
      const lead = buildLead(group, page);
      const reason = (lead.developerId && seenIds.has(lead.developerId)) ? 'duplicate developer' : passes(lead, input.filters);
      if (lead.developerId) seenIds.add(lead.developerId);
      if (reason) {
        rejected[reason] = (rejected[reason] ?? 0) + 1;
        return;
      }
      if (saved >= wanted) return;
      saved++;
      await Actor.pushData({ ...lead, scrapedAt: new Date().toISOString() });
      if (saved % 10 === 0) await Actor.setStatusMessage(`Saved ${saved} leads; checked ${checked} of ${groups.length} developers`);
    } catch (error) {
      rejected['app page failed'] = (rejected['app page failed'] ?? 0) + 1;
      log.debug(`${group.developer}: ${error.message}`);
    }
  });

  const summary = { leadsSaved: saved, developersFound: groups.length, developersChecked: checked, leftOut: rejected, appsFound: found.length, sources };
  await Actor.setValue('SUMMARY', summary);
  if (sources.length > 0 && sources.every((row) => row.error)) throw new Error(`All sources failed. First error: ${sources[0].error}`);
  const left = Object.entries(rejected).map(([reason, count]) => `${count} ${reason}`).join(', ');
  const message = `Saved ${saved} leads from ${groups.length} developers${left ? ` (left out: ${left})` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(`${error.message} If this looks wrong, please report it in the Issues tab of this Actor and we will fix it quickly.`);
}
