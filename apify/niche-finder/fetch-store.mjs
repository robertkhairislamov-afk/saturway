// Downloads public Actors from the Apify Store API into a compact JSONL file.
// The Store API is public, so no token is needed.
//
// The API stops returning items after roughly 14,000 results per sort order, so
// the script walks several sort orders and merges them by Actor id. Sorting by
// popularity alone already covers nearly all Actors that have any users.
//
// Usage: node fetch-store.mjs [output.jsonl]
// Behind an HTTPS proxy on Node >= 22.21, run with NODE_USE_ENV_PROXY=1.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGE_SIZE = 1000;
const API_URL = 'https://api.apify.com/v2/store';
const SORT_ORDERS = ['popularity', 'newest', 'relevance'];
const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(process.argv[2] ?? `${here}/data/store.jsonl`);

async function fetchPage(sortBy, offset, attempt = 1) {
  try {
    const res = await fetch(`${API_URL}?sortBy=${sortBy}&limit=${PAGE_SIZE}&offset=${offset}`);
    if (!res.ok) throw new Error(`Store API returned ${res.status}`);
    return (await res.json()).data;
  } catch (err) {
    if (attempt >= 4) throw new Error(`sortBy=${sortBy} offset=${offset}: ${err.message}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return fetchPage(sortBy, offset, attempt + 1);
  }
}

// Price of the primary pay-per-event event for free-plan users, or the per-unit price.
function primaryPrice(pricing) {
  if (!pricing) return null;
  const events = pricing.pricingPerEvent?.actorChargeEvents;
  if (events) {
    const primary = Object.values(events).find((e) => e.isPrimaryEvent) ?? Object.values(events)[0];
    return primary?.eventTieredPricingUsd?.FREE?.tieredEventPriceUsd ?? primary?.eventPriceUsd ?? null;
  }
  return pricing.pricePerUnitUsd ?? null;
}

function compact(item) {
  const s = item.stats ?? {};
  const runs = s.publicActorRunStats30Days ?? {};
  return {
    id: item.id,
    title: item.title,
    name: item.name,
    username: item.username,
    url: item.url,
    categories: item.categories ?? [],
    notice: item.notice,
    description: (item.description ?? '').slice(0, 400),
    users: s.totalUsers ?? 0,
    users7: s.totalUsers7Days ?? 0,
    users30: s.totalUsers30Days ?? 0,
    users90: s.totalUsers90Days ?? 0,
    runs30: runs.TOTAL ?? 0,
    failed30: (runs.FAILED ?? 0) + (runs['TIMED-OUT'] ?? 0),
    rating: item.actorReviewRating ?? null,
    reviews: item.actorReviewCount ?? 0,
    bookmarks: item.bookmarkCount ?? 0,
    lastRunStartedAt: s.lastRunStartedAt ?? null,
    pricingModel: item.currentPricingInfo?.pricingModel ?? 'NONE',
    price: primaryPrice(item.currentPricingInfo),
  };
}

const byId = new Map();
let storeTotal = 0;
for (const sortBy of SORT_ORDERS) {
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await fetchPage(sortBy, offset);
    storeTotal = page.total;
    if (page.items.length === 0) break;
    for (const item of page.items) byId.set(item.id, compact(item));
    process.stderr.write(`${sortBy} offset ${offset}: ${byId.size} unique Actors so far\n`);
  }
}
console.log(`Store reports ${storeTotal} Actors in total`);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, [...byId.values()].map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`Saved ${byId.size} Actors to ${outPath}`);
