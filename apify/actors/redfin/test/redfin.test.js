import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  TooManyHomesError, badgeDate, formatFilter, inputFilters, isZipCode, listingKey, mergeFilters, pageUrl, parseFilter,
  parseRedfinJson, parseRegionPath, parseRentalsPage, parseSalePage, parseSearchUrl, photoPositions, pickPlace, regionApiUrl,
  searchPageUrl, searchParamsOf, splitRange, stateOf, statusOf, toRentalListing, toSaleListing,
} from '../src/redfin.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const NOW = Date.parse('2026-09-28T12:00:00Z');

test('filter strings keep their order, values and flags', () => {
  const filter = parseFilter('sort=lo-price,property-type=house+condo,min-price=500k,no-outline');
  assert.deepEqual([...filter], [['sort', 'lo-price'], ['property-type', 'house+condo'], ['min-price', '500k'], ['no-outline', '']]);
  assert.equal(formatFilter(filter), 'sort=lo-price,property-type=house+condo,min-price=500k,no-outline');
  assert.equal(formatFilter(mergeFilters(filter, new Map([['min-price', '600000'], ['min-beds', '3']]))),
    'sort=lo-price,property-type=house+condo,min-price=600000,no-outline,min-beds=3');
});

test('search links give the region, the listing type and the filters', () => {
  const city = parseSearchUrl('https://www.redfin.com/city/30749/NY/New-York/filter/sort=lo-price,property-type=house,min-beds=3');
  assert.equal(city.regionType, 6);
  assert.equal(city.regionId, '30749');
  assert.equal(city.type, 'sale');
  assert.equal(city.path, '/city/30749/NY/New-York');
  assert.equal(formatFilter(city.filter), 'sort=lo-price,property-type=house,min-beds=3');

  const rent = parseSearchUrl('https://www.redfin.com/city/30818/TX/Austin/apartments-for-rent/filter/max-price=2.5k');
  assert.equal(rent.type, 'rent');
  assert.equal(rent.path, '/city/30818/TX/Austin');
  assert.equal(searchPageUrl(rent), 'https://www.redfin.com/city/30818/TX/Austin/apartments-for-rent/filter/max-price=2.5k');

  const zip = parseSearchUrl('https://www.redfin.com/zipcode/78701');
  assert.deepEqual([zip.regionType, zip.regionId, zip.filter.size], [2, '78701', 0]);
  const state = parseSearchUrl('https://www.redfin.com/state/Rhode-Island');
  assert.deepEqual([state.regionType, state.regionId], [4, 'Rhode-Island']);
  assert.deepEqual([parseSearchUrl('https://www.redfin.com/county/2866/TX/Travis-County').regionType, parseSearchUrl('https://www.redfin.com/neighborhood/219258/NY/New-York/Brooklyn').regionType], [5, 1]);

  const sold = parseSearchUrl('https://www.redfin.com/city/30818/TX/Austin/recently-sold');
  assert.equal(formatFilter(sold.filter), 'include=sold-3mo,status=sold');
  assert.equal(sold.path, '/city/30818/TX/Austin');

  assert.throws(() => parseSearchUrl('https://www.redfin.com/TX/Austin/7204-Cielo-Azul-Pass-78732/home/31896901'), /page of one home/);
  assert.throws(() => parseSearchUrl('https://www.zillow.com/austin-tx/'), /not a redfin.com link/);
  assert.throws(() => parseSearchUrl('https://www.redfin.com/news/'), /not a Redfin search page/);
  assert.throws(() => parseSearchUrl('Austin, TX'), TypeError);
  assert.equal(parseRegionPath('/city/30818/TX/Austin').regionId, '30818');
  assert.equal(parseRegionPath('/TX/Austin'), null);
});

test('locations find the right place, with the state when one is given', () => {
  const austin = parseRedfinJson(fixture('place-austin.txt')).payload;
  const brooklyn = parseRedfinJson(fixture('place-brooklyn.txt')).payload;
  assert.equal(pickPlace('Austin, TX', austin).url, '/city/30818/TX/Austin');
  assert.equal(pickPlace('Austin, Minnesota', austin).url, '/city/766/MN/Austin');
  assert.equal(pickPlace('Austin', austin).url, '/city/30818/TX/Austin');
  assert.equal(pickPlace('Brooklyn, NY', brooklyn).url, '/neighborhood/219258/NY/New-York/Brooklyn');
  assert.equal(pickPlace('Brooklyn, OH', brooklyn).url, '/city/2390/OH/Brooklyn');
  assert.equal(pickPlace('Brooklyn, ON', brooklyn), null);
  assert.equal(pickPlace('Austin, TX', { sections: [] }), null);

  assert.equal(stateOf('Austin, TX'), 'TX');
  assert.equal(stateOf('Austin, TX 78701, USA'), 'TX');
  assert.equal(stateOf('Portland, Oregon'), 'OR');
  assert.equal(stateOf('Brooklyn, New York'), 'NY');
  assert.equal(stateOf('Washington, D.C.'), 'DC');
  assert.equal(stateOf('Austin'), undefined);
  assert.equal(stateOf('Toronto, ON'), null);
  assert.ok(isZipCode(' 78701 '));
  assert.ok(!isZipCode('7870'));
});

test('input filters use Redfin filter names', () => {
  const input = {
    propertyTypes: ['house', 'condo', 'land'], minPrice: 300000, maxPrice: 900000, minBeds: 3, maxBeds: 5, minBaths: 2,
    minSqft: 1500, maxSqft: 3000, minLotSqft: 5000, minYearBuilt: 1990, maxYearBuilt: 2020, maxHoa: 200,
    maxDaysOnMarket: 7, keywords: 'pool, view', sortBy: 'newest', includePending: true, soldWithinDays: '30',
  };
  assert.equal(formatFilter(inputFilters(input, 'sale')),
    'property-type=house+condo+land,min-price=300000,max-price=900000,min-beds=3,max-beds=5,min-baths=2,min-sqft=1500-sqft,max-sqft=3000-sqft,'
    + 'min-lot-size=5000-sqft,min-year-built=1990,max-year-built=2020,hoa=200,max-days-on-market=1wk,remarks=pool+view,sort=lo-days,'
    + 'status=active+comingsoon+contingent+pending');
  assert.equal(formatFilter(inputFilters({ soldWithinDays: '30', sortBy: 'recentlySold' }, 'sold')), 'sort=hi-sale-date,include=sold-1mo,status=sold');
  assert.equal(formatFilter(inputFilters({ sortBy: 'recommended' }, 'sold')), 'include=sold-3mo,status=sold');
  // For rent only homes and apartments exist, and HOA and days on market do not apply.
  assert.equal(formatFilter(inputFilters(input, 'rent')),
    'property-type=house+condo,min-price=300000,max-price=900000,min-beds=3,max-beds=5,min-baths=2,min-sqft=1500-sqft,max-sqft=3000-sqft,'
    + 'min-lot-size=5000-sqft,min-year-built=1990,max-year-built=2020,remarks=pool+view,sort=lo-days');
  // Search links keep their own listing type.
  assert.equal(formatFilter(inputFilters(input, 'sale', { fromUrl: true })).includes('status='), false);
  assert.equal(formatFilter(inputFilters({ maxHoa: 0 }, 'sale')), 'hoa=0');
  assert.equal(formatFilter(inputFilters({}, 'sale')), '');
});

test('the region answer becomes the search parameters, without filters that are off', () => {
  const query = searchParamsOf(parseRedfinJson(fixture('region-austin.txt')), 'sale');
  assert.equal(query.params.market, 'austin');
  assert.equal(query.params.region_id, '30818');
  assert.equal(query.params.uipt, '1');
  assert.equal(query.params.num_beds, '3');
  assert.equal(query.minPrice, 300000);
  assert.equal(query.maxPrice, null);
  assert.equal(Object.values(query.params).includes('false'), false);
  assert.equal(query.params.region_name, undefined);
  assert.equal(searchParamsOf({ payload: {} }, 'sale'), null);

  const rent = searchParamsOf(parseRedfinJson(fixture('region-austin.txt')), 'rent');
  assert.equal(rent.params.isRentals, 'true');

  const url = new URL(pageUrl('sale', query.params, { start: 700, minPrice: 400000, maxPrice: 500000 }));
  assert.equal(url.pathname, '/stingray/api/gis');
  assert.deepEqual(['start', 'num_homes', 'min_price', 'max_price'].map((key) => url.searchParams.get(key)), ['700', '350', '400000', '500000']);
  assert.equal(new URL(pageUrl('sale', query.params)).searchParams.get('min_price'), null);
  assert.equal(new URL(pageUrl('rent', rent.params)).pathname, '/stingray/api/v1/search/rentals');

  const region = new URL(regionApiUrl({ ...parseSearchUrl('https://www.redfin.com/city/30818/TX/Austin/apartments-for-rent/filter/min-beds=2'), type: 'rent' }));
  assert.deepEqual(['f', 'isRentals', 'region_id', 'region_type'].map((key) => region.searchParams.get(key)), ['min-beds=2', 'true', '30818', '6']);
});

test('search pages are read, and too big searches are reported', () => {
  const page = parseSalePage(fixture('gis-sale.txt'));
  assert.equal(page.homes.length, 4);
  assert.equal(page.mls.get(211), 'RLS at REBNY');
  assert.throws(() => parseSalePage(fixture('gis-timeout.txt')), TooManyHomesError);
  assert.throws(() => parseSalePage('{}&&{"errorMessage":"Invalid arguments","resultCode":1}'), /Invalid arguments/);
  const rentals = parseRentalsPage(fixture('rentals.json'));
  assert.equal(rentals.homes.length, 2);
  assert.equal(rentals.total, 6854);
});

test('price ranges are cut in two until they are small', () => {
  assert.deepEqual(splitRange({ min: null, max: null }, 'sale'), [{ min: 0, max: 100000 }, { min: 100001, max: null }]);
  assert.deepEqual(splitRange({ min: 300000, max: null }, 'sale'), [{ min: 300000, max: 600000 }, { min: 600001, max: null }]);
  assert.deepEqual(splitRange({ min: 100000, max: 200000 }, 'sale'), [{ min: 100000, max: 150000 }, { min: 150001, max: 200000 }]);
  assert.equal(splitRange({ min: 100000, max: 105000 }, 'sale'), null);
  assert.deepEqual(splitRange({ min: null, max: null }, 'rent'), [{ min: 0, max: 1000 }, { min: 1001, max: null }]);
});

test('a home for sale becomes a flat listing without agent names', () => {
  const page = parseSalePage(fixture('gis-sale.txt'));
  const [house, condo, comingSoon, openHouse] = page.homes.map((home) => toSaleListing(home, { mls: page.mls, now: NOW }));
  assert.equal(house.propertyId, 20895100);
  assert.equal(house.listingId, 223911304);
  assert.equal(house.mlsId, '1053588');
  assert.equal(house.listingType, 'for-sale');
  assert.equal(house.status, 'Active');
  assert.equal(house.url, 'https://www.redfin.com/NY/Middle-Village/8251-Penelope-Ave-11379/home/20895100');
  assert.deepEqual([house.price, house.pricePerSqft, house.beds, house.baths, house.fullBaths, house.partialBaths], [928000, 567, 3, 1.5, 1, 1]);
  assert.deepEqual([house.sqft, house.lotSizeSqft, house.yearBuilt, house.propertyType], [1638, 2000, 1930, 'House']);
  assert.equal(house.address, '82-51 Penelope Ave, Middle Village, NY 11379');
  assert.equal(house.neighborhood, 'Middle Village');
  assert.deepEqual([house.latitude, house.longitude], [40.720931, -73.8718352]);
  assert.equal(house.daysOnMarket, 1);
  assert.equal(house.listedAt, new Date(NOW - 9704840).toISOString());
  assert.deepEqual(house.keyFacts, ['True english tudor', 'Sunken living room', 'Wood-beam ceilings']);
  assert.deepEqual(house.badges, ['New']);
  assert.equal(house.brokerName, 'Macaluso Realty');
  assert.equal(house.photoUrl, 'https://ssl.cdn-redfin.com/photo/269/bigphoto/588/1053588_0.jpg');
  assert.equal(house.photos.length, 22);
  assert.equal(house.photos[5], 'https://ssl.cdn-redfin.com/photo/269/bigphoto/588/1053588_5_0.jpg');
  assert.match(house.description, /^TRUE ENGLISH TUDOR/);

  assert.equal(condo.propertyType, 'Condo');
  assert.equal(condo.unit, 'Unit 4J');
  assert.equal(condo.streetAddress, '143 Bennett Ave Unit 4J');
  assert.equal(condo.hoaPerMonth, 1024);
  assert.equal(condo.mlsName, 'RLS at REBNY');

  assert.equal(comingSoon.status, 'Coming soon');
  assert.equal(comingSoon.price, null);
  assert.equal(comingSoon.propertyType, 'Multi-family');
  assert.equal(comingSoon.lastSoldDate, '2016-08-05');
  assert.equal(comingSoon.soldDate, null);

  assert.equal(openHouse.openHouseStart, '2026-09-30T15:00:00.000Z');
  assert.equal(openHouse.openHouseEnd, '2026-09-30T17:00:00.000Z');
  assert.equal(openHouse.stories, 2);

  for (const listing of [house, condo, comingSoon, openHouse]) assert.equal(JSON.stringify(listing).includes('listingAgent'), false);
});

test('sold homes, also sales from public records, get the sale date', () => {
  const [mls, publicRecord] = parseSalePage(fixture('gis-sold.txt')).homes.map((home) => toSaleListing(home, { now: NOW }));
  assert.deepEqual([mls.listingType, mls.status, mls.mlsStatus, mls.soldDate, mls.price], ['sold', 'Sold', 'Closed', '2026-09-04', 604000]);
  assert.equal(mls.daysOnMarket, null);
  assert.equal(mls.listedAt, null);
  assert.deepEqual([publicRecord.listingType, publicRecord.status, publicRecord.soldDate, publicRecord.price], ['sold', 'Sold', '2026-09-11', 391200]);
  assert.equal(publicRecord.unit, null);
  assert.equal(listingKey(mls), 'sold:34060653:2026-09-04');
});

test('rentals become flat listings without phone numbers or emails', () => {
  const [building, second] = parseRentalsPage(fixture('rentals.json')).homes.map((item) => toRentalListing(item));
  assert.equal(building.listingType, 'for-rent');
  assert.equal(building.propertyName, 'Villas at Mueller');
  assert.deepEqual([building.price, building.priceMax, building.beds, building.bedsMax, building.sqft, building.sqftMax], [699, 799, 1, 2, 653, 982]);
  assert.equal(building.propertyType, 'Apartment');
  assert.deepEqual(building.units, [{ beds: 1, rent: 699 }, { beds: 2, rent: 799 }]);
  assert.equal(building.address, '6103 Manor Rd, Austin, TX 78723');
  assert.equal(building.photoUrl, 'https://ssl.cdn-redfin.com/photo/rent/714553e5-0506-4f0f-9d73-ae9f58408f7f/islphoto/genIsl.0_2.jpg');
  assert.equal(building.photos[6], 'https://ssl.cdn-redfin.com/photo/rent/714553e5-0506-4f0f-9d73-ae9f58408f7f/islphoto/genIsl.6_4.jpg');
  assert.equal(listingKey(building), 'rent:714553e5-0506-4f0f-9d73-ae9f58408f7f');
  for (const listing of [building, second]) {
    const text = JSON.stringify(listing);
    assert.equal(text.includes('5550000000'), false);
    assert.equal(text.includes('example.com'), false);
  }
});

test('photo positions, badge dates, statuses and keys', () => {
  assert.deepEqual(photoPositions('0:0,1-3:1,4:2'), [[0, 0], [1, 1], [2, 1], [3, 1], [4, 2]]);
  assert.deepEqual(photoPositions(undefined), []);
  assert.equal(badgeDate('SEP 11, 2026'), '2026-09-11');
  assert.equal(badgeDate('June 3, 2025'), '2025-06-03');
  assert.equal(badgeDate(''), null);
  assert.equal(statusOf({ mlsStatus: 'Pending Accepting Backup Offers' }), 'Pending');
  assert.equal(statusOf({ mlsStatus: 'Active Under Contract' }), 'Under contract');
  assert.equal(statusOf({ mlsStatus: 'Coming Soon' }), 'Coming soon');
  assert.equal(statusOf({ searchStatus: 4 }), 'Sold');
  assert.equal(statusOf({ mlsStatus: 'New' }), 'Active');
  assert.equal(listingKey({ listingType: 'for-sale', listingId: 5, propertyId: 1 }), 'sale:5');
});
