import { Actor, log } from 'apify';

import { BRANCHES, CAR, branchCodeOf, carOf, createClient, daysFrom, lanesOf } from './auct.js';
import { discountPercent, matchTargets, modelKey, parseTarget, referencePrice } from './value.js';

await Actor.init();
const input = (await Actor.getInput()) ?? {};
const branches = (input.branches?.length ? input.branches : ['029', '010', '021', '001', '018']).filter((b) => BRANCHES[b]);
const daysAhead = Math.min(Math.max(Number(input.daysAhead ?? 10), 0), 30);
const brands = (input.brands ?? []).map((b) => b.trim().toLowerCase()).filter(Boolean);
const keywords = (input.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean);
const targets = (input.targets ?? []).map(parseTarget).filter(Boolean);
const minDiscount = Number(input.minDiscountPercent ?? 0);
const post = createClient({ delayMs: Math.max(Number(input.delayMs ?? 1200), 300), log });

// Today in Thailand.
const today = new Date(Date.now() + 7 * 3600000);
const days = daysFrom(new Date(today.toISOString().slice(0, 10)), daysAhead);
// A lane or car whose yard cannot be told is kept, and counted in the log.
const branchOk = (code) => code == null || branches.includes(code);

const lanes = [];
let firstLotList = true;
for (const day of days) {
  await Actor.setStatusMessage(`Reading the auction calendar: ${day}`);
  const res = await post('/weblot/lot_list', { Auction_Date: day, Branch_Code: 'All', Asset_Type: CAR });
  if (firstLotList && res) { await Actor.setValue('DEBUG_LOT_LIST', res); firstLotList = false; }
  for (const lane of lanesOf(res)) {
    if (lane.Asset_Type && lane.Asset_Type !== CAR) continue;
    if (!branchOk(branchCodeOf(lane))) continue;
    lanes.push({ ...lane, Auction_Date: lane.Auction_Date ?? day });
  }
}
log.info(`${lanes.length} car auction lanes in ${days.length} days.`);

const cars = [];
let firstProducts = true;
for (const [i, lane] of lanes.entries()) {
  await Actor.setStatusMessage(`Reading lane ${i + 1} of ${lanes.length}: ${lane.auction_name ?? lane.Document_No}`);
  const res = await post('/webauction/products_new', { Document_No: lane.Document_No, Passed: '0' });
  if (firstProducts && res) { await Actor.setValue('DEBUG_PRODUCTS', res); firstProducts = false; }
  for (const raw of res?.product ?? []) cars.push(carOf(raw, lane));
}
log.info(`${cars.length} cars listed in those lanes.`);

const unknownYard = cars.filter((c) => !c.branchCode).length;
if (unknownYard) log.warning(`${unknownYard} cars have no recognizable yard and are kept.`);

// Every car with a price is a comparable, filtered or not; earlier runs add theirs.
const history = await Actor.openKeyValueStore(input.historyName || 'auct-car-deals-history');
const past = (await history.getValue('observations')) ?? [];
const now = today.toISOString().slice(0, 10);
const fresh = cars.filter((c) => c.price && c.brand && c.model).map((c) => ({ id: c.id, key: modelKey(c), year: c.year, price: c.price, date: c.auctionDate ?? now }));
const byId = new Map(past.map((o) => [o.id, o]));
for (const o of fresh) byId.set(o.id, o);
const cutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
const observations = [...byId.values()].filter((o) => o.date >= cutoff).slice(-50000);
await history.setValue('observations', observations);

const passes = (car) => branchOk(car.branchCode)
  && (!brands.length || brands.includes(String(car.brand).toLowerCase()))
  && (!keywords.length || keywords.some((k) => `${car.model} ${car.subModel}`.toLowerCase().includes(k)))
  && (!input.minYear || (car.year && car.year >= input.minYear))
  && (!input.maxYear || (car.year && car.year <= input.maxYear))
  && (!input.maxMileage || (car.mileageKm != null && car.mileageKm <= input.maxMileage))
  && (!input.maxPrice || (car.price && car.price <= input.maxPrice));

const rows = [];
for (const car of cars.filter(passes)) {
  const ref = referencePrice(car, observations);
  const discount = discountPercent(car.price, ref.referencePrice);
  const hits = matchTargets(car, targets);
  if (minDiscount > 0 && !hits.length && !(discount != null && discount >= minDiscount)) continue;
  rows.push({ ...car, ...ref, discountPercent: discount, matchesTarget: hits.length > 0, targets: hits.map((t) => t.text) });
}
rows.sort((a, b) => (b.matchesTarget - a.matchesTarget) || ((b.discountPercent ?? -999) - (a.discountPercent ?? -999)));
await Actor.pushData(rows);

const message = `Saved ${rows.length} cars from ${lanes.length} auction lanes (${cars.length} cars listed); ${rows.filter((r) => r.matchesTarget).length} within your targets, ${rows.filter((r) => (r.discountPercent ?? 0) >= 15).length} at least 15% below the reference.`;
log.info(message);
await Actor.setStatusMessage(message, { isStatusMessageTerminal: true });
await Actor.exit();
