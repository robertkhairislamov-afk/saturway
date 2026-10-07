// Glassdoor: the GraphQL API behind Glassdoor's own job search (api.glassdoor.com/graph), which
// answers without the browser check of the website. Searches by keywords and a place in 62
// countries; a place typed as text is looked up in Glassdoor's location suggestions first.
// Glassdoor shows at most 30 pages per search, so the Actor asks for the first page again and
// again with the jobs it already has excluded, which goes far past that. Descriptions come from
// the job view, several jobs per request. Recruiters and their contact details are never read.

import { makeJob } from '../core/job.js';
import { makeSalary } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'glassdoor';
export const title = 'Glassdoor';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 3;
// Descriptions are loaded several jobs per request, so every job of a batch is asked for at once.
export const detailConcurrency = 48;
export const proxyFallback = true;

const API = 'https://api.glassdoor.com/graph';
const SUGGEST = 'https://api.glassdoor.com/autocomplete/location';
// The client name and the public anti-forgery token of Glassdoor's job search pages, as the open
// source JobSpy library sends them.
const APP_HEADERS = {
  accept: '*/*',
  'apollographql-client-name': 'job-search-next',
  'apollographql-client-version': '4.65.5',
  'gd-csrf-token': 'Ft6oHEWlRZrxDww95Cpazw:0pGUrkb2y3TyOpAIqF2vbPmUXoXVkD3oEGDVkvfeCerceQ5-n8mBg3BovySUIjmCPHCaW0H2nQVdqzbtsYqf4Q:wcqRqeegRUa9MVLJGyujVXB7vWFPjdaS1CtrrzJq-ok',
  origin: 'https://www.glassdoor.com',
  referer: 'https://www.glassdoor.com/',
};
const PAGE_SIZE = 100;
// Very long lists of excluded jobs make Glassdoor answer with empty pages, so a search stops here.
export const MAX_PER_SEARCH = 10000;
// An empty page in the middle of a long search is asked for again this many times.
const EMPTY_RETRIES = 3;
const DESCRIPTION_BATCH = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

// Countries: name and Glassdoor's location id of the whole country.
export const COUNTRIES = {
  US: ['United States', 1], GB: ['United Kingdom', 2], CA: ['Canada', 3], AU: ['Australia', 16],
  NZ: ['New Zealand', 186], IE: ['Ireland', 70], IN: ['India', 115], SG: ['Singapore', 217],
  MY: ['Malaysia', 170], PH: ['Philippines', 204], ID: ['Indonesia', 113], TH: ['Thailand', 229],
  VN: ['Vietnam', 251], HK: ['Hong Kong', 106], TW: ['Taiwan', 240], JP: ['Japan', 123],
  KR: ['South Korea', 135], CN: ['China', 48], PK: ['Pakistan', 192], DE: ['Germany', 96],
  AT: ['Austria', 18], CH: ['Switzerland', 226], FR: ['France', 86], BE: ['Belgium', 25],
  NL: ['Netherlands', 178], LU: ['Luxembourg', 148], ES: ['Spain', 219], PT: ['Portugal', 195],
  IT: ['Italy', 120], GR: ['Greece', 100], PL: ['Poland', 193], CZ: ['Czechia', 77],
  HU: ['Hungary', 111], RO: ['Romania', 203], UA: ['Ukraine', 244], SE: ['Sweden', 223],
  NO: ['Norway', 180], DK: ['Denmark', 63], FI: ['Finland', 79], TR: ['Türkiye', 238],
  IL: ['Israel', 119], AE: ['United Arab Emirates', 6], SA: ['Saudi Arabia', 207], QA: ['Qatar', 199],
  KW: ['Kuwait', 137], BH: ['Bahrain', 21], OM: ['Oman', 167], EG: ['Egypt', 69],
  MA: ['Morocco', 162], NG: ['Nigeria', 177], ZA: ['South Africa', 211], BR: ['Brazil', 36],
  MX: ['Mexico', 169], AR: ['Argentina', 15], CL: ['Chile', 49], CO: ['Colombia', 54],
  PE: ['Peru', 189], EC: ['Ecuador', 68], UY: ['Uruguay', 246], VE: ['Venezuela', 249],
  CR: ['Costa Rica', 57], PA: ['Panama', 194],
};
const COUNTRY_OF_ID = Object.fromEntries(Object.entries(COUNTRIES).map(([code, [, id]]) => [id, code]));
// Glassdoor's country sites; every other country is searched on glassdoor.com.
const DOMAINS = {
  com: 'US', 'co.uk': 'GB', ca: 'CA', 'com.au': 'AU', 'co.nz': 'NZ', ie: 'IE', 'co.in': 'IN', sg: 'SG',
  'com.hk': 'HK', jp: 'JP', de: 'DE', at: 'AT', ch: 'CH', fr: 'FR', be: 'BE', nl: 'NL', es: 'ES', it: 'IT',
  'com.br': 'BR', 'com.mx': 'MX', 'com.ar': 'AR',
};

// Search options: the Actor's option, Glassdoor's value and its name.
export const JOB_TYPES = {
  fulltime: ['fulltime', 'Full-time'], parttime: ['parttime', 'Part-time'], contract: ['contract', 'Contract'],
  temporary: ['temporary', 'Temporary'], internship: ['internship', 'Internship'],
};
export const LEVELS = {
  internship: ['internship', 'Internship'], entry: ['entrylevel', 'Entry level'], midsenior: ['midseniorlevel', 'Mid-senior level'],
  director: ['director', 'Director'], executive: ['executive', 'Executive'],
};
const LEVEL_NAMES = Object.fromEntries(Object.values(LEVELS));
const TYPE_NAMES = Object.fromEntries(Object.values(JOB_TYPES));
// Glassdoor's distances, in miles.
const DISTANCES = [0, 5, 10, 15, 25, 50, 100];
// Filters of Glassdoor search links that are passed on as they are.
const LINK_FILTERS = ['jobType', 'jobTypeIndeed', 'remoteWorkType', 'applicationType', 'minRating', 'radius', 'employerSizes', 'minSalary', 'maxSalary', 'sgocId', 'industryNId', 'cityId', 'companyId'];
const PLACE_TYPES = { C: 'CITY', S: 'STATE', N: 'COUNTRY', M: 'METRO' };
const PLACE_CODES = Object.fromEntries(Object.entries(PLACE_TYPES).map(([code, type]) => [type, code]));

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const valuesOf = (values, map) => [...new Set(toList(values).map((value) => map[value.toLowerCase()]?.[0]).filter(Boolean))];

// glassdoor.co.uk, www.glassdoor.de or nl.glassdoor.be.
export function countryOfHost(hostname) {
  const domain = /^(?:[a-z]{2,3}\.)?glassdoor\.([a-z.]+)$/.exec(String(hostname ?? '').toLowerCase())?.[1];
  return DOMAINS[domain] ?? null;
}

// The search form of the Actor, as a Glassdoor search link. The country goes into the link as
// Glassdoor's location of the whole country, and a place typed as text as `locKeyword`.
export function searchUrl({ country = 'US', query = '', location = '', distance, jobTypes, levels, remoteOnly = false, easyApply = false, minRating, postedWithinDays } = {}) {
  const code = COUNTRIES[String(country).toUpperCase()] ? String(country).toUpperCase() : 'US';
  const params = new URLSearchParams();
  const what = String(query ?? '').trim();
  const where = String(location ?? '').trim();
  if (what) params.set('sc.keyword', what);
  if (where) params.set('locKeyword', where);
  params.set('locT', 'N');
  params.set('locId', String(COUNTRIES[code][1]));
  if (where && distance !== undefined && distance !== null && distance !== '' && Number(distance) >= 0) {
    // Glassdoor offers a few distances; the next one up is used.
    params.set('radius', String(DISTANCES.find((miles) => miles >= Number(distance)) ?? 100));
  }
  if (Number(postedWithinDays) > 0) params.set('fromAge', String(Math.round(Number(postedWithinDays))));
  const types = valuesOf(jobTypes, JOB_TYPES);
  if (types.length > 0) params.set('jobType', types.join(','));
  const wanted = valuesOf(levels, LEVELS);
  if (wanted.length > 0) params.set('seniorityType', wanted.join(','));
  if (remoteOnly) params.set('remoteWorkType', '1');
  if (easyApply) params.set('applicationType', '1');
  if (Number(minRating) > 0) params.set('minRating', Number(minRating).toFixed(1));
  return `https://www.glassdoor.com/Job/jobs.htm?${params}`;
}

// Keywords become searches with the form's filters; Glassdoor links are used as they are.
export function prepareInput(raw) {
  const form = {
    country: raw.country,
    location: raw.location,
    distance: raw.distance,
    jobTypes: raw.jobTypes,
    levels: raw.experienceLevels,
    remoteOnly: raw.remoteOnly === true,
    easyApply: raw.easyApplyOnly === true,
    minRating: raw.minCompanyRating,
    postedWithinDays: raw.postedWithinDays,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A location on its own lists every job there.
  if (companies.length === 0 && String(form.location ?? '').trim()) companies.push(searchUrl(form));
  return { ...raw, companies };
}

export const exampleInput = { companies: [searchUrl({ query: 'python developer', location: 'New York, NY' })], maxItems: 50 };

const unslug = (text) => cleanText(decodeURIComponent(text ?? '').replace(/-/g, ' ')) ?? '';

// The place, keywords and filters of a search link: /Job/new-york-ny-nurse-jobs-SRCH_IL.0,11_IC1132348_KO12,17.htm,
// where IL and KO mark the place and the keywords in the words before "jobs", or the older
// /Job/jobs.htm?sc.keyword=nurse&locT=C&locId=1132348.
function readLink(url) {
  const params = url.searchParams;
  const seo = /^\/Job\/(.*?)-?jobs-SRCH_([^/]+?)\.htm$/i.exec(url.pathname);
  if (seo) {
    const [, slug, codes] = seo;
    const read = { what: '', where: '', label: '', place: null };
    for (const code of codes.split('_')) {
      const keywords = /^KO(\d+),(\d+)$/i.exec(code);
      const label = /^IL\.(\d+),(\d+)$/i.exec(code);
      const id = /^I([CSNM])(\d+)$/i.exec(code);
      if (keywords) read.what = unslug(slug.slice(Number(keywords[1]), Number(keywords[2])));
      else if (label) read.label = unslug(slug.slice(Number(label[1]), Number(label[2])));
      else if (id) read.place = { type: PLACE_TYPES[id[1].toUpperCase()], id: Number(id[2]) };
    }
    return read;
  }
  if (!/^\/Job\/jobs\.htm$/i.test(url.pathname)) return null;
  const type = PLACE_TYPES[String(params.get('locT') ?? '').toUpperCase()];
  const id = Number(params.get('locId'));
  const where = cleanText(params.get('locKeyword')) ?? '';
  return {
    what: cleanText(params.get('sc.keyword') ?? params.get('keyword') ?? params.get('typedKeyword')) ?? '',
    where,
    label: where,
    place: type && id > 0 ? { type, id } : null,
  };
}

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  const domainCountry = countryOfHost(url.hostname);
  const read = domainCountry ? readLink(url) : null;
  if (!read) throw new Error('this is not a Glassdoor search link. Search on glassdoor.com and copy the address, or enter keywords.');
  const params = url.searchParams;
  const wholeCountry = read.place?.type === 'COUNTRY';
  const country = (wholeCountry ? COUNTRY_OF_ID[read.place.id] : null) ?? domainCountry;
  // A place typed as text is looked up in the link's country; a city or state of the link is used
  // as it is, and without either the whole country is searched.
  const place = read.where && (!read.place || wholeCountry) ? null : read.place ?? { type: 'COUNTRY', id: COUNTRIES[country][1] };
  const filters = {};
  for (const key of LINK_FILTERS) {
    const filter = cleanText(params.get(key));
    if (filter) filters[key] = filter;
  }
  const days = Number(params.get('fromAge'));
  const levels = toList(String(params.get('seniorityType') ?? '').split(',')).filter((level) => LEVEL_NAMES[level]);
  const search = {
    kind: 'search',
    country,
    what: read.what,
    where: place ? '' : read.where,
    place,
    filters,
    levels,
    days: days > 0 ? Math.round(days) : 0,
  };
  // The key holds everything that changes the results, in a fixed order.
  const key = new URLSearchParams();
  if (search.what) key.set('sc.keyword', search.what.toLowerCase());
  if (search.where) key.set('locKeyword', search.where.toLowerCase());
  key.set('locT', place ? PLACE_CODES[place.type] : 'N');
  key.set('locId', String(place ? place.id : COUNTRIES[country][1]));
  if (search.days) key.set('fromAge', String(search.days));
  if (levels.length > 0) key.set('seniorityType', [...levels].sort().join(','));
  for (const filter of Object.keys(filters).sort()) key.set(filter, filters[filter].split(',').sort().join(','));
  const placeName = search.where ? `${search.where}, ${COUNTRIES[country][0]}` : (place.type !== 'COUNTRY' && read.label) || COUNTRIES[country][0];
  return {
    ...search,
    id: `${search.what || 'all jobs'} in ${placeName}`,
    key: `https://www.glassdoor.com/Job/jobs.htm?${key}`,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

const INTERVALS = { ANNUAL: 'year', MONTHLY: 'month', WEEKLY: 'week', DAILY: 'day', HOURLY: 'hour' };
const cents = (value) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : null);
// Company facts Glassdoor does not know read "Unknown" or "Unknown / Non-Applicable".
const known = (value) => {
  const text = cleanText(value);
  return text && !/^unknown\b/i.test(text) ? text : null;
};

// Glassdoor gives pay as the 10th, 50th and 90th percentile; for pay the employer states, these
// are its lowest, middle and highest amount.
export function salaryOf(header) {
  const pay = header?.payPeriodAdjustedPay;
  const interval = INTERVALS[header?.payPeriod];
  if (!pay || !interval) return null;
  const salary = makeSalary({
    min: cents(pay.p10),
    max: cents(pay.p90),
    currency: header.payCurrency,
    interval,
    source: header.salarySource === 'EMPLOYER_PROVIDED' ? 'listing' : 'estimate',
  });
  if (!salary) return null;
  return header.salarySource === 'EMPLOYER_PROVIDED' ? salary : { ...salary, median: cents(pay.p50) };
}

// Glassdoor's date is a day without a time zone, read as UTC; without it, the age in days counts.
function postedAtOf(job, header, now) {
  if (job.discoverDate) return /[zZ]|[+-]\d\d:?\d\d$/.test(job.discoverDate) ? job.discoverDate : `${job.discoverDate}Z`;
  if (!Number.isFinite(header.ageInDays)) return null;
  const today = new Date(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - header.ageInDays * DAY_MS).toISOString();
}

// The company page on Glassdoor: /Overview/Working-at-<name>-EI_IE<id>.<start>,<end>.htm, where the
// numbers mark the name in the words before them.
export function companyUrlOf(id, companyName, site = 'https://www.glassdoor.com') {
  if (!(Number(id) > 0)) return null;
  const slug = String(companyName ?? '').normalize('NFKD').replace(/\p{M}+/gu, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'Company';
  const start = 'Working-at-'.length;
  return `${site}/Overview/Working-at-${slug}-EI_IE${id}.${start},${start + slug.length}.htm`;
}

export function toJob(view, country = 'US', now = Date.now()) {
  const header = view?.header ?? {};
  const job = view?.job ?? {};
  const overview = view?.overview ?? {};
  const employer = header.employer ?? {};
  const jobId = String(job.listingId);
  const countryCode = COUNTRY_OF_ID[header.jobCountryId] ?? country;
  const jobUrl = header.seoJobLink ?? `https://www.glassdoor.com/job-listing/j?jl=${jobId}`;
  const site = /^https:\/\/[^/]+/.exec(jobUrl)?.[0] ?? 'https://www.glassdoor.com';
  const remoteTypes = (header.remoteWorkTypes ?? []).map((type) => String(type).toUpperCase());
  const workplace = remoteTypes.some((type) => type.includes('HYBRID')) ? 'hybrid' : remoteTypes.length > 0 ? 'remote' : null;
  const types = (header.jobTypeKeys ?? []).map((key) => TYPE_NAMES[String(key).split('.').pop()] ?? null).filter(Boolean);
  const salary = salaryOf(header);
  const companyName = cleanText(header.employerNameFromSearch) ?? cleanText(employer.shortName) ?? cleanText(overview.shortName);
  const location = cleanText(header.locationName);
  const parts = (location ?? '').split(',').map((part) => part.trim()).filter(Boolean);
  // A city reads "Brooklyn, NY" or "Berlin"; a job of a whole state or region names only that.
  const isCity = header.locationType === 'C' && parts.length > 0 && !/^remote$/i.test(parts[0]);
  const isState = header.locationType === 'S' && parts.length > 0 && !/^remote$/i.test(parts[0]);
  const website = cleanText(overview.website);
  return {
    ...makeJob({
      ats: name,
      company: Number(employer.id) > 0 ? String(employer.id) : null,
      companyName,
      jobId,
      title: header.jobTitleText ?? job.jobTitleText,
      location,
      remote: workplace === 'remote',
      workplaceType: workplace,
      employmentType: types[0] ?? null,
      salary: salary?.source === 'listing' ? salary : null,
      postedAt: postedAtOf(job, header, now),
      jobUrl,
      descriptionText: null,
      descriptionHtml: null,
    }),
    jobTypes: types,
    seniorityLevel: null,
    easyApply: header.easyApply === true,
    sponsored: header.sponsored === true,
    salaryEstimate: salary?.source === 'estimate' ? salary : null,
    // Glassdoor files titles it cannot place as "non title".
    normalizedTitle: /^non title$/i.test(header.normalizedJobTitle ?? header.goc ?? '') ? null : cleanText(header.normalizedJobTitle ?? header.goc),
    city: isCity ? parts[0] : null,
    state: (isCity && parts.length > 1 ? parts[parts.length - 1] : null) ?? (isState ? parts[0] : null),
    country: countryCode,
    companyRating: Number(header.rating) > 0 ? header.rating : null,
    companyUrl: companyUrlOf(employer.id, employer.shortName ?? companyName, site),
    companyWebsite: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
    companyLogo: overview.squareLogoUrl ?? null,
    companySize: known(overview.size),
    companyRevenue: known(overview.revenue),
    companyType: known(overview.type),
    companyIndustry: known(overview.primaryIndustry?.industryName),
    companyFounded: Number(overview.yearFounded) > 0 ? overview.yearFounded : null,
    companyHeadquarters: known(overview.headquarters),
  };
}

// --- Searching ----------------------------------------------------------------------------------

export const SEARCH_QUERY = `query JobSearchResultsQuery($excludeJobListingIds: [Long!], $keyword: String, $locationId: Int, $locationType: LocationTypeEnum, $numJobsToShow: Int!, $pageNumber: Int, $filterParams: [FilterParams]) {
  jobListings(contextHolder: { searchParams: { excludeJobListingIds: $excludeJobListingIds, keyword: $keyword, locationId: $locationId, locationType: $locationType, numPerPage: $numJobsToShow, pageNumber: $pageNumber, filterParams: $filterParams, searchType: SR } }) {
    totalJobsCount
    jobListings {
      jobview {
        header { ageInDays easyApply sponsored employer { id shortName } employerNameFromSearch jobCountryId jobTitleText locationName locationType jobTypeKeys remoteWorkTypes seoJobLink normalizedJobTitle goc rating payCurrency payPeriod payPeriodAdjustedPay { p10 p50 p90 } salarySource }
        job { listingId jobTitleText discoverDate }
        overview { shortName squareLogoUrl size revenue type website yearFounded headquarters primaryIndustry { industryName } }
      }
    }
  }
}`;

// Filters of one search: the link's own filters, the posting date and one experience level.
export function filtersOf(search, level = null) {
  const filters = Object.entries(search.filters ?? {}).map(([filterKey, values]) => ({ filterKey, values: String(values) }));
  // "Posted in the last N days" counts whole days, so Glassdoor is asked for one day more.
  if (search.days > 0) filters.push({ filterKey: 'fromAge', values: String(search.days + 1) });
  if (level) filters.push({ filterKey: 'seniorityType', values: level });
  return filters;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const placeCache = new WeakMap();

// A place typed as text: the first of Glassdoor's suggestions in the search's country.
export async function findPlace(search, { http }) {
  const cache = placeCache.get(http) ?? new Map();
  placeCache.set(http, cache);
  const cacheKey = `${search.country}|${search.where.toLowerCase()}`;
  if (!cache.has(cacheKey)) {
    const url = `${SUGGEST}?locationTypeFilters=CITY,STATE,COUNTRY&caller=jobs&term=${encodeURIComponent(search.where)}`;
    cache.set(cacheKey, http.getJson(url, { headers: APP_HEADERS, retries: 4 }).then((items) => {
      const found = (Array.isArray(items) ? items : []).find((item) => item?.country2LetterIso === search.country && PLACE_TYPES[item.locationType] && item.locationId > 0);
      return found ? { type: PLACE_TYPES[found.locationType], id: found.locationId, name: found.label ?? found.locationName } : null;
    }, (error) => {
      cache.delete(cacheKey);
      throw error;
    }));
  }
  const place = await cache.get(cacheKey);
  if (!place) throw new Error(`Glassdoor does not know "${search.where}" in ${COUNTRIES[search.country][0]}. Enter a city, state or region, or leave the location empty.`);
  return place;
}

async function* readSearch(search, context, place, level) {
  const { http, log, now } = context;
  const seen = new Set();
  let total = null;
  let misses = 0;
  const filterParams = filtersOf(search, level);
  while (seen.size < MAX_PER_SEARCH) {
    const variables = { locationId: place.id, locationType: place.type, numJobsToShow: PAGE_SIZE, pageNumber: 1, filterParams, excludeJobListingIds: [...seen].map(Number) };
    if (search.what) variables.keyword = search.what;
    const data = await http.postJson(API, [{ operationName: 'JobSearchResultsQuery', variables, query: SEARCH_QUERY }], { headers: APP_HEADERS, retries: 4 });
    const result = Array.isArray(data) ? data[0] : data;
    const listings = result?.data?.jobListings;
    if (!listings && total === null) throw new Error(`Glassdoor did not run the search: ${result?.errors?.[0]?.message ?? 'no answer'}`);
    // Glassdoor counts the jobs not yet excluded: the whole search on the first page.
    const remaining = listings?.totalJobsCount ?? 0;
    total ??= remaining;
    const views = (listings?.jobListings ?? []).map((item) => item?.jobview).filter((view) => view?.job?.listingId && !seen.has(String(view.job.listingId)));
    if (views.length === 0) {
      // Near the end Glassdoor keeps the last few jobs back. Far from it, an empty page that counts
      // no jobs left is a hiccup of very long searches and is asked for again.
      const hiccup = remaining === 0 && seen.size < total * 0.9;
      if (!hiccup || ++misses > EMPTY_RETRIES) break;
      await sleep((context.retryDelayMs ?? 1000) * misses);
      continue;
    }
    misses = 0;
    for (const view of views) seen.add(String(view.job.listingId));
    yield views.map((view) => ({ ...toJob(view, search.country, now), seniorityLevel: level ? LEVEL_NAMES[level] : null }));
    if (remaining <= views.length) break;
  }
  if (seen.size >= MAX_PER_SEARCH) {
    log.info(`${search.id}: stopped at ${MAX_PER_SEARCH} jobs, the most this Actor reads from one Glassdoor search. Split it by location or filters for more.`);
  } else if (misses > EMPTY_RETRIES) {
    log.info(`${search.id}: Glassdoor stopped listing after ${seen.size} of about ${total} jobs.`);
  }
}

export async function* listJobs(search, context) {
  const inner = { ...context, now: context.now ?? Date.now() };
  const place = search.place ?? (await findPlace(search, inner));
  // Without keywords Glassdoor answers a search of a whole country with jobs from anywhere.
  if (place.type === 'COUNTRY' && !search.what) throw new Error('Glassdoor needs keywords to search a whole country. Enter keywords, or a city or region as the location.');
  // Each experience level is a search of its own, so every job carries its level.
  for (const level of search.levels.length > 0 ? search.levels : [null]) yield* readSearch(search, inner, place, level);
}

// --- Descriptions ---------------------------------------------------------------------------------

// Loads the descriptions of the jobs asked for in the same moment with one request per
// DESCRIPTION_BATCH jobs: the job view of each under its own alias.
function descriptionLoader(http, log) {
  const waiting = [];
  let scheduled = false;
  let warned = false;
  async function send(batch) {
    const declared = batch.map((_, index) => `$j${index}: Long!`).join(', ');
    const fields = batch.map((_, index) => `j${index}: jobView(listingId: $j${index}, contextHolder: { queryString: "q", pageTypeEnum: SERP }) { job { description } }`).join('\n  ');
    const variables = Object.fromEntries(batch.map(({ id }, index) => [`j${index}`, Number(id)]));
    try {
      const data = await http.postJson(API, [{ operationName: 'JobDescriptions', variables, query: `query JobDescriptions(${declared}) {\n  ${fields}\n}` }], { headers: APP_HEADERS, retries: 3 });
      const result = Array.isArray(data) ? data[0] : data;
      batch.forEach(({ resolve }, index) => resolve(result?.data?.[`j${index}`]?.job?.description ?? null));
    } catch (error) {
      // The jobs are saved without descriptions rather than lost.
      if (!warned) log?.warning?.(`Glassdoor did not send some job descriptions: ${error.message}`);
      warned = true;
      batch.forEach(({ resolve }) => resolve(null));
    }
  }
  function flush() {
    scheduled = false;
    while (waiting.length > 0) send(waiting.splice(0, DESCRIPTION_BATCH));
  }
  return (id) => new Promise((resolve) => {
    waiting.push({ id, resolve });
    if (waiting.length >= DESCRIPTION_BATCH) send(waiting.splice(0, DESCRIPTION_BATCH));
    else if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 0);
    }
  });
}

const loaders = new WeakMap();

export async function completeJob(job, search, context) {
  if (context.includeDescription === false) return job;
  if (!loaders.has(context.http)) loaders.set(context.http, descriptionLoader(context.http, context.log));
  const html = await loaders.get(context.http)(job.jobId);
  return html ? { ...job, descriptionText: htmlToText(html), descriptionHtml: html } : job;
}

// The same job found by two searches is saved once.
export const dedupeKey = (job) => job.jobId;
