// Reference prices and price targets for auction cars.
// A car is compared with the same brand, model and year seen at AUCT (this run and earlier runs);
// with fewer than three such cars, the neighbouring years are used and the confidence is low.

const clean = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9฀-๿]+/g, ' ').trim();

export const modelKey = (car) => `${clean(car.brand)}|${clean(car.model)}`;

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
};

// The price a car will probably go for: the median of what the same brand, model and year sold for
// at earlier AUCT auctions ([{ id, key, year, price }]); the neighbouring years with low confidence.
// The listed price of an upcoming lot is only the starting price and says little about the result.
export function expectedPrice(car, sold) {
  const others = sold.filter((o) => o.id !== car.id && o.key === modelKey(car) && o.price > 0);
  const same = others.filter((o) => o.year === car.year);
  if (same.length >= 3) return { expectedPrice: median(same.map((o) => o.price)), soldComparables: same.length, confidence: same.length >= 8 ? 'high' : 'medium', basis: 'same model and year' };
  const near = others.filter((o) => car.year && Math.abs(o.year - car.year) <= 1);
  if (near.length >= 3) return { expectedPrice: median(near.map((o) => o.price)), soldComparables: near.length, confidence: 'low', basis: 'same model, year ±1' };
  return { expectedPrice: null, soldComparables: same.length, confidence: null, basis: null };
}

// "toyota fortuner 2020 750000" → { words: ['toyota', 'fortuner'], year: 2020, maxPrice: 750000 }
export function parseTarget(line) {
  const parts = clean(line).split(' ').filter(Boolean);
  const numbers = parts.filter((p) => /^\d+$/.test(p)).map(Number);
  const maxPrice = numbers.filter((n) => n > 3000).pop() ?? null;
  const year = numbers.find((n) => n >= 1980 && n <= 2040) ?? null;
  const words = parts.filter((p) => !/^\d+$/.test(p));
  if (!maxPrice || !words.length) return null;
  return { text: String(line).trim(), words, year, maxPrice };
}

// A target fits when the car matches its words and year and its expected price is at or under the
// target; without an expected price, when the starting price is (a weaker sign, marked as such).
export function matchTargets(car, targets, expected = null) {
  const text = clean(`${car.brand} ${car.model} ${car.subModel}`);
  return targets
    .filter((t) => t.words.every((w) => text.includes(w)) && (!t.year || t.year === car.year))
    .map((t) => ({ target: t.text, maxPrice: t.maxPrice, by: expected ? 'expected price' : 'starting price only', fits: expected ? expected <= t.maxPrice : car.startPrice > 0 && car.startPrice <= t.maxPrice }))
    .filter((m) => m.fits);
}

// The retail price of the same brand, model and year on sale at Carsome (median); the neighbouring
// years with low confidence. retail: [{ id, brand, model, year, price }].
export function retailPrice(car, retail) {
  const others = retail.filter((r) => modelKey(r) === modelKey(car) && r.price > 0);
  const same = others.filter((r) => r.year === car.year);
  if (same.length >= 2) return { retailPrice: median(same.map((r) => r.price)), retailComparables: same.length, retailBasis: 'same model and year' };
  const near = others.filter((r) => car.year && Math.abs(r.year - car.year) <= 1);
  if (near.length >= 2) return { retailPrice: median(near.map((r) => r.price)), retailComparables: near.length, retailBasis: 'same model, year ±1' };
  return { retailPrice: null, retailComparables: same.length, retailBasis: null };
}

export function belowPercent(price, reference) {
  if (!price || !reference) return null;
  return Math.round(((reference - price) / reference) * 100);
}
