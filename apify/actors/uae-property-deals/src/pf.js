// Property Finder UAE pages: listing search pages (25 listings a page, ?page=N) and transaction
// pages of a location (the latest 10 DLD deals, the location's yearly summary and its child
// locations). Only pages robots.txt allows are used: transaction pages without query parameters.

export const BASE = 'https://www.propertyfinder.ae';
export const EMIRATES = { dubai: 'Dubai', 'abu-dhabi': 'Abu Dhabi', sharjah: 'Sharjah' };
// Emirates whose deals Property Finder publishes (DLD); elsewhere listings are compared with listings.
export const WITH_DEALS = new Set(['dubai']);
export const PROPERTY_TYPES = { apartments: 'Apartment', villas: 'Villa', townhouses: 'Townhouse', penthouses: 'Penthouse' };

const slugify = (text) => String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "Dubai Marina", "dubai-marina" or a Property Finder link → the location slug used in its URLs.
export function areaSlug(value) {
  const text = String(value ?? '').trim();
  const link = /propertyfinder\.ae\/en\/(?:buy|rent)\/[^/]+\/[a-z-]+-for-(?:sale|rent)-([a-z0-9-]+)\.html/i.exec(text) ?? /propertyfinder\.ae\/en\/transactions\/[a-z]+\/[^/]+\/([a-z0-9-]+)/i.exec(text);
  return link ? link[1].toLowerCase() : slugify(text);
}

export function listingSearchUrl({ emirate, type, area, page = 1 }) {
  return `${BASE}/en/buy/${emirate}/${type}-for-sale${area ? `-${area}` : ''}.html${page > 1 ? `?page=${page}` : ''}`;
}

export const transactionsUrl = (emirate, slug, kind = 'sold') => `${BASE}/en/transactions/${kind}/${emirate}/${slug}`;

export function nextData(html) {
  const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html));
  if (!m) throw new Error('The page has no data (not a Property Finder page or a changed layout).');
  return JSON.parse(m[1]).props?.pageProps ?? {};
}

export const bedroomsOf = (value) => {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'studio' || text === '0') return 0;
  const m = /^(\d+)/.exec(text);
  return m ? Number(m[1]) : null;
};

// One listing as a flat record. The agent's personal name is not kept; the agency is.
export function listingOf(p, emirate) {
  const loc = p.location ?? {};
  const size = p.size?.value ?? null;
  const sizeSqft = size == null ? null : p.size?.unit === 'sqm' ? size * 10.7639 : size;
  return {
    listingId: String(p.id),
    url: p.share_url ?? (p.details_path ? BASE + p.details_path : null),
    title: p.title ?? null,
    emirate: EMIRATES[emirate],
    propertyType: p.property_type ?? null,
    location: loc.full_name ?? null,
    building: loc.name ?? null,
    locationType: loc.type ?? null,
    locationSlug: loc.slug ?? null,
    locationId: loc.id ? String(loc.id) : null,
    community: (loc.path_name ?? '').split(',').map((s) => s.trim()).filter(Boolean).slice(1).join(', ') || null,
    latitude: loc.coordinates?.lat ?? null,
    longitude: loc.coordinates?.lon ?? null,
    bedrooms: bedroomsOf(p.bedrooms),
    bathrooms: p.bathrooms != null ? Number(p.bathrooms) || null : null,
    sizeSqft: sizeSqft == null ? null : Math.round(sizeSqft),
    price: p.price?.value ?? null,
    priceHidden: Boolean(p.price?.is_hidden),
    currency: p.price?.currency ?? 'AED',
    completion: p.completion_status === 'off_plan' || /off/i.test(p.completion_status ?? '') ? 'off-plan' : 'ready',
    furnished: p.furnished ?? null,
    verified: Boolean(p.is_verified),
    priceDropOnSite: Boolean(p.is_price_drop),
    agency: p.broker?.name ?? null,
    reraPermit: p.rera || null,
    reference: p.reference ?? null,
    listedAt: p.listed_date ?? null,
    refreshedAt: p.last_refreshed_at ?? null,
  };
}

// A listing search page: its listings and the number of pages.
export function parseListingPage(html, emirate) {
  const pp = nextData(html);
  const result = pp.searchResult;
  if (!result) throw new Error('No search results on the page.');
  const listings = (result.listings ?? []).filter((x) => x.property).map((x) => listingOf(x.property, emirate));
  return { listings, total: result.meta?.total_count ?? null, pages: result.meta?.page_count ?? null };
}

// A transaction page of a location: its latest deals, yearly summary and child locations.
export function parseTransactionPage(html) {
  const pp = nextData(html);
  if (!pp.list) throw new Error('No transactions on the page.');
  const loc = pp.location ?? {};
  return {
    locationId: loc.id ? String(loc.id) : null,
    name: loc.n ?? null,
    type: loc.l_t ?? null,
    path: loc.p_n ?? null,
    total: pp.list.totalTransactionCount ?? null,
    insights: pp.insights?.insights ?? null,
    deals: pp.list.transactionList ?? [],
    children: (pp.childLocations ?? []).map((c) => ({ name: c.name, slug: c.slugEn, type: c.locationType, transactions: c.transactionCount })),
  };
}
