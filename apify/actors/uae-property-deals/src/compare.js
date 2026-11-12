// Market value of a listing from comparable sales of the same layout (Dubai: DLD deals) or, where
// deals are not published, from other listings of the same layout. Rules come from the Dubai Marina
// pilot (2026-11): comparing average price per sqft of a whole building gave false finds (a large
// one-bedroom against small ones), so comparables must be the same building, bedrooms and status,
// with a size within 15%.

export const SQM = 10.7639;
const DAY = 86400000;
export const SIZE_TOLERANCE = 0.15;
export const MIN_COMPARABLES = 3;
export const MIN_LISTING_COMPARABLES = 4;
export const DEAL_MONTHS = 12;

// Typical sizes in sqft by bedrooms (wide, to catch only clear unit or typing errors).
const SIZE_RANGE = { 0: [250, 1100], 1: [450, 1700], 2: [700, 2800], 3: [1000, 4500], 4: [1400, 8000], 5: [1800, 12000], 6: [2500, 20000] };
export function plausibleSize(bedrooms, sqft) {
  const [lo, hi] = SIZE_RANGE[Math.min(Math.max(bedrooms ?? 2, 0), 6)];
  return sqft >= lo && sqft <= hi;
}

export const median = (values) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

const statusOf = (text) => (/off/i.test(String(text ?? '')) ? 'off-plan' : 'ready');

// A DLD deal from a transaction page as a clean record, or null with the reason. The area is in
// sqft on most deals and in square metres on a few: the unit that gives a plausible size is used.
export function cleanDeal(t, building) {
  const area = t.builtupArea || t.plotArea;
  if (!t.price || !area) return { deal: null, reason: 'no price or area' };
  if (t.isBulkTransaction) return { deal: null, reason: 'bulk deal' };
  const beds = Number.isInteger(t.bedrooms) ? t.bedrooms : null;
  let sqft = area;
  let unit = 'sqft';
  if (!plausibleSize(beds, area) && plausibleSize(beds, area * SQM)) {
    sqft = area * SQM;
    unit = 'sqm';
  }
  if (!plausibleSize(beds, sqft)) return { deal: null, reason: 'implausible size' };
  return {
    deal: {
      id: t.id,
      building,
      bedrooms: beds,
      price: t.price,
      sqft: Math.round(sqft),
      pricePerSqft: t.price / sqft,
      date: String(t.transactionDate ?? '').slice(0, 10),
      status: statusOf(t.status),
      areaUnit: unit,
    },
    reason: null,
  };
}

const ageDays = (date, now) => (now - Date.parse(date)) / DAY;

// Comparable sales for a listing and the market value they give.
export function dealComparison(listing, deals, now = Date.now()) {
  const comps = deals.filter((d) => d.bedrooms === listing.bedrooms && d.status === listing.completion && ageDays(d.date, now) <= DEAL_MONTHS * 30.4
    && Math.abs(d.sqft / listing.sizeSqft - 1) <= SIZE_TOLERANCE);
  if (comps.length < MIN_COMPARABLES) return null;
  const ppsf = median(comps.map((d) => d.pricePerSqft));
  const prices = comps.map((d) => d.price).sort((a, b) => a - b);
  return {
    basis: 'deals',
    marketValue: Math.round(ppsf * listing.sizeSqft),
    marketPricePerSqft: Math.round(ppsf),
    comparables: comps.length,
    comparablePrices: prices,
    lastComparableDate: comps.map((d) => d.date).sort().at(-1),
    spread: prices.at(-1) / prices[0],
    belowAll: listing.price < prices[0],
  };
}

// Where no deals are published: other listings of the same building, bedrooms, status and size.
export function listingComparison(listing, others) {
  const comps = others.filter((o) => o.listingId !== listing.listingId && o.bedrooms === listing.bedrooms && o.completion === listing.completion
    && Math.abs(o.sizeSqft / listing.sizeSqft - 1) <= SIZE_TOLERANCE && o.agency !== listing.agency);
  if (comps.length < MIN_LISTING_COMPARABLES) return null;
  const ppsf = median(comps.map((o) => o.price / o.sizeSqft));
  const prices = comps.map((o) => o.price).sort((a, b) => a - b);
  return {
    basis: 'listings',
    marketValue: Math.round(ppsf * listing.sizeSqft),
    marketPricePerSqft: Math.round(ppsf),
    comparables: comps.length,
    comparablePrices: prices,
    lastComparableDate: null,
    spread: prices.at(-1) / prices[0],
    belowAll: listing.price < prices[0],
  };
}

// How far a listing can be trusted as "below market". Asking prices are about 11% above sold prices
// in Dubai, so listing-based comparisons are never "high".
export function confidenceOf(listing, cmp) {
  if (!cmp) return null;
  if (/hotel/i.test(listing.building ?? '') || /\bhotel (room|unit|apartment)\b/i.test(listing.title ?? '')) return 'low';
  if (!listing.verified) return 'low';
  if (cmp.basis === 'deals') {
    if (cmp.spread <= 1.35 && cmp.belowAll) return 'high';
    if (cmp.spread <= 1.6) return 'medium';
    return 'low';
  }
  return cmp.spread <= 1.35 && cmp.belowAll ? 'medium' : 'low';
}

// Listings of the same layout on sale (same building, bedrooms and size within 3%): in Dubai's
// towers the same layout repeats on every floor, so this is supply, not the same unit.
export function layoutSupply(listings) {
  const groups = new Map();
  for (const l of listings) {
    if (!l.locationId || !l.sizeSqft) continue;
    const key = `${l.locationId}|${l.bedrooms}|${Math.round(l.sizeSqft / 30)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  const out = new Map();
  for (const ls of groups.values()) {
    const prices = ls.map((l) => l.price).sort((a, b) => a - b);
    for (const l of ls) out.set(l.listingId, { sameLayoutListings: ls.length, sameLayoutMinPrice: prices[0], sameLayoutMedianPrice: median(prices) });
  }
  return out;
}

// Deals of a building remembered across runs: Property Finder shows only the latest 10, so each run
// adds the new ones and the history grows. Keeps deals of the last `months` months.
export function mergeDeals(known = [], fresh = [], now = Date.now(), months = 36) {
  const byId = new Map(known.map((d) => [d.id, d]));
  for (const d of fresh) byId.set(d.id, d);
  return [...byId.values()].filter((d) => ageDays(d.date, now) <= months * 30.4).sort((a, b) => b.date.localeCompare(a.date));
}

// A listing's own history across runs: first seen, previous price and the change.
export function listingHistory(previous, listing, today) {
  if (!previous) return { firstSeenAt: today, previousPrice: null, priceChange: null, priceChangedAt: null, record: { firstSeenAt: today, price: listing.price, priceChangedAt: null, previousPrice: null } };
  const changed = previous.price !== listing.price;
  const record = changed
    ? { firstSeenAt: previous.firstSeenAt, price: listing.price, previousPrice: previous.price, priceChangedAt: today }
    : previous;
  return {
    firstSeenAt: record.firstSeenAt,
    previousPrice: record.previousPrice ?? null,
    priceChange: record.previousPrice ? listing.price - record.previousPrice : null,
    priceChangedAt: record.priceChangedAt ?? null,
    record,
  };
}
