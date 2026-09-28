// Redfin Scraper: homes for sale, sold homes and rentals from Redfin, by location or search link.
// Every search is read through Redfin's own search API, 350 listings per request, with the
// filters of the input or of the link. Searches too big for Redfin are split by price.

import { createHash } from 'node:crypto';
import { Actor, log } from 'apify';
import { createHttpClient } from './http.js';
import {
  PAGE_SIZE, TooManyHomesError, formatFilter, inputFilters, isZipCode, listingKey, mergeFilters, pageUrl, parseRedfinJson,
  parseRegionPath, parseRentalsPage, parseSalePage, parseSearchUrl, pickPlace, placeLookupUrl, regionApiUrl, searchPageUrl,
  searchParamsOf, splitRange, toRentalListing, toSaleListing,
} from './redfin.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
const EXAMPLE = { location: 'Austin, TX', maxItems: 50 };
const SEARCH_CONCURRENCY = 3;
const TYPES = { forSale: 'sale', sold: 'sold', forRent: 'rent' };

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

const listOf = (value) => (Array.isArray(value) ? value : String(value ?? '').split('\n'))
  .map((item) => (item && typeof item === 'object' ? item.url : item))
  .map((item) => String(item ?? '').trim())
  .filter(Boolean);

function normalizeInput(raw) {
  const locations = [];
  const urls = listOf(raw.searchUrls ?? raw.startUrls);
  // A link pasted into the locations counts as a search link.
  for (const value of listOf(raw.locations)) (/^https?:\/\//i.test(value) ? urls : locations).push(value);
  const usedExample = locations.length === 0 && urls.length === 0;
  if (usedExample) locations.push(EXAMPLE.location);
  const limit = (value) => (Number(value) > 0 ? Math.floor(Number(value)) : 0);
  return {
    ...raw,
    locations,
    urls,
    usedExample,
    type: TYPES[raw.searchType] ?? 'sale',
    maxItems: limit(raw.maxItems) || (usedExample ? EXAMPLE.maxItems : 0),
    maxItemsPerSearch: limit(raw.maxItemsPerSearch),
  };
}

// "Only new listings": the listings already seen by each search of a saved task, kept in a named
// key-value store so that they survive between runs.
async function openSeenListings() {
  const store = await Actor.openKeyValueStore('redfin-listings-seen');
  const scope = Actor.getEnv().actorTaskId || 'default';
  const keyOf = (searchKey) => `seen-${createHash('sha256').update(`${scope}|${searchKey}`).digest('hex').slice(0, 32)}`;
  return {
    async load(searchKey) {
      const value = await store.getValue(keyOf(searchKey));
      return new Set(Array.isArray(value?.ids) ? value.ids : []);
    },
    async save(searchKey, ids) {
      await store.setValue(keyOf(searchKey), { search: searchKey, task: scope, updatedAt: new Date().toISOString(), ids: [...ids] });
    },
  };
}

// Listings to remember after a run. When the whole search was read, listings that are gone are
// forgotten; listings skipped because of a limit are not remembered, so the next run returns them.
function nextSeenIds({ before, listed, handled, complete }) {
  const next = new Set(complete ? [...before].filter((id) => listed.has(id)) : before);
  for (const id of handled) next.add(id);
  return next;
}

const placeName = (row) => {
  const sub = String(row.subName ?? '').replace(/(^|,\s*)USA$/, '');
  if (!sub) return row.name;
  return sub.toLowerCase().startsWith(String(row.name).toLowerCase()) ? sub : `${row.name}, ${sub}`;
};

await Actor.init();

try {
  const input = normalizeInput((await Actor.getInput()) ?? {});
  if (input.usedExample) log.warning(`No locations or search links in the input, so the example is used: ${EXAMPLE.location}.`);

  const proxyConfiguration = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const http = createHttpClient({
    proxyConfiguration,
    fallbackProxy: () => Actor.createProxyConfiguration({ useApifyProxy: true }),
    onFallback: () => log.info('Redfin is limiting direct requests; continuing through Apify Proxy.'),
  });

  // Searches from links keep their own filters; the input's listing filters are added to them.
  const searches = [];
  const rejected = [];
  for (const value of input.urls) {
    try {
      const search = parseSearchUrl(value);
      search.filter = mergeFilters(search.filter, inputFilters(input, search.type, { fromUrl: true }));
      searches.push(search);
    } catch (error) {
      const message = error instanceof TypeError ? 'this is not a valid link.' : error.message;
      log.warning(`Skipping "${value}": ${message}`);
      rejected.push({ input: value, error: message, homesSaved: 0 });
    }
  }

  // Locations are looked up like in the search box of redfin.com; ZIP codes need no lookup.
  const places = await mapWithConcurrency(input.locations, 5, async (location) => {
    try {
      if (isZipCode(location)) return { location, region: { regionType: 2, regionId: location.trim(), path: `/zipcode/${location.trim()}` }, name: location.trim() };
      const answer = parseRedfinJson(await http.getText(placeLookupUrl(location)));
      const row = pickPlace(location, answer.payload);
      if (!row) return { location, error: 'Redfin has no US city, ZIP code, county, neighborhood or state with this name. Check the spelling or add the state, such as "Austin, TX".' };
      return { location, region: parseRegionPath(row.url), name: placeName(row) };
    } catch (error) {
      return { location, error: `the place lookup failed: ${error.message}` };
    }
  });
  for (const place of places) {
    if (place.error) {
      log.warning(`Skipping "${place.location}": ${place.error}`);
      rejected.push({ input: place.location, error: place.error, homesSaved: 0 });
      continue;
    }
    searches.push({
      input: place.location,
      label: place.location,
      place: place.name,
      regionType: place.region.regionType,
      regionId: place.region.regionId,
      path: place.region.path,
      type: input.type,
      filter: inputFilters(input, input.type),
      fromUrl: false,
    });
  }

  // The same place with the same filters is searched once.
  const unique = new Map();
  for (const search of searches) {
    search.key = `${search.regionType}/${search.regionId}|${search.type}|${formatFilter(search.filter)}`;
    search.url = searchPageUrl(search);
    if (!unique.has(search.key)) unique.set(search.key, search);
  }
  const jobs = [...unique.values()];
  if (jobs.length === 0) throw new Error(`No search could be made from the input. ${rejected[0]?.error ?? ''}`.trim());

  const seenListings = input.onlyNew ? await openSeenListings() : null;
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  const savedKeys = new Set();
  let saved = 0;
  let finished = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);

  // Pages of one search. A price range with too many homes for Redfin is cut in two, and each part
  // is read from its first page; homes read twice are saved once.
  async function* pagesOf(search, query) {
    const ranges = [{ min: query.minPrice, max: query.maxPrice }];
    let split = false;
    while (ranges.length > 0) {
      const range = ranges.shift();
      for (let start = 0; ; start += PAGE_SIZE) {
        let page;
        try {
          const text = await http.getText(pageUrl(search.type, query.params, { start, minPrice: range.min, maxPrice: range.max }));
          page = search.type === 'rent' ? parseRentalsPage(text) : parseSalePage(text);
        } catch (error) {
          if (!(error instanceof TooManyHomesError)) throw error;
          const parts = splitRange(range, search.type);
          if (!parts) throw new Error(`Redfin has too many homes priced $${range.min ?? 0}–${range.max} in this search. Narrow it with filters.`);
          if (!split) log.info(`${search.label}: too many homes for one Redfin search; reading it by price ranges.`);
          split = true;
          ranges.unshift(...parts);
          break;
        }
        yield page;
        if (page.homes.length < PAGE_SIZE) break;
      }
    }
  }

  async function scrapeSearch(search) {
    const stats = { input: search.input, place: search.place ?? null, searchUrl: search.url, homesFound: 0, homesSaved: 0, duplicates: 0, error: null };
    const before = seenListings ? await seenListings.load(search.key) : null;
    if (before?.size === 0) log.info(`${search.label}: first run with "Only new listings"; saving all current listings and remembering them for next time.`);
    const listed = new Set();
    const handled = new Set();
    let complete = true;
    const room = () => Math.min(roomLeft(), input.maxItemsPerSearch > 0 ? input.maxItemsPerSearch - stats.homesSaved : Infinity);

    try {
      const query = searchParamsOf(parseRedfinJson(await http.getText(regionApiUrl(search))), search.type);
      if (!query) throw new Error('Redfin does not know this place.');
      for await (const page of pagesOf(search, query)) {
        if (room() <= 0) {
          complete = false;
          break;
        }
        const scrapedAt = new Date().toISOString();
        const fresh = [];
        for (const raw of page.homes) {
          const listing = search.type === 'rent' ? toRentalListing(raw) : toSaleListing(raw, { mls: page.mls });
          const key = listingKey(listing);
          if (!listing.propertyId || listed.has(key)) continue;
          listed.add(key);
          stats.homesFound++;
          if (before?.has(key)) continue;
          if (savedKeys.has(key)) {
            stats.duplicates++;
            handled.add(key);
            continue;
          }
          fresh.push({ key, listing });
        }
        const taken = fresh.slice(0, Math.max(0, room()));
        for (const { key } of taken) {
          savedKeys.add(key);
          handled.add(key);
        }
        saved += taken.length;
        stats.homesSaved += taken.length;
        if (taken.length > 0) {
          await Actor.pushData(taken.map(({ listing }) => {
            const { photos, ...rest } = listing;
            return { ...rest, ...(input.includeAllPhotos ? { photos } : {}), search: search.label, searchUrl: search.url, scrapedAt };
          }));
        }
        if (taken.length < fresh.length) {
          complete = false;
          break;
        }
      }
    } catch (error) {
      stats.error = error.message;
      complete = false;
      log.warning(`${search.label}: ${error.message}`);
    }

    if (seenListings && (!stats.error || handled.size > 0)) await seenListings.save(search.key, nextSeenIds({ before, listed, handled, complete }));
    const place = search.place && search.place !== search.label ? ` (${search.place})` : '';
    const duplicates = stats.duplicates ? `, ${stats.duplicates} already saved by another search` : '';
    const known = before ? `, ${[...listed].filter((key) => !before.has(key)).length} new` : '';
    log.info(`${search.label}${place}: ${stats.homesFound} listings${known}, ${stats.homesSaved} saved${duplicates}.`);
    return stats;
  }

  const results = await mapWithConcurrency(jobs, SEARCH_CONCURRENCY, async (search) => {
    if (roomLeft() <= 0) return { input: search.input, place: search.place ?? null, searchUrl: search.url, homesFound: 0, homesSaved: 0, error: null, skipped: 'limit reached' };
    const stats = await scrapeSearch(search);
    finished++;
    await Actor.setStatusMessage(`Saved ${saved} listings from ${finished} of ${jobs.length} searches`);
    return stats;
  });

  await Actor.setValue('SUMMARY', { homesSaved: saved, searches: [...results, ...rejected] });
  const { requests, retried, limited } = http.stats;
  if (retried > 0) log.info(`${requests} requests; ${retried} tried again after ${limited} rate limits.`);

  const failed = results.filter((result) => result.error);
  if (failed.length === results.length) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} searches failed. First error: ${failed[0].error}`);
  }
  let stopped = null;
  if (saved >= budget) stopped = 'stopped at the maximum cost per run';
  else if (input.maxItems > 0 && saved >= input.maxItems) stopped = `stopped at the limit of ${input.maxItems} listings`;
  const notes = [];
  if (failed.length > 0) notes.push(`${failed.length} failed`);
  if (rejected.length > 0) notes.push(`${rejected.length} skipped as invalid`);
  if (stopped) notes.push(stopped);
  const searchesText = `${jobs.length} ${jobs.length === 1 ? 'search' : 'searches'}`;
  const message = saved === 0 && failed.length === 0 && !stopped
    ? `No ${input.onlyNew ? 'new ' : ''}listings matched the filters in ${searchesText}.`
    : `Saved ${saved} ${input.onlyNew ? 'new ' : ''}listings from ${searchesText}${notes.length > 0 ? ` (${notes.join(', ')})` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.message);
  await Actor.fail(error.message);
}
