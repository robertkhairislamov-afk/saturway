// UAE property deals: apartments, villas and townhouses for sale on Property Finder, each compared
// with real sales of the same layout (Dubai: DLD deals from the building's transaction page) or, in
// Abu Dhabi and Sharjah, with other listings of the same layout. Remembers listings and deals in
// the user's account, so price changes show and each building's deal history grows run by run.

import { Actor, log } from 'apify';

import { MIN_COMPARABLES, cleanDeal, confidenceOf, dealComparison, layoutSupply, listingComparison, listingHistory, median, mergeDeals, plausibleSize } from './compare.js';
import { createHttpClient } from './http.js';
import { EMIRATES, PROPERTY_TYPES, WITH_DEALS, areaSlug, listingSearchUrl, parseListingPage, parseTransactionPage, transactionsUrl } from './pf.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const PAUSE_MS = 1200;
const DEAL_CONCURRENCY = 2;
const HISTORY_SHARDS = 50;
const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toList = (v) => (Array.isArray(v) ? v : v ? String(v).split(/[,\n]+/) : []).map((x) => String(x).trim()).filter(Boolean);

function readInput(raw) {
  const emirate = String(raw.emirate ?? 'dubai').toLowerCase();
  if (!EMIRATES[emirate]) throw new Error(`Unknown emirate "${raw.emirate}". Use dubai, abu-dhabi or sharjah.`);
  const types = toList(raw.propertyTypes ?? ['apartments']).map((t) => t.toLowerCase());
  const badType = types.find((t) => !PROPERTY_TYPES[t]);
  if (badType) throw new Error(`Unknown property type "${badType}". Use ${Object.keys(PROPERTY_TYPES).join(', ')}.`);
  let areas = toList(raw.areas).map(areaSlug).filter(Boolean);
  if (!toList(raw.areas).length && raw.areas === undefined) areas = emirate === 'dubai' ? ['dubai-marina'] : [];
  const maxListings = Number(raw.maxListings ?? 300);
  if (!Number.isInteger(maxListings) || maxListings < 1) throw new Error('"maxListings" must be a whole number, 1 or more.');
  const minDiscount = Number(raw.minDiscount ?? 10);
  const minConfidence = String(raw.minConfidence ?? 'medium').toLowerCase();
  if (!CONFIDENCE_RANK[minConfidence]) throw new Error('"minConfidence" must be high, medium or low.');
  return {
    emirate,
    types: types.length ? types : ['apartments'],
    areas: areas.length ? areas : [null],
    maxListings,
    onlyBelowMarket: raw.onlyBelowMarket === true,
    minDiscount,
    minConfidence,
    includeRentData: raw.includeRentData !== false,
    historyName: String(raw.historyName ?? 'uae-property-history').trim() || 'uae-property-history',
    proxyConfiguration: raw.proxyConfiguration,
  };
}

await Actor.init();

try {
  const input = readInput((await Actor.getInput()) ?? {});
  const proxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length ? await Actor.createProxyConfiguration(input.proxyConfiguration) : undefined;
  const fetchPage = createHttpClient({ proxyConfiguration: proxy });
  const get = async (url) => {
    await sleep(PAUSE_MS);
    return (await fetchPage(url)).text;
  };
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const history = await Actor.openKeyValueStore(input.historyName);
  const buildingsDataset = await Actor.openDataset({ alias: 'buildings' });
  const summary = { emirate: EMIRATES[input.emirate], searches: [], listingsFound: 0, listingsAnalysed: 0, skipped: {}, buildingsChecked: 0, dealsUsed: 0, compared: { deals: 0, listings: 0 }, saved: 0, errors: [] };
  const skip = (reason) => { summary.skipped[reason] = (summary.skipped[reason] ?? 0) + 1; };

  // 1. Listings, search by search, until the maximum is reached.
  const byId = new Map();
  for (const type of input.types) {
    for (const area of input.areas) {
      const search = { type, area: area ?? '(whole emirate)', pages: 0, found: 0, total: null };
      summary.searches.push(search);
      for (let page = 1; byId.size < input.maxListings; page++) {
        let result;
        try {
          result = parseListingPage(await get(listingSearchUrl({ emirate: input.emirate, type, area, page })), input.emirate);
        } catch (error) {
          if (page === 1) summary.errors.push(`${type} ${search.area}: ${error.message}`);
          break;
        }
        search.pages = page;
        search.total = result.total;
        for (const l of result.listings) {
          if (byId.size >= input.maxListings) break;
          if (!byId.has(l.listingId)) { byId.set(l.listingId, l); search.found++; }
        }
        await Actor.setStatusMessage(`Listings: ${byId.size} (${type}, ${search.area}, page ${page} of ${result.pages ?? '?'})`);
        if (!result.listings.length || (result.pages && page >= result.pages)) break;
      }
    }
  }
  summary.listingsFound = byId.size;
  if (!byId.size) throw new Error(`No listings found. ${summary.errors[0] ?? 'Check the area names, for example dubai-marina or jumeirah-village-circle.'}`);

  const listings = [];
  for (const l of byId.values()) {
    if (l.priceHidden || !l.price) skip('price hidden');
    else if (!l.sizeSqft || l.bedrooms == null) skip('no size or bedrooms');
    else if (l.propertyType === 'Apartment' && !plausibleSize(l.bedrooms, l.sizeSqft)) skip('implausible size');
    else listings.push(l);
  }
  summary.listingsAnalysed = listings.length;

  // 2. Deals of every building with listings (Dubai), added to the deals remembered from earlier runs.
  const dealsBySlug = new Map();
  const buildingInfo = new Map();
  if (WITH_DEALS.has(input.emirate)) {
    const slugs = [...new Set(listings.map((l) => l.locationSlug).filter(Boolean))];
    let next = 0;
    const worker = async () => {
      while (next < slugs.length) {
        const slug = slugs[next++];
        try {
          const sold = parseTransactionPage(await get(transactionsUrl(input.emirate, slug, 'sold')));
          const rented = input.includeRentData ? await get(transactionsUrl(input.emirate, slug, 'rented')).then(parseTransactionPage).catch(() => null) : null;
          const fresh = [];
          for (const t of sold.deals) {
            const { deal, reason } = cleanDeal(t, sold.name);
            if (deal) fresh.push(deal); else skip(`deal: ${reason}`);
          }
          const key = `deals-${slug}`.slice(0, 250);
          const known = (await history.getValue(key)) ?? [];
          const merged = mergeDeals(known, fresh, now);
          await history.setValue(key, merged);
          dealsBySlug.set(slug, merged);
          buildingInfo.set(slug, { sold, rented });
          summary.buildingsChecked++;
          summary.dealsUsed += merged.length;
        } catch (error) {
          skip(`building page: ${error.status === 404 ? 'no transaction page' : 'error'}`);
        }
        await Actor.setStatusMessage(`Deals: ${summary.buildingsChecked} of ${slugs.length} buildings`);
      }
    };
    await Promise.all(Array.from({ length: DEAL_CONCURRENCY }, worker));
  }

  // 3. Compare, add layout supply and each listing's own history.
  const byBuilding = new Map();
  for (const l of listings) {
    const k = l.locationId ?? l.locationSlug;
    if (!byBuilding.has(k)) byBuilding.set(k, []);
    byBuilding.get(k).push(l);
  }
  const supply = layoutSupply(listings);
  const shards = new Map();
  const shardOf = async (id) => {
    const n = Number(BigInt(id.replace(/\D/g, '') || '0') % BigInt(HISTORY_SHARDS));
    if (!shards.has(n)) shards.set(n, { data: (await history.getValue(`listings-${input.emirate}-${n}`)) ?? {}, changed: false });
    return shards.get(n);
  };

  const records = [];
  for (const l of listings) {
    const deals = dealsBySlug.get(l.locationSlug) ?? [];
    const cmp = dealComparison(l, deals, now) ?? listingComparison(l, byBuilding.get(l.locationId ?? l.locationSlug) ?? []);
    if (cmp) summary.compared[cmp.basis]++;
    const confidence = confidenceOf(l, cmp);
    const shard = await shardOf(l.listingId);
    const h = listingHistory(shard.data[l.listingId], l, today);
    shard.data[l.listingId] = h.record;
    shard.changed = true;
    const info = buildingInfo.get(l.locationSlug);
    const sale = info?.sold?.insights?.saleAveragePrice;
    const rent = info?.rented?.insights?.newRentalsAveragePrice ?? info?.rented?.insights?.renewedRentalsAveragePrice;
    records.push({
      ...l,
      pricePerSqft: Math.round(l.price / l.sizeSqft),
      daysListed: l.listedAt ? Math.max(0, Math.round((now - Date.parse(l.listedAt)) / 86400000)) : null,
      comparisonBasis: cmp?.basis ?? null,
      marketValue: cmp?.marketValue ?? null,
      marketPricePerSqft: cmp?.marketPricePerSqft ?? null,
      discountPercent: cmp ? Math.round((1 - l.price / cmp.marketValue) * 1000) / 10 : null,
      comparables: cmp?.comparables ?? 0,
      comparablePrices: cmp?.comparablePrices ?? [],
      lastComparableDate: cmp?.lastComparableDate ?? null,
      confidence,
      ...(supply.get(l.listingId) ?? { sameLayoutListings: 1, sameLayoutMinPrice: l.price, sameLayoutMedianPrice: l.price }),
      buildingDealsLastYear: info?.sold?.insights?.totalTransactionCount ?? null,
      buildingRoiPercent: info?.rented?.insights?.roi ?? info?.sold?.insights?.roi ?? null,
      buildingGrossYieldPercent: sale && rent ? Math.round((rent / sale) * 1000) / 10 : null,
      firstSeenAt: h.firstSeenAt,
      previousPrice: h.previousPrice,
      priceChange: h.priceChange,
      priceChangedAt: h.priceChangedAt,
      checkedAt: new Date(now).toISOString(),
    });
  }
  for (const [n, shard] of shards) if (shard.changed) await history.setValue(`listings-${input.emirate}-${n}`, shard.data);

  // 4. Save: every analysed listing, or only those below market with enough confidence.
  const wanted = input.onlyBelowMarket
    ? records.filter((r) => r.discountPercent != null && r.discountPercent >= input.minDiscount && CONFIDENCE_RANK[r.confidence] >= CONFIDENCE_RANK[input.minConfidence])
    : records;
  // Trustworthy finds first (high, then medium), then the rest; within each, the biggest discount first.
  const trust = (r) => (r.discountPercent == null ? 0 : CONFIDENCE_RANK[r.confidence] >= 2 ? 2 : 1);
  wanted.sort((a, b) => trust(b) - trust(a) || (b.discountPercent ?? -999) - (a.discountPercent ?? -999));
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  const toSave = wanted.slice(0, budget);
  for (let i = 0; i < toSave.length; i += 500) await Actor.pushData(toSave.slice(i, i + 500));
  summary.saved = toSave.length;

  // Building summaries (free): deals, prices, rents, yield and how listings compare with deals.
  const buildings = [];
  for (const [slug, info] of buildingInfo) {
    const ls = records.filter((r) => r.locationSlug === slug);
    const deals = dealsBySlug.get(slug) ?? [];
    const si = info.sold.insights ?? {};
    const ri = info.rented?.insights ?? {};
    const rent = ri.newRentalsAveragePrice ?? ri.renewedRentalsAveragePrice ?? null;
    const listingPpsf = median(ls.map((r) => r.pricePerSqft));
    const dealPpsf = median(deals.map((d) => d.pricePerSqft));
    buildings.push({
      building: info.sold.name, community: info.sold.path, locationSlug: slug, emirate: EMIRATES[input.emirate],
      dealsLastYear: si.totalTransactionCount ?? null, averageSalePrice: si.saleAveragePrice ? Math.round(si.saleAveragePrice) : null,
      averageSalePricePerSqftSite: si.saleAveragePricePerSqft ? Math.round(si.saleAveragePricePerSqft) : null,
      salePriceChangePercent: si.saleAveragePriceChange != null ? Math.round(si.saleAveragePriceChange * 10) / 10 : null,
      averageAnnualRent: rent ? Math.round(rent) : null, roiPercent: ri.roi ?? si.roi ?? null,
      grossYieldPercent: rent && si.saleAveragePrice ? Math.round((rent / si.saleAveragePrice) * 1000) / 10 : null,
      dealsRemembered: deals.length, medianDealPricePerSqft: dealPpsf ? Math.round(dealPpsf) : null,
      listings: ls.length, medianListingPricePerSqft: listingPpsf ? Math.round(listingPpsf) : null,
      listingPremiumPercent: listingPpsf && dealPpsf ? Math.round((listingPpsf / dealPpsf - 1) * 1000) / 10 : null,
      belowMarketListings: ls.filter((r) => r.discountPercent >= 10 && CONFIDENCE_RANK[r.confidence] >= 2).length,
    });
  }
  if (buildings.length) await buildingsDataset.pushData(buildings);

  await Actor.setValue('SUMMARY', summary);
  const below = records.filter((r) => r.discountPercent >= 10 && CONFIDENCE_RANK[r.confidence] >= 2).length;
  const message = `Analysed ${records.length} listings (${summary.compared.deals} against deals, ${summary.compared.listings} against listings); ${below} at least 10% below market; saved ${toSave.length}.`;
  log.info(message);
  if (MIN_COMPARABLES && !summary.compared.deals && WITH_DEALS.has(input.emirate)) log.warning('No listing had 3 comparable deals; try larger areas or more listings.');
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(`${error.message} If this looks wrong, please report it in the Issues tab of this Actor and we will fix it quickly.`);
}
