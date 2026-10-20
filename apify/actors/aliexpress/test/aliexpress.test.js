import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  EMPTY_PRODUCT,
  isCheckPage,
  isSearchResult,
  pageUrl,
  parseSearchLink,
  parseSearchPage,
  recommendedShare,
  searchUrl,
  shipToCookie,
  soldFromText,
  toProduct,
} from '../src/aliexpress.js';
import { createPageClient, problemOf } from '../src/http.js';
import { passes, readInput } from '../src/sources.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('searchUrl and pageUrl build AliExpress search links', () => {
  assert.equal(searchUrl('  Phone Case '), 'https://www.aliexpress.com/w/wholesale-phone-case.html');
  assert.equal(searchUrl('USB-C hub 4K/60Hz'), 'https://www.aliexpress.com/w/wholesale-usb-c-hub-4k-60hz.html');
  assert.throws(() => searchUrl(' !! '), /empty/);
  const base = searchUrl('yoga mat');
  assert.equal(pageUrl(base, {}, 1), base);
  const url = new URL(pageUrl(base, { sort: 'orders', minPrice: 5, maxPrice: 20, shipFrom: 'ES' }, 3));
  assert.equal(url.searchParams.get('sortType'), 'total_tranpro_desc');
  assert.equal(url.searchParams.get('minPrice'), '5');
  assert.equal(url.searchParams.get('maxPrice'), '20');
  assert.equal(url.searchParams.get('shpf_co'), 'ES');
  assert.equal(url.searchParams.get('page'), '3');
  // Best match keeps the sorting of a pasted link.
  assert.equal(new URL(pageUrl(`${base}?sortType=price_asc`, { sort: 'relevance' }, 1)).searchParams.get('sortType'), 'price_asc');
});

test('parseSearchLink accepts search and category links and keeps their filters', () => {
  assert.equal(parseSearchLink('https://de.aliexpress.com/w/wholesale-phone-case.html?page=4&spm=a2g0o&catId=509&shpf_co=US'),
    'https://www.aliexpress.com/w/wholesale-phone-case.html?catId=509&shpf_co=US');
  assert.equal(parseSearchLink('https://www.aliexpress.com/category/100003109/women-clothing.html?trafficChannel=main'),
    'https://www.aliexpress.com/category/100003109/women-clothing.html');
  assert.equal(parseSearchLink('https://www.aliexpress.us/wholesale?SearchText=led+strip&isFreeShip=y'),
    'https://www.aliexpress.com/w/wholesale-led-strip.html?isFreeShip=y');
  assert.throws(() => parseSearchLink('https://www.aliexpress.com/item/1005001.html'), /product page/);
  assert.throws(() => parseSearchLink('https://www.amazon.com/s?k=phone+case'), /not an AliExpress link/);
  assert.throws(() => parseSearchLink('phone case'), /not a valid link/);
  assert.throws(() => parseSearchLink('https://www.aliexpress.com/'), /search or category link/);
});

test('shipToCookie sets the country, currency and English', () => {
  assert.equal(shipToCookie('FR', 'EUR'), 'aep_usuc_f=site=glo&c_tp=EUR&region=FR&b_locale=en_US');
});

test('parseSearchPage reads the embedded results and ignores what follows', () => {
  const page = parseSearchPage(fixture('search-full.html'));
  assert.equal(page.page, 1);
  assert.equal(page.pageSize, 60);
  assert.equal(page.total, 150);
  assert.equal(page.cards.length, 5);
  assert.equal(parseSearchPage('<html>no data</html>'), null);
  assert.equal(parseSearchPage('_init_data_= { data: {"root": {'), null);
});

test('isCheckPage and problemOf tell check pages, redirects and errors apart', () => {
  assert.equal(isCheckPage(fixture('check.html')), true);
  assert.equal(isCheckPage(fixture('search-full.html')), false);
  const ok = { status: 200, finalUrl: 'https://www.aliexpress.com/w/wholesale-a.html', html: fixture('search-full.html') };
  assert.equal(problemOf(ok), null);
  assert.match(problemOf({ ...ok, html: fixture('check.html') }).message, /check page/);
  assert.match(problemOf({ ...ok, finalUrl: 'https://www.aliexpress.us/w/wholesale-a.html' }).message, /aliexpress\.us/);
  assert.equal(problemOf({ ...ok, status: 404 }).retryable, false);
  assert.equal(problemOf({ ...ok, status: 429 }).retryable, true);
  assert.equal(problemOf({ ...ok, html: '<html></html>' }).retryable, true);
});

test('soldFromText reads the lower bound of the sold label', () => {
  assert.equal(soldFromText('10,000+ sold'), 10000);
  assert.equal(soldFromText('100K+ sold'), 100000);
  assert.equal(soldFromText('4K+ sold'), 4000);
  assert.equal(soldFromText('1.5K+ sold'), 1500);
  assert.equal(soldFromText('6 sold'), 6);
  assert.equal(soldFromText('New'), null);
  assert.equal(soldFromText(undefined), null);
});

test('toProduct maps full cards, ads and new products', () => {
  const cards = parseSearchPage(fixture('search-full.html')).cards;
  const [first, ad, , fresh, banner] = cards.map((card) => toProduct(card, { currency: 'GBP' }));
  assert.deepEqual(Object.keys(first), Object.keys(EMPTY_PRODUCT));
  assert.equal(first.productId, '1005001');
  assert.equal(first.title, 'Test product 1005001 & case');
  assert.equal(first.url, 'https://www.aliexpress.com/item/1005001.html');
  assert.equal(first.image, 'https://ae-pic-a1.aliexpress-media.com/kf/S1005001.jpg');
  assert.equal(first.images.length, 2);
  assert.equal(first.price, 2);
  assert.equal(first.originalPrice, 4.44);
  assert.equal(first.discountPercent, 55);
  assert.equal(first.currency, 'GBP');
  assert.equal(first.priceText, '£2.00');
  assert.equal(first.soldCount, 12345);
  assert.equal(first.soldText, '10,000+ sold');
  assert.equal(first.rating, 4.7);
  assert.equal(first.isChoice, true);
  assert.equal(first.isSponsored, false);
  assert.equal(first.deliveryDaysMin, 4);
  assert.equal(first.deliveryDaysMax, 7);
  assert.equal(first.deliveryFrom, '2026-10-24');
  assert.equal(first.deliveryTo, '2026-10-27');
  assert.equal(first.isNewShopperPrice, true);
  assert.deepEqual(first.badges, ['New shoppers save £2.44', 'Top selling on AliExpress', 'Choice']);
  assert.deepEqual(first.categoryIds, ['202192403', '380230']);
  assert.equal(first.listedAt, '2024-08-06');

  // Prices only in the tracking data, the sold count only in the label, the store of an ad.
  assert.equal(ad.price, 1.33);
  assert.equal(ad.originalPrice, 3.15);
  assert.equal(ad.discountPercent, 58);
  assert.equal(ad.currency, 'GBP');
  assert.equal(ad.priceText, null);
  assert.equal(ad.soldCount, 4000);
  assert.equal(ad.rating, null);
  assert.equal(ad.isChoice, false);
  assert.equal(ad.isSponsored, true);
  assert.equal(ad.isNewShopperPrice, false);
  assert.deepEqual(ad.badges, ['Free shipping']);
  assert.equal(ad.storeName, "Miss Z' Store");
  assert.equal(ad.sellerCompany, 'Test Trading Co., Ltd.');
  assert.equal(ad.deliveryDaysMin, null);
  assert.equal(ad.categoryIds, null);

  assert.equal(fresh.soldCount, null);
  assert.equal(fresh.rating, null);
  assert.equal(fresh.originalPrice, null);
  assert.equal(fresh.discountPercent, null);
  assert.equal(fresh.badges, null);
  assert.equal(banner, null);

  // Without a page currency, tracking amounts are not turned into prices; nor in yen.
  const bare = { productId: '1', trace: { utLogMap: { salePriceAmount: '500' } } };
  assert.equal(toProduct(bare).price, null);
  assert.equal(toProduct(bare, { currency: 'JPY' }).price, null);
  assert.equal(toProduct(bare, { currency: 'EUR' }).price, 5);
});

test('recommendation cards are told apart from search results', () => {
  const page = parseSearchPage(fixture('search-recommended.html'));
  assert.deepEqual(page.cards.map(isSearchResult), [false, false, true]);
  assert.equal(recommendedShare(page), 2 / 3);
  assert.equal(recommendedShare(parseSearchPage(fixture('search-full.html'))), 1 / 5);
  assert.equal(recommendedShare({ cards: [] }), 0);
});

// A fake fetch that answers with the given pages in turn.
const answers = (...names) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(options.headers.cookie);
    const name = names[Math.min(calls.length - 1, names.length - 1)];
    return { status: 200, url, text: async () => fixture(name) };
  };
  return { fetchImpl, calls };
};

test('loadPage loads a page again after a check page or recommendations', async () => {
  const { fetchImpl, calls } = answers('check.html', 'search-recommended.html', 'search-full.html');
  const client = createPageClient({ cookie: 'aep_usuc_f=x', fetchImpl, backoffMs: 1 });
  const page = await client.loadPage('https://www.aliexpress.com/w/wholesale-a.html');
  assert.equal(page.total, 150);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((cookie) => cookie === 'aep_usuc_f=x'));
  assert.equal(client.stats.checkPages, 1);
  assert.equal(client.stats.recommendationPages, 1);
});

test('loadPage keeps the best answer when every answer has recommendations', async () => {
  const { fetchImpl, calls } = answers('search-recommended.html');
  const client = createPageClient({ fetchImpl, maxReloads: 2, backoffMs: 1 });
  const page = await client.loadPage('https://www.aliexpress.com/w/wholesale-a.html');
  assert.equal(page.cards.length, 3);
  assert.equal(calls.length, 3);
});

test('loadPage gives up after repeated check pages and at once on 404', async () => {
  const blocked = createPageClient({ fetchImpl: answers('check.html').fetchImpl, maxRetries: 3, backoffMs: 1 });
  await assert.rejects(blocked.loadPage('https://www.aliexpress.com/w/wholesale-a.html'), /check page/);
  assert.equal(blocked.stats.requests, 3);
  let calls = 0;
  const missing = createPageClient({ fetchImpl: async (url) => { calls++; return { status: 404, url, text: async () => '' }; }, backoffMs: 1 });
  await assert.rejects(missing.loadPage('https://www.aliexpress.com/w/wholesale-a.html'), /404/);
  assert.equal(calls, 1);
});

test('readInput falls back to the example and validates fields', () => {
  const warnings = [];
  const example = readInput({}, (message) => warnings.push(message));
  assert.equal(example.searches.length, 1);
  assert.equal(example.searches[0].query, 'phone case');
  assert.equal(example.maxItemsPerSearch, 60);
  assert.equal(example.shipTo, 'US');
  assert.equal(example.currency, 'USD');
  assert.equal(warnings.length, 1);

  const input = readInput({
    searchQueries: ['yoga mat', 'Yoga Mat', ''],
    startUrls: ['https://www.aliexpress.com/w/wholesale-yoga-mat.html', { url: 'https://www.aliexpress.com/category/100003109/women-clothing.html' }, 'https://www.aliexpress.com/item/1.html'],
    shipTo: 'fr',
    sort: 'orders',
    minPrice: 2,
    maxPrice: '10',
    shipFrom: 'es',
    minSold: 100,
  }, (message) => warnings.push(message));
  assert.deepEqual(input.searches.map((search) => search.query), ['yoga mat', null]);
  assert.deepEqual(input.searches.map((search) => Boolean(search.isCategory)), [false, true]);
  assert.equal(input.shipTo, 'FR');
  assert.equal(input.currency, 'EUR');
  assert.equal(input.shipFrom, 'ES');
  assert.equal(input.maxPrice, 10);
  assert.equal(input.maxItemsPerSearch, 100);
  assert.ok(warnings.some((message) => /product page/.test(message)));
  assert.equal(readInput({ searchQueries: ['a'], shipTo: 'GB', currency: 'usd' }).currency, 'USD');
  assert.equal(readInput({ startUrls: ['https://www.aliexpress.com/w/wholesale-led-strip.html'] }).searches[0].query, 'led strip');

  assert.throws(() => readInput({ searchQueries: ['a'], shipTo: 'XX' }), /ship-to country/);
  assert.throws(() => readInput({ searchQueries: ['a'], sort: 'newest' }), /Unknown sort/);
  assert.throws(() => readInput({ searchQueries: ['a'], minPrice: 10, maxPrice: 5 }), /above/);
  assert.throws(() => readInput({ searchQueries: ['a'], maxItemsPerSearch: 5000 }), /maxItemsPerSearch/);
  assert.throws(() => readInput({ searchQueries: ['a'], minRating: 6 }), /minRating/);
  assert.throws(() => readInput({ startUrls: ['https://www.aliexpress.com/item/1.html'] }, () => {}), /None of the searches/);
});

test('passes applies the price, rating, sold and ad filters', () => {
  const product = { price: 5, rating: 4.6, soldCount: 300, isSponsored: false };
  const none = { minPrice: 0, maxPrice: 0, minRating: 0, minSold: 0, skipSponsored: false };
  assert.equal(passes(product, none), true);
  assert.equal(passes(product, { ...none, minPrice: 6 }), false);
  assert.equal(passes(product, { ...none, maxPrice: 4.99 }), false);
  assert.equal(passes(product, { ...none, minRating: 4.5, minSold: 300 }), true);
  assert.equal(passes({ ...product, rating: null }, { ...none, minRating: 4 }), false);
  assert.equal(passes({ ...product, soldCount: null }, { ...none, minSold: 1 }), false);
  assert.equal(passes({ ...product, isSponsored: true }, { ...none, skipSponsored: true }), false);
});
