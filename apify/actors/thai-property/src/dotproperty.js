// Dot Property (dotproperty.co.th): search URLs and parsers for list and listing pages.
// List pages carry a schema.org ItemList (30 listings: project, bedrooms, coordinates, price, date)
// and one card per listing with size, bathrooms and price per m². A listing page adds the photo
// gallery, the full description, the basic information table and the project details.

export const BASE_URL = 'https://www.dotproperty.co.th';
export const PAGE_SIZE = 30;

export const PROPERTY_TYPES = { condo: 'condos', house: 'houses', villa: 'villas', townhouse: 'townhouses' };
export const TRANSACTIONS = { sale: 'for-sale', rent: 'for-rent' };

// "chonburi/pattaya" → https://www.dotproperty.co.th/en/condos-for-sale/chonburi/pattaya?page=2
export function searchUrl({ location, propertyType = 'condo', transaction = 'sale', page = 1 }) {
  const type = PROPERTY_TYPES[propertyType];
  const deal = TRANSACTIONS[transaction];
  if (!type) throw new Error(`Unknown property type "${propertyType}". Use one of: ${Object.keys(PROPERTY_TYPES).join(', ')}.`);
  if (!deal) throw new Error(`Unknown transaction "${transaction}". Use sale or rent.`);
  const path = String(location).trim().replace(/^\/+|\/+$/g, '').toLowerCase();
  const url = `${BASE_URL}/en/${type}-${deal}/${path}`;
  return page > 1 ? `${url}?page=${page}` : url;
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

// One record per listing of a list page, and the total the site reports for the search.
export function parseListPage(html) {
  const list = jsonLd(html, 'ItemList');
  if (!list) return { total: null, listings: [] };
  const cards = cardDetails(html);
  const listings = (list.itemListElement ?? []).map((element) => {
    const item = element.item ?? {};
    const about = item.about ?? {};
    const address = about.address ?? {};
    const key = listingKey(item.url);
    const card = cards.get(key) ?? {};
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

// Facts the advertiser writes only in the description: foreign or Thai quota, freehold or
// leasehold, the unit's floor and its view.
export function descriptionFacts(description) {
  const text = String(description ?? '').toLowerCase();
  const ownership = /foreign (freehold|quota|name|ownership)|freehold.{0,20}foreign|foreigner quota/.test(text) ? 'foreign quota'
    : /thai (quota|name|company)|company name/.test(text) ? 'thai quota'
      : /leasehold|30[- ]year lease/.test(text) ? 'leasehold' : null;
  const floor = text.match(/\b(\d{1,2})(?:st|nd|rd|th)[ -]floor\b/) ?? text.match(/\bfloor[: ]+(\d{1,2})\b/);
  const view = /\b(full|panoramic|direct|frontal)? ?sea ?view\b|ocean view/.test(text) ? (/(partial|side) sea ?view/.test(text) ? 'partial sea view' : 'sea view')
    : /city view/.test(text) ? 'city view' : /pool view/.test(text) ? 'pool view' : /garden view/.test(text) ? 'garden view' : null;
  return { ownership, unitFloor: floor ? Number(floor[1]) : null, view };
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
  return {
    listingId,
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
