// One unit, many listings: agencies list the same apartment with the owner's photos, at different
// prices. Listings are joined into a "lot" when they are in the same project, have the same
// bedrooms, nearly the same size and share a photo that is not a marketing render. A photo is the
// same when it is the same file or, with visual hashes, nearly the same picture.

import { descriptionFacts } from './dotproperty.js';
import { hammingDistance, shortPhotoId } from './photos.js';

// A photo in this many listings of a project, or in listings of different layouts, is a render or
// a photo of the common areas: it says nothing about which unit it is.
const SHARED_PHOTO_LISTINGS = 5;
const SIZE_TOLERANCE_SQM = 1;
const SAME_BATCH_MINUTES = 15;
// Bits two hashes of the same picture may differ in (re-saved, watermarked, resized).
export const SAME_PICTURE_BITS = 6;
// Only the first photos count: they show the unit itself; building, pool and view photos come
// later and are shared by many units.
const HASHED_PHOTOS = 4;
// Prices of one unit rarely differ this much between advertisers; beyond it, the listings are
// different units that share show-unit or building photos (checked by eye on the widest gaps).
const MAX_PRICE_RATIO = { strong: 1.6, single: 1.4 };
// New and off-plan projects show the same show-unit photos for many different units.
const SEGMENTS_WITHOUT_LOTS = new Set(['new', 'off plan']);

// The file's fingerprint: the sha256 at the end of the image key.
export const photoId = (key) => String(key ?? '').split('/').pop().replace(/\.\w+$/, '') || null;

// "PropertyScout ID …", "FazWaz Ref …", "--- Pattaya Realty ---": the advertiser's signature at the
// start of the description, when there is one.
export function agencyHint(description) {
  const text = String(description ?? '').trim();
  const signed = text.match(/^-{2,}\s*([^-\n]{3,40}?)\s*-{2,}/) ?? text.match(/^([A-Z][\w&.'’ -]{1,40}?)\s+(?:ID|Ref(?:erence)?|Code)\b/);
  return signed ? signed[1].trim() : null;
}

const minutesApart = (a, b) => (a && b ? Math.abs(Date.parse(a) - Date.parse(b)) / 60000 : Infinity);

// Two listings of one advertiser posted together at different prices are different units of the
// same stock (a developer or an agency listing a building), even when they share photos.
function sameBatchDifferentUnits(a, b) {
  const sameStart = a.descriptionStart && a.descriptionStart === b.descriptionStart;
  const together = minutesApart(a.verifiedAt ?? a.postedAt, b.verifiedAt ?? b.postedAt) <= SAME_BATCH_MINUTES;
  return sameStart && together && a.price !== b.price;
}

// A listing reference with letters and digits: "#RT04897", "Listing code: RT04900", "Ref: AB-123".
const refCode = (text) => {
  const m = String(text ?? '').match(/(?:#|listing code:?\s*#?|ref(?:erence)?(?:\s*no\.?)?:?\s*#?)\s*([A-Z]{1,4})[- ]?(\d{3,7})\b/i);
  return m ? { prefix: m[1].toUpperCase(), code: `${m[1].toUpperCase()}${m[2]}` } : null;
};

// Facts in the descriptions that rule out one unit: different floors, or two different references
// of one advertiser's numbering (the same prefix).
function differentUnits(a, b) {
  const fa = descriptionFacts(a.descriptionStart).unitFloor;
  const fb = descriptionFacts(b.descriptionStart).unitFloor;
  if (fa != null && fb != null && fa !== fb) return true;
  const ra = refCode(a.descriptionStart);
  const rb = refCode(b.descriptionStart);
  return Boolean(ra && rb && ra.prefix === rb.prefix && ra.code !== rb.code);
}

class UnionFind {
  constructor() { this.parent = new Map(); }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root);
    let node = x;
    while (this.parent.get(node) !== root) { const next = this.parent.get(node); this.parent.set(node, root); node = next; }
    return root;
  }
  union(a, b) { this.parent.set(this.find(a), this.find(b)); }
}

const median = (values) => {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// The photos of each listing of a project as IDs: a visual cluster for hashed photos (pictures
// within a few bits of each other are one), the file for the others.
function photoIdentities(items, photoHashes) {
  const reps = [];
  const out = new Map();
  for (const l of items) {
    const ids = new Set();
    l.photoKeys.slice(0, HASHED_PHOTOS).forEach((key) => {
      const hash = photoHashes.get(shortPhotoId(key));
      if (!hash) {
        const id = photoId(key);
        if (id) ids.add(`f:${id}`);
        return;
      }
      let cluster = reps.find((r) => hammingDistance(r.hash, hash) <= SAME_PICTURE_BITS);
      if (!cluster) {
        cluster = { hash, id: `v:${reps.length}` };
        reps.push(cluster);
      }
      ids.add(cluster.id);
    });
    out.set(l.key, ids);
  }
  return out;
}

// Groups listings of one deal type (sale or rent) into lots. Returns the lots with two or more
// listings, and for every listing in them its lot ID.
export function findLots(listings, { projectMedians = {}, photoHashes = new Map() } = {}) {
  const byProject = new Map();
  for (const l of listings) {
    if (!l.projectKey || !l.photoKeys?.length || SEGMENTS_WITHOUT_LOTS.has(l.segment)) continue;
    if (!byProject.has(l.projectKey)) byProject.set(l.projectKey, []);
    byProject.get(l.projectKey).push(l);
  }
  const uf = new UnionFind();
  const evidence = new Map();
  for (const items of byProject.values()) {
    if (items.length < 2) continue;
    // Which listings use each photo, and whether it is shared too widely to count.
    const ids = photoIdentities(items, photoHashes);
    const users = new Map();
    for (const l of items) for (const id of ids.get(l.key)) {
      if (!users.has(id)) users.set(id, []);
      users.get(id).push(l);
    }
    const pairs = new Map();
    for (const [id, ls] of users) {
      if (ls.length < 2) continue;
      const layouts = new Set(ls.map((l) => `${l.bedrooms}|${Math.round(l.sizeSqm ?? 0)}`));
      const sizes = ls.map((l) => l.sizeSqm).filter(Number.isFinite);
      const spread = sizes.length ? Math.max(...sizes) - Math.min(...sizes) : 0;
      if (ls.length >= SHARED_PHOTO_LISTINGS || (layouts.size > 1 && (new Set(ls.map((l) => l.bedrooms)).size > 1 || spread > SIZE_TOLERANCE_SQM))) continue;
      for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) {
        const [a, b] = [ls[i], ls[j]].sort((x, y) => (x.key < y.key ? -1 : 1));
        const k = `${a.key}|${b.key}`;
        if (!pairs.has(k)) pairs.set(k, { a, b, photos: new Set() });
        pairs.get(k).photos.add(id);
      }
    }
    for (const { a, b, photos } of pairs.values()) {
      if (a.bedrooms !== b.bedrooms) continue;
      if (a.sizeSqm != null && b.sizeSqm != null && Math.abs(a.sizeSqm - b.sizeSqm) > SIZE_TOLERANCE_SQM) continue;
      if (sameBatchDifferentUnits(a, b) || differentUnits(a, b)) continue;
      const ratio = Math.max(a.price, b.price) / Math.min(a.price, b.price);
      if (!(ratio <= (photos.size >= 2 ? MAX_PRICE_RATIO.strong : MAX_PRICE_RATIO.single))) continue;
      uf.union(a.key, b.key);
      evidence.set(`${a.key}|${b.key}`, photos.size);
    }
  }
  const groups = new Map();
  for (const l of listings) {
    if (!uf.parent.has(l.key)) continue;
    const root = uf.find(l.key);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(l);
  }
  const lotOf = new Map();
  const lots = [];
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    const lotId = items.map((l) => l.key).sort()[0];
    const prices = items.map((l) => l.price).filter(Number.isFinite);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const size = median(items.map((l) => l.sizeSqm));
    const shared = Math.max(0, ...items.flatMap((a) => items.map((b) => evidence.get(`${a.key}|${b.key}`) ?? 0)));
    const projectPsm = projectMedians[items[0].projectKey];
    for (const l of items) lotOf.set(l.key, lotId);
    lots.push({
      recordType: 'lot',
      lotId,
      transaction: items[0].transaction,
      project: items[0].project,
      projectKey: items[0].projectKey,
      district: items[0].district,
      bedrooms: items[0].bedrooms,
      sizeSqm: size,
      listings: items.length,
      advertisers: new Set(items.map((l) => agencyHint(l.descriptionStart) ?? l.key)).size,
      minPrice: min,
      maxPrice: max,
      priceSpreadPercent: min > 0 ? Math.round(((max - min) / min) * 1000) / 10 : null,
      minPricePerSqm: size ? Math.round(min / size) : null,
      // Below zero: the cheapest offer of this unit asks less per m² than the project's typical listing.
      vsProjectMedianPercent: size && projectPsm ? Math.round(((min / size - projectPsm) / projectPsm) * 1000) / 10 : null,
      cheapestUrl: items[0].url,
      sharedPhotos: shared,
      // High: two or more shared photos; medium: one, which can also be a render used by two listings.
      confidence: shared >= 2 ? 'high' : 'medium',
      offers: items.map((l) => ({ url: l.url, price: l.price, agency: agencyHint(l.descriptionStart), postedAt: l.postedAt, daysListed: l.daysListed ?? null })),
    });
  }
  lots.sort((a, b) => b.listings - a.listings || (b.priceSpreadPercent ?? 0) - (a.priceSpreadPercent ?? 0));
  return { lots, lotOf };
}
