import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { districtOf, pattayaDistrict } from '../src/areas.js';
import { descriptionFacts, homesData, unitFloorOf, imageKey, listingKey, parseListingPage, parseListPage, searchUrl, thumbnailUrl } from '../src/dotproperty.js';
import { applyHistory, dayNumber, keepAsSeen, loadHistory, saveHistory } from '../src/history.js';
import { districtRecords, median, projectKey, projectRecords, projectSegment } from '../src/stats.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('search URLs', () => {
  assert.equal(searchUrl({ location: 'chonburi/pattaya' }), 'https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?sortBy=verification_at');
  assert.equal(searchUrl({ location: '/Phuket/', propertyType: 'villa', transaction: 'rent', page: 4 }), 'https://www.dotproperty.co.th/en/villas-for-rent/phuket?sortBy=verification_at&page=4');
  assert.equal(searchUrl({ location: 'chonburi/pattaya', minPrice: 0, maxPrice: 1499999, page: 2 }), 'https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?sortBy=verification_at&minPrice=0&maxPrice=1499999&page=2');
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
  assert.equal(page.available, true);
  assert.equal(page.availability, 'InStock');
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

test('the unit floor in a description, not the floor of the pool or the gym', () => {
  const cases = [
    ['Room 205, 2nd Floor, size 32.5 sq', 2],
    ['Size: 32 Sq.m. Floor: 12th Thai Quota', 12],
    ['Infinity pool on the 40th floor. Unit on the 12th floor', 12],
    ['37th &amp; 42nd Floor Cantilevered Sky Pools, 7th Floor Gymnasium. Corner unit, 32nd floor', 32],
    ['pool on the 24th and 25th floors. Situated on the 33th floor', 33],
    ['33 sq.m. 2 floor 1 Bedroom | 1 Bathroom', null],
    ['Floor: 30+ (High Floor)', null],
    ['Unit on the 6th floor; also available: 9th floor unit', null],
    ['Квартира на 16 этаже, дом 33 этажа', 16],
    ['ห้องชั้น 12 วิวทะเล', 12],
    ['位于16楼，海景', 16],
    ['8 floors, high floor, pool view', null],
  ];
  for (const [text, floor] of cases) assert.equal(unitFloorOf(text), floor, text);
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
  assert.equal(d.segment, 'all');
  assert.equal(d.projects, 1);
  assert.equal(median([3, 1, 2]), 2);
});

test('history: new listings, price changes and listings that left the market', () => {
  const day1 = '2026-10-01T00:00:00Z';
  const first = [{ key: 'a', price: 100, postedAt: '2026-09-21T00:00:00Z', projectKey: 'p' }, { key: 'b', price: 200, projectKey: 'p' }];
  const run1 = applyHistory(first, {}, day1);
  assert.equal(first[0].daysListed, 10);
  assert.equal(first[0].isNewSinceLastRun, false);
  assert.deepEqual(run1.missing, []);
  const second = [{ key: 'a', price: 90, projectKey: 'p' }, { key: 'c', price: 300, projectKey: 'p' }];
  const run2 = applyHistory(second, run1.seen, '2026-10-08T00:00:00Z');
  assert.equal(second[0].previousPrice, 100);
  assert.equal(second[0].priceChange, -10);
  assert.equal(second[0].priceChangePercent, -10);
  assert.equal(second[0].daysListed, 17);
  assert.equal(second[1].isNewSinceLastRun, true);
  assert.deepEqual(run2.missing.map((r) => r.key), ['b']);
  // The gone listing keeps its first date if it comes back.
  const third = [{ key: 'b', price: 200 }];
  applyHistory(third, run2.seen, '2026-10-15T00:00:00Z');
  assert.equal(third[0].firstSeenAt, '2026-10-01');
});

import { agencyHint, findLots, photoId } from '../src/match.js';

const unit = (key, over = {}) => ({
  key, url: `https://x/${key}`, transaction: 'sale', project: 'P', projectKey: 'p', district: 'Jomtien',
  bedrooms: 1, sizeSqm: 35, price: 3000000, photoKeys: [], descriptionStart: `Agency ${key} ID 1`, postedAt: `2026-10-${10 + key.length}T00:00:00Z`, ...over,
});
const ph = (...ids) => ids.map((id) => `ingester/u/${id}.jpeg`);

test('lots: the same unit from two agencies, joined by a shared photo file', () => {
  const { lots, lotOf } = findLots([
    unit('a', { price: 3200000, photoKeys: ph('kitchen', 'bed', 'view') }),
    unit('b', { price: 2900000, sizeSqm: 35.5, photoKeys: ph('bed', 'bath') }),
    unit('c', { photoKeys: ph('other') }),
  ], { projectMedians: { p: 100000 } });
  assert.equal(lots.length, 1);
  assert.equal(lots[0].listings, 2);
  assert.equal(lots[0].minPrice, 2900000);
  assert.equal(lots[0].maxPrice, 3200000);
  assert.equal(lots[0].priceSpreadPercent, 10.3);
  assert.equal(lots[0].cheapestUrl, 'https://x/b');
  assert.equal(lots[0].vsProjectMedianPercent, -17.7);
  assert.equal(lotOf.get('a'), lotOf.get('b'));
  assert.equal(lotOf.has('c'), false);
});

test('lots: renders shared by many listings and common-area photos are no evidence', () => {
  const stock = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'].map((k, i) => unit(k, { price: 4000000 + i * 50000, photoKeys: ph('render1', 'render2') }));
  const pool = [unit('e', { bedrooms: 1, photoKeys: ph('pool') }), unit('f', { bedrooms: 2, sizeSqm: 60, photoKeys: ph('pool') })];
  const lobby = [unit('g', { sizeSqm: 30, photoKeys: ph('lobby') }), unit('h', { sizeSqm: 45, photoKeys: ph('lobby') })];
  assert.equal(findLots([...stock, ...pool, ...lobby]).lots.length, 0);
});

test('lots: one advertiser posting several units together is not one unit', () => {
  const batch = (k, price) => unit(k, { price, descriptionStart: 'Developer X ID', postedAt: '2026-10-20T10:00:00Z', photoKeys: ph('r1', 'r2') });
  assert.equal(findLots([batch('a', 3000000), batch('b', 3100000)]).lots.length, 0);
  // The same advertiser posting the same unit twice at the same price is a duplicate.
  assert.equal(findLots([batch('a', 3000000), batch('b', 3000000)]).lots.length, 1);
});

test('lots: different sizes stay apart; a chain of shared photos makes one lot', () => {
  assert.equal(findLots([unit('a', { photoKeys: ph('x') }), unit('b', { sizeSqm: 38, photoKeys: ph('x') })]).lots.length, 0);
  const { lots } = findLots([unit('a', { photoKeys: ph('x') }), unit('b', { photoKeys: ph('x', 'y') }), unit('c', { photoKeys: ph('y') })]);
  assert.equal(lots.length, 1);
  assert.equal(lots[0].listings, 3);
});

test('lots: a chain of look-alike photos does not join units on other floors or at other prices', () => {
  // b has no floor; a is on the 2nd floor and c on the 8th: c stays out of the lot of a and b.
  const floors = findLots([
    unit('a', { descriptionStart: 'Room 205 on the 2nd floor', photoKeys: ph('x', 'z') }),
    unit('b', { photoKeys: ph('x', 'y', 'z') }),
    unit('c', { descriptionStart: 'Nice unit, 8th floor', photoKeys: ph('y', 'w') }),
  ]).lots;
  assert.equal(floors.length, 1);
  assert.deepEqual(floors[0].offers.map((o) => o.url).sort(), ['https://x/a', 'https://x/b']);
  // Each neighbour within 40% of the next, but the ends 74% apart: the dearest stays out.
  const prices = findLots([
    unit('a', { price: 2300000, photoKeys: ph('x') }),
    unit('b', { price: 3000000, photoKeys: ph('x', 'y') }),
    unit('c', { price: 4000000, photoKeys: ph('y') }),
  ]).lots;
  assert.equal(prices.length, 1);
  assert.deepEqual([prices[0].minPrice, prices[0].maxPrice], [2300000, 3000000]);
});

test('lots: floors read from the listing pages keep neighbours furnished alike apart', () => {
  const same = { photoKeys: ph('sofa', 'bed') };
  assert.equal(findLots([unit('a', { ...same, unitFloor: 16 }), unit('b', { ...same, unitFloor: 28 })]).lots.length, 0);
  const lots = findLots([unit('a', { ...same, unitFloor: 16 }), unit('b', { ...same, descriptionStart: 'Corner unit, 16th floor' })]).lots;
  assert.equal(lots.length, 1);
  assert.equal(lots[0].floor, 16);
});

test('lots: a hashed render reused as the same file by other layouts is no evidence', () => {
  const hashes = new Map([['render1', 'aaaaaaaaaaaaaaaa'], ['render2', 'aaaaaaaaaaaaaaab']]);
  const tower = [
    unit('a', { photoKeys: ph('render1') }),
    unit('b', { photoKeys: ph('render2') }),
    // Not candidates, so not hashed: the same files in other layouts.
    unit('c', { bedrooms: 2, sizeSqm: 60, photoKeys: ph('render1') }),
    unit('d', { bedrooms: 0, sizeSqm: 26, photoKeys: ph('render2') }),
  ];
  assert.equal(findLots(tower.slice(0, 2), { photoHashes: hashes }).lots.length, 1);
  assert.equal(findLots(tower, { photoHashes: hashes }).lots.length, 0);
});

test('agency signatures and photo IDs', () => {
  assert.equal(agencyHint('PropertyScout ID ----- Fully furnished'), 'PropertyScout');
  assert.equal(agencyHint('--- Pattaya Realty --- 1 bed'), 'Pattaya Realty');
  assert.equal(agencyHint('Beautiful 1 bed condo'), null);
  assert.equal(photoId('ingester/01a/abc123.jpeg'), 'abc123');
});

test('history: kept in parts by the first character of the key, links included', async () => {
  const store = new Map();
  const kv = { getValue: async (k) => store.get(k) ?? null, setValue: async (k, v) => { if (v == null) store.delete(k); else store.set(k, v); } };
  const search = { location: 'chonburi/pattaya', propertyType: 'condo', transaction: 'sale' };
  const week = dayNumber('2026-10-19T00:00:00Z');
  store.set('seen-chonburi-pattaya-condo-sale', { 'aa-1': [week - 30, week, 3, 4, 'p', 'd'] });
  const { seen, missing } = applyHistory([{ key: 'b1', price: 5, url: 'https://x/b1' }], await loadHistory(kv, search), '2026-10-26T00:00:00Z');
  assert.deepEqual(missing.map((m) => m.key), ['aa-1']);
  keepAsSeen(seen, 'aa-1', '2026-10-26T00:00:00Z');
  await saveHistory(kv, search, seen);
  assert.equal(store.has('seen-chonburi-pattaya-condo-sale'), false);
  assert.equal(store.get('seen-chonburi-pattaya-condo-sale-b').b1[6], 'https://x/b1');
  const again = await loadHistory(kv, search);
  assert.equal(Object.keys(again).length, 2);
  assert.equal(again['aa-1'][1], again.b1[1]);
});

import jpegjs from 'jpeg-js';
import { differenceHash, hammingDistance, hashOfJpeg, shortPhotoId, thumbnailForKey } from '../src/photos.js';

const picture = (fn, width = 64, height = 48) => {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const v = Math.max(0, Math.min(255, Math.round(fn(x, y))));
    data.set([v, v, v, 255], (y * width + x) * 4);
  }
  return { width, height, data };
};

test('visual hashes: a re-saved, brighter copy matches; another picture does not', () => {
  const room = picture((x, y) => 128 + 100 * Math.sin(x / 6) * Math.cos(y / 9));
  const copy = jpegjs.encode(picture((x, y) => 140 + 100 * Math.sin(x / 6) * Math.cos(y / 9)), 60).data;
  const other = picture((x, y) => 128 + 100 * Math.cos(x / 4 + y / 3));
  const a = differenceHash(room);
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.ok(hammingDistance(a, hashOfJpeg(copy)) <= 6);
  assert.ok(hammingDistance(a, differenceHash(other)) > 16);
  assert.equal(hammingDistance('ff00000000000000', '0f00000000000001'), 5);
  assert.equal(shortPhotoId('ingester/u/0123456789abcdef0123.jpeg'), '0123456789abcdef');
  assert.match(Buffer.from(thumbnailForKey('ingester/u/x.jpeg').split('/').pop(), 'base64').toString(), /"width":64/);
});

test('lots: re-saved photos (new files, same picture) join two listings, with confidence', () => {
  const hashes = new Map([['k1', 'aaaaaaaaaaaaaaaa'], ['k2', 'aaaaaaaaaaaaaaab'], ['k3', '5555555555555555'], ['k4', '5555555555555554']]);
  const a = unit('a', { photoKeys: ph('k1', 'k3') });
  const b = unit('b', { price: 3100000, photoKeys: ph('k2', 'k4') });
  const { lots } = findLots([a, b], { photoHashes: hashes });
  assert.equal(lots.length, 1);
  assert.equal(lots[0].sharedPhotos, 2);
  assert.equal(lots[0].confidence, 'high');
  const one = findLots([unit('c', { photoKeys: ph('k1') }), unit('d', { photoKeys: ph('k2') })], { photoHashes: hashes }).lots;
  assert.equal(one[0].confidence, 'medium');
  // Without hashes, different files are different photos.
  assert.equal(findLots([a, b]).lots.length, 0);
});

test('market segments: resale, new and off plan, and district figures per segment', () => {
  const now = new Date('2026-10-26T00:00:00Z');
  assert.equal(projectSegment({ construction: 'Off Plan (Dec 2028)', completedYear: 2028 }, now), 'off plan');
  assert.equal(projectSegment({ construction: 'Completed (Aug 2026)', completedYear: 2026 }, now), 'new');
  assert.equal(projectSegment({ construction: 'Completed (Sep 2007)', completedYear: 2007 }, now), 'resale');
  assert.equal(projectSegment({}, now), null);
  const rows = districtRecords([
    listing({ segment: 'resale' }), listing({ segment: 'resale', projectKey: 'q' }), listing({ segment: 'off plan', projectKey: 'r', price: 6000000 }),
  ]);
  assert.deepEqual(rows.map((r) => [r.segment, r.saleListings, r.projects]), [['all', 3, 3], ['resale', 2, 2], ['new & off plan', 1, 1]]);
  assert.equal(rows[1].medianSalePricePerSqm, 100000);
  assert.equal(rows[2].medianSalePricePerSqm, 200000);
});

test('lots: floors, references of one advertiser, segments and price gaps keep units apart', () => {
  const shared = { photoKeys: ph('liv', 'bed') };
  const pair = (a, b) => findLots([unit('a', { ...shared, ...a }), unit('b', { ...shared, ...b })]).lots.length;
  assert.equal(pair({}, {}), 1);
  assert.equal(pair({ descriptionStart: 'Centric Sea 1 bed on the 6th floor' }, { descriptionStart: 'Centric Sea 1 bed, 38th floor' }), 0);
  assert.equal(pair({ descriptionStart: 'Listing code: #RT04897 Grand' }, { descriptionStart: 'Listing code: #RT04900 Grand' }), 0);
  // Different agencies number differently: no conclusion from their codes.
  assert.equal(pair({ descriptionStart: 'Ref: AB-1234 nice' }, { descriptionStart: '#RT04900 nice' }), 1);
  assert.equal(pair({ segment: 'off plan' }, { segment: 'off plan' }), 0);
  assert.equal(pair({ segment: 'resale' }, { segment: 'resale' }), 1);
  assert.equal(pair({ price: 2400000 }, { price: 4590000 }), 0);
  // Photos after the fourth (building, pool) are no evidence.
  assert.equal(findLots([unit('a', { photoKeys: ph('a1', 'a2', 'a3', 'a4', 'pool') }), unit('b', { photoKeys: ph('b1', 'b2', 'b3', 'b4', 'pool') })]).lots.length, 0);
});

import { belowMarket, ownershipOf } from '../src/deals.js';

test('ownership from the title or description', () => {
  assert.equal(ownershipOf('The Palm - Foreign Quota Sea View Studio'), 'foreign quota');
  assert.equal(ownershipOf('Cheap 1 bed', 'Thai quota, 35 sqm'), 'thai quota');
  assert.equal(ownershipOf('Sold in company name'), 'thai quota');
  assert.equal(ownershipOf('30-year lease, sea view'), 'leasehold');
  assert.equal(ownershipOf('Nice studio', null), null);
});

test('below market: compared with similar units, Thai quota and the same unit left out', () => {
  const sale = (key, over) => ({ key, transaction: 'sale', segment: 'resale', projectKey: 'p', project: 'P', district: 'Jomtien', bedrooms: 1, sizeSqm: 35, price: 3500000, ...over });
  const items = [
    sale('t', { price: 2800000, ownership: 'thai quota' }),
    sale('a'), sale('b', { sizeSqm: 36, price: 3600000 }), sale('c', { ownership: 'foreign quota' }), sale('d', { ownership: 'foreign quota', price: 3400000 }),
    sale('big', { sizeSqm: 80, price: 4000000 }), // not similar in size
    sale('t2', { price: 2900000, ownership: 'thai quota' }), // not a comparable for t
    sale('x', { price: 1000000 }), // a typo-sized gap
    sale('new', { segment: 'off plan', price: 1000000 }),
  ];
  const deals = belowMarket(items, { projects: { p: { grossYieldPercent: 7, rentListings: 5 } } });
  assert.equal(belowMarket(items, { projects: { p: { rentListings: 0 } } }).length, 0);
  const t = deals.find((d) => d.ownership === 'thai quota' && d.price === 2800000);
  assert.equal(t.comparablePricePerSqm, 100000);
  assert.equal(t.gapPercent, -20);
  assert.equal(t.potentialThb, 700000);
  assert.equal(t.comparables, 5);
  assert.equal(t.foreignQuotaPricePerSqm, 98571);
  assert.equal(t.projectGrossYieldPercent, 7);
  assert.equal(deals.at(-1).checkData, true);
  assert.equal(deals.some((d) => d.project === 'P' && d.price === 1000000 && d.sizeSqm === 35 && !d.checkData), false);
  assert.equal(deals.filter((d) => d.price === 1000000).length, 1);
});

import { loadSearchState, saveSearchState } from '../src/state.js';

test('a finished search is saved in parts and taken back after a migration', async () => {
  const store = new Map();
  const kv = { getValue: async (k) => store.get(k) ?? null, setValue: async (k, v) => store.set(k, v) };
  const listings = Array.from({ length: 9001 }, (_, i) => ({ key: `k${i}`, price: i, photoKeys: ['a/b/c.jpeg'] }));
  await saveSearchState(kv, 0, { row: { search: 's', listings: 9001 }, listings, removed: [{ key: 'gone' }] });
  assert.equal(store.get('STATE-0').parts, 3);
  const back = await loadSearchState(kv, 0);
  assert.equal(back.listings.length, 9001);
  assert.equal(back.listings[9000].key, 'k9000');
  assert.deepEqual(back.removed, [{ key: 'gone' }]);
  assert.equal(await loadSearchState(kv, 1), null);
});
