// SEEK and the sites on its platform: SEEK (Australia, New Zealand), Jobstreet (Malaysia,
// Singapore, the Philippines, Indonesia) and JobsDB (Hong Kong, Thailand). The job search API behind
// the websites lists at most 550 jobs per search (10 pages of 55), so bigger searches are split by
// classification, work type and salary band. Job details come from the GraphQL API: the full
// description, expiry date and company profile. Phone numbers and contacts of recruiters are never
// requested.

import { makeJob } from '../core/job.js';
import { makeSalary, salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'seek';
export const title = 'SEEK';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const detailConcurrency = 8;
export const proxyFallback = true;

const PAGE_SIZE = 55;
const MAX_PAGES = 10;

// Asian sites show pay per month unless the label says otherwise. "$" is the local dollar where
// there is one, and US dollars elsewhere.
export const SITES = {
  AU: { brand: 'seek', host: 'www.seek.com.au', siteKey: 'AU-Main', locale: 'en-AU', zone: 'anz-1', currency: 'AUD', dollar: 'AUD', country: 'Australia', everywhere: 'All Australia' },
  NZ: { brand: 'seek', host: 'www.seek.co.nz', siteKey: 'NZ-Main', locale: 'en-NZ', zone: 'anz-2', currency: 'NZD', dollar: 'NZD', country: 'New Zealand', everywhere: 'All New Zealand' },
  MY: { brand: 'jobstreet', host: 'my.jobstreet.com', oldHost: 'jobstreet.com.my', siteKey: 'MY-Main', locale: 'en-MY', zone: 'asia-3', currency: 'MYR', country: 'Malaysia', monthly: true },
  SG: { brand: 'jobstreet', host: 'sg.jobstreet.com', oldHost: 'jobstreet.com.sg', siteKey: 'SG-Main', locale: 'en-SG', zone: 'asia-5', currency: 'SGD', dollar: 'SGD', country: 'Singapore', monthly: true },
  PH: { brand: 'jobstreet', host: 'ph.jobstreet.com', oldHost: 'jobstreet.com.ph', siteKey: 'PH-Main', locale: 'en-PH', zone: 'asia-4', currency: 'PHP', country: 'the Philippines', monthly: true },
  ID: { brand: 'jobstreet', host: 'id.jobstreet.com', oldHost: 'jobstreet.co.id', siteKey: 'ID-Main', locale: 'en-ID', zone: 'asia-2', currency: 'IDR', country: 'Indonesia', monthly: true },
  HK: { brand: 'jobsdb', host: 'hk.jobsdb.com', siteKey: 'HK-Main', locale: 'en-HK', zone: 'asia-1', currency: 'HKD', dollar: 'HKD', country: 'Hong Kong', monthly: true },
  TH: { brand: 'jobsdb', host: 'th.jobsdb.com', siteKey: 'TH-Main', locale: 'en-TH', zone: 'asia-6', currency: 'THB', country: 'Thailand', monthly: true },
};
export const BRANDS = {
  seek: { title: 'SEEK', sites: ['AU', 'NZ'], example: 'python developer' },
  jobstreet: { title: 'Jobstreet', sites: ['MY', 'SG', 'PH', 'ID'], example: 'software engineer' },
  jobsdb: { title: 'JobsDB', sites: ['HK', 'TH'], example: 'software engineer' },
};

export const CLASSIFICATIONS = {
  1200: 'Accounting',
  6251: 'Administration & Office Support',
  6304: 'Advertising, Arts & Media',
  1203: 'Banking & Financial Services',
  1204: 'Call Centre & Customer Service',
  7019: 'CEO & General Management',
  6163: 'Community Services & Development',
  1206: 'Construction',
  6076: 'Consulting & Strategy',
  6263: 'Design & Architecture',
  6123: 'Education & Training',
  1209: 'Engineering',
  6205: 'Farming, Animals & Conservation',
  1210: 'Government & Defence',
  1211: 'Healthcare & Medical',
  1212: 'Hospitality & Tourism',
  6317: 'Human Resources & Recruitment',
  6281: 'Information & Communication Technology',
  1214: 'Insurance & Superannuation',
  1216: 'Legal',
  6092: 'Manufacturing, Transport & Logistics',
  6008: 'Marketing & Communications',
  6058: 'Mining, Resources & Energy',
  1220: 'Real Estate & Property',
  6043: 'Retail & Consumer Products',
  6362: 'Sales',
  1223: 'Science & Technology',
  6261: 'Self Employment',
  6246: 'Sport & Recreation',
  1225: 'Trades & Services',
};
export const WORK_TYPES = { 242: 'Full time', 243: 'Part time', 244: 'Contract/Temp', 245: 'Casual/Vacation' };
export const WORK_ARRANGEMENTS = { 1: 'On-site', 2: 'Hybrid', 3: 'Remote' };
export const SALARY_TYPES = ['annual', 'monthly', 'hourly'];
// Salary bands for the last split of a big search. Bands may overlap a job's range; duplicates are dropped.
const SALARY_BANDS = {
  annual: [0, 50000, 70000, 90000, 110000, 130000, 160000, 200000],
  monthly: [0, 4000, 6000, 8000, 10000, 13000, 17000],
  hourly: [0, 30, 40, 50, 60, 80, 100, 130],
};
const SEARCH_PARAMS = ['keywords', 'where', 'classification', 'subclassification', 'worktype', 'workarrangement', 'daterange', 'salaryrange', 'salarytype', 'sortmode'];

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const slug = (text) => text.toLowerCase().replace(/&/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CLASSIFICATION_SLUGS = Object.fromEntries(Object.entries(CLASSIFICATIONS).map(([id, label]) => [slug(label), id]));
const siteOf = (code, fallback = 'AU') => (SITES[String(code ?? '').toUpperCase()] ? String(code).toUpperCase() : fallback);
const bareHost = (host) => String(host).toLowerCase().replace(/^www\./, '');
// The site of a link, also on the old Jobstreet domains such as jobstreet.com.my.
export const siteOfHost = (host) => Object.keys(SITES).find((code) => [SITES[code].host, SITES[code].oldHost].filter(Boolean).map(bareHost).includes(bareHost(host))) ?? null;

// A search as a key: the site plus SEEK's own search parameters, sorted.
function keyOf(siteCode, params) {
  const search = new URLSearchParams();
  for (const param of SEARCH_PARAMS) {
    const value = params[param];
    if (value != null && String(value).trim() !== '') search.set(param, String(value).trim());
  }
  search.sort();
  return `seek://${siteCode.toLowerCase()}?${search}`;
}

// The search form of the Actor, as a search key.
export function searchKey({ site, query = '', location, classifications, workTypes, workArrangements, postedWithinDays, minSalary, salaryType, sortBy } = {}) {
  const pay = SALARY_TYPES.includes(salaryType) ? salaryType : 'annual';
  return keyOf(siteOf(site), {
    keywords: query,
    where: location,
    classification: toList(classifications).filter((id) => CLASSIFICATIONS[id]).join(','),
    worktype: toList(workTypes).filter((id) => WORK_TYPES[id]).join(','),
    workarrangement: toList(workArrangements).filter((id) => WORK_ARRANGEMENTS[id]).join(','),
    // "1 day" means today and yesterday here, so SEEK is asked for one day more and the rest is filtered.
    daterange: Number(postedWithinDays) > 0 ? String(Number(postedWithinDays) + 1) : '',
    salaryrange: Number(minSalary) > 0 ? `${Number(minSalary)}-` : '',
    salarytype: Number(minSalary) > 0 ? pay : '',
    sortmode: sortBy === 'KeywordRelevance' ? 'KeywordRelevance' : 'ListedDate',
  });
}

// A search link from one of the sites, such as seek.com.au/python-developer-jobs/in-All-Sydney-NSW?worktype=242.
export function fromSeekUrl(value) {
  const url = new URL(value);
  const siteCode = siteOfHost(url.hostname);
  if (!siteCode) throw new Error(`${url.hostname} is not a SEEK, Jobstreet or JobsDB site.`);
  const params = Object.fromEntries(SEARCH_PARAMS.map((param) => [param, url.searchParams.get(param) ?? '']));
  const segments = url.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
  for (const segment of segments) {
    if (/^in-/i.test(segment)) {
      params.where ||= segment.slice(3).replace(/-/g, ' ');
      continue;
    }
    const match = /^(?:(.*?)-)?jobs(?:-in-(.+))?$/i.exec(segment);
    if (!match) continue;
    params.keywords ||= (match[1] ?? '').replace(/-/g, ' ');
    if (match[2] && CLASSIFICATION_SLUGS[match[2].toLowerCase()]) params.classification ||= CLASSIFICATION_SLUGS[match[2].toLowerCase()];
  }
  params.sortmode ||= 'KeywordRelevance';
  return keyOf(siteCode, params);
}

// Keywords become searches with the form's filters; links from the sites are used as they are.
export function prepareInput(raw, defaultSite = 'AU') {
  const form = {
    site: siteOf(raw.country, defaultSite),
    location: String(raw.location ?? '').trim(),
    classifications: raw.classifications,
    workTypes: raw.workTypes,
    workArrangements: raw.workArrangements,
    postedWithinDays: raw.postedWithinDays,
    minSalary: raw.minSalary,
    salaryType: raw.salaryType,
    sortBy: raw.sortBy,
  };
  const searches = toList(raw.searchQueries ?? raw.companies).map((query) => {
    if (/^seek:\/\//i.test(query)) return query;
    if (/^https?:\/\//i.test(query)) {
      try {
        return fromSeekUrl(query);
      } catch {
        return query;
      }
    }
    return searchKey({ ...form, query });
  });
  // A location or classification on its own lists every job there.
  if (searches.length === 0 && (form.location || toList(form.classifications).length > 0)) searches.push(searchKey(form));
  return { ...raw, companies: searches };
}

export const exampleInput = { companies: [searchKey({ query: 'python developer' })], maxItems: 50 };

export function parseCompany(value, brand = 'seek') {
  const raw = String(value ?? '').trim();
  const { title: brandTitle, sites } = BRANDS[brand];
  let key = raw;
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (!siteOfHost(url.hostname)) {
      const hosts = sites.map((code) => SITES[code].host.replace(/^www\./, '')).join(', ');
      throw new Error(`this is not a ${brandTitle} search link. Search on ${hosts} and copy the address, or enter keywords.`);
    }
    key = fromSeekUrl(raw);
  } else if (!/^seek:\/\//i.test(raw)) {
    key = searchKey({ site: sites[0], query: raw });
  }
  const url = new URL(key.replace(/^seek:\/\//i, 'https://seek/'));
  const siteCode = siteOf(url.pathname.slice(1), sites[0]);
  const params = Object.fromEntries(SEARCH_PARAMS.map((param) => [param, url.searchParams.get(param) ?? '']));
  const site = SITES[siteCode];
  const id = `${params.keywords || 'all jobs'} in ${params.where || site.everywhere || site.country}`;
  return { kind: 'search', id, key, site: siteCode, params };
}

export function searchUrl(siteCode, params, page = 1) {
  const site = SITES[siteCode] ?? SITES.AU;
  const search = new URLSearchParams({ siteKey: site.siteKey, locale: site.locale, pageSize: String(PAGE_SIZE), page: String(page) });
  for (const param of SEARCH_PARAMS) {
    if (params[param]) search.set(param, params[param]);
  }
  if (!params.where && site.everywhere) search.set('where', site.everywhere);
  return `https://${site.host}/api/jobsearch/v5/search?${search}`;
}

// --- Jobs ------------------------------------------------------------------------------------

const EMPLOYMENT = { 'Full time': 'full-time', 'Part time': 'part-time', 'Contract/Temp': 'contract', 'Casual/Vacation': 'casual' };

// Words a pay label may have around bare numbers such as "85 - 105" or "100k - 120k + super".
const PAY_WORDS = /\b(?:per|an?|hours?|hr|days?|weeks?|months?|years?|annum|p\.?[ahd]\.?|ph|pa|plus|super|superannuation|package|packaging|base|salary|doe|negotiable|inc|incl|including|aud|nzd|myr|sgd|php|idr|hkd|thb|circa|up|to|from|bonus)\b/gi;
const CURRENCY = /[$€£₱฿]|RM\s?\d|Rp\.?\s?\d|Php\s?\d|\b(?:AUD|NZD|USD|MYR|SGD|PHP|IDR|HKD|THB)\b/i;
const PERIOD = /hour|\bhr\b|p\.?h\b|\dph\b|\bday|daily|p\.?d\b|week|fortnight|month|p\.?m\b|annum|annual|year|p\.?a\b/i;

// The salary is free text. Numbers without a currency count only in a plain pay label, so "Hay
// Grade 17" is no salary. On SEEK "85 - 105" for a full-time job means 85K to 105K a year, not
// per hour; on the Asian sites pay without a period is per month.
export function salaryOf(label, workType, siteCode = 'AU') {
  const site = SITES[siteCode] ?? SITES.AU;
  const text = String(label ?? '');
  if (!CURRENCY.test(text) && /[a-z]/i.test(text.replace(/(\d)\s*k\b/gi, '$1').replace(PAY_WORDS, ''))) return null;
  const salary = salaryFromText(text, { known: true, source: 'listing', defaultCurrency: site.currency, dollar: site.dollar ?? 'USD' });
  if (!salary) return null;
  const again = (changes) => makeSalary({ ...salary, ...changes, source: 'listing' });
  if (site.monthly) return salary.interval && PERIOD.test(text) ? salary : again({ interval: 'month' });
  const hourly = /hour|\bhr|p\.?h\b|\dph\b/i.test(text);
  if (workType !== 'Full time' || salary.interval !== 'hour' || hourly || (salary.max ?? salary.min) >= 1000) return salary;
  const thousand = (value) => (value == null ? null : value * 1000);
  return again({ min: thousand(salary.min), max: thousand(salary.max), interval: 'year' });
}
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toJob(raw, details = null, siteCode = 'AU') {
  const site = SITES[siteCode] ?? SITES.AU;
  const job = details?.job ?? {};
  const classification = raw.classifications?.[0];
  const arrangement = raw.workArrangements?.data?.[0]?.label?.text ?? null;
  const workType = raw.workTypes?.[0] ?? job.workTypes?.label ?? null;
  const bullets = (job.products?.bullets ?? raw.bulletPoints ?? []).map(cleanText).filter(Boolean);
  // Without job details the teaser and the bullet points are the description.
  const summaryHtml = [raw.teaser && `<p>${escapeHtml(raw.teaser)}</p>`, bullets.length > 0 && `<ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('')}</ul>`]
    .filter(Boolean).join('');
  const descriptionHtml = job.content ?? (summaryHtml || null);
  const jobUrl = `https://${site.host}/job/${raw.id}`;
  const place = details?.gfjInfo?.location ?? null;
  const profile = details?.companyProfile ?? null;
  const rating = profile?.reviewsSummary?.overallRating;
  return {
    ...makeJob({
      ats: site.brand,
      company: raw.advertiser?.id ?? null,
      companyName: raw.companyName ?? raw.advertiser?.description ?? job.advertiser?.name,
      jobId: raw.id,
      title: raw.title ?? job.title,
      department: classification?.classification?.description ?? job.tracking?.classificationInfo?.classification,
      location: raw.locations?.[0]?.label ?? job.location?.label,
      locations: (raw.locations ?? []).map((location) => location?.label),
      remote: arrangement === 'Remote',
      workplaceType: arrangement,
      employmentType: EMPLOYMENT[workType] ?? workType,
      salary: salaryOf(job.salary?.label || raw.salaryLabel, workType, siteCode),
      postedAt: job.listedAt?.dateTimeUtc ?? raw.listingDate,
      jobUrl,
      applyUrl: `${jobUrl}/apply`,
      descriptionText: descriptionHtml ? htmlToText(descriptionHtml) : null,
      descriptionHtml,
    }),
    subClassification: classification?.subclassification?.description ?? job.tracking?.classificationInfo?.subClassification ?? null,
    bulletPoints: bullets.length > 0 ? bullets : null,
    suburb: place?.suburb ?? null,
    state: place?.state ?? null,
    postcode: place?.postcode ?? null,
    country: place?.country ?? null,
    validThrough: job.expiresAt?.dateTimeUtc ?? null,
    companyIndustry: profile?.overview?.industry ?? null,
    companySize: profile?.overview?.size?.description ?? null,
    companyWebsite: profile?.overview?.website?.url ?? null,
    companyRating: rating?.value ?? null,
    companyReviewCount: rating?.numberOfReviews?.value ?? null,
    companyLogoUrl: raw.branding?.serpLogoUrl ?? null,
  };
}

// Only these fields are requested: recruiter phone numbers and contacts are left out on purpose.
const JOB_DETAILS_QUERY = `query jobDetails($jobId: ID!, $zone: Zone!, $locale: Locale!) {
  jobDetails(id: $jobId) {
    job {
      id title isExpired
      content(platform: WEB)
      listedAt { dateTimeUtc }
      expiresAt { dateTimeUtc }
      salary { label }
      workTypes { label(locale: $locale) }
      location { label(locale: $locale, type: LONG) }
      advertiser { id name(locale: $locale) }
      products { bullets }
      tracking { classificationInfo { classification subClassification } }
    }
    companyProfile(zone: $zone) { overview { industry size { description } website { url } } reviewsSummary { overallRating { value numberOfReviews { value } } } }
    gfjInfo { location { countryCode country suburb region state postcode } }
  }
}`;

function toPartialJob(raw, siteCode) {
  return { ...toJob(raw, null, siteCode), partial: true, raw };
}

export async function completeJob(partial, source, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.raw, null, source.site);
  const site = SITES[source.site] ?? SITES.AU;
  const result = await http.postJson(`https://${site.host}/graphql`, {
    operationName: 'jobDetails',
    query: JOB_DETAILS_QUERY,
    variables: { jobId: String(partial.raw.id), zone: site.zone, locale: site.locale },
  });
  if (!result?.data && result?.errors?.length) throw new Error(`Job details failed: ${result.errors[0]?.message}`);
  const details = result?.data?.jobDetails;
  // The job was taken down after the search listed it.
  if (!details?.job || details.job.isExpired) return null;
  return toJob(partial.raw, details, source.site);
}

// --- Searching ----------------------------------------------------------------------------------

const bandLabel = (low, high) => (high ? `${low.toLocaleString('en-US')}-${high.toLocaleString('en-US')}` : `${low.toLocaleString('en-US')}+`);

// Classifications and work types divide a search cleanly; salary bands overlap but reach every job.
export function chooseSplit(params) {
  const split = (dimension, key, values) => [dimension, values.map(([value, label]) => [label, { ...params, [key]: value }])];
  const classifications = params.classification ? params.classification.split(',') : Object.keys(CLASSIFICATIONS);
  if (classifications.length > 1) return split('classification', 'classification', classifications.map((id) => [id, CLASSIFICATIONS[id] ?? id]));
  const workTypes = params.worktype ? params.worktype.split(',') : Object.keys(WORK_TYPES);
  if (workTypes.length > 1) return split('work type', 'worktype', workTypes.map((id) => [id, WORK_TYPES[id] ?? id]));
  if (/^\d*-\d*$/.test(params.salaryrange ?? '') && params.salaryrange.split('-')[1]) return null;
  const type = SALARY_TYPES.includes(params.salarytype) ? params.salarytype : 'annual';
  const floor = Number((params.salaryrange ?? '').split('-')[0]) || 0;
  const edges = SALARY_BANDS[type].filter((edge) => edge > floor);
  const bands = [floor, ...edges].map((low, index, all) => [low, all[index + 1] ?? null]);
  if (bands.length < 2) return null;
  return ['salary band', bands.map(([low, high]) => [bandLabel(low, high), { ...params, salaryrange: `${low}-${high ?? ''}`, salarytype: type }])];
}

async function* searchPages(source, params, context, seen, label = source.id) {
  const { http, log } = context;
  const brandTitle = BRANDS[SITES[source.site]?.brand ?? 'seek'].title;
  const first = await http.getJson(searchUrl(source.site, params), { retries: 4 });
  const total = Number(first?.totalCount) || 0;
  if (label === source.id && params.where) {
    const place = first?.location?.description;
    if (!place) log.warning(`${label}: ${brandTitle} did not recognize the location "${params.where}". Try a suburb, city, region or state as the site shows it.`);
    // "WA" alone is Wagga Wagga, so say which place SEEK picked.
    else if (place.toLowerCase() !== params.where.toLowerCase()) log.info(`${label}: ${brandTitle} searches in "${place}".`);
  }
  const limit = PAGE_SIZE * MAX_PAGES;
  const split = total > limit ? chooseSplit(params) : null;
  if (split) {
    const [dimension, parts] = split;
    log.info(`${label}: ${total} jobs; ${brandTitle} lists at most ${limit} per search, so searching each ${dimension} separately.`);
    for (const [value, next] of parts) yield* searchPages(source, next, context, seen, `${label}, ${value}`);
    return;
  }
  if (total > limit) {
    log.warning(`${label}: ${brandTitle} lists at most ${limit} jobs per search; ${total} match. Add filters or more precise keywords to get the rest.`);
  }
  const fresh = (list) => (list ?? []).filter((raw) => raw?.id && !seen.has(raw.id) && seen.add(raw.id)).map((raw) => toPartialJob(raw, source.site));
  yield fresh(first?.data);
  const pages = Math.min(MAX_PAGES, Math.ceil(total / PAGE_SIZE));
  for (let page = 2; page <= pages; page++) {
    const result = await http.getJson(searchUrl(source.site, params, page), { retries: 4 });
    if (!result?.data?.length) break;
    yield fresh(result.data);
  }
}

export async function* listJobs(source, context) {
  yield* searchPages(source, source.params, context, new Set());
}

// Jobstreet and JobsDB run the same code with their own sites, name and example search.
export function brandAdapter(brand) {
  const { title: brandTitle, sites, example } = BRANDS[brand];
  return {
    name: brand,
    title: brandTitle,
    sourceNames,
    companyConcurrency,
    detailConcurrency,
    proxyFallback,
    exampleInput: { companies: [searchKey({ site: sites[0], query: example })], maxItems: 50 },
    prepareInput: (raw) => prepareInput(raw, sites[0]),
    parseCompany: (value) => parseCompany(value, brand),
    completeJob,
    listJobs,
  };
}
