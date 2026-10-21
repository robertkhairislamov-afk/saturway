// Input of the Actor: what to look up (brands, websites, advertiser IDs, links), the region,
// filters and limits.

import { FORMATS, PLATFORMS, isAdvertiserId, isDomain, normalizeDomain, parseStartUrl, regionCode, regionId } from './transparency.js';

// An empty input (for example the Store's daily health check) scrapes this example instead of failing.
export const EXAMPLE_INPUT = { queries: ['nike.com'], maxAdsPerSearch: 20 };

export const MAX_ADS_PER_SEARCH = 10000;

const toList = (value) => (Array.isArray(value) ? value : value ? String(value).split(/\n/) : [])
  .map((item) => String(typeof item === 'object' && item !== null ? item.url ?? '' : item).trim())
  .filter(Boolean);

const numberField = (input, name, { min = 0, max = Infinity, fallback = 0 } = {}) => {
  const value = input[name];
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`"${name}" must be a whole number from ${min}${max < Infinity ? ` to ${max}` : ' or more'}.`);
  return n;
};

const dateField = (input, name) => {
  const value = String(input[name] ?? '').trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) throw new Error(`"${name}" must be a date such as 2026-09-01.`);
  return value;
};

export function readInput(raw, warn = () => {}) {
  let input = raw;
  const given = ['queries', 'domains', 'advertiserIds', 'startUrls'].some((key) => toList(raw[key]).length > 0);
  if (!given) {
    warn('No brands, websites, advertiser IDs or links in the input; scraping the ads of nike.com as an example.');
    input = { ...raw, ...EXAMPLE_INPUT };
  }

  const resultType = String(input.resultType || 'ads');
  if (!['ads', 'advertisers'].includes(resultType)) throw new Error('"resultType" must be "ads" or "advertisers".');
  const region = regionId(input.region ?? 'US');
  const platforms = toList(input.platforms).map((p) => p.toUpperCase());
  for (const p of platforms) if (!(p in PLATFORMS)) throw new Error(`Unknown platform "${p}". Use ${Object.keys(PLATFORMS).join(', ')}.`);
  const format = String(input.adFormat || 'ALL').toUpperCase();
  if (format !== 'ALL' && !(format in FORMATS)) throw new Error(`Unknown ad format "${format}". Use ALL, ${Object.keys(FORMATS).join(', ')}.`);
  const startDate = dateField(input, 'startDate');
  const endDate = dateField(input, 'endDate');
  if (startDate && endDate && startDate > endDate) throw new Error('"startDate" is after "endDate".');

  const targets = [];
  const seen = new Set();
  const add = (target) => {
    if (seen.has(target.key)) return;
    seen.add(target.key);
    targets.push(target);
  };
  const addDomain = (domain, label = domain) => add({ kind: 'domain', key: `d:${domain}`, label, domain });
  const addAdvertiser = (advertiserId, label = advertiserId) => add({ kind: 'advertiser', key: `a:${advertiserId}`, label, advertiserId });
  const addLink = (link) => {
    try {
      const parsed = parseStartUrl(link);
      if (parsed.kind === 'domain') addDomain(parsed.domain, link);
      else if (parsed.kind === 'advertiser') addAdvertiser(parsed.advertiserId, link);
      else add({ kind: 'creative', key: `c:${parsed.creativeId}`, label: link, advertiserId: parsed.advertiserId, creativeId: parsed.creativeId });
    } catch (error) {
      warn(`Skipping link "${link}": ${error.message}.`);
    }
  };

  for (const query of toList(input.queries)) {
    if (/^https?:\/\/[^/]*adstransparency\.google\.com/i.test(query)) addLink(query);
    else if (isAdvertiserId(query)) addAdvertiser(query);
    else if (isDomain(query)) addDomain(normalizeDomain(query), query);
    else add({ kind: 'query', key: `q:${query.toLowerCase()}`, label: `"${query}"`, query });
  }
  for (const domain of toList(input.domains)) {
    if (isDomain(domain)) addDomain(normalizeDomain(domain), domain);
    else warn(`Skipping "${domain}": not a website such as nike.com.`);
  }
  for (const id of toList(input.advertiserIds)) {
    if (isAdvertiserId(id)) addAdvertiser(id);
    else warn(`Skipping "${id}": advertiser IDs start with AR followed by digits.`);
  }
  for (const link of toList(input.startUrls)) addLink(link);
  if (targets.length === 0) throw new Error('None of the brands, websites, advertiser IDs or links can be used; see the warnings above.');

  return {
    targets,
    resultType,
    region,
    regionLabel: regionCode(region) ?? 'ANYWHERE',
    platforms,
    format: format === 'ALL' ? null : format,
    startDate,
    endDate,
    maxAdsPerSearch: numberField(input, 'maxAdsPerSearch', { min: 1, max: MAX_ADS_PER_SEARCH, fallback: 100 }),
    maxAdvertisersPerQuery: numberField(input, 'maxAdvertisersPerQuery', { min: 1, max: 10, fallback: 1 }),
    includeAdText: input.includeAdText !== false,
    includeDetails: Boolean(input.includeDetails),
    onlyNewAds: Boolean(input.onlyNewAds),
    monitorStoreName: String(input.monitorStoreName || 'ads-transparency-seen').trim(),
    maxItems: numberField(input, 'maxItems'),
    proxyConfiguration: input.proxyConfiguration,
  };
}
