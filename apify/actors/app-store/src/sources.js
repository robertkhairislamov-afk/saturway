// Input and sources of the App Store Actor: what to load for every country, and how.

import {
  CHARTS,
  GENRES,
  LOOKUP_BATCH,
  MAX_CHART_DEPTH,
  appsOf,
  chartUrl,
  developerUrl,
  lookupUrl,
  parseAppId,
  parseChart,
  parseDeveloperId,
  searchUrl,
} from './appstore.js';

// An empty input (for example the Store's daily health check) scrapes this example instead of failing.
export const EXAMPLE_INPUT = { charts: ['top_free'], chartGenres: ['ALL'], chartDepth: 50 };

// Every record has the same keys in the same order; missing values are null.
export const EMPTY_RECORD = {
  appId: null, bundleId: null, url: null, title: null, developer: null, developerId: null, developerUrl: null,
  seller: null, developerWebsite: null, genre: null, genreId: null, categories: null, score: null, ratingsCount: null,
  scoreCurrentVersion: null, ratingsCountCurrentVersion: null, free: null, price: null, currency: null, priceText: null,
  contentRating: null, advisories: null, releasedAt: null, updatedAt: null, version: null, recentChanges: null,
  minIosVersion: null, sizeBytes: null, languages: null, iPadSupport: null, gameCenter: null, description: null,
  icon: null, screenshots: null, ipadScreenshots: null,
  source: null, rank: null, searchTerm: null, chart: null, chartGenre: null, developerQuery: null, country: null,
};

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map((item) => String(item).trim())
  .filter(Boolean);

export function readInput(raw, warn = () => {}) {
  let input = raw;
  const empty = ['appIds', 'searchTerms', 'charts', 'developers'].every((field) => toList(raw[field]).length === 0);
  if (empty) {
    warn('No apps, searches, charts or developers in the input; scraping the US top free apps chart as an example.');
    input = { ...raw, ...EXAMPLE_INPUT };
  }
  const appIds = [];
  for (const value of toList(input.appIds)) {
    try {
      appIds.push(parseAppId(value));
    } catch (error) {
      warn(`Skipping app "${value}": ${error.message}`);
    }
  }
  const developers = [];
  for (const value of toList(input.developers)) {
    try {
      developers.push({ query: value, id: parseDeveloperId(value) });
    } catch (error) {
      warn(`Skipping developer "${value}": ${error.message}`);
    }
  }
  const charts = toList(input.charts);
  const unknownChart = charts.find((chart) => !CHARTS[chart]);
  if (unknownChart) throw new Error(`Unknown chart "${unknownChart}". Use one of: ${Object.keys(CHARTS).join(', ')}.`);
  let chartGenres = toList(input.chartGenres).map((genre) => genre.toUpperCase());
  if (chartGenres.length === 0) chartGenres = ['ALL'];
  const unknownGenre = chartGenres.find((genre) => !GENRES[genre]);
  if (unknownGenre) throw new Error(`Unknown category "${unknownGenre}". Use one of: ${Object.keys(GENRES).join(', ')}.`);
  const countries = toList(input.countries).map((country) => country.toUpperCase());
  const badCountry = countries.find((country) => !/^[A-Z]{2}$/.test(country));
  if (badCountry) throw new Error(`Invalid country "${badCountry}". Use two-letter codes such as US, GB or JP.`);
  const chartDepth = Number(input.chartDepth ?? MAX_CHART_DEPTH);
  if (!Number.isInteger(chartDepth) || chartDepth < 1 || chartDepth > MAX_CHART_DEPTH) {
    throw new Error(`"chartDepth" must be a whole number from 1 to ${MAX_CHART_DEPTH}.`);
  }
  const maxItems = Number(input.maxItems ?? 0);
  if (!Number.isInteger(maxItems) || maxItems < 0) throw new Error('"maxItems" must be a whole number, 0 or more.');
  return {
    appIds: [...new Set(appIds)],
    searchTerms: [...new Set(toList(input.searchTerms))],
    charts: [...new Set(charts)],
    chartGenres: [...new Set(chartGenres)],
    chartDepth,
    developers,
    countries: countries.length > 0 ? [...new Set(countries)] : ['US'],
    maxItems,
    proxyConfiguration: input.proxyConfiguration,
  };
}

// Looks up apps by id, LOOKUP_BATCH at a time, keeping the order of the ids. Apps not sold in the
// country are missing from the answer.
export async function lookupApps(fetchJson, ids, country) {
  const found = new Map();
  // Apple looks apps up either by numeric id or by bundle id, not both in one request.
  const numeric = ids.filter((id) => /^\d+$/.test(id));
  const bundles = ids.filter((id) => !/^\d+$/.test(id));
  for (const group of [numeric, bundles]) {
    for (let start = 0; start < group.length; start += LOOKUP_BATCH) {
      for (const app of appsOf(await fetchJson(lookupUrl(group.slice(start, start + LOOKUP_BATCH), country)))) {
        found.set(app.appId, app);
        if (app.bundleId) found.set(app.bundleId.toLowerCase(), app);
      }
    }
  }
  return ids.map((id) => found.get(/^\d+$/.test(id) ? id : id.toLowerCase())).filter(Boolean);
}

// Every source for every country, as tasks that load their apps.
export function tasksOf(input, fetchJson) {
  const tasks = [];
  for (const country of input.countries) {
    if (input.appIds.length > 0) {
      tasks.push({ label: `${input.appIds.length} app(s)`, country, context: { source: 'app' }, ranked: false, load: () => lookupApps(fetchJson, input.appIds, country) });
    }
    for (const term of input.searchTerms) {
      tasks.push({ label: `search "${term}"`, country, context: { source: 'search', searchTerm: term }, ranked: true, load: async () => appsOf(await fetchJson(searchUrl(term, country))) });
    }
    for (const chart of input.charts) {
      for (const genre of input.chartGenres) {
        tasks.push({
          label: `${CHARTS[chart][1]}, ${GENRES[genre]}`,
          country,
          context: { source: 'chart', chart, chartGenre: GENRES[genre] },
          ranked: true,
          load: async () => lookupApps(fetchJson, parseChart(await fetchJson(chartUrl(chart, genre, country, input.chartDepth))), country),
        });
      }
    }
    for (const developer of input.developers) {
      tasks.push({ label: `developer ${developer.query}`, country, context: { source: 'developer', developerQuery: developer.query }, ranked: false, load: async () => appsOf(await fetchJson(developerUrl(developer.id, country))) });
    }
  }
  return tasks;
}
