// Redfin: places, search links and filters, the search APIs and their listings as flat records.
//
// Redfin's own search pages send a filter such as "property-type=house,min-beds=3" to the region
// API, which answers with the matching search parameters. The Actor does the same, so a search
// link keeps every filter it was made with, and the input's filters use the same names.

export const BASE_URL = 'https://www.redfin.com';
// Listings per request: the most Redfin's search pages ask for.
export const PAGE_SIZE = 350;

// Region types of the search API by the first part of a search page path. ZIP codes and states
// are named in the path; the region API turns them into Redfin's numeric ids.
const REGION_TYPES = { neighborhood: 1, zipcode: 2, state: 4, county: 5, city: 6, school: 7, 'school-district': 8 };

// Property types of the input, in Redfin's filter names. For rent, multi-family means apartments.
export const PROPERTY_TYPES = ['house', 'condo', 'townhouse', 'multifamily', 'land', 'manufactured', 'co-op', 'other'];
const RENT_TYPES = new Set(['house', 'condo', 'townhouse', 'multifamily']);
const SALE_TYPE_NAMES = { 1: 'House', 2: 'Condo', 3: 'Townhouse', 4: 'Multi-family', 5: 'Land', 6: 'Other', 7: 'Manufactured', 8: 'Co-op' };
const RENT_TYPE_NAMES = { 3: 'Condo', 4: 'Multi-family', 5: 'Apartment', 6: 'House', 13: 'Townhouse' };

export const SOLD_WITHIN = { 7: '1wk', 30: '1mo', 90: '3mo', 180: '6mo', 365: '1yr', 730: '2yr', 1095: '3yr', 1825: '5yr' };
export const DAYS_ON_MARKET = { 1: '1day', 3: '3day', 7: '1wk', 14: '2wk', 30: '1mo', 90: '3mo', 180: '6mo', 365: '1yr' };
export const SORTS = {
  recommended: null,
  newest: 'lo-days',
  priceLow: 'lo-price',
  priceHigh: 'hi-price',
  largest: 'hi-sqft',
  pricePerSqftLow: 'lo-dollarsqft',
  recentlySold: 'hi-sale-date',
};

const STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO', montana: 'MT',
  nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
const STATE_CODES = new Set(Object.values(STATES));

// Filter strings of Redfin links ("property-type=house,min-beds=3") as ordered maps.
export function parseFilter(text) {
  const filter = new Map();
  for (const part of String(text ?? '').split(',')) {
    const [key, ...value] = part.split('=');
    if (key.trim()) filter.set(key.trim(), value.join('=').trim());
  }
  return filter;
}

export function formatFilter(filter) {
  return [...filter].map(([key, value]) => (value === '' ? key : `${key}=${value}`)).join(',');
}

// Region of a Redfin search page path such as /city/30818/TX/Austin/filter/min-beds=3.
export function parseRegionPath(pathname) {
  const parts = pathname.split('/').filter(Boolean).map((part) => decodeURIComponent(part));
  const kind = parts[0]?.toLowerCase();
  const regionType = REGION_TYPES[kind];
  if (!regionType || !parts[1]) return null;
  const filterAt = parts.indexOf('filter');
  const end = filterAt >= 0 ? filterAt : parts.length;
  // The path up to the filter, without the rentals part: /city/30818/TX/Austin.
  const place = parts.slice(0, end).filter((part) => !/-for-rent$|^rentals$|^recently-sold$/i.test(part));
  return {
    regionType,
    regionId: parts[1],
    path: `/${place.map((part) => encodeURIComponent(part)).join('/')}`,
    rent: parts.slice(2, end).some((part) => /-for-rent$|^rentals$/i.test(part)),
    soldPage: parts.slice(2, end).some((part) => /^recently-sold$/i.test(part)),
    filter: filterAt >= 0 ? parts.slice(filterAt + 1).join('/') : '',
  };
}

// A search link from redfin.com. Its own filters and listing type are kept.
export function parseSearchUrl(value) {
  const url = new URL(String(value).trim());
  if (!/(^|\.)redfin\.com$/i.test(url.hostname)) throw new Error('this is not a redfin.com link.');
  if (/\/home\/\d+/.test(url.pathname)) {
    throw new Error('this is the page of one home. Paste the link of a search, such as a city, ZIP code or county page with your filters.');
  }
  const region = parseRegionPath(url.pathname);
  if (!region) {
    throw new Error('this is not a Redfin search page. Open a city, ZIP code, county, neighborhood or state on redfin.com and copy the link.');
  }
  const filter = parseFilter(region.filter);
  // "Recently sold" pages list the homes sold in the last 3 months.
  if (region.soldPage && !filter.has('include')) filter.set('include', 'sold-3mo');
  if (region.soldPage && !filter.has('status')) filter.set('status', 'sold');
  return {
    input: String(value).trim(),
    label: url.href,
    regionType: region.regionType,
    regionId: region.regionId,
    path: region.path,
    type: region.rent ? 'rent' : 'sale',
    filter,
    fromUrl: true,
  };
}

export const isZipCode = (text) => /^\d{5}$/.test(String(text).trim());

// The US state named after the first comma of a location: "TX", "Texas" or "TX 78701".
// Undefined when there is no such part; null when it names no US state ("Toronto, ON").
export function stateOf(query) {
  const rest = String(query).split(',').slice(1).join(' ').replace(/\b(usa?|united states)\b/gi, ' ').replace(/\b\d{5}\b/g, ' ').trim();
  if (!rest) return undefined;
  const text = rest.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (STATES[text]) return STATES[text];
  if (text === 'nyc') return 'NY';
  const code = text.toUpperCase().split(' ').find((word) => STATE_CODES.has(word));
  return code ?? null;
}

// The place a location of the input names, from Redfin's place lookup. "Austin, TX" must be in
// Texas; without a state the first match is taken, as on the website.
export function pickPlace(query, payload) {
  const name = String(query).split(',')[0].trim().toLowerCase();
  const hint = stateOf(query);
  if (hint === null) return null;
  const rows = (payload?.sections ?? [])
    .flatMap((section) => (section.rows ?? []).map((row) => ({ ...row, section: section.name })))
    .filter((row) => row.url && parseRegionPath(row.url) && (row.countryCode ?? 'US') === 'US');
  const places = rows.filter((row) => row.section === 'Places');
  const candidates = places.length > 0 ? places : rows;
  const inState = (row) => {
    if (!hint) return true;
    const region = parseRegionPath(row.url);
    if (region.regionType === REGION_TYPES.state) return STATES[String(row.name).toLowerCase()] === hint;
    return new RegExp(`(^|, )${hint}(,|$)`).test(row.subName ?? '') || row.url.includes(`/${hint}/`);
  };
  const matching = candidates.filter(inState);
  if (matching.length === 0) return null;
  return matching.find((row) => String(row.name).toLowerCase() === name) ?? matching[0];
}

// The input's filters in Redfin's filter names. Search links keep their own listing type, so
// only the listing filters are added to them.
export function inputFilters(input, type, { fromUrl = false } = {}) {
  const filter = new Map();
  const number = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null);
  const types = (input.propertyTypes ?? []).filter((kind) => (type === 'rent' ? RENT_TYPES.has(kind) : PROPERTY_TYPES.includes(kind)));
  if (types.length > 0) filter.set('property-type', types.join('+'));
  if (number(input.minPrice)) filter.set('min-price', String(Math.round(input.minPrice)));
  if (number(input.maxPrice)) filter.set('max-price', String(Math.round(input.maxPrice)));
  if (number(input.minBeds)) filter.set('min-beds', String(input.minBeds));
  if (number(input.maxBeds)) filter.set('max-beds', String(input.maxBeds));
  if (number(input.minBaths)) filter.set('min-baths', String(input.minBaths));
  if (number(input.minSqft)) filter.set('min-sqft', `${Math.round(input.minSqft)}-sqft`);
  if (number(input.maxSqft)) filter.set('max-sqft', `${Math.round(input.maxSqft)}-sqft`);
  if (number(input.minLotSqft)) filter.set('min-lot-size', `${Math.round(input.minLotSqft)}-sqft`);
  if (number(input.minYearBuilt)) filter.set('min-year-built', String(input.minYearBuilt));
  if (number(input.maxYearBuilt)) filter.set('max-year-built', String(input.maxYearBuilt));
  if (type !== 'rent' && input.maxHoa !== undefined && input.maxHoa !== null && input.maxHoa !== '' && Number(input.maxHoa) >= 0) {
    filter.set('hoa', String(Math.round(input.maxHoa)));
  }
  if (type === 'sale' && DAYS_ON_MARKET[input.maxDaysOnMarket]) filter.set('max-days-on-market', DAYS_ON_MARKET[input.maxDaysOnMarket]);
  const keywords = String(input.keywords ?? '').trim().replace(/[,=]/g, ' ').replace(/\s+/g, '+');
  if (keywords) filter.set('remarks', keywords);
  if (SORTS[input.sortBy]) filter.set('sort', SORTS[input.sortBy]);
  if (!fromUrl && type === 'sold') {
    filter.set('include', `sold-${SOLD_WITHIN[input.soldWithinDays] ?? SOLD_WITHIN[90]}`);
    filter.set('status', 'sold');
  }
  if (!fromUrl && type === 'sale' && input.includePending) filter.set('status', 'active+comingsoon+contingent+pending');
  return filter;
}

// The filters of a search link with the input's filters added: the input wins where both set one.
export function mergeFilters(base, extra) {
  const merged = new Map(base);
  for (const [key, value] of extra) merged.set(key, value);
  return merged;
}

// The link of a search on redfin.com, for the output.
export function searchPageUrl(search) {
  const filter = formatFilter(search.filter);
  return `${BASE_URL}${search.path}${search.type === 'rent' ? '/apartments-for-rent' : ''}${filter ? `/filter/${filter}` : ''}`;
}

export function regionApiUrl(search) {
  const params = new URLSearchParams({
    al: '1',
    ep: 'true',
    f: formatFilter(search.filter),
    ...(search.type === 'rent' ? { isRentals: 'true', mpt: '130' } : {}),
    num_homes: String(PAGE_SIZE),
    page_number: '1',
    region_id: String(search.regionId),
    region_type: String(search.regionType),
    start: '0',
    tz: 'true',
    v: '8',
  });
  return `${BASE_URL}/stingray/api/region?${params}`;
}

// Redfin's JSON answers start with "{}&&" so that they cannot run as scripts.
export function parseRedfinJson(text) {
  return JSON.parse(String(text).replace(/^\{\}&&/, ''));
}

export const placeLookupUrl = (query) => `${BASE_URL}/stingray/do/rental-location-autocomplete?location=${encodeURIComponent(query)}&v=2`;

// The search parameters for the region of a search, from the region API's answer.
export function searchParamsOf(regionAnswer, type) {
  const srp = regionAnswer?.payload?.srp;
  if (!srp?.region_id || !srp.market) return null;
  const params = { al: '1' };
  for (const [key, value] of Object.entries(srp)) {
    // Filters that are off stay out: the rentals search reads "has_pool=false" as "without a pool".
    if (value === false || value === null || value === undefined || value === '') continue;
    if (['region_name', 'num_homes', 'start', 'page_number'].includes(key)) continue;
    params[key] = Array.isArray(value) ? value.join(',') : String(value);
  }
  if (type === 'rent') Object.assign(params, { isRentals: 'true', includeKeyFacts: 'true', use_max_pins: 'true' });
  return {
    params,
    regionName: srp.region_name ?? null,
    minPrice: Number(srp.min_price) > 0 ? Number(srp.min_price) : null,
    maxPrice: Number(srp.max_price) > 0 ? Number(srp.max_price) : null,
  };
}

export function pageUrl(type, params, { start = 0, minPrice = null, maxPrice = null } = {}) {
  const query = new URLSearchParams({ ...params, num_homes: String(PAGE_SIZE), start: String(start), page_number: '1' });
  query.delete('min_price');
  query.delete('max_price');
  if (minPrice !== null) query.set('min_price', String(minPrice));
  if (maxPrice !== null) query.set('max_price', String(maxPrice));
  const path = type === 'rent' ? 'api/v1/search/rentals' : 'api/gis';
  return `${BASE_URL}/stingray/${path}?${query}`;
}

// Redfin answers a search with too many homes (a whole state) with a timeout after ~10 seconds.
export class TooManyHomesError extends Error {}

export function parseSalePage(text) {
  const data = parseRedfinJson(text);
  if (data.resultCode !== 0 || !Array.isArray(data.payload?.homes)) {
    const message = data.errorMessage || `result code ${data.resultCode}`;
    if (/timeout/i.test(message)) throw new TooManyHomesError(message);
    throw new Error(`Redfin search failed: ${message}`);
  }
  const mls = new Map((data.payload.dataSources ?? []).map((source) => [source.id, source.name]));
  return { homes: data.payload.homes, mls };
}

export function parseRentalsPage(text) {
  const data = parseRedfinJson(text);
  if (!Array.isArray(data.homes)) {
    const message = data.errorMessage || data.message || 'no homes in the answer';
    if (/timeout/i.test(message)) throw new TooManyHomesError(message);
    throw new Error(`Redfin rentals search failed: ${message}`);
  }
  return { homes: data.homes, total: data.numMatchedHomes ?? null };
}

// A price range too big for one search, cut in two. Open ranges grow by doubling; the smallest
// range is $10,000 for sale and $100 for rent.
export function splitRange({ min, max }, type) {
  const first = type === 'rent' ? 1000 : 100000;
  const smallest = type === 'rent' ? 100 : 10000;
  const low = min ?? 0;
  if (max === null || max === undefined) {
    const cut = low < first ? first : low * 2;
    return [{ min: low, max: cut }, { min: cut + 1, max: null }];
  }
  if (max - low < smallest) return null;
  const middle = Math.floor((low + max) / 2);
  return [{ min: low, max: middle }, { min: middle + 1, max }];
}

// Values of the search API come as { value, level }; hidden values have no value.
const valueOf = (field) => (field !== null && typeof field === 'object' && !Array.isArray(field) ? field.value ?? null : field ?? null);
const numberOrNull = (value) => (value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
const dateOf = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString().slice(0, 10) : null);
const timeOf = (ms) => (Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null);
const unique = (items) => [...new Set(items.filter(Boolean))];
// Text values with the blanks some listings have (" ") turned into null.
const textOf = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// Photo positions such as "0-21:0" or "0:0,1-9:1": ranges of photo numbers with their version.
export function photoPositions(spec) {
  const positions = [];
  for (const part of String(spec ?? '').split(',')) {
    const match = part.trim().match(/^(\d+)(?:-(\d+))?:(\d+)$/);
    if (!match) continue;
    const [, from, to = from, version] = match;
    for (let index = Number(from); index <= Number(to) && positions.length < 200; index++) positions.push([index, Number(version)]);
  }
  return positions;
}

export function salePhotoUrls(home) {
  const mls = valueOf(home.mlsId);
  if (!mls || !home.dataSourceId) return [];
  const folder = `https://ssl.cdn-redfin.com/photo/${home.dataSourceId}/bigphoto/${String(mls).slice(-3)}`;
  return photoPositions(valueOf(home.photos)).map(([index, version]) => (index === 0 ? `${folder}/${mls}_0.jpg` : `${folder}/${mls}_${index}_${version}.jpg`));
}

export function rentalPhotoUrls(rentalId, ranges) {
  if (!rentalId) return [];
  const spec = (ranges ?? []).map((range) => `${range.startPos}-${range.endPos}:${range.version}`).join(',');
  return photoPositions(spec).map(([index, version]) => `https://ssl.cdn-redfin.com/photo/rent/${rentalId}/islphoto/genIsl.${index}_${version}.jpg`);
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "SEP 11, 2026", as the "Sold" badge of a sale from public records shows it.
export function badgeDate(text) {
  const match = String(text ?? '').trim().match(/^([a-z]{3})[a-z]*\.? (\d{1,2}), (\d{4})$/i);
  const month = match && MONTHS[match[1].toLowerCase()];
  return month ? `${match[3]}-${String(month).padStart(2, '0')}-${match[2].padStart(2, '0')}` : null;
}

const soldBadge = (home) => (home.sashes ?? []).find((sash) => /^sold$/i.test(sash.sashTypeName ?? ''));

// Listing status in plain words; the MLS's own wording stays in mlsStatus. Sales from public
// records have no MLS status, only a "Sold" badge.
export function statusOf(home) {
  const mls = String(home.mlsStatus ?? '').toLowerCase();
  if (home.searchStatus === 4 || /^(closed|sold)$/.test(mls) || soldBadge(home)) return 'Sold';
  if (/coming soon/.test(mls) || home.searchStatus === 8) return 'Coming soon';
  if (/pending/.test(mls)) return 'Pending';
  if (/contract|contingent|backup/.test(mls)) return 'Under contract';
  return 'Active';
}

// Fields every listing has, so that tables and CSV files get the same columns for sale and rent.
const EMPTY = {
  propertyId: null, listingId: null, rentalId: null, mlsId: null, listingType: null, status: null, mlsStatus: null, url: null,
  price: null, priceMax: null, currency: 'USD', pricePerSqft: null, hoaPerMonth: null,
  beds: null, bedsMax: null, baths: null, bathsMax: null, fullBaths: null, partialBaths: null,
  sqft: null, sqftMax: null, lotSizeSqft: null, yearBuilt: null, stories: null, propertyType: null,
  address: null, streetAddress: null, unit: null, city: null, state: null, zip: null, neighborhood: null, latitude: null, longitude: null,
  daysOnMarket: null, listedAt: null, soldDate: null, lastSoldDate: null, openHouseStart: null, openHouseEnd: null,
  description: null, keyFacts: [], tags: [], badges: [],
  isNewConstruction: null, isHotHome: null, has3DTour: null, hasVideoTour: null, hasVirtualTour: null, virtualTourUrl: null,
  garageSpaces: null, parkingSpaces: null, photoUrl: null, photoCount: null, photos: [],
  brokerName: null, mlsName: null,
  propertyName: null, availableUnits: null, units: [], availableFrom: null, rentUpdatedAt: null,
};

const addressOf = (street, city, state, zip) => [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null;

// A home for sale or a sold home from the search API. Agent names are never read.
export function toSaleListing(home, { mls = new Map(), now = Date.now() } = {}) {
  const status = statusOf(home);
  const sold = status === 'Sold';
  const street = textOf(valueOf(home.streetLine));
  const photos = salePhotoUrls(home);
  const onRedfin = numberOrNull(valueOf(home.timeOnRedfin));
  return {
    ...EMPTY,
    propertyId: numberOrNull(home.propertyId),
    listingId: numberOrNull(home.listingId),
    mlsId: valueOf(home.mlsId) ? String(valueOf(home.mlsId)) : null,
    listingType: sold ? 'sold' : 'for-sale',
    status,
    mlsStatus: home.mlsStatus ?? null,
    url: home.url ? new URL(home.url, BASE_URL).href : null,
    price: numberOrNull(valueOf(home.price)),
    pricePerSqft: numberOrNull(valueOf(home.pricePerSqFt)),
    hoaPerMonth: numberOrNull(valueOf(home.hoa)),
    beds: numberOrNull(home.beds),
    baths: numberOrNull(home.baths),
    fullBaths: numberOrNull(home.fullBaths),
    partialBaths: numberOrNull(home.partialBaths),
    sqft: numberOrNull(valueOf(home.sqFt)),
    lotSizeSqft: numberOrNull(valueOf(home.lotSize)),
    yearBuilt: numberOrNull(valueOf(home.yearBuilt)),
    stories: numberOrNull(home.stories),
    propertyType: SALE_TYPE_NAMES[home.uiPropertyType] ?? null,
    address: addressOf(street, home.city, home.state, home.zip),
    streetAddress: street,
    unit: textOf(valueOf(home.unitNumber)),
    city: home.city ?? null,
    state: home.state ?? null,
    zip: home.zip ?? valueOf(home.postalCode),
    neighborhood: textOf(valueOf(home.location)),
    latitude: numberOrNull(valueOf(home.latLong)?.latitude),
    longitude: numberOrNull(valueOf(home.latLong)?.longitude),
    daysOnMarket: sold ? null : numberOrNull(valueOf(home.dom)),
    listedAt: !sold && onRedfin !== null ? timeOf(now - onRedfin) : null,
    soldDate: sold ? dateOf(home.soldDate) ?? badgeDate(soldBadge(home)?.lastSaleDate) : null,
    lastSoldDate: sold ? null : dateOf(home.soldDate),
    openHouseStart: timeOf(home.openHouseStart),
    openHouseEnd: timeOf(home.openHouseEnd),
    description: home.listingRemarks ?? null,
    keyFacts: unique((home.keyFacts ?? []).map((fact) => fact.description)),
    tags: unique(home.listingTags ?? []),
    badges: unique((home.sashes ?? []).map((sash) => sash.sashTypeName)),
    isNewConstruction: Boolean(home.isNewConstruction),
    isHotHome: Boolean(home.isHot),
    has3DTour: Boolean(home.has3DTour),
    hasVideoTour: Boolean(home.hasVideoTour),
    hasVirtualTour: Boolean(home.hasVirtualTour),
    virtualTourUrl: home.scanUrl ?? null,
    garageSpaces: numberOrNull(home.skGarageSpaces),
    parkingSpaces: numberOrNull(home.skParkingSpaces),
    photoUrl: photos[0] ?? null,
    photoCount: numberOrNull(home.numPictures) ?? (photos.length || null),
    photos,
    brokerName: home.listingBroker?.name ?? null,
    mlsName: mls.get(home.dataSourceId) ?? null,
  };
}

// A rental from the rentals search. Phone numbers and emails of the rentals feed are never read.
export function toRentalListing(item) {
  const home = item.homeData ?? {};
  const rental = item.rentalExtension ?? {};
  const address = home.addressInfo ?? {};
  const point = address.centroid?.centroid ?? {};
  const range = (value) => [numberOrNull(value?.min), numberOrNull(value?.max)];
  const [rentMin, rentMax] = range(rental.rentPriceRange);
  const [bedsMin, bedsMax] = range(rental.bedRange);
  const [bathsMin, bathsMax] = range(rental.bathRange);
  const [sqftMin, sqftMax] = range(rental.sqftRange);
  const photos = rentalPhotoUrls(rental.rentalId, home.photosInfo?.photoRanges);
  const street = textOf(address.formattedStreetLine);
  return {
    ...EMPTY,
    propertyId: numberOrNull(home.propertyId),
    rentalId: rental.rentalId ?? null,
    listingType: 'for-rent',
    status: 'For rent',
    url: home.url ? new URL(home.url, BASE_URL).href : null,
    price: rentMin,
    priceMax: rentMax !== rentMin ? rentMax : null,
    beds: bedsMin,
    bedsMax: bedsMax !== bedsMin ? bedsMax : null,
    baths: bathsMin,
    bathsMax: bathsMax !== bathsMin ? bathsMax : null,
    sqft: sqftMin,
    sqftMax: sqftMax !== sqftMin ? sqftMax : null,
    propertyType: RENT_TYPE_NAMES[home.propertyType] ?? 'Other',
    address: addressOf(street, address.city, address.state, address.zip),
    streetAddress: street,
    unit: textOf(address.unitNumber),
    city: address.city ?? null,
    state: address.state ?? null,
    zip: address.zip ?? null,
    latitude: numberOrNull(point.latitude),
    longitude: numberOrNull(point.longitude),
    description: rental.description ?? null,
    keyFacts: unique((rental.keyFacts ?? []).map((fact) => fact.description)),
    badges: unique((home.sashes ?? []).map((sash) => sash.sashTypeName)),
    photoUrl: photos[0] ?? null,
    photoCount: photos.length || null,
    photos,
    propertyName: rental.propertyName ?? null,
    availableUnits: numberOrNull(rental.numAvailableUnits),
    units: (rental.units ?? []).map((unit) => ({ beds: numberOrNull(unit.bedrooms), rent: numberOrNull(unit.rentPrice) })),
    availableFrom: rental.dateAvailable ? String(rental.dateAvailable).slice(0, 10) : null,
    rentUpdatedAt: rental.lastUpdated ?? null,
  };
}

// One key per listing: the same home found by two searches is saved once. A home sold again
// later is a new sale.
export function listingKey(listing) {
  if (listing.listingType === 'for-rent') return `rent:${listing.rentalId ?? listing.propertyId}`;
  if (listing.listingType === 'sold') return `sold:${listing.propertyId}:${listing.soldDate ?? listing.listingId}`;
  return `sale:${listing.listingId ?? listing.propertyId}`;
}
