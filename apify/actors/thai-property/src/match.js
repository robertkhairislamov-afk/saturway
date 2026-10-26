// One unit, many listings: agencies list the same apartment with the owner's photos, at different
// prices. Listings are joined into a "lot" when they are in the same project, have the same
// bedrooms, nearly the same size and share a photo file that is not a marketing render.

// A photo in this many listings of a project, or in listings of different layouts, is a render or
// a photo of the common areas: it says nothing about which unit it is.
const SHARED_PHOTO_LISTINGS = 5;
const SIZE_TOLERANCE_SQM = 1;
const SAME_BATCH_MINUTES = 15;

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

// Groups listings of one deal type (sale or rent) into lots. Returns the lots with two or more
// listings, and for every listing in them its lot ID.
export function findLots(listings, { projectMedians = {} } = {}) {
  const byProject = new Map();
  for (const l of listings) {
    if (!l.projectKey || !l.photoKeys?.length) continue;
    if (!byProject.has(l.projectKey)) byProject.set(l.projectKey, []);
    byProject.get(l.projectKey).push(l);
  }
  const uf = new UnionFind();
  const evidence = new Map();
  for (const items of byProject.values()) {
    if (items.length < 2) continue;
    // Which listings use each photo file, and whether the file is shared too widely to count.
    const users = new Map();
    for (const l of items) for (const id of new Set(l.photoKeys.map(photoId).filter(Boolean))) {
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
      if (sameBatchDifferentUnits(a, b)) continue;
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
      offers: items.map((l) => ({ url: l.url, price: l.price, agency: agencyHint(l.descriptionStart), postedAt: l.postedAt, daysListed: l.daysListed ?? null })),
    });
  }
  lots.sort((a, b) => b.listings - a.listings || (b.priceSpreadPercent ?? 0) - (a.priceSpreadPercent ?? 0));
  return { lots, lotOf };
}
