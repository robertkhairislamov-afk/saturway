// Thai property market analyzer, stage 1: reads Dot Property searches (location × type × deal),
// adds the tourist district and the project's facts, compares each run with the earlier ones and
// saves listings, projects, districts and the listings that left the market.

import { Actor, log } from 'apify';

import { districtOf } from './areas.js';
import { PAGE_SIZE, parseListPage, parseListingPage, searchUrl } from './dotproperty.js';
import { applyHistory, historyKey } from './history.js';
import { createHttpClient, mapLimit } from './http.js';
import { districtRecords, projectKey, projectRecords } from './stats.js';

await Actor.init();

const EXAMPLE_INPUT = { locations: ['chonburi/pattaya'], propertyTypes: ['condo'], transactions: ['sale', 'rent'], maxPagesPerSearch: 2 };
const raw = (await Actor.getInput()) ?? {};
const input = {
  locations: ['chonburi/pattaya'],
  propertyTypes: ['condo'],
  transactions: ['sale', 'rent'],
  maxPagesPerSearch: 0,
  includeProjectDetails: true,
  maxProjectDetailsPerRun: 600,
  projectDetailsMaxAgeDays: 90,
  saveListings: true,
  memoryName: 'thai-property-history',
  concurrency: 2,
  delayMs: 1000,
  ...(Object.keys(raw).length === 0 ? EXAMPLE_INPUT : raw),
};
const scrapedAt = new Date().toISOString();

let proxyConfiguration;
if (input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length) {
  proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration).catch((error) => {
    log.warning(`The proxy is not available (${error.message}); going without it.`);
    return undefined;
  });
}
const http = createHttpClient({ proxyConfiguration, delayMs: input.delayMs });
const memory = await Actor.openKeyValueStore(input.memoryName);

const searches = input.locations.flatMap((location) => input.propertyTypes.flatMap((propertyType) =>
  input.transactions.map((transaction) => ({ location: location.trim().replace(/^\/+|\/+$/g, '').toLowerCase(), propertyType, transaction }))));

const summary = { searches: [], projects: 0, districts: 0, projectDetailsFetched: 0, removed: 0, http: http.stats, startedAt: scrapedAt };
const allListings = [];
const removedAll = [];

for (const search of searches) {
  const label = `${search.propertyType} for ${search.transaction} in ${search.location}`;
  const row = { search: label, url: searchUrl(search), reported: null, pages: 0, listings: 0, complete: false, error: null };
  summary.searches.push(row);
  try {
    const first = parseListPage(await http.get(searchUrl(search)));
    row.reported = first.total;
    const pageCount = Math.ceil((first.total ?? 0) / PAGE_SIZE);
    const pages = input.maxPagesPerSearch > 0 ? Math.min(pageCount, input.maxPagesPerSearch) : pageCount;
    const byKey = new Map(first.listings.map((l) => [l.key, l]));
    row.pages = 1;
    let failedPages = 0;
    await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), input.concurrency, async (page) => {
      try {
        const { listings } = parseListPage(await http.get(searchUrl({ ...search, page })));
        for (const l of listings) byKey.set(l.key, l);
        row.pages++;
      } catch (error) {
        failedPages++;
        log.warning(`${label}, page ${page}: ${error.message}`);
      }
      if (row.pages % 100 === 0) await Actor.setStatusMessage(`${label}: ${row.pages} of ${pages} pages, ${byKey.size} listings.`);
    });
    // The order shifts while we read, so a few listings can be missed; a search counts as complete
    // when every page was read and we have at least 95% of what the site reports.
    row.complete = pages === pageCount && failedPages === 0 && byKey.size >= 0.95 * Math.min(first.total ?? 0, pageCount * PAGE_SIZE);
    const listings = [...byKey.values()].map((l) => {
      const projectName = l.project && !/^(n\/a|untitled)$/i.test(l.project) ? l.project : null;
      return { recordType: 'listing', source: 'dotproperty', transaction: search.transaction, propertyType: search.propertyType, location: search.location, ...l, project: projectName, projectKey: projectName ? projectKey(projectName) : null, ...districtOf(l), scrapedAt };
    });
    row.listings = listings.length;

    const key = historyKey(search);
    const { seen, removed } = applyHistory(listings, (await memory.getValue(key)) ?? {}, scrapedAt);
    // A partial read cannot tell what left the market, and must not forget what it did not see.
    if (row.complete) {
      await memory.setValue(key, seen);
      for (const r of removed) removedAll.push({ ...r, transaction: search.transaction, propertyType: search.propertyType, location: search.location });
    } else {
      const merged = { ...((await memory.getValue(key)) ?? {}), ...Object.fromEntries(Object.entries(seen).filter(([k]) => byKey.has(k))) };
      await memory.setValue(key, merged);
    }
    allListings.push(...listings);
    log.info(`${label}: ${listings.length} listings from ${row.pages} pages (the site reports ${row.reported})${row.complete ? '' : ', partial'}.`);
  } catch (error) {
    row.error = error.message;
    log.error(`${label}: ${error.message}`);
  }
}

// Project facts from one listing page per project, kept for 90 days.
const details = (await memory.getValue('projects')) ?? {};
if (input.includeProjectDetails) {
  const maxAge = input.projectDetailsMaxAgeDays * 24 * 60 * 60 * 1000;
  const sample = new Map();
  for (const l of allListings) {
    if (!l.projectKey) continue;
    const cached = details[l.projectKey];
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < maxAge) continue;
    if (!sample.has(l.projectKey) || (l.transaction === 'sale' && sample.get(l.projectKey).transaction !== 'sale')) sample.set(l.projectKey, l);
  }
  // Projects with the most listings first, so that capped runs cover the market that matters.
  const counts = new Map();
  for (const l of allListings) if (l.projectKey) counts.set(l.projectKey, (counts.get(l.projectKey) ?? 0) + 1);
  const todo = [...sample.values()].sort((a, b) => counts.get(b.projectKey) - counts.get(a.projectKey)).slice(0, input.maxProjectDetailsPerRun);
  if (todo.length) await Actor.setStatusMessage(`Reading the details of ${todo.length} projects.`);
  await mapLimit(todo, input.concurrency, async (l) => {
    try {
      const page = parseListingPage(await http.get(l.url));
      details[l.projectKey] = { ...page.project, yearBuilt: page.yearBuilt ?? page.project.completedYear ?? null, fetchedAt: new Date().toISOString() };
      summary.projectDetailsFetched++;
      if (summary.projectDetailsFetched % 50 === 0) await memory.setValue('projects', details);
    } catch (error) {
      log.warning(`Project ${l.project}: ${error.message}`);
    }
  });
  await memory.setValue('projects', details);
  if (sample.size > todo.length) log.info(`${sample.size - todo.length} projects are left for the next runs (at most ${input.maxProjectDetailsPerRun} per run).`);
}

for (const l of allListings) {
  const info = details[l.projectKey] ?? {};
  l.developer = info.developer ?? null;
  l.completedYear = info.completedYear ?? info.yearBuilt ?? null;
  l.nearestLandmark = info.nearestLandmark ?? null;
  l.nearestLandmarkKm = info.nearestLandmarkKm ?? null;
}

const removedByProject = {};
const removedByDistrict = {};
for (const r of removedAll) {
  if (r.projectKey) removedByProject[r.projectKey] = (removedByProject[r.projectKey] ?? 0) + 1;
  if (r.district) removedByDistrict[r.district] = (removedByDistrict[r.district] ?? 0) + 1;
}
const projects = projectRecords(allListings, { details, removed: removedByProject }).map((p) => ({ ...p, scrapedAt }));
const districts = districtRecords(allListings, { removedByDistrict }).map((d) => ({ ...d, scrapedAt }));
summary.projects = projects.length;
summary.districts = districts.length;
summary.removed = removedAll.length;

// Projects go to the default dataset; districts, listings and the listings that left the market
// to their own datasets, each with its own table.
const push = async (dataset, records) => {
  for (let i = 0; i < records.length; i += 500) await dataset.pushData(records.slice(i, i + 500));
};
await push(await Actor.openDataset(), projects);
await push(await Actor.openDataset({ alias: 'districts' }), districts);
await push(await Actor.openDataset({ alias: 'removed' }), removedAll.map((r) => ({ recordType: 'removed', ...r, scrapedAt })));
if (input.saveListings) await push(await Actor.openDataset({ alias: 'listings' }), allListings);

summary.finishedAt = new Date().toISOString();
await Actor.setValue('SUMMARY', summary);
const listingsTotal = allListings.length;
const failed = summary.searches.filter((s) => s.error).length;
const message = `Saved ${listingsTotal} listings, ${projects.length} projects and ${districts.length} districts`
  + `${removedAll.length ? `; ${removedAll.length} listings left the market since the last run` : ''}`
  + `${failed ? `; ${failed} of ${searches.length} searches failed` : ''}.`;
if (listingsTotal === 0 && failed) await Actor.fail(message);
else await Actor.exit(message);
