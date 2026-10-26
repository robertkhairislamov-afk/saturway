// Thai property market analyzer, stage 1: reads Dot Property searches (location × type × deal),
// adds the tourist district and the project's facts, compares each run with the earlier ones and
// saves listings, projects, districts and the listings that left the market.

import { Actor, log } from 'apify';

import { districtOf } from './areas.js';
import { MAX_RESULTS, PAGE_SIZE, parseListPage, parseListingPage, searchUrl } from './dotproperty.js';
import { applyHistory, keepAsSeen, loadHistory, saveHistory } from './history.js';
import { HttpError, createHttpClient, mapLimit } from './http.js';
import { findLots } from './match.js';
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
  maxRemovalChecksPerRun: 1500,
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

// Price ranges for searches above the result limit: start from typical cut points and halve any
// range that is still too big. Each range comes with its first page, which tells its size.
const CUTS = {
  sale: [0, 1500000, 2000000, 2500000, 3000000, 3500000, 4000000, 5000000, 6000000, 8000000, 12000000, 20000000],
  rent: [0, 8000, 10000, 12000, 15000, 18000, 22000, 28000, 35000, 50000, 80000],
};
const rangeLabel = ({ minPrice, maxPrice }) => `฿${(minPrice ?? 0).toLocaleString('en-US')}–${maxPrice != null ? `฿${maxPrice.toLocaleString('en-US')}` : 'up'}`;
async function priceSlices(search, label) {
  const cuts = CUTS[search.transaction];
  const queue = cuts.map((lo, i) => ({ minPrice: lo, maxPrice: cuts[i + 1] != null ? cuts[i + 1] - 1 : undefined }));
  const slices = [];
  while (queue.length) {
    const range = queue.shift();
    const first = parseListPage(await http.get(searchUrl({ ...search, ...range })));
    const { minPrice: lo, maxPrice: hi } = range;
    if ((first.total ?? 0) > MAX_RESULTS && (hi == null || hi - lo > 1000)) {
      const mid = hi == null ? Math.max(lo * 2, 1000000) : Math.round((lo + hi) / 2 / 1000) * 1000;
      queue.unshift({ minPrice: lo, maxPrice: mid - 1 }, { minPrice: mid, maxPrice: hi });
      continue;
    }
    if ((first.total ?? 0) > MAX_RESULTS) log.warning(`${label}, ${rangeLabel(range)}: ${first.total} listings at one price; only the first ${MAX_RESULTS} can be read.`);
    slices.push({ range, total: first.total, first });
  }
  log.info(`${label}: ${slices.length} price ranges.`);
  return slices;
}

// Missing from the list pages is not gone yet: a listing can move between pages while they are
// read. Its own page tells: not found, or no longer on offer, means it left the market; still on
// offer means the list pages missed it.
async function confirmGone(missing, seen, label) {
  const gone = [];
  const withLink = missing.filter((m) => m.url);
  const todo = withLink.slice(0, input.maxRemovalChecksPerRun);
  if (todo.length) await Actor.setStatusMessage(`${label}: checking ${todo.length} listings that are missing since the last run.`);
  await mapLimit(todo, input.concurrency, async (m) => {
    try {
      const page = parseListingPage(await http.get(m.url));
      if (page.available === false) gone.push({ ...m, status: page.availability === 'SoldOut' ? 'sold' : 'off market' });
      else keepAsSeen(seen, m.key, scrapedAt);
    } catch (error) {
      if (error instanceof HttpError && (error.status === 404 || error.status === 410)) gone.push({ ...m, status: 'page removed' });
      else keepAsSeen(seen, m.key, scrapedAt);
    }
  });
  // Beyond the cap: checked in the next run.
  for (const m of withLink.slice(todo.length)) keepAsSeen(seen, m.key, scrapedAt);
  log.info(`${label}: ${missing.length} listings missing since the last run, ${gone.length} confirmed gone${withLink.length > todo.length ? `, ${withLink.length - todo.length} left for the next run` : ''}.`);
  return gone;
}

for (const search of searches) {
  const label = `${search.propertyType} for ${search.transaction} in ${search.location}`;
  const row = { search: label, url: searchUrl(search), reported: null, priceRanges: 1, pages: 0, listings: 0, complete: false, error: null };
  summary.searches.push(row);
  try {
    const first = parseListPage(await http.get(searchUrl(search)));
    row.reported = first.total;
    const byKey = new Map();
    const add = (listings) => { for (const l of listings) byKey.set(l.key, l); };
    // Searches above the site's result limit are read in price ranges below it.
    const slices = (first.total ?? 0) > MAX_RESULTS && !(input.maxPagesPerSearch > 0)
      ? await priceSlices(search, label)
      : [{ range: {}, total: first.total, first }];
    row.priceRanges = slices.length;
    let failedPages = 0;
    const pagesWanted = slices.reduce((sum, slice) => sum + Math.ceil((slice.total ?? 0) / PAGE_SIZE), 0);
    for (const slice of slices) {
      add(slice.first.listings);
      row.pages++;
      const pageCount = Math.ceil((slice.total ?? 0) / PAGE_SIZE);
      const pages = input.maxPagesPerSearch > 0 ? Math.min(pageCount, input.maxPagesPerSearch) : pageCount;
      if (pages < pageCount) failedPages += pageCount - pages;
      await mapLimit(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2), input.concurrency, async (page) => {
        try {
          add(parseListPage(await http.get(searchUrl({ ...search, ...slice.range, page }))).listings);
          row.pages++;
        } catch (error) {
          failedPages++;
          log.warning(`${label}, ${rangeLabel(slice.range)}, page ${page}: ${error.message}`);
        }
        if (row.pages % 100 === 0) await Actor.setStatusMessage(`${label}: ${row.pages} of about ${pagesWanted} pages, ${byKey.size} listings.`);
      });
    }
    // A search is complete when every page of every range was read and we have at least 95% of
    // what the site reports (listings move between pages while we read).
    row.complete = failedPages === 0 && byKey.size >= 0.95 * (first.total ?? 0);
    const listings = [...byKey.values()].map((l) => {
      const projectName = l.project && !/^(n\/a|untitled)$/i.test(l.project) ? l.project : null;
      return { recordType: 'listing', source: 'dotproperty', transaction: search.transaction, propertyType: search.propertyType, location: search.location, ...l, project: projectName, projectKey: projectName ? projectKey(projectName) : null, ...districtOf(l), scrapedAt };
    });
    row.listings = listings.length;

    const before = await loadHistory(memory, search);
    const { seen, missing } = applyHistory(listings, before, scrapedAt);
    if (row.complete) {
      // Only a complete read can tell what is missing; each missing listing is confirmed on its page.
      const gone = await confirmGone(missing, seen, label);
      row.missing = missing.length;
      row.leftMarket = gone.length;
      for (const r of gone) removedAll.push({ ...r, transaction: search.transaction, propertyType: search.propertyType, location: search.location });
      await saveHistory(memory, search, seen);
    } else {
      // A partial read must not forget what it did not see.
      await saveHistory(memory, search, { ...before, ...Object.fromEntries(Object.entries(seen).filter(([k]) => byKey.has(k))) });
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

// Lots: the same unit listed by several advertisers, per deal type.
const lots = [];
for (const transaction of input.transactions) {
  const projectMedians = Object.fromEntries(projects.map((p) => [p.projectKey, transaction === 'sale' ? p.medianSalePricePerSqm : p.medianRentPerSqm]));
  const found = findLots(allListings.filter((l) => l.transaction === transaction), { projectMedians });
  for (const l of allListings) if (l.transaction === transaction) l.lotId = found.lotOf.get(l.key) ?? null;
  lots.push(...found.lots.map((lot) => ({ ...lot, scrapedAt })));
}
const duplicates = new Map();
for (const lot of lots) {
  if (lot.transaction !== 'sale') continue;
  duplicates.set(lot.projectKey, (duplicates.get(lot.projectKey) ?? 0) + lot.listings - 1);
}
for (const p of projects) {
  p.duplicateSaleListings = duplicates.get(p.projectKey) ?? 0;
  p.uniqueSaleUnits = p.saleListings - p.duplicateSaleListings;
}
summary.lots = lots.length;
summary.listingsInLots = lots.reduce((sum, lot) => sum + lot.listings, 0);
summary.districts = districts.length;
summary.removed = removedAll.length;

// Projects go to the default dataset; districts, listings and the listings that left the market
// to their own datasets, each with its own table.
const push = async (dataset, records) => {
  for (let i = 0; i < records.length; i += 500) await dataset.pushData(records.slice(i, i + 500));
};
await push(await Actor.openDataset(), projects);
await push(await Actor.openDataset({ alias: 'districts' }), districts);
await push(await Actor.openDataset({ alias: 'lots' }), lots);
await push(await Actor.openDataset({ alias: 'removed' }), removedAll.map((r) => ({ recordType: 'removed', ...r, scrapedAt })));
if (input.saveListings) await push(await Actor.openDataset({ alias: 'listings' }), allListings.map(({ photoUrls, photoKeys, ...l }) => l));

summary.finishedAt = new Date().toISOString();
await Actor.setValue('SUMMARY', summary);
const listingsTotal = allListings.length;
const failed = summary.searches.filter((s) => s.error).length;
const message = `Saved ${listingsTotal} listings, ${projects.length} projects, ${districts.length} districts and ${lots.length} units listed more than once`
  + `${removedAll.length ? `; ${removedAll.length} listings left the market since the last run` : ''}`
  + `${failed ? `; ${failed} of ${searches.length} searches failed` : ''}.`;
if (listingsTotal === 0 && failed) await Actor.fail(message);
else await Actor.exit(message);
