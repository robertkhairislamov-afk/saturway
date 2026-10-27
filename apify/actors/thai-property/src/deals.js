// Listings that ask less than similar units in the same project: same deal, same bedrooms, size
// within 25%. The comparison leaves out listings of the same unit (its lot) and Thai-quota
// listings, so the baseline is the price a foreign buyer can pay. Thai-quota units are the ones a
// foreigner cannot buy freehold unless the building has foreign quota left, which keeps their
// prices lower.

const SIZE_TOLERANCE = 0.25;
const MIN_COMPARABLES = 3;
const MIN_RENT_LISTINGS = 3;

// "Foreign Quota Sea View Studio", "Thai quota", "Thai name", "company name": what the advertiser
// says in the title or the start of the description. Null when it says nothing.
const THAI = /\bthai\s*(quota|name|ownership|owned)\b|\bcompany\s*name\b|\bthai\s+company\b/i;
const FOREIGN = /\bforeign(er)?\s*(quota|name|freehold|ownership|owned)\b|\bforeign\s+freehold\b/i;
export function ownershipOf(...texts) {
  const text = texts.filter(Boolean).join(' ');
  if (FOREIGN.test(text)) return 'foreign quota';
  if (THAI.test(text)) return 'thai quota';
  if (/\bleasehold\b|\b30[- ]?year lease\b/i.test(text)) return 'leasehold';
  return null;
}

const median = (values) => {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const usable = (l) => l.sizeSqm >= 15 && l.sizeSqm <= 1500 && l.price >= 300000;

// Sale listings of resale projects at least `minGapPercent` below their comparables.
export function belowMarket(listings, { minGapPercent = 10, projects = {} } = {}) {
  const groups = new Map();
  for (const l of listings) {
    if (l.transaction !== 'sale' || l.segment !== 'resale' || !l.projectKey || !usable(l)) continue;
    // A building people live in: completed and rented out. Without rentals the comparables are
    // mostly a developer's stock at list prices, not the resale market.
    if ((projects[l.projectKey]?.rentListings ?? 0) < MIN_RENT_LISTINGS) continue;
    const k = `${l.projectKey}|${l.bedrooms}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const out = [];
  for (const items of groups.values()) {
    for (const l of items) {
      const comparables = items.filter((c) => c !== l
        && c.ownership !== 'thai quota'
        && !(l.lotId && c.lotId === l.lotId)
        && Math.abs(c.sizeSqm - l.sizeSqm) <= SIZE_TOLERANCE * l.sizeSqm);
      if (comparables.length < MIN_COMPARABLES) continue;
      const typical = median(comparables.map((c) => c.price / c.sizeSqm));
      const own = l.price / l.sizeSqm;
      const gap = ((own - typical) / typical) * 100;
      if (gap > -minGapPercent) continue;
      const foreign = comparables.filter((c) => c.ownership === 'foreign quota');
      const project = projects[l.projectKey] ?? {};
      out.push({
        recordType: 'belowMarket',
        project: l.project,
        projectKey: l.projectKey,
        district: l.district,
        ownership: l.ownership ?? null,
        bedrooms: l.bedrooms,
        sizeSqm: l.sizeSqm,
        price: l.price,
        pricePerSqm: Math.round(own),
        comparablePricePerSqm: Math.round(typical),
        gapPercent: Math.round(gap * 10) / 10,
        // What the unit would ask at its comparables' price per m², and the difference.
        priceAtComparables: Math.round((typical * l.sizeSqm) / 1000) * 1000,
        potentialThb: Math.round((typical * l.sizeSqm - l.price) / 1000) * 1000,
        comparables: comparables.length,
        foreignQuotaComparables: foreign.length,
        foreignQuotaPricePerSqm: foreign.length >= 2 ? Math.round(median(foreign.map((c) => c.price / c.sizeSqm))) : null,
        // A gap this large is more often a typo in size or price, or a share, than a bargain.
        checkData: gap <= -50,
        projectGrossYieldPercent: project.grossYieldPercent ?? null,
        projectRentListings: project.rentListings ?? null,
        daysListed: l.daysListed ?? null,
        lotId: l.lotId ?? null,
        title: l.title,
        url: l.url,
      });
    }
  }
  // Likely bargains first, then the ones whose data should be checked.
  return out.sort((a, b) => Number(a.checkData) - Number(b.checkData) || a.gapPercent - b.gapPercent);
}
