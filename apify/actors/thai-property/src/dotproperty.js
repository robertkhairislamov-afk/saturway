// Dot Property (dotproperty.co.th): search URLs and parsers for list and listing pages.
// List pages carry a schema.org ItemList (30 listings: project, bedrooms, coordinates, price, date)
// and one card per listing with size, bathrooms and price per m². A listing page adds the photo
// gallery, the full description, the basic information table and the project details.

export const BASE_URL = 'https://www.dotproperty.co.th';
export const PAGE_SIZE = 30;

export const PROPERTY_TYPES = { condo: 'condos', house: 'houses', villa: 'villas', townhouse: 'townhouses' };
export const TRANSACTIONS = { sale: 'for-sale', rent: 'for-rent' };

// The site returns at most about 10,000 results per search; deeper pages repeat earlier ones.
// Larger searches are read in price ranges below this size.
export const MAX_RESULTS = 9000;

// "chonburi/pattaya" → https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?sortBy=price&page=2
// Sorting by verification date keeps the order stable while the pages are read: sorting by price
// shuffles listings with the same price between pages (11% of rentals missed in a test, none with
// this order). The price range is inclusive.
export function searchUrl({ location, propertyType = 'condo', transaction = 'sale', page = 1, minPrice, maxPrice }) {
  const type = PROPERTY_TYPES[propertyType];
  const deal = TRANSACTIONS[transaction];
  if (!type) throw new Error(`Unknown property type "${propertyType}". Use one of: ${Object.keys(PROPERTY_TYPES).join(', ')}.`);
  if (!deal) throw new Error(`Unknown transaction "${transaction}". Use sale or rent.`);
  const path = String(location).trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  const params = new URLSearchParams({ sortBy: 'verification_at' });
  if (minPrice != null) params.set('minPrice', String(minPrice));
  if (maxPrice != null) params.set('maxPrice', String(maxPrice));
  if (page > 1) params.set('page', String(page));
  return `${BASE_URL}/en/${type}-${deal}/${path}?${params}`;
}

const decode = (s) => String(s)
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' | ')).replace(/\s+/g, ' ').replace(/(\s*\|\s*)+/g, ' | ').trim();
const number = (s) => {
  if (s == null) return null;
  const n = Number(String(s).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && String(s).match(/\d/) ? n : null;
};

export function jsonLd(html, type) {
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(m[1]);
      if (data?.['@type'] === type) return data;
    } catch {
      // Another block; keep looking.
    }
  }
  return null;
}

// The listing's own key: the part of the URL after the last underscore, the same on every page.
export const listingKey = (url) => String(url).split('?')[0].split('_').pop();

// The photo file behind an img.fazwaz.com link: the service encodes {bucket, key, edits} as base64,
// and the key ends with the file's sha256.
export function imageKey(url) {
  try {
    const b64 = String(url).split('/').pop();
    const cfg = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return cfg.key ?? null;
  } catch {
    return null;
  }
}

// A small version of a photo, for comparing pictures: the same link with a resize edit.
export function thumbnailUrl(url, width = 64, height = 48) {
  try {
    const b64 = String(url).split('/').pop();
    const cfg = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    cfg.edits = { resize: { width, height, fit: 'cover' } };
    return `https://img.fazwaz.com/${Buffer.from(JSON.stringify(cfg)).toString('base64')}`;
  } catch {
    return null;
  }
}

// Size, bathrooms and price per m² of each card, by listing URL.
function cardDetails(html) {
  const out = new Map();
  for (const m of html.matchAll(/<article class="relative w-full overflow-hidden">([\s\S]*?)<\/article>/g)) {
    const href = m[1].match(/href="(\/en\/ads\/[^"]+)"/);
    if (!href) continue;
    const text = textOf(m[1]);
    out.set(listingKey(href[1]), {
      sqm: number(text.match(/([\d,.]+) SqM\b/)?.[1]),
      baths: number(text.match(/(\d+) Baths?\b/)?.[1]),
      pricePerSqm: number(text.match(/฿([\d,.]+)\/SqM/)?.[1]),
      isNew: /\bNew Listing\b/.test(text),
      priceChanged: /\bPrice Change\b/.test(text),
    });
  }
  return out;
}

// The page's own data for the listings (the "homes" array of the Next.js payload): the site's unit
// ID, the full photo album and the date the listing was last verified.
export function homesData(html) {
  const out = new Map();
  let payload = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)) {
    try {
      payload += JSON.parse(`"${m[1]}"`);
    } catch {
      // A chunk we cannot read; the others still count.
    }
  }
  let from = 0;
  while ((from = payload.indexOf('"homes":[', from)) !== -1) {
    const start = from + '"homes":'.length;
    let depth = 0;
    let end = -1;
    let inString = false;
    for (let i = start; i < payload.length; i++) {
      const c = payload[i];
      if (inString) {
        if (c === '\\') i++;
        else if (c === '"') inString = false;
      } else if (c === '"') inString = true;
      else if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') {
        depth--;
        if (depth === 0) { end = i; break; }
      }
    }
    from = start;
    if (end < 0) break;
    try {
      for (const home of JSON.parse(payload.slice(start, end + 1))) {
        if (!home?.uuid) continue;
        out.set(home.uuid, {
          unitId: home.unit_id ?? null,
          album: (home.album ?? []).map((a) => a?.src).filter(Boolean),
          verifiedAt: home.verification_at ? new Date(home.verification_at).toISOString() : null,
          projectSlug: home.project?.clean_name ?? null,
          areaSlug: home.location_clean_name ?? null,
        });
      }
    } catch {
      // Not the listing array.
    }
  }
  return out;
}

// One record per listing of a list page, and the total the site reports for the search.
export function parseListPage(html) {
  const list = jsonLd(html, 'ItemList');
  if (!list) return { total: null, listings: [] };
  const cards = cardDetails(html);
  const homes = homesData(html);
  const listings = (list.itemListElement ?? []).map((element) => {
    const item = element.item ?? {};
    const about = item.about ?? {};
    const address = about.address ?? {};
    const key = listingKey(item.url);
    const card = cards.get(key) ?? {};
    const home = homes.get(key) ?? {};
    const price = number(item.offers?.price);
    const sqm = card.sqm ?? null;
    return {
      key,
      url: item.url,
      title: item.name ?? null,
      project: about.containedInPlace?.name ?? null,
      bedrooms: about.numberOfBedrooms ?? null,
      bathrooms: card.baths ?? null,
      sizeSqm: sqm,
      price,
      currency: item.offers?.priceCurrency ?? 'THB',
      pricePerSqm: card.pricePerSqm ?? (price && sqm ? Math.round(price / sqm) : null),
      subdistrict: address.streetAddress ? address.streetAddress.replace(/-/g, ' ') : null,
      city: address.addressLocality ?? null,
      province: address.addressRegion ? address.addressRegion.replace(/-/g, ' ') : null,
      latitude: about.geo?.latitude ?? null,
      longitude: about.geo?.longitude ?? null,
      postedAt: item.datePosted ? new Date(item.datePosted).toISOString() : null,
      imageUrl: item.image ?? null,
      imageKey: item.image ? imageKey(item.image) : null,
      descriptionStart: item.description ? item.description.replace(/\s+/g, ' ').trim() : null,
      isNewListing: card.isNew ?? false,
      priceChangeBadge: card.priceChanged ?? false,
      unitId: home.unitId ?? null,
      verifiedAt: home.verifiedAt ?? null,
      photoCount: home.album?.length ?? null,
      photoUrls: home.album ?? [],
      photoKeys: (home.album ?? []).map(imageKey).filter(Boolean),
    };
  });
  return { total: list.numberOfItems ?? null, listings };
}

// The value after a label in the page text: "Floors | 31" → "31".
const field = (text, label) => {
  const m = text.match(new RegExp(`\\| ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| ([^|]+) \\|`));
  return m ? m[1].trim() : null;
};

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const date = (s) => {
  const m = String(s ?? '').match(/([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})/);
  if (!m || MONTHS[m[1].toLowerCase()] == null) return null;
  return new Date(Date.UTC(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]))).toISOString().slice(0, 10);
};

// The unit's floor in a description: "on the 16th floor", "Floor: 16", "ชั้น 16", "на 16 этаже",
// "16楼". Floors of the building's facilities ("rooftop pool on the 40th floor") do not count; a
// description that names two different floors for the unit leaves it unknown.
const FLOOR_PATTERNS = [
  /\b(\d{1,2})(?:st|nd|rd|th)[ -]?(?:floor(?!s)|fl\b)/g,
  // "Floor: 16", but not "2 floor 1 Bedroom" or "Floor: 30+ (High Floor)".
  /\bfloor(?:\s*(?:no\.?|number))?[:\s#]+(\d{1,2})(?![\d+])(?!\s*-?\s*(?:bed|bath|br\b|rooms?\b))/g,
  /ชั้น(?:ที่)?\s*(\d{1,2})(?![\d+])/g,
  /(?<![\d.,])(\d{1,2})(?:-?м|-?й|-ом)?\s*этаж(?:е)?(?![а-яё])/g,
  /этаж[:\s]+(\d{1,2})(?![\d+])/g,
  /(?<!\d)(\d{1,2})\s*楼|第\s*(\d{1,2})\s*层/g,
];
// "Infinity pool on the 25th floor", "gym is on the 8th floor" before the floor; "42nd Floor Sky
// Lounge", "7th Floor Gymnasium" after it.
const FACILITY_BEFORE = /(?:pool|gym|fitness|rooftop|roof|sky\s*(?:bar|lounge|deck|garden)|lobby|restaurant|bar|lounge|parking|car\s*park|garden|sauna|library|co-?working|reception|бассейн|фитнес|спортзал|ресторан|лобби|парковка)(?:\s+(?!view|unit|room|condo|apartment|studio|bedroom)[\w-]+){0,2}\s+(?:is\s+)?(?:on|at|in)\s+(?:the\s+)?$/;
const FACILITY_AFTER = /^[\s:,-]*(?:[\w&;-]+\s+){0,2}?(?:pool|swimming|gym|gymnasium|fitness|lounge|bar\b|garden|lobby|restaurant|sauna|deck|terrace|podium|parking|library|co-?working)(?!\s*view)/;
export function unitFloorOf(description) {
  const text = String(description ?? '').toLowerCase();
  const found = new Set();
  for (const pattern of FLOOR_PATTERNS) {
    for (const m of text.matchAll(pattern)) {
      const floor = Number(m[1] ?? m[2]);
      if (!floor) continue;
      if (FACILITY_BEFORE.test(text.slice(Math.max(0, m.index - 60), m.index))) continue;
      if (FACILITY_AFTER.test(text.slice(m.index + m[0].length, m.index + m[0].length + 40))) continue;
      found.add(floor);
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

// Facts the advertiser writes only in the description: foreign or Thai quota, freehold or
// leasehold, the unit's floor and its view.
export function descriptionFacts(description) {
  const text = String(description ?? '').toLowerCase();
  const ownership = /foreign (freehold|quota|name|ownership)|freehold.{0,20}foreign|foreigner quota/.test(text) ? 'foreign quota'
    : /thai (quota|name|company)|company name/.test(text) ? 'thai quota'
      : /leasehold|30[- ]year lease/.test(text) ? 'leasehold' : null;
  const floor = unitFloorOf(text);
  const view = /\b(full|panoramic|direct|frontal)? ?sea ?view\b|ocean view/.test(text) ? (/(partial|side) sea ?view/.test(text) ? 'partial sea view' : 'sea view')
    : /city view/.test(text) ? 'city view' : /pool view/.test(text) ? 'pool view' : /garden view/.test(text) ? 'garden view' : null;
  return { ownership, unitFloor: floor, view };
}

// The listing page: gallery, description and the details tables.
export function parseListingPage(html) {
  const listing = jsonLd(html, 'RealEstateListing');
  const entity = listing?.mainEntity ?? {};
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  const text = ` ${textOf(body)} `;
  const landmark = text.match(/Nearest Landmark: \| ([^|]+?)- ?([\d.]+) ?Km/i);
  const construction = field(text, 'Construction');
  const camFee = field(text, 'CAM Fee');
  const listingId = text.match(/Listing ID \| : \| (\d+)/)?.[1] ?? null;
  const images = Array.isArray(entity.image) ? entity.image : entity.image ? [entity.image] : [];
  const description = typeof listing?.description === 'string' ? listing.description : typeof entity.description === 'string' ? entity.description : null;
  const availability = String(entity.offers?.availability ?? '');
  return {
    listingId,
    // InStock while the listing is on offer; sold or withdrawn listings say otherwise.
    available: availability ? /InStock|InStoreOnly|OnlineOnly|PreOrder/.test(availability) : null,
    availability: availability ? availability.split('/').pop() : null,
    bathrooms: entity.numberOfBathroomsTotal ?? number(field(text, 'Baths')),
    sizeSqm: entity.floorSize?.value ?? number(field(text, 'SqM')),
    listedAt: date(field(text, 'Date Listed')),
    updatedAt: date(field(text, 'Updated At')),
    furniture: field(text, 'Furniture Status'),
    yearBuilt: number(field(text, 'Year Built')),
    camFeePerMonth: camFee ? number(camFee) : null,
    amenities: (entity.amenityFeature ?? []).filter((a) => a.value).map((a) => a.name),
    images,
    imageKeys: images.map(imageKey).filter(Boolean),
    description,
    ...descriptionFacts(description),
    project: {
      name: field(text, 'Project Name'),
      developer: field(text, 'Developer'),
      construction,
      completedYear: number(construction?.match(/(\d{4})/)?.[1]),
      floors: number(field(text, 'Floors')),
      buildings: number(field(text, 'Buildings')),
      units: number(field(text, 'Units')),
      areaSqm: number(field(text, 'Project Area')),
      nearestLandmark: landmark ? landmark[1].trim() : null,
      nearestLandmarkKm: landmark ? Number(landmark[2]) : null,
    },
  };
}
