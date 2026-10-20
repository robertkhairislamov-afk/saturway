// AliExpress search pages: URLs, the ship-to cookie and the product cards the page embeds as JSON
// (window._dida_config_._init_data_). Everything here is pure, so it can be tested offline.

const BASE = 'https://www.aliexpress.com';
export const PAGE_SIZE = 60;
// AliExpress shows at most 60 pages of 60 products for one search.
export const MAX_PAGES = 60;

export const SORTS = {
  relevance: null,
  orders: 'total_tranpro_desc',
  price_asc: 'price_asc',
  price_desc: 'price_desc',
};

// "Phone case" becomes the search path "wholesale-phone-case.html".
const slug = (text) => String(text).trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

// The URL of one page of a search. `base` is a search or category link (see parseSearchLink).
export function pageUrl(base, { sort, minPrice, maxPrice, shipFrom } = {}, page = 1) {
  const url = new URL(base);
  if (SORTS[sort]) url.searchParams.set('sortType', SORTS[sort]);
  if (minPrice > 0) url.searchParams.set('minPrice', String(minPrice));
  if (maxPrice > 0) url.searchParams.set('maxPrice', String(maxPrice));
  if (shipFrom) url.searchParams.set('shpf_co', shipFrom);
  if (page > 1) url.searchParams.set('page', String(page));
  else url.searchParams.delete('page');
  return url.toString();
}

export const searchUrl = (query) => {
  const path = slug(query);
  if (!path) throw new Error('the search is empty');
  return `${BASE}/w/wholesale-${path}.html`;
};

// A search or category link from AliExpress: /w/wholesale-<words>.html, /wholesale?SearchText=…,
// /category/<id>/<name>.html or /af/<words>.html. Country sites (de.aliexpress.com, aliexpress.us)
// are read through www.aliexpress.com; the ship-to country decides prices and currency.
export function parseSearchLink(link) {
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new Error('not a valid link');
  }
  if (!/(^|\.)aliexpress\.(com|us|ru)$|(^|\.)aliexpress\.[a-z]{2}$/i.test(url.hostname)) throw new Error('not an AliExpress link');
  const path = url.pathname;
  if (/^\/item\//i.test(path)) throw new Error('this is a product page; this Actor reads search and category pages');
  const text = url.searchParams.get('SearchText') ?? url.searchParams.get('searchText');
  let base;
  if (/^\/w\/wholesale-.+\.html$/i.test(path) || /^\/category\/\d+\/[^/]+\.html$/i.test(path) || /^\/af\/[^/]+\.html$/i.test(path)) base = `${BASE}${path}`;
  else if (text) base = searchUrl(text);
  else throw new Error('use a search or category link, such as https://www.aliexpress.com/w/wholesale-phone-case.html');
  const out = new URL(base);
  // Keep the link's own filters (category, price, ship-from, sorting); paging is the Actor's job.
  for (const [key, value] of url.searchParams) {
    if (['catId', 'minPrice', 'maxPrice', 'shpf_co', 'sortType', 'selectedSwitches', 'isFreeShip', 'isFavorite', 'brandId', 'pr'].includes(key)) out.searchParams.set(key, value);
  }
  return out.toString();
}

// The cookie that sets the ship-to country, currency and language, as AliExpress's own selector does.
export const shipToCookie = (country, currency) => `aep_usuc_f=site=glo&c_tp=${currency}&region=${country}&b_locale=en_US`;

const MARKER = '_init_data_= { data: ';

// The search data of a page, or null when the page has none (a check page, an error page).
export function parseSearchPage(html) {
  const start = html.indexOf(MARKER);
  if (start < 0) return null;
  let data;
  try {
    data = readJson(html, start + MARKER.length);
  } catch {
    return null;
  }
  const fields = data?.data?.root?.fields;
  if (!fields) return null;
  const info = fields.pageInfo ?? {};
  return {
    page: Number(info.page) || 1,
    pageSize: Number(info.pageSize) || PAGE_SIZE,
    total: Number(info.totalResults) || 0,
    cards: fields.mods?.itemList?.content ?? [],
  };
}

// Reads one JSON value that starts at `from`, ignoring what follows it.
function readJson(text, from) {
  let depth = 0;
  let inString = false;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === '\\') i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(from, i + 1));
    }
  }
  throw new Error('unfinished JSON');
}

// A captcha or check page instead of results: AliExpress asks the visitor to slide a bar.
export const isCheckPage = (html) => /punish|x5secdata|_____tmd_____/i.test(html) && !html.includes(MARKER);

// "10,000+ sold", "100K+ sold", "4K+ sold", "6 sold" as a number (the lower bound).
export function soldFromText(text) {
  const m = /([\d.,]+)\s*([kKmM])?\+?\s*sold/.exec(String(text ?? ''));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const unit = m[2]?.toLowerCase();
  return Math.round(n * (unit === 'k' ? 1e3 : unit === 'm' ? 1e6 : 1));
}

const imageUrl = (url) => (url ? (url.startsWith('//') ? `https:${url}` : url) : null);
const numberOr = (value) => {
  const n = Number(value);
  return value === undefined || value === null || value === '' || !Number.isFinite(n) ? null : n;
};
const dayOf = (text) => (/^\d{4}-\d{2}-\d{2}/.test(text ?? '') ? text.slice(0, 10) : null);
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
// Store names come HTML-escaped ("Miss Z&#39; Store").
const decode = (text) => (text == null ? null : String(text)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
  .trim() || null);
// Currencies without cents, whose tracking amounts are not in hundredths.
const WHOLE_CURRENCIES = new Set(['JPY', 'KRW', 'CLP', 'VND', 'ISK', 'HUF', 'TWD', 'IDR', 'COP', 'UGX']);

// Delivery estimate "4,7,2026-10-24,2026-10-27": days from now and the dates.
function deliveryOf(text) {
  const parts = String(text ?? '').split(',');
  if (parts.length < 4) return null;
  return { minDays: numberOr(parts[0]), maxDays: numberOr(parts[1]), from: dayOf(parts[2]), to: dayOf(parts[3]) };
}

// Every product record has the same keys in the same order; missing values are null.
export const EMPTY_PRODUCT = {
  productId: null, title: null, url: null, image: null, images: null,
  price: null, originalPrice: null, discountPercent: null, currency: null, priceText: null, isNewShopperPrice: null,
  soldCount: null, soldText: null, rating: null, isChoice: null, isSponsored: null,
  deliveryDaysMin: null, deliveryDaysMax: null, deliveryFrom: null, deliveryTo: null,
  badges: null, categoryIds: null, storeName: null, sellerCompany: null, listedAt: null,
  position: null, page: null, searchQuery: null, searchUrl: null, shipTo: null, scrapedAt: null,
};

// Search results are "productV3" cards. Some answers replace part or all of a page with short
// recommendation cards (title, picture and price only) of other products; they are not results.
export const isSearchResult = (card) => card?.itemType === 'productV3';

// The share of a page's cards that are recommendations instead of search results.
export const recommendedShare = (page) => (page?.cards?.length ? page.cards.filter((card) => !isSearchResult(card)).length / page.cards.length : 0);

// One product card of the results as a record.
// `currency` is the currency of the page, for cards that carry their price only in tracking data.
export function toProduct(card, { currency: pageCurrency = null } = {}) {
  const productId = card.productId ? String(card.productId) : null;
  if (!productId) return null;
  const log = card.trace?.utLogMap ?? {};
  const prices = card.prices ?? {};
  const sale = prices.salePrice ?? {};
  const original = prices.originalPrice ?? {};
  const currency = sale.currencyCode ?? original.currencyCode ?? pageCurrency ?? null;
  // Some full cards carry the price only in their tracking data, in cents of the page currency.
  const fromLog = (amount) => (numberOr(amount) !== null && currency && !WHOLE_CURRENCIES.has(currency) ? Number(amount) / 100 : null);
  const price = numberOr(sale.minPrice) ?? fromLog(log.salePriceAmount);
  const originalPrice = numberOr(original.minPrice) ?? fromLog(log.originPriceAmount);
  const discount = numberOr(sale.discount) ?? (price !== null && originalPrice > price ? Math.round((1 - price / originalPrice) * 100) : null);
  const soldText = card.trade?.tradeDesc ?? null;
  const soldCount = numberOr(log.real_trade_count) ?? soldFromText(soldText);
  const rating = numberOr(card.evaluation?.starRating) ?? numberOr(log.star_rating);
  const delivery = deliveryOf(log.delivery_info);
  const tags = (card.sellingPoints ?? []).map((point) => decode(point.tagContent?.tagText)).filter(Boolean);
  // The delivery estimate and the "Ad" label have their own fields.
  const badges = [...new Set(tags.filter((text) => !/^delivery:/i.test(text) && text !== 'Ad'))];
  let store = null;
  try {
    store = JSON.parse(card.trace?.custom?.p4pExtendParam ?? 'null');
  } catch {
    store = null;
  }
  return {
    ...EMPTY_PRODUCT,
    productId,
    title: decode(card.title?.displayTitle),
    url: `${BASE}/item/${productId}.html`,
    image: imageUrl(card.image?.imgUrl),
    images: card.images?.length ? card.images.map((image) => imageUrl(image.imgUrl)).filter(Boolean) : null,
    price,
    originalPrice: originalPrice !== null && originalPrice !== price ? originalPrice : null,
    discountPercent: discount && discount > 0 ? discount : null,
    currency,
    priceText: sale.formattedPrice ?? log.formatted_price ?? null,
    // "New shoppers save £12.32": the card price is the first-order price of a new customer.
    isNewShopperPrice: tags.some((text) => /^new shoppers? save/i.test(text)),
    soldCount,
    soldText,
    rating,
    isChoice: log.isChoice ? log.isChoice === 'true' : (card.sellingPoints ?? []).some((point) => point.source === 'choice_atm') || null,
    isSponsored: card.productType === 'ad' || tags.includes('Ad'),
    deliveryDaysMin: delivery?.minDays ?? null,
    deliveryDaysMax: delivery?.maxDays ?? null,
    deliveryFrom: delivery?.from ?? null,
    deliveryTo: delivery?.to ?? null,
    badges: badges.length > 0 ? badges : null,
    categoryIds: log.categoryId ? String(log.categoryId).split(',').filter(Boolean) : null,
    storeName: decode(store?.store_name),
    sellerCompany: decode(store?.company_name),
    listedAt: dayOf(card.lunchTime),
  };
}
