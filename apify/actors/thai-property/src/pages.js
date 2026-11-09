// What the listing's own page says: when the agency last updated it ("Updated At") and whether it
// is still for sale. The search list only has the date the listing was first verified, so a unit
// listed in 2019 and updated last week looked stale. Pages are read for the listings that matter
// (below market, units at several agencies), each at most once a week; the answers are kept in the
// memory as { key: [checkedDay, updatedDay | null, status] }, status 1 for sale, 0 no longer for
// sale, -1 page removed.

import { listingKey } from './dotproperty.js';
import { dayDate, dayNumber, freshnessOf } from './history.js';

export const RECHECK_DAYS = 7;
export const FOR_SALE = 1;
export const NOT_FOR_SALE = 0;
export const PAGE_REMOVED = -1;
const STATUS_TEXT = { [FOR_SALE]: 'for sale', [NOT_FOR_SALE]: 'not for sale', [PAGE_REMOVED]: 'page removed' };

// The answer of one page read, as kept in the memory.
export const pageCheck = (today, page) => [today, page?.updatedAt ? dayNumber(page.updatedAt) : null, page?.available === false ? NOT_FOR_SALE : FOR_SALE];
export const removedCheck = (today) => [today, null, PAGE_REMOVED];

// Listings whose page is worth reading, most useful first: below-market listings by how far below
// they are, then listings in units offered by several agencies, biggest units first. Listings read
// in the last RECHECK_DAYS are skipped.
export function pageCandidates({ deals = [], lots = [], listings = [], checks = {}, today }) {
  const byKey = new Map(listings.map((l) => [l.key, l]));
  const due = (key) => !checks[key] || today - checks[key][0] >= RECHECK_DAYS;
  const out = new Map();
  for (const d of [...deals].sort((a, b) => a.gapPercent - b.gapPercent)) {
    const key = d.url ? listingKey(d.url) : null;
    if (key && byKey.has(key) && due(key)) out.set(key, byKey.get(key));
  }
  const lotSize = new Map(lots.map((lot) => [lot.lotId, lot.listings]));
  const inLots = listings.filter((l) => l.lotId && l.transaction === 'sale' && due(l.key))
    .sort((a, b) => (lotSize.get(b.lotId) ?? 0) - (lotSize.get(a.lotId) ?? 0));
  for (const l of inLots) if (!out.has(l.key)) out.set(l.key, l);
  return [...out.values()];
}

// Adds the page's answer to each listing: the site's update date counts as activity, and a
// listing the site no longer offers is marked so it is left out of below-market figures.
export function applyPageChecks(listings, checks, today) {
  let applied = 0;
  for (const l of listings) {
    const check = checks[l.key];
    if (!check) continue;
    applied++;
    const [, updated, status] = check;
    l.siteUpdatedAt = updated != null ? dayDate(updated) : null;
    l.siteStatus = STATUS_TEXT[status] ?? null;
    l.offMarket = status !== FOR_SALE;
    if (updated != null && (l.lastActivityAt == null || updated > dayNumber(l.lastActivityAt))) {
      l.lastActivityAt = dayDate(updated);
      l.daysSinceActivity = Math.max(0, today - updated);
      l.freshness = freshnessOf(l.daysSinceActivity);
    }
  }
  return applied;
}

// Only the checks of listings still on the market are kept.
export const keepChecks = (checks, listings) => {
  const current = new Set(listings.map((l) => l.key));
  return Object.fromEntries(Object.entries(checks).filter(([key]) => current.has(key)));
};
