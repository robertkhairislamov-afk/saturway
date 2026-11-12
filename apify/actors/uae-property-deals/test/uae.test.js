import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { cleanDeal, confidenceOf, dealComparison, layoutSupply, listingComparison, listingHistory, mergeDeals } from '../src/compare.js';
import { areaSlug, listingSearchUrl, parseListingPage, parseTransactionPage, transactionsUrl } from '../src/pf.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-12T00:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

test('Property Finder addresses', () => {
  assert.equal(areaSlug('Dubai Marina'), 'dubai-marina');
  assert.equal(areaSlug('https://www.propertyfinder.ae/en/buy/dubai/apartments-for-sale-jumeirah-village-circle.html'), 'jumeirah-village-circle');
  assert.equal(areaSlug('https://www.propertyfinder.ae/en/transactions/sold/dubai/dubai-marina-ciel-tower'), 'dubai-marina-ciel-tower');
  assert.equal(listingSearchUrl({ emirate: 'dubai', type: 'villas', area: 'arabian-ranches', page: 2 }), 'https://www.propertyfinder.ae/en/buy/dubai/villas-for-sale-arabian-ranches.html?page=2');
  assert.equal(listingSearchUrl({ emirate: 'sharjah', type: 'apartments', area: null }), 'https://www.propertyfinder.ae/en/buy/sharjah/apartments-for-sale.html');
  assert.equal(transactionsUrl('dubai', 'dubai-marina', 'rented'), 'https://www.propertyfinder.ae/en/transactions/rented/dubai/dubai-marina');
});

test('listing pages: listings without agents, projects left out', () => {
  const page = parseListingPage(fixture('listings.html'), 'dubai');
  assert.equal(page.total, 3804);
  assert.equal(page.listings.length, 8);
  const l = page.listings[0];
  assert.deepEqual([l.building, l.community, l.bedrooms, l.sizeSqft, l.price, l.completion, l.verified], ['Sulafa Tower', 'Dubai Marina', 2, 1392, 1900000, 'ready', true]);
  assert.ok(l.agency && !('agent' in l));
  assert.throws(() => parseListingPage('<html></html>', 'dubai'), /no data/);
});

test('transaction pages: deals, summary and child locations', () => {
  const building = parseTransactionPage(fixture('transactions-building.html'));
  assert.deepEqual([building.name, building.type, building.total, building.deals.length], ['Ciel Tower', 'TOWER', 175, 10]);
  assert.ok(building.insights.saleAveragePrice > 0);
  const community = parseTransactionPage(fixture('transactions-community.html'));
  assert.ok(community.children.length > 0 && community.children[0].slug.startsWith('dubai-marina-'));
});

test('deals: square metres converted, bulk and implausible deals left out', () => {
  assert.equal(cleanDeal({ id: 'a', price: 2500000, plotArea: 1350, bedrooms: 2, transactionDate: '2026-11-10', status: 'Ready' }, 'X').deal.areaUnit, 'sqft');
  const sqm = cleanDeal({ id: 'b', price: 900000, plotArea: 60, bedrooms: 1, transactionDate: '2026-11-10', status: 'Ready' }, 'X').deal;
  assert.equal(sqm.areaUnit, 'sqm');
  assert.equal(sqm.sqft, 646);
  assert.equal(cleanDeal({ id: 'c', price: 1e6, plotArea: 900, bedrooms: 1, isBulkTransaction: true }, 'X').reason, 'bulk deal');
  assert.equal(cleanDeal({ id: 'd', price: 1e6, plotArea: 20000, bedrooms: 1 }, 'X').reason, 'implausible size');
  assert.equal(cleanDeal({ id: 'e', price: 1e6, bedrooms: 1 }, 'X').reason, 'no price or area');
});

const deal = (id, price, sqft, extra = {}) => ({ id, building: 'T', bedrooms: 1, price, sqft, pricePerSqft: price / sqft, date: daysAgo(30), status: 'ready', ...extra });
const listing = (extra = {}) => ({ listingId: 'L1', building: 'Marina Quays West', title: 'Vacant', bedrooms: 1, sizeSqft: 780, price: 1200000, completion: 'ready', verified: true, agency: 'A', ...extra });

test('comparison only with the same layout', () => {
  const deals = [deal(1, 1450000, 770), deal(2, 1500000, 790), deal(3, 1550000, 800), deal(4, 1680000, 820),
    deal(5, 1500000, 1250), // a large one-bedroom: not the same layout
    deal(6, 1300000, 780, { status: 'off-plan' }), deal(7, 1300000, 780, { bedrooms: 2 }), deal(8, 1000000, 780, { date: daysAgo(500) })];
  const cmp = dealComparison(listing(), deals, NOW);
  assert.equal(cmp.comparables, 4);
  assert.deepEqual(cmp.comparablePrices, [1450000, 1500000, 1550000, 1680000]);
  assert.equal(cmp.belowAll, true);
  assert.equal(confidenceOf(listing(), cmp), 'high');
  assert.equal(confidenceOf(listing({ verified: false }), cmp), 'low');
  assert.equal(confidenceOf(listing({ building: 'TFG Marina Hotel' }), cmp), 'low');
  assert.equal(dealComparison(listing(), deals.slice(0, 2), NOW), null);
  const wide = dealComparison(listing({ price: 1500000 }), [deal(1, 1000000, 780), deal(2, 1500000, 780), deal(3, 1800000, 780)], NOW);
  assert.equal(confidenceOf(listing({ price: 1500000 }), wide), 'low'); // deals 1.0–1.8 M: too scattered
});

test('listing comparison where deals are not published', () => {
  const others = [1, 2, 3, 4, 5].map((i) => listing({ listingId: `O${i}`, agency: `B${i}`, price: 1300000 + i * 20000 }));
  const cmp = listingComparison(listing(), [listing(), ...others, listing({ listingId: 'same-agency', price: 1000000 })]);
  assert.equal(cmp.basis, 'listings');
  assert.equal(cmp.comparables, 5);
  assert.equal(confidenceOf(listing(), cmp), 'medium'); // never high on asking prices
  assert.equal(listingComparison(listing(), others.slice(0, 3)), null);
});

test('layout supply, deal history and listing history', () => {
  const ls = [listing({ listingId: 'a', locationId: '1', price: 1.2e6 }), listing({ listingId: 'b', locationId: '1', price: 1.4e6, sizeSqft: 785 }), listing({ listingId: 'c', locationId: '1', sizeSqft: 1200 })];
  const s = layoutSupply(ls);
  assert.equal(s.get('a').sameLayoutListings, 2);
  assert.equal(s.get('a').sameLayoutMinPrice, 1.2e6);
  assert.equal(s.get('c').sameLayoutListings, 1);

  const merged = mergeDeals([deal('old', 1e6, 700, { date: daysAgo(2000) }), deal('k', 1e6, 700)], [deal('k', 1e6, 700), deal('new', 1.1e6, 700, { date: daysAgo(1) })], NOW);
  assert.deepEqual(merged.map((d) => d.id), ['new', 'k']);

  const first = listingHistory(undefined, { price: 1.3e6 }, '2026-11-01');
  assert.equal(first.firstSeenAt, '2026-11-01');
  const drop = listingHistory(first.record, { price: 1.2e6 }, '2026-11-12');
  assert.deepEqual([drop.firstSeenAt, drop.previousPrice, drop.priceChange, drop.priceChangedAt], ['2026-11-01', 1.3e6, -100000, '2026-11-12']);
  const same = listingHistory(drop.record, { price: 1.2e6 }, '2026-11-19');
  assert.equal(same.priceChange, -100000);
});
