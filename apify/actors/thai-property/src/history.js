// What earlier runs saw, kept in a named key-value store so that it outlives the runs: when each
// listing was first and last seen and at what price. It gives days on the market, price cuts, new
// listings and the listings that disappeared (most of them sold or taken off the market).

const DAY_MS = 24 * 60 * 60 * 1000;

// One record per search (location, type, deal), so that each stays well under the record size
// limit: about 60 bytes per listing.
export const historyKey = ({ location, propertyType, transaction }) =>
  `seen-${location}-${propertyType}-${transaction}`.replace(/[^a-zA-Z0-9!\-_.'()]/g, '-');

// seen: { [listingKey]: [firstSeenDay, lastSeenDay, firstPrice, lastPrice, projectKey, district] }
// Days are counted from 2020-01-01 to keep the record small.
const EPOCH = Date.UTC(2020, 0, 1);
const dayNumber = (iso) => Math.floor((Date.parse(iso) - EPOCH) / DAY_MS);
const dayDate = (n) => new Date(EPOCH + n * DAY_MS).toISOString().slice(0, 10);

// Adds history fields to this run's listings and returns the updated record and the listings of
// the last run that are gone now.
export function applyHistory(listings, seen = {}, now = new Date().toISOString()) {
  const today = dayNumber(now);
  const hadHistory = Object.keys(seen).length > 0;
  const next = { ...seen };
  const present = new Set();
  for (const listing of listings) {
    present.add(listing.key);
    const before = seen[listing.key];
    const posted = listing.postedAt ? dayNumber(listing.postedAt) : today;
    const first = before ? Math.min(before[0], posted) : posted;
    listing.firstSeenAt = dayDate(first);
    listing.daysListed = Math.max(0, today - first);
    listing.isNewSinceLastRun = hadHistory && !before;
    listing.previousPrice = before && before[3] !== listing.price ? before[3] : null;
    listing.priceChange = listing.previousPrice != null && listing.price != null ? listing.price - listing.previousPrice : null;
    listing.priceChangePercent = listing.priceChange != null && listing.previousPrice
      ? Math.round((listing.priceChange / listing.previousPrice) * 1000) / 10 : null;
    listing.firstPrice = before ? before[2] : listing.price;
    next[listing.key] = [first, today, before ? before[2] : listing.price, listing.price, listing.projectKey ?? null, listing.district ?? null];
  }
  // Gone since the last run: seen then, not now. Kept for 180 days so that a listing that comes
  // back keeps its first date.
  const lastRun = Math.max(-1, ...Object.values(seen).map((v) => v[1]));
  const removed = [];
  for (const [key, value] of Object.entries(seen)) {
    if (present.has(key)) continue;
    if (value[1] === lastRun) removed.push({ key, projectKey: value[4], district: value[5], lastPrice: value[3], firstSeenAt: dayDate(value[0]), lastSeenAt: dayDate(value[1]) });
    if (today - value[1] > 180) delete next[key];
  }
  return { seen: next, removed };
}
