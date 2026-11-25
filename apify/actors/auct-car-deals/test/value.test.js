import assert from 'node:assert/strict';
import { test } from 'node:test';

import { branchCodeOf, carOf, createClient, daysFrom, lanesOf } from '../src/auct.js';
import { expectedPrice, matchTargets, modelKey, parseTarget } from '../src/value.js';

const raw = {
  _id: 'a1', Document_No: 'D-1', Car_Order: '12', Brand_Name: 'TOYOTA', Model_Name: 'FORTUNER', Sub_Model_Name: '2.4 V 2WD',
  Year_of_Manufacture: '2020', Register_Year: '2563', Mile: '85,000', Asset_Gear: 'ออโตเมติค', Fuel_Type: 'ดีเซล', Sales_Price: '720,000', Branch_Name: 'พัทยา',
  Asset_Grade: 'C1', Car_Type: 'G', Point_Grade_1: '4', Point_Grade_2: '2', Point_Grade_3: '3', Engine_Size: '2393',
  Comment: "[{'Document_No': 'X', 'Comment': 'กันชนหน้าครูด  '}]", images: "['TimePhoto_1.jpg']",
  Contract_No: 'SECRET-1', Chassis_No: 'CHASSIS-1', License_Plate_No: '1กข 1234', Customer_Name: 'PERSON', Customer_Phone_No: '0812345678',
};

test('a car from the auction service, with the yard, a Buddhist-era year and no contract number', () => {
  const car = carOf(raw, { auction_name: 'Lane A', Auction_Date: '2026-11-28T00:00:00.000Z' });
  assert.equal(car.branch, 'Pattaya');
  assert.equal(car.branchCode, '029');
  assert.equal(car.year, 2020);
  assert.equal(car.registerYear, 2020);
  assert.equal(car.mileageKm, 85000);
  assert.equal(car.startPrice, 720000);
  assert.equal(car.auctionDate, '2026-11-28');
  assert.equal(car.lotUrl, 'https://www.auct.co.th/auction-list/D-1');
  assert.deepEqual([car.gear, car.fuel, car.engineCc, car.grade], ['automatic', 'diesel', 2393, 'C1']);
  assert.deepEqual([car.carGroup, car.bodyStars, car.engineStars, car.interiorStars], ['G', 4, 2, 3]);
  assert.equal(car.inspectorNotes, 'กันชนหน้าครูด');
  for (const secret of ['SECRET-1', 'CHASSIS-1', '1234', 'PERSON', '0812345678', 'TimePhoto']) assert.ok(!JSON.stringify(car).includes(secret), secret);
});

test('yards by code or by name', () => {
  assert.equal(branchCodeOf({ Branch_Code: '10' }), '010');
  assert.equal(branchCodeOf({ Branch_Name: 'สาขาชลบุรี' }), '010');
  assert.equal(branchCodeOf({ Branch_Name: 'Rayong' }), '021');
  assert.equal(branchCodeOf({ Branch_Name: 'Somewhere' }), null);
});

test('lanes are found wherever the service puts them, once each', () => {
  const res = { branch: [], data: { 'พัทยา': [{ Document_No: 'D-1' }, { Document_No: 'D-2' }], 'ชลบุรี': [{ Document_No: 'D-1' }] } };
  assert.deepEqual(lanesOf(res).map((l) => l.Document_No), ['D-1', 'D-2']);
});

test('expected price: what the same model and year sold for, then the neighbouring years', () => {
  const car = carOf(raw);
  const sold = [700000, 800000, 900000, 850000].map((price, i) => ({ id: `x${i}`, key: modelKey(car), year: 2020, price }));
  const ref = expectedPrice(car, sold);
  assert.deepEqual([ref.expectedPrice, ref.soldComparables, ref.confidence], [825000, 4, 'medium']);
  const near = [{ id: 'y1', key: modelKey(car), year: 2019, price: 650000 }, { id: 'y2', key: modelKey(car), year: 2021, price: 900000 }, { id: 'y3', key: modelKey(car), year: 2021, price: 880000 }];
  assert.equal(expectedPrice(car, near).confidence, 'low');
  assert.equal(expectedPrice(car, [{ id: 'z', key: 'other|car', year: 2020, price: 1 }]).expectedPrice, null);
});

test('price targets: words, optional year, the most to pay', () => {
  const t = parseTarget('toyota fortuner 2020 750000');
  assert.deepEqual([t.words, t.year, t.maxPrice], [['toyota', 'fortuner'], 2020, 750000]);
  assert.equal(parseTarget('honda city 450000').year, null);
  assert.equal(parseTarget('fortuner'), null);
  const car = carOf(raw);
  // Starting price 720,000: under 750,000 when nothing sold is known (a weaker sign).
  assert.deepEqual(matchTargets(car, [t]).map((m) => m.by), ['starting price only']);
  // With an expected price of 800,000 it no longer fits 750,000; with 740,000 it does.
  assert.equal(matchTargets(car, [t], 800000).length, 0);
  assert.deepEqual(matchTargets(car, [t], 740000).map((m) => [m.by, m.maxPrice]), [['expected price', 750000]]);
  assert.equal(matchTargets(car, [parseTarget('toyota fortuner 2021 900000')], 700000).length, 0);
});

test('the client sends a form with an honest user agent and retries a busy server', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push([url, opts]);
    return calls.length === 1 ? { ok: false, status: 503 } : { ok: true, status: 200, json: async () => ({ success: true }) };
  };
  const post = createClient({ delayMs: 0, fetchImpl, log: { warning() {} } });
  const orig = global.setTimeout;
  global.setTimeout = (fn) => orig(fn, 0);
  try { assert.deepEqual(await post('/weblot/lot_list', { Auction_Date: '2026-11-25' }), { success: true }); } finally { global.setTimeout = orig; }
  assert.equal(calls.length, 2);
  assert.match(calls[0][1].headers['user-agent'], /internal tool/);
  assert.equal(calls[0][1].body, 'Auction_Date=2026-11-25');
});

test('days from today', () => {
  assert.deepEqual(daysFrom(new Date('2026-11-25'), 2), ['2026-11-25', '2026-11-26', '2026-11-27']);
});

test('carsome: the car list is read from the page data as text, with parameters resolved', async () => {
  const { parseCarsomePage, retailOf } = await import('../src/carsome.js');
  const { readFileSync } = await import('node:fs');
  const { cars, total } = parseCarsomePage(readFileSync(new URL('./fixtures/carsome-mini.html', import.meta.url), 'utf8'));
  assert.equal(total, 36);
  assert.deepEqual(cars.map(retailOf).map((c) => [c.brand, c.model, c.year, c.mileageKm, c.price]), [['Toyota', 'FORTUNER', 2020, 189540, 1133130], ['Isuzu', 'D-MAX', 2021, 52000, 455000]]);
  assert.ok(!('dealerName' in retailOf(cars[0])));
});

test('retail price of the same model and year, and how far the expected auction price is below it', async () => {
  const { retailPrice, belowPercent } = await import('../src/value.js');
  const auction = { brand: 'Isuzu', model: 'D-Max', year: 2021 };
  const retail = [455000, 475000, 520000].map((price, i) => ({ id: `r${i}`, brand: 'Isuzu', model: 'D-MAX', year: 2021, price }));
  const r = retailPrice(auction, retail);
  assert.deepEqual([r.retailPrice, r.retailComparables], [475000, 3]);
  assert.equal(belowPercent(370000, r.retailPrice), 22);
  assert.equal(retailPrice({ ...auction, year: 2015 }, retail).retailPrice, null);
});
