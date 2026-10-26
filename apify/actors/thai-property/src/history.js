// What earlier runs saw, kept in a named key-value store so that it outlives the runs: when each
// listing was first and last seen, at what price, and its link. It gives days on the market, price
// cuts, new listings and the listings that disappeared.

const DAY_MS = 24 * 60 * 60 * 1000;
const SHARDS = '0123456789abcdef'.split('');

// One record per search (location, type, deal) and per first character of the listing key, so
// that every record stays far below the record size limit.
export const historyKey = ({ location, propertyType, transaction }, shard = '') =>
  `seen-${location}-${propertyType}-${transaction}${shard ? `-${shard}` : ''}`.replace(/[^a-zA-Z0-9!\-_.'()]/g, '-');
const shardOf = (key) => (SHARDS.includes(String(key)[0]) ? String(key)[0] : '0');

export async function loadHistory(store, search) {
  const seen = {};
  for (const shard of SHARDS) Object.assign(seen, (await store.getValue(historyKey(search, shard))) ?? {});
  // Older runs kept one record per search.
  Object.assign(seen, (await store.getValue(historyKey(search))) ?? {});
  return seen;
}

export async function saveHistory(store, search, seen) {
  const parts = Object.fromEntries(SHARDS.map((s) => [s, {}]));
  for (const [key, value] of Object.entries(seen)) parts[shardOf(key)][key] = value;
  for (const shard of SHARDS) await store.setValue(historyKey(search, shard), parts[shard]);
  if (await store.getValue(historyKey(search))) await store.setValue(historyKey(search), null);
}

// seen: { [listingKey]: [firstSeenDay, lastSeenDay, firstPrice, lastPrice, projectKey, district, url] }
// Days are counted from 2020-01-01 to keep the records small.
const EPOCH = Date.UTC(2020, 0, 1);
export const dayNumber = (iso) => Math.floor((Date.parse(iso) - EPOCH) / DAY_MS);
const dayDate = (n) => new Date(EPOCH + n * DAY_MS).toISOString().slice(0, 10);

// Adds history fields to this run's listings and returns the updated history and the listings of
// the last run that are missing now. Missing is not gone yet: a listing can move between pages
// while they are read, so the caller confirms each one on its own page.
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
    next[listing.key] = [first, today, before ? before[2] : listing.price, listing.price, listing.projectKey ?? null, listing.district ?? null, listing.url ?? null];
  }
  const lastRun = Math.max(-1, ...Object.values(seen).map((v) => v[1]));
  const missing = [];
  for (const [key, value] of Object.entries(seen)) {
    if (present.has(key)) continue;
    if (value[1] === lastRun) {
      missing.push({ key, projectKey: value[4], district: value[5], lastPrice: value[3], firstSeenAt: dayDate(value[0]), lastSeenAt: dayDate(value[1]), url: value[6] ?? null });
    }
    // Forgotten after 180 days, so that the history does not grow forever.
    if (today - value[1] > 180) delete next[key];
  }
  return { seen: next, missing };
}

// A missing listing whose page is still on offer was only missed by the list pages: it stays in
// the history as seen today.
export function keepAsSeen(seen, key, now = new Date().toISOString()) {
  if (seen[key]) seen[key] = [seen[key][0], dayNumber(now), ...seen[key].slice(2)];
}
