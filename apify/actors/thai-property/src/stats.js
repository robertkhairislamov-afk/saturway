// Market figures per project and per district: asking prices per m², rents, gross yield, supply and
// how listings come and go between runs. All prices are asking prices: Thailand publishes no sale
// prices per unit.

// Rounded to a step (1000, 10, 0.1…) without float noise such as 7.1000000000000005.
const round = (n, step = 1) => (Number.isFinite(n) ? Number((Math.round(n / step) * step).toFixed(step < 1 ? String(step).split('.')[1].length : 0)) : null);

export function quantile(values, q) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
export const median = (values) => quantile(values, 0.5);

// A project's name the same way however agencies write it: "The Base Central Pattaya",
// "Base Central Pattaya" and "THE BASE central-pattaya" are one key.
export const projectKey = (name) => String(name ?? '')
  .normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase()
  .replace(/&/g, ' and ').replace(/\b(the|condominium|condo|residence|residences)\b/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Listings whose size or price cannot be right are left out of the figures (not out of the data):
// a 3 m² condo or a ฿5,000 sale price is a typo or a parking spot.
export function usableForStats(listing) {
  const { sizeSqm: sqm, price, transaction } = listing;
  if (!(sqm >= 15 && sqm <= 1500) || !(price > 0)) return false;
  if (transaction === 'sale') return price >= 300000;
  return price >= 2000 && price <= 2000000;
}

// Robust middle of a set: drop the values beyond 3 interquartile ranges, which are almost always
// mistakes (a rent typed as a sale price, a missing zero).
function trimmed(all) {
  // First drop what is more than 3 times off the median (works with few values), then the far
  // ends of what is left.
  const mid = median(all);
  const values = mid ? all.filter((v) => v >= mid / 3 && v <= mid * 3) : all;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  if (q1 == null) return [];
  const spread = (q3 - q1) || q1 * 0.1;
  return values.filter((v) => v >= q1 - 3 * spread && v <= q3 + 3 * spread);
}

function summarize(listings) {
  const sale = listings.filter((l) => l.transaction === 'sale' && usableForStats(l));
  const rent = listings.filter((l) => l.transaction === 'rent' && usableForStats(l));
  const salePsm = trimmed(sale.map((l) => l.price / l.sizeSqm));
  const rentPsm = trimmed(rent.map((l) => l.price / l.sizeSqm));
  const medianSalePsm = median(salePsm);
  const medianRentPsm = median(rentPsm);
  return {
    saleListings: listings.filter((l) => l.transaction === 'sale').length,
    rentListings: listings.filter((l) => l.transaction === 'rent').length,
    medianSalePricePerSqm: round(medianSalePsm, 10),
    salePricePerSqmLow: round(quantile(salePsm, 0.25), 10),
    salePricePerSqmHigh: round(quantile(salePsm, 0.75), 10),
    medianSalePrice: round(median(sale.map((l) => l.price)), 1000),
    medianSaleSizeSqm: round(median(sale.map((l) => l.sizeSqm)), 0.1),
    medianRentPerSqm: round(medianRentPsm, 1),
    medianRent: round(median(rent.map((l) => l.price)), 100),
    // Gross yield: a year of the typical rent per m² against the typical sale price per m².
    grossYieldPercent: medianSalePsm && medianRentPsm && sale.length >= 3 && rent.length >= 3
      ? round((medianRentPsm * 12 * 100) / medianSalePsm, 0.1) : null,
    newSinceLastRun: listings.filter((l) => l.isNewSinceLastRun).length,
    priceCutsSinceLastRun: listings.filter((l) => l.priceChange != null && l.priceChange < 0).length,
    medianDaysListed: round(median(listings.map((l) => l.daysListed))),
  };
}

const groupBy = (items, keyOf) => {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (key == null || key === '') continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
};

const mostCommon = (values) => {
  const counts = new Map();
  for (const v of values) if (v != null) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
};

// One record per project. `details` are the project facts from a listing page (developer, year,
// units, nearest beach); `removed` counts listings of the project that were gone in this run.
export function projectRecords(listings, { details = {}, removed = {} } = {}) {
  return [...groupBy(listings, (l) => l.projectKey).entries()].map(([key, items]) => {
    const info = details[key] ?? {};
    const figures = summarize(items);
    const units = info.units ?? null;
    return {
      recordType: 'project',
      project: mostCommon(items.map((l) => l.project)),
      projectKey: key,
      district: mostCommon(items.map((l) => l.district)),
      city: mostCommon(items.map((l) => l.city)),
      latitude: items.find((l) => l.latitude != null)?.latitude ?? null,
      longitude: items.find((l) => l.longitude != null)?.longitude ?? null,
      developer: info.developer ?? null,
      completedYear: info.completedYear ?? null,
      floors: info.floors ?? null,
      units,
      nearestLandmark: info.nearestLandmark ?? null,
      nearestLandmarkKm: info.nearestLandmarkKm ?? null,
      ...figures,
      removedSinceLastRun: removed[key] ?? 0,
      // Sale listings per 100 units: how much of the building is on offer (duplicates included).
      saleListingsPer100Units: units ? round((figures.saleListings * 100) / units, 0.1) : null,
    };
  }).sort((a, b) => b.saleListings + b.rentListings - (a.saleListings + a.rentListings));
}

export function districtRecords(listings, { removedByDistrict = {} } = {}) {
  return [...groupBy(listings, (l) => l.district).entries()].map(([district, items]) => ({
    recordType: 'district',
    district,
    city: mostCommon(items.map((l) => l.city)),
    projects: new Set(items.map((l) => l.projectKey).filter(Boolean)).size,
    ...summarize(items),
    removedSinceLastRun: removedByDistrict[district] ?? 0,
  })).sort((a, b) => b.saleListings - a.saleListings);
}
