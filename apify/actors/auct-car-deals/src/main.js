import { Actor, log } from 'apify';

import { BRANCHES, CAR, branchCodeOf, carOf, createClient, daysFrom, lanesOf } from './auct.js';
import { expectedPrice, matchTargets, modelKey, parseTarget } from './value.js';

await Actor.init();
const input = (await Actor.getInput()) ?? {};
const branches = (input.branches?.length ? input.branches : ['029', '010', '021', '001', '018']).filter((b) => BRANCHES[b]);
const daysAhead = Math.min(Math.max(Number(input.daysAhead ?? 10), 0), 30);
const brands = (input.brands ?? []).map((b) => b.trim().toLowerCase()).filter(Boolean);
const keywords = (input.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean);
const targets = (input.targets ?? []).map(parseTarget).filter(Boolean);
const onlyTargets = input.onlyTargets === true && targets.length > 0;
const post = createClient({ delayMs: Math.max(Number(input.delayMs ?? 1200), 300), log });

// Today in Thailand.
const today = new Date(Date.now() + 7 * 3600000);
const days = daysFrom(new Date(today.toISOString().slice(0, 10)), daysAhead);
const pastDays = Math.min(Math.max(Number(input.pastDays ?? 14), 0), 60);
const past = pastDays ? daysFrom(new Date(new Date(today.toISOString().slice(0, 10)).getTime() - pastDays * 86400000), pastDays - 1) : [];
// A lane or car whose yard cannot be told is kept, and counted in the log.
const branchOk = (code) => code == null || branches.includes(code);

const lanes = [];
for (const day of days) {
  await Actor.setStatusMessage(`Reading the auction calendar: ${day}`);
  const res = await post('/weblot/lot_list', { Auction_Date: day, Branch_Code: 'All', Asset_Type: CAR });
  for (const lane of lanesOf(res)) {
    if (lane.Asset_Type && lane.Asset_Type !== CAR) continue;
    if (!branchOk(branchCodeOf(lane))) continue;
    lanes.push({ ...lane, Auction_Date: lane.Auction_Date ?? day });
  }
}
log.info(`${lanes.length} car auction lanes in ${days.length} days.`);

const cars = [];
for (const [i, lane] of lanes.entries()) {
  await Actor.setStatusMessage(`Reading lane ${i + 1} of ${lanes.length}: ${lane.auction_name ?? lane.Document_No}`);
  const res = await post('/webauction/products_new', { Document_No: lane.Document_No, Passed: '0' });
  for (const raw of res?.product ?? []) cars.push(carOf(raw, lane));
}
log.info(`${cars.length} cars listed in those lanes.`);

// Prices of earlier auctions, all yards: only brand, model, year and the price a car was sold for
// are kept (the service also returns buyers' details, which are never read).
const soldCars = [];
for (const day of past) {
  await Actor.setStatusMessage(`Reading sold prices: ${day}`);
  const res = await post('/weblot/lot_list', { Auction_Date: day, Branch_Code: 'All', Asset_Type: CAR });
  for (const lane of lanesOf(res)) {
    if (lane.Asset_Type && lane.Asset_Type !== CAR) continue;
    if (Number(lane.NoofSoldAsset ?? 1) === 0) continue;
    const list = await post('/webauction/products_new', { Document_No: lane.Document_No, Passed: '1' });
    for (const raw of list?.product ?? []) {
      const car = carOf(raw, lane);
      if (car.soldPrice && car.brand && car.model) soldCars.push({ id: `sold-${car.id}`, key: modelKey(car), year: car.year, price: car.soldPrice, kind: 'sold', date: car.auctionDate ?? day });
    }
  }
}
if (past.length) log.info(`${soldCars.length} sold prices from the last ${pastDays} days.`);

const unknownYard = cars.filter((c) => !c.branchCode).length;
if (unknownYard) log.warning(`${unknownYard} cars have no recognizable yard and are kept.`);

// Sold prices of this run and earlier runs (kept 180 days).
const history = await Actor.openKeyValueStore(input.historyName || 'auct-car-deals-history');
const kept = ((await history.getValue('sold')) ?? []).filter((o) => o.kind === 'sold');
const byId = new Map(kept.map((o) => [o.id, o]));
for (const o of soldCars) byId.set(o.id, o);
const cutoff = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
const sold = [...byId.values()].filter((o) => o.date >= cutoff).slice(-50000);
await history.setValue('sold', sold);
log.info(`${sold.length} sold prices in the history.`);

const passes = (car) => branchOk(car.branchCode)
  && (!brands.length || brands.includes(String(car.brand).toLowerCase()))
  && (!keywords.length || keywords.some((k) => `${car.model} ${car.subModel}`.toLowerCase().includes(k)))
  && (!input.minYear || (car.year && car.year >= input.minYear))
  && (!input.maxYear || (car.year && car.year <= input.maxYear))
  && (!input.maxMileage || (car.mileageKm != null && car.mileageKm <= input.maxMileage))
  && (!input.maxPrice || (car.startPrice && car.startPrice <= input.maxPrice));

const rows = [];
for (const car of cars.filter(passes)) {
  const ref = expectedPrice(car, sold);
  const hits = matchTargets(car, targets, ref.expectedPrice);
  if (onlyTargets && !hits.length) continue;
  rows.push({ ...car, ...ref, matchesTarget: hits.length > 0, targets: hits });
}
// Cars within a target first (by expected price), then by auction date and yard.
rows.sort((a, b) => (b.matchesTarget - a.matchesTarget) || String(a.auctionDate).localeCompare(String(b.auctionDate)) || String(a.branch).localeCompare(String(b.branch)) || ((a.order ?? 0) - (b.order ?? 0)));
await Actor.pushData(rows);

const message = `Saved ${rows.length} cars from ${lanes.length} auction lanes (${cars.length} cars listed); ${rows.filter((r) => r.matchesTarget).length} within your targets; expected price known for ${rows.filter((r) => r.expectedPrice).length}.`;
log.info(message);
await Actor.setStatusMessage(message, { isStatusMessageTerminal: true });
await Actor.exit();
