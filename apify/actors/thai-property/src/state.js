// Resuming after a migration: Apify can move a run to another server, and the Actor then starts
// again from the beginning. Each finished search is saved in the run's own key-value store
// (gzipped, in parts), so a restarted run reuses it instead of reading the site again.

import { gunzipSync, gzipSync } from 'node:zlib';

const PART = 4000;

export async function saveSearchState(store, index, { row, listings, removed }) {
  const parts = Math.ceil(listings.length / PART);
  for (let p = 0; p < parts; p++) {
    const body = gzipSync(Buffer.from(JSON.stringify(listings.slice(p * PART, (p + 1) * PART))));
    await store.setValue(`STATE-${index}-${p}`, body, { contentType: 'application/gzip' });
  }
  await store.setValue(`STATE-${index}`, { row, removed, parts });
}

export async function loadSearchState(store, index) {
  const meta = await store.getValue(`STATE-${index}`);
  if (!meta) return null;
  const listings = [];
  for (let p = 0; p < meta.parts; p++) {
    const body = await store.getValue(`STATE-${index}-${p}`);
    if (!body) return null;
    listings.push(...JSON.parse(gunzipSync(Buffer.from(body)).toString('utf8')));
  }
  return { row: meta.row, removed: meta.removed ?? [], listings };
}
