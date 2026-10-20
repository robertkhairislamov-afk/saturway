// Input of the AliExpress Actor: searches and links to scrape, the ship-to country and currency,
// filters and limits.

import { MAX_PAGES, PAGE_SIZE, SORTS, parseSearchLink, searchUrl } from './aliexpress.js';

// An empty input (for example the Store's daily health check) scrapes this example instead of failing.
export const EXAMPLE_INPUT = { searchQueries: ['phone case'], maxItemsPerSearch: 60 };

export const MAX_PER_SEARCH = PAGE_SIZE * MAX_PAGES;

// Ship-to countries and the currency AliExpress shows there by default.
export const COUNTRIES = {
  US: ['United States', 'USD'], GB: ['United Kingdom', 'GBP'], CA: ['Canada', 'CAD'], AU: ['Australia', 'AUD'],
  NZ: ['New Zealand', 'NZD'], DE: ['Germany', 'EUR'], FR: ['France', 'EUR'], ES: ['Spain', 'EUR'], IT: ['Italy', 'EUR'],
  NL: ['Netherlands', 'EUR'], BE: ['Belgium', 'EUR'], AT: ['Austria', 'EUR'], PT: ['Portugal', 'EUR'], IE: ['Ireland', 'EUR'],
  FI: ['Finland', 'EUR'], GR: ['Greece', 'EUR'], SK: ['Slovakia', 'EUR'], HR: ['Croatia', 'EUR'], BG: ['Bulgaria', 'EUR'],
  PL: ['Poland', 'PLN'], CZ: ['Czechia', 'CZK'], HU: ['Hungary', 'HUF'], RO: ['Romania', 'RON'], SE: ['Sweden', 'SEK'],
  NO: ['Norway', 'NOK'], DK: ['Denmark', 'DKK'], CH: ['Switzerland', 'CHF'], IL: ['Israel', 'ILS'], SA: ['Saudi Arabia', 'SAR'],
  AE: ['United Arab Emirates', 'AED'], TR: ['Türkiye', 'TRY'], UA: ['Ukraine', 'UAH'], IN: ['India', 'INR'], JP: ['Japan', 'JPY'],
  KR: ['South Korea', 'KRW'], SG: ['Singapore', 'SGD'], MY: ['Malaysia', 'MYR'], TH: ['Thailand', 'THB'], PH: ['Philippines', 'PHP'],
  ID: ['Indonesia', 'IDR'], VN: ['Vietnam', 'VND'], BR: ['Brazil', 'BRL'], MX: ['Mexico', 'MXN'], CL: ['Chile', 'CLP'],
  CO: ['Colombia', 'COP'], PE: ['Peru', 'PEN'], ZA: ['South Africa', 'ZAR'], KZ: ['Kazakhstan', 'KZT'], MA: ['Morocco', 'MAD'],
  EG: ['Egypt', 'EGP'], NG: ['Nigeria', 'NGN'],
};

// Every product record has the same keys in the same order; missing values are null.
export { EMPTY_PRODUCT } from './aliexpress.js';

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : [])
  .map((item) => String(typeof item === 'object' && item !== null ? item.url ?? '' : item).trim())
  .filter(Boolean);

const numberField = (input, name, { min = 0, max = Infinity, integer = false } = {}) => {
  const value = input[name];
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new Error(`"${name}" must be a${integer ? ' whole' : ''} number from ${min}${max < Infinity ? ` to ${max}` : ' or more'}.`);
  }
  return n;
};

// The words of a /w/wholesale-<words>.html link, as the search they stand for.
const queryOfLink = (url) => {
  const m = /\/w\/wholesale-(.+)\.html$/i.exec(new URL(url).pathname);
  return m ? decodeURIComponent(m[1]).replace(/-/g, ' ') : null;
};

export function readInput(raw, warn = () => {}) {
  let input = raw;
  if (toList(raw.searchQueries).length === 0 && toList(raw.startUrls).length === 0) {
    warn('No searches or links in the input; scraping the search "phone case" as an example.');
    input = { ...EXAMPLE_INPUT, ...raw, searchQueries: EXAMPLE_INPUT.searchQueries };
  }
  const shipTo = String(input.shipTo || 'US').trim().toUpperCase();
  if (!COUNTRIES[shipTo]) throw new Error(`Unknown ship-to country "${shipTo}". Use one of: ${Object.keys(COUNTRIES).join(', ')}.`);
  const currency = String(input.currency || COUNTRIES[shipTo][1]).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error(`Invalid currency "${currency}". Use a three-letter code such as USD, EUR or GBP.`);
  const sort = String(input.sort || 'relevance');
  if (!(sort in SORTS)) throw new Error(`Unknown sort "${sort}". Use one of: ${Object.keys(SORTS).join(', ')}.`);
  const shipFrom = input.shipFrom ? String(input.shipFrom).trim().toUpperCase() : null;
  if (shipFrom && !/^[A-Z]{2}$/.test(shipFrom)) throw new Error(`Invalid ship-from country "${shipFrom}". Use a two-letter code such as CN, US or ES.`);
  const minPrice = numberField(input, 'minPrice');
  const maxPrice = numberField(input, 'maxPrice');
  if (maxPrice > 0 && minPrice > maxPrice) throw new Error('"minPrice" is above "maxPrice".');
  const maxItemsPerSearch = input.maxItemsPerSearch === undefined || input.maxItemsPerSearch === null || input.maxItemsPerSearch === ''
    ? 100
    : numberField(input, 'maxItemsPerSearch', { min: 1, max: MAX_PER_SEARCH, integer: true });

  const searches = [];
  const seen = new Set();
  const add = (search) => {
    const key = search.baseUrl;
    if (seen.has(key)) return;
    seen.add(key);
    searches.push(search);
  };
  for (const query of toList(input.searchQueries)) {
    try {
      add({ label: `"${query}"`, query, baseUrl: searchUrl(query) });
    } catch (error) {
      warn(`Skipping search "${query}": ${error.message}`);
    }
  }
  for (const link of toList(input.startUrls)) {
    try {
      const baseUrl = parseSearchLink(link);
      add({ label: link.length > 90 ? `${link.slice(0, 87)}...` : link, query: queryOfLink(baseUrl), baseUrl, isCategory: /\/category\//.test(baseUrl) });
    } catch (error) {
      warn(`Skipping link "${link}": ${error.message}`);
    }
  }
  if (searches.length === 0) throw new Error('None of the searches or links can be scraped; see the warnings above.');

  return {
    searches,
    sort,
    shipTo,
    shipToName: COUNTRIES[shipTo][0],
    currency,
    shipFrom,
    minPrice,
    maxPrice,
    minRating: numberField(input, 'minRating', { max: 5 }),
    minSold: numberField(input, 'minSold', { integer: true }),
    skipSponsored: Boolean(input.skipSponsored),
    maxItemsPerSearch,
    maxItems: numberField(input, 'maxItems', { integer: true }),
    proxyConfiguration: input.proxyConfiguration,
  };
}

// Whether a product passes the input's filters. The price range is also sent to AliExpress, so
// this only catches the few products whose card price differs from the price AliExpress filtered on.
export function passes(product, { minPrice, maxPrice, minRating, minSold, skipSponsored }) {
  if (skipSponsored && product.isSponsored) return false;
  if (minPrice > 0 && !(product.price >= minPrice)) return false;
  if (maxPrice > 0 && !(product.price <= maxPrice)) return false;
  if (minRating > 0 && !(product.rating >= minRating)) return false;
  if (minSold > 0 && !(product.soldCount >= minSold)) return false;
  return true;
}
