import assert from 'node:assert/strict';
import { test } from 'node:test';

import { branchCodeOf, carOf, createClient, daysFrom, lanesOf } from '../src/auct.js';
import { discountPercent, matchTargets, modelKey, parseTarget, referencePrice } from '../src/value.js';

const raw = {
  _id: 'a1', Document_No: 'D-1', Car_Order: '12', Brand_Name: 'TOYOTA', Model_Name: 'FORTUNER', Sub_Model_Name: '2.4 V 2WD',
  Year_of_Manufacture: '2020', Register_Year: '2563', Mile: '85,000', Asset_Gear: 'AT', Sales_Price: '720,000', Branch_Name: 'พัทยา',
  images: ['uploads/a.jpg', { url: 'https://img.example/b.jpg' }], Contract_No: 'SECRET-1', License_Plate_No: '1กข 1234',
};

test('a car from the auction service, with the yard, a Buddhist-era year and no contract number', () => {
  const car = carOf(raw, { auction_name: 'Lane A', Auction_Date: '2026-11-28T00:00:00.000Z' });
  assert.equal(car.branch, 'Pattaya');
  assert.equal(car.branchCode, '029');
  assert.equal(car.year, 2020);
  assert.equal(car.registerYear, 2020);
  assert.equal(car.mileageKm, 85000);
  assert.equal(car.price, 720000);
  assert.equal(car.auctionDate, '2026-11-28');
  assert.equal(car.lotUrl, 'https://www.auct.co.th/auction-list/D-1');
  assert.deepEqual(car.images, ['https://www.auct.co.th/uploads/a.jpg', 'https://img.example/b.jpg']);
  assert.ok(!JSON.stringify(car).includes('SECRET-1'));
  assert.ok(!JSON.stringify(car).includes('1234'));
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

test('reference price from the same model and year, then the neighbouring years', () => {
  const car = carOf(raw);
  const obs = [700000, 800000, 900000, 850000].map((price, i) => ({ id: `x${i}`, key: modelKey(car), year: 2020, price }));
  const ref = referencePrice(car, obs);
  assert.equal(ref.referencePrice, 825000);
  assert.equal(ref.confidence, 'medium');
  assert.equal(discountPercent(car.price, ref.referencePrice), 13);
  const near = [{ id: 'y1', key: modelKey(car), year: 2019, price: 650000 }, { id: 'y2', key: modelKey(car), year: 2021, price: 900000 }, { id: 'y3', key: modelKey(car), year: 2021, price: 880000 }];
  assert.equal(referencePrice(car, near).confidence, 'low');
  assert.equal(referencePrice(car, [{ id: car.id, key: modelKey(car), year: 2020, price: 1 }]).referencePrice, null);
});

test('price targets: words, optional year, the most to pay', () => {
  const t = parseTarget('toyota fortuner 2020 750000');
  assert.deepEqual([t.words, t.year, t.maxPrice], [['toyota', 'fortuner'], 2020, 750000]);
  assert.equal(parseTarget('honda city 450000').year, null);
  assert.equal(parseTarget('fortuner'), null);
  const car = carOf(raw);
  assert.equal(matchTargets(car, [t]).length, 1);
  assert.equal(matchTargets(car, [parseTarget('toyota fortuner 2020 700000')]).length, 0);
  assert.equal(matchTargets(car, [parseTarget('toyota fortuner 2021 900000')]).length, 0);
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
