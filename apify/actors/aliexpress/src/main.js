import { Actor, log } from 'apify';

import { MAX_PAGES, isSearchResult, pageUrl, shipToCookie, toProduct } from './aliexpress.js';
import { createPageClient } from './http.js';
import { EMPTY_PRODUCT, passes, readInput } from './sources.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
// AliExpress answers residential addresses in the United Kingdom for every ship-to country;
// addresses in the United States are sent to aliexpress.us.
const DEFAULT_PROXY = { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'], apifyProxyCountry: 'GB' };
// Pages in a row that add nothing new (repeats or filtered out) before a search stops.
const MAX_EMPTY_PAGES = 5;

await Actor.init();

async function proxyFor(config) {
  if (config && !config.useApifyProxy && !config.proxyUrls?.length) {
    log.warning('Running without a proxy. AliExpress shows a check page after a few pages from one address, so results may stop early.');
    return undefined;
  }
  try {
    return await Actor.createProxyConfiguration(config ?? DEFAULT_PROXY);
  } catch (error) {
    log.warning(`This proxy is not available (${error.message}); using Apify Proxy datacenter addresses instead.`);
    return Actor.createProxyConfiguration({ useApifyProxy: true });
  }
}

try {
  const input = readInput((await Actor.getInput()) ?? {}, (message) => log.warning(message));
  const client = createPageClient({
    proxyConfiguration: await proxyFor(input.proxyConfiguration),
    cookie: shipToCookie(input.shipTo, input.currency),
  });
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  let recommendations = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);
  const summary = [];
  const filters = { sort: input.sort, minPrice: input.minPrice, maxPrice: input.maxPrice, shipFrom: input.shipFrom };
  log.info(`${input.searches.length} search(es), shipping to ${input.shipToName}, prices in ${input.currency}.`);

  for (const [index, search] of input.searches.entries()) {
    if (roomLeft() <= 0) break;
    const firstUrl = pageUrl(search.baseUrl, filters, 1);
    const row = { source: search.label, url: firstUrl, totalResults: null, pages: 0, found: 0, saved: 0, error: null };
    summary.push(row);
    const seen = new Set();
    let position = 0;
    let lastPage = MAX_PAGES;
    let emptyPages = 0;
    try {
      for (let pageNumber = 1; pageNumber <= lastPage; pageNumber++) {
        const room = Math.min(roomLeft(), input.maxItemsPerSearch - row.saved);
        if (room <= 0) break;
        await Actor.setStatusMessage(`Saved ${saved} products. ${search.label}: page ${pageNumber}, ${row.saved} saved.`).catch(() => {});
        const page = await client.loadPage(pageUrl(search.baseUrl, filters, pageNumber));
        if (pageNumber === 1) {
          row.totalResults = page.total;
          if (page.total === 0 && search.isCategory) {
            log.warning(`${search.label}: AliExpress shows no products in this category when shipping to ${input.shipToName}. Category pages are empty for some ship-to countries (France and Spain in our tests); search keywords instead, or choose another ship-to country.`);
          }
          lastPage = Math.min(MAX_PAGES, Math.max(1, Math.ceil(page.total / (page.pageSize || 60))));
        }
        // Past the last page AliExpress shows no products, or page 1 again.
        if (page.cards.length === 0 || (pageNumber > 1 && page.page !== pageNumber)) break;
        row.pages++;
        const currency = page.cards.map((card) => card.prices?.salePrice?.currencyCode).find(Boolean) ?? input.currency;
        const scrapedAt = new Date().toISOString();
        const records = [];
        let belowMinSold = 0;
        const results = page.cards.filter(isSearchResult);
        recommendations += page.cards.length - results.length;
        for (const card of results) {
          const product = toProduct(card, { currency });
          if (!product || seen.has(product.productId)) continue;
          seen.add(product.productId);
          position++;
          row.found++;
          if (input.minSold > 0 && !(product.soldCount >= input.minSold)) belowMinSold++;
          if (!passes(product, input)) continue;
          records.push({
            ...EMPTY_PRODUCT,
            ...product,
            position,
            page: pageNumber,
            searchQuery: search.query,
            searchUrl: firstUrl,
            shipTo: input.shipTo,
            scrapedAt,
          });
        }
        const batch = records.slice(0, room);
        if (batch.length > 0) await Actor.pushData(batch);
        row.saved += batch.length;
        saved += batch.length;
        emptyPages = batch.length > 0 ? 0 : emptyPages + 1;
        if (emptyPages >= MAX_EMPTY_PAGES) {
          log.info(`${search.label}: ${MAX_EMPTY_PAGES} pages in a row added no products that pass the filters; moving on.`);
          break;
        }
        // Sorted by orders, no later page can reach the minimum sold count once a whole page misses it.
        if (input.sort === 'orders' && input.minSold > 0 && results.length > 0 && belowMinSold === results.length) break;
      }
      log.info(`${search.label}: ${row.totalResults ?? 0} results on AliExpress, ${row.pages} page(s) read, ${row.saved} product(s) saved; ${saved} in total.`);
    } catch (error) {
      row.error = error.message;
      log.warning(`${search.label}: ${error.message}${row.saved > 0 ? ` (${row.saved} product(s) saved before the error)` : ''}`);
    }
    if (input.searches.length > 1) await Actor.setStatusMessage(`Saved ${saved} products; ${index + 1} of ${input.searches.length} searches done.`).catch(() => {});
  }
  if (roomLeft() <= 0) log.info('Reached the item limit or the maximum charge for this run; stopping.');
  if (recommendations > 0) {
    log.info(`AliExpress mixed ${recommendations} recommendation(s) of other products into the search pages; they are not search results and were not saved.`);
  }

  await Actor.setValue('SUMMARY', { saved, shipTo: input.shipTo, currency: input.currency, searches: summary, requests: client.stats });
  const failed = summary.filter((row) => row.error);
  if (summary.length > 0 && failed.length === summary.length && saved === 0) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} searches failed. First error: ${failed[0].error}`);
  }
  const message = `Saved ${saved} products from ${summary.length} search(es)${failed.length > 0 ? ` (${failed.length} stopped by an error)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
