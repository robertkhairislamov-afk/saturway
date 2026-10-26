import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { districtOf, pattayaDistrict } from '../src/areas.js';
import { descriptionFacts, homesData, imageKey, listingKey, parseListingPage, parseListPage, searchUrl, thumbnailUrl } from '../src/dotproperty.js';
import { applyHistory } from '../src/history.js';
import { districtRecords, median, projectKey, projectRecords } from '../src/stats.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('search URLs', () => {
  assert.equal(searchUrl({ location: 'chonburi/pattaya' }), 'https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?sortBy=price');
  assert.equal(searchUrl({ location: '/Phuket/', propertyType: 'villa', transaction: 'rent', page: 4 }), 'https://www.dotproperty.co.th/en/villas-for-rent/phuket?sortBy=price&page=4');
  assert.equal(searchUrl({ location: 'chonburi/pattaya', minPrice: 0, maxPrice: 1499999, page: 2 }), 'https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?sortBy=price&minPrice=0&maxPrice=1499999&page=2');
  assert.throws(() => searchUrl({ location: 'x', propertyType: 'castle' }), /Unknown property type/);
});

test('list page: JSON-LD listings with size, baths and price per m² from the cards', () => {
  const { total, listings } = parseListPage(fixture('list.html'));
  assert.equal(total, 37541);
  assert.equal(listings.length, 3);
  const [first, second, third] = listings;
  assert.equal(first.project, 'Edge Central Pattaya');
  assert.equal(first.bedrooms, 4);
  assert.equal(first.bathrooms, 5);
  assert.equal(first.sizeSqm, 360);
  assert.equal(first.price, 11700000);
  assert.equal(first.pricePerSqm, 32500);
  assert.equal(second.price, 12900000);
  assert.equal(third.sizeSqm, 262.7);
  assert.equal(first.key, 'fee8f0110ae9-a210-71b2-5014-1f528f89');
  assert.match(first.imageKey, /^ingester\/.+\/[0-9a-f]{64}\.jpeg$/);
  assert.equal(first.latitude, 12.931042);
  assert.equal(first.postedAt, '2026-10-25T21:59:15.000Z');
  assert.equal(first.isNewListing, true);
});

test('listing page: gallery, basics and project facts', () => {
  const page = parseListingPage(fixture('detail.html'));
  assert.equal(page.listingId, '2899757');
  assert.equal(page.images.length, 5);
  assert.equal(page.imageKeys.length, 5);
  assert.equal(page.bathrooms, 5);
  assert.equal(page.sizeSqm, 360);
  assert.equal(page.listedAt, '2026-10-26');
  assert.equal(page.furniture, 'Fully Furnished');
  assert.equal(page.camFeePerMonth, 25200);
  assert.deepEqual(page.project, {
    name: 'Edge Central Pattaya', developer: 'Sansiri', construction: 'Completed (Oct 2021)', completedYear: 2021,
    floors: 31, buildings: 1, units: 603, areaSqm: 3200, nearestLandmark: 'South Pattaya Beach', nearestLandmarkKm: 0.3,
  });
});

test('page data: unit ID, album and verification date from the Next.js payload', () => {
  const photo = (k) => 'https://img.fazwaz.com/' + Buffer.from(JSON.stringify({ bucket: 'b', key: `ingester/u/${k}.jpeg` })).toString('base64');
  const homes = [{ uuid: 'abc-1', unit_id: 42, verification_at: '2026-10-26T04:59:15+07:00', project: { clean_name: 'edge' }, album: [{ src: photo('p1') }, { src: photo('p2') }], descriptions: 'a "quoted" [text] {x}' }];
  const payload = `x:{"initUnitSearchPage":{"searchResult":{"homes":${JSON.stringify(homes)}}}}`;
  const html = `<script>self.__next_f.push([1,${JSON.stringify(payload.slice(0, 40))}])</script><script>self.__next_f.push([1,${JSON.stringify(payload.slice(40))}])</script>`;
  const data = homesData(html).get('abc-1');
  assert.equal(data.unitId, 42);
  assert.equal(data.album.length, 2);
  assert.equal(data.verifiedAt, '2026-10-25T21:59:15.000Z');
  assert.equal(data.projectSlug, 'edge');
});

test('image keys and thumbnails', () => {
  const url = 'https://img.fazwaz.com/' + Buffer.from(JSON.stringify({ bucket: 'b', key: 'ingester/x/abc.jpeg', edits: { rotate: null } })).toString('base64');
  assert.equal(imageKey(url), 'ingester/x/abc.jpeg');
  const small = JSON.parse(Buffer.from(thumbnailUrl(url).split('/').pop(), 'base64').toString());
  assert.deepEqual(small.edits, { resize: { width: 64, height: 48, fit: 'cover' } });
  assert.equal(imageKey('not a link'), null);
  assert.equal(listingKey('https://x/en/ads/a-b-c_12ab-34?x=1'), '12ab-34');
});

test('description facts: quota, floor and view', () => {
  assert.deepEqual(descriptionFacts('Foreign freehold quota. 1 bed on the 15th floor with full sea view.'), { ownership: 'foreign quota', unitFloor: 15, view: 'sea view' });
  assert.deepEqual(descriptionFacts('Thai quota, floor 7, city view'), { ownership: 'thai quota', unitFloor: 7, view: 'city view' });
  assert.deepEqual(descriptionFacts('Leasehold, partial sea view'), { ownership: 'leasehold', unitFloor: null, view: 'partial sea view' });
  assert.deepEqual(descriptionFacts(null), { ownership: null, unitFloor: null, view: null });
});

test('Pattaya districts from coordinates', () => {
  const cases = [
    [12.9713, 100.8875, 'Naklua & Wongamat'], [12.9568, 100.8843, 'Naklua & Wongamat'], [12.9442, 100.8856, 'North Pattaya'],
    [12.9310, 100.8821, 'Central Pattaya'], [12.9267, 100.8790, 'South Pattaya'], [12.9213, 100.8624, 'Pratumnak'],
    [12.9125, 100.8706, 'Pratumnak'], [12.8954, 100.8795, 'Jomtien'], [12.8666, 100.9024, 'Jomtien'],
    [12.8591, 100.8993, 'Na Jomtien'], [12.7400, 100.9200, 'Bang Saray'], [12.9192, 100.9092, 'East Pattaya'],
  ];
  for (const [lat, lng, name] of cases) assert.equal(pattayaDistrict(lat, lng), name, `${lat},${lng}`);
  assert.equal(pattayaDistrict(7.89, 98.39), null);
  assert.deepEqual(districtOf({ latitude: 7.89, longitude: 98.39, subdistrict: 'CHOENG THALE' }), { district: 'Choeng Thale', districtSource: 'listing' });
});

test('project keys join spellings of one project', () => {
  assert.equal(projectKey('The Base Central Pattaya'), projectKey('BASE central-pattaya'));
  assert.equal(projectKey('Laguna Beach Resort 3 - The Maldives'), 'laguna beach resort 3 maldives');
  assert.notEqual(projectKey('Laguna Beach Resort 2'), projectKey('Laguna Beach Resort 3'));
});

const listing = (over) => ({ transaction: 'sale', projectKey: 'p', project: 'P', district: 'Jomtien', sizeSqm: 30, price: 3000000, ...over });

test('project figures: medians, yield and outliers', () => {
  const items = [
    listing({ price: 2700000 }), listing({ price: 3000000 }), listing({ price: 3300000 }), listing({ price: 30000 }),
    listing({ price: 300000000 }), // a typo: left out of the middle
    listing({ transaction: 'rent', price: 15000 }), listing({ transaction: 'rent', price: 15000 }), listing({ transaction: 'rent', price: 18000 }),
  ];
  const [p] = projectRecords(items, { details: { p: { units: 200, developer: 'D' } } });
  assert.equal(p.saleListings, 5);
  assert.equal(p.rentListings, 3);
  assert.equal(p.medianSalePricePerSqm, 100000);
  assert.equal(p.medianRentPerSqm, 500);
  assert.equal(p.grossYieldPercent, 6);
  assert.equal(p.saleListingsPer100Units, 2.5);
  assert.equal(p.developer, 'D');
  const [d] = districtRecords(items);
  assert.equal(d.district, 'Jomtien');
  assert.equal(d.projects, 1);
  assert.equal(median([3, 1, 2]), 2);
});

test('history: new listings, price changes and listings that left the market', () => {
  const day1 = '2026-10-01T00:00:00Z';
  const first = [{ key: 'a', price: 100, postedAt: '2026-09-21T00:00:00Z', projectKey: 'p' }, { key: 'b', price: 200, projectKey: 'p' }];
  const run1 = applyHistory(first, {}, day1);
  assert.equal(first[0].daysListed, 10);
  assert.equal(first[0].isNewSinceLastRun, false);
  assert.deepEqual(run1.removed, []);
  const second = [{ key: 'a', price: 90, projectKey: 'p' }, { key: 'c', price: 300, projectKey: 'p' }];
  const run2 = applyHistory(second, run1.seen, '2026-10-08T00:00:00Z');
  assert.equal(second[0].previousPrice, 100);
  assert.equal(second[0].priceChange, -10);
  assert.equal(second[0].priceChangePercent, -10);
  assert.equal(second[0].daysListed, 17);
  assert.equal(second[1].isNewSinceLastRun, true);
  assert.deepEqual(run2.removed.map((r) => r.key), ['b']);
  // The gone listing keeps its first date if it comes back.
  const third = [{ key: 'b', price: 200 }];
  applyHistory(third, run2.seen, '2026-10-15T00:00:00Z');
  assert.equal(third[0].firstSeenAt, '2026-10-01');
});
