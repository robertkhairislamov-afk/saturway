// Xing: the GraphQL API behind Xing's own job search (www.xing.com/graphql/api), which answers
// visitors without an account. Searches by keywords and a city in Germany, Austria and
// Switzerland with Xing's filters; one request returns 20 jobs with the full description, so no
// job pages are opened. Xing shows at most 1,000 jobs per search. Recruiters and their contact
// details are never read.

import { makeJob } from '../core/job.js';
import { makeSalary } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'xing';
export const title = 'Xing';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 3;
export const proxyFallback = true;

const SITE = 'https://www.xing.com';
const API = `${SITE}/graphql/api`;
const CONSUMER = 'loggedout.web.jobs.conv_search_results.center';
// English names for job types, levels and fields, as on Xing's English site.
const HEADERS = { 'accept-language': 'en', cookie: 'language=en', origin: SITE, referer: `${SITE}/jobs/search/ki` };
const PAGE_SIZE = 20;
export const MAX_PER_SEARCH = 1000;

// Search options: the Actor's option, Xing's id and its name. Xing's ids end in a code it checks
// ("FULL_TIME.ef2fe9"); if Xing changes the codes, they are read again from its search.
export const JOB_TYPES = {
  fulltime: ['FULL_TIME', 'Full-time'], parttime: ['PART_TIME', 'Part-time'], contract: ['CONTRACTOR', 'Self-employed'],
  internship: ['INTERN', 'Student'], temporary: ['TEMPORARY', 'Temp'], seasonal: ['SEASONAL', 'Seasonal'], volunteer: ['VOLUNTARY', 'Volunteer'],
};
export const LEVELS = {
  student: ['1', 'Student/Intern'], entry: ['2', 'Entry Level'], experienced: ['3', 'Professional/Experienced'],
  manager: ['4', 'Manager/Supervisor'], executive: ['5', 'Executive (VP, SVP, etc.)'], senior_executive: ['6', 'Senior Executive (CEO, CFO, President)'],
};
export const WORKPLACES = { remote: ['FULL_REMOTE', 'Full Remote'], hybrid: ['PARTLY_REMOTE', 'Hybrid'], onsite: ['NON_REMOTE', 'On-site'] };
const CODES = {
  FULL_TIME: 'ef2fe9', PART_TIME: '58889d', CONTRACTOR: '0ed397', INTERN: 'dc571c', TEMPORARY: '8ff6ad', SEASONAL: 'e4ab1d', VOLUNTARY: 'c61099',
  1: '795d28', 2: '24d1f6', 3: '2ebf16', 4: '83b992', 5: '6b837d', 6: '37d32d',
  FULL_REMOTE: '050e26', PARTLY_REMOTE: 'ca71ca', NON_REMOTE: '3ca273',
};
const PERIODS = [[1, 'LAST_24_HOURS', '24 hours'], [7, 'LAST_WEEK', 'week'], [31, 'LAST_MONTH', 'month']];
const EMPLOYMENT = { FULL_TIME: 'full-time', PART_TIME: 'part-time', CONTRACTOR: 'contract', INTERN: 'internship', TEMPORARY: 'temporary', SEASONAL: 'seasonal', VOLUNTARY: 'volunteer' };
const WORKPLACE = { FULL_REMOTE: 'remote', PARTLY_REMOTE: 'hybrid', NON_REMOTE: 'onsite' };
// Link filters and the search filter each one sets.
const LINK_FILTERS = { employmentType: 'employmentType', careerLevel: 'careerLevel', remote: 'remoteOption', remoteOption: 'remoteOption' };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const plainId = (id) => String(id).split('.')[0];
const valuesOf = (values, map) => [...new Set(toList(values).map((value) => map[value.toLowerCase()]?.[0]).filter(Boolean))];

// The period Xing offers that covers the days asked for; shorter ranges are cut by the date filter.
export const periodOf = (days) => PERIODS.find(([max]) => Number(days) > 0 && Number(days) <= max)?.[1] ?? null;

// The search form of the Actor, as a Xing search link.
export function searchUrl({ query = '', location = '', distance, jobTypes, levels, workplaces, postedWithinDays } = {}) {
  const params = new URLSearchParams();
  const what = String(query ?? '').trim();
  const where = String(location ?? '').trim();
  if (what) params.set('keywords', what);
  if (where) params.set('location', where);
  if (where && Number(distance) > 0) params.set('radius', String(Math.round(Number(distance))));
  const types = valuesOf(jobTypes, JOB_TYPES);
  if (types.length > 0) params.set('employmentType', types.join(','));
  const wanted = valuesOf(levels, LEVELS);
  if (wanted.length > 0) params.set('careerLevel', wanted.join(','));
  const places = valuesOf(workplaces, WORKPLACES);
  if (places.length > 0) params.set('remote', places.join(','));
  const period = periodOf(postedWithinDays);
  if (period) params.set('sincePeriod', period.toLowerCase());
  return `${SITE}/jobs/search?${params}`;
}

// Keywords become searches with the form's filters; Xing links are used as they are.
export function prepareInput(raw) {
  const form = {
    location: raw.location,
    distance: raw.distance,
    jobTypes: raw.jobTypes,
    levels: raw.experienceLevels,
    workplaces: raw.remoteOnly === true ? ['remote'] : raw.workplaceTypes,
    postedWithinDays: raw.postedWithinDays,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A city on its own lists every job there.
  if (companies.length === 0 && String(form.location ?? '').trim()) companies.push(searchUrl(form));
  // Remote jobs are picked by Xing's filter, which also keeps jobs that are remote or hybrid.
  return { ...raw, companies, remoteOnly: false };
}

export const exampleInput = { companies: [searchUrl({ query: 'software engineer', location: 'Berlin' })], maxItems: 50 };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'xing.com' || !/^\/jobs\/search(\/ki)?\/?$/.test(url.pathname)) {
    throw new Error('this is not a Xing job search link. Search on xing.com/jobs and copy the address, or enter keywords.');
  }
  const params = url.searchParams;
  const filters = {};
  for (const [param, filter] of Object.entries(LINK_FILTERS)) {
    const ids = toList(String(params.get(param) ?? '').split(',')).map(plainId).filter((id) => CODES[id] || /^[A-Z_]+$|^\d+$/.test(id));
    if (ids.length > 0) filters[filter] = [...new Set([...(filters[filter] ?? []), ...ids])].sort();
  }
  const period = String(params.get('sincePeriod') ?? '').toUpperCase();
  const radius = Number(params.get('radius'));
  const search = {
    kind: 'search',
    what: cleanText(params.get('keywords')) ?? '',
    where: cleanText(params.get('location')) ?? '',
    radius: radius > 0 ? radius : null,
    filters,
    period: PERIODS.some(([, value]) => value === period) ? period : null,
  };
  if (!search.where) search.radius = null;
  // The key holds everything that changes the results, in a fixed order.
  const key = new URLSearchParams();
  if (search.what) key.set('keywords', search.what.toLowerCase());
  if (search.where) key.set('location', search.where.toLowerCase());
  if (search.radius) key.set('radius', String(search.radius));
  for (const filter of Object.keys(filters).sort()) key.set(filter, filters[filter].join(','));
  if (search.period) key.set('sincePeriod', search.period.toLowerCase());
  const where = search.where ? ` in ${search.where}${search.radius ? ` (${search.radius} km)` : ''}` : '';
  return {
    ...search,
    id: `${search.what || 'all jobs'}${where}`,
    key: `${SITE}/jobs/search?${key}`,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

// Pay on Xing is a year's gross pay: stated by the employer (a range or one amount), or Xing's
// own estimate with a median.
export function salaryOf(pay) {
  if (!pay) return { salary: null, salaryEstimate: null };
  if (pay.__typename === 'SalaryEstimate') {
    const estimate = makeSalary({ min: pay.minimum, max: pay.maximum, currency: pay.currency, interval: 'year', source: 'estimate' });
    return { salary: null, salaryEstimate: estimate ? { ...estimate, median: Number(pay.median) > 0 ? pay.median : null } : null };
  }
  const salary = pay.__typename === 'Salary'
    ? makeSalary({ min: pay.amount, max: pay.amount, currency: pay.currency, interval: 'year', source: 'listing' })
    : makeSalary({ min: pay.minimum, max: pay.maximum, currency: pay.currency, interval: 'year', source: 'listing' });
  return { salary, salaryEstimate: null };
}

const LEGAL_FORMS = /\b(gmbh|mbh|ag|se|kg|kgaa|co|ohg|e\.?\s?v|ug|haftungsbeschrankt|inc|ltd|llc|sa|nv|bv|plc|holding|group|gruppe)\b/g;
const firstWord = (text) => String(text ?? '').normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(LEGAL_FORMS, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ')[0] ?? '';

// Xing links some jobs of staffing agencies and subsidiaries to another company's page; that
// page's details are kept only when it is the employer the job names.
export function sameCompany(employer, page) {
  if (!employer || !page) return true;
  const a = firstWord(employer);
  const b = firstWord(page);
  return Boolean(a) && a === b;
}

// The description: Xing's own HTML, or the sections of Xing's job template. The template's
// contact section names recruiters and is left out.
export function descriptionOf(description) {
  if (!description) return null;
  if (description.__typename === 'HtmlDescription') return cleanText(description.content) ? description.content : null;
  if (description.__typename === 'ExternalUrlDescription') return cleanText(description.htmlContent) ? description.htmlContent : null;
  if (description.__typename !== 'TemplateData') return null;
  const sections = [
    [null, description.genericDescription],
    [description.companyDescriptionTitle, description.companyDescriptionContent],
    [description.responsibilityTitle, description.responsibilityContent],
    [description.skillsTitle, description.skillsContent],
    [description.weOfferTitle, description.weOfferContent],
  ].filter(([, content]) => cleanText(content));
  if (sections.length === 0) return null;
  return sections.map(([heading, content]) => `${cleanText(heading) ? `<h3>${cleanText(heading)}</h3>` : ''}${content}`).join('\n');
}

const placeOf = (place) => [place?.city, place?.region, place?.country?.countryCode].map(cleanText).filter(Boolean).join(', ') || null;

export function toJob(raw) {
  const pageCompany = raw.companyInfo?.company ?? null;
  const employer = cleanText(raw.companyInfo?.companyNameOverride);
  const company = sameCompany(employer, pageCompany?.companyName) ? pageCompany : null;
  const options = (raw.remoteOptions ?? []).map((option) => WORKPLACE[plainId(option)]).filter(Boolean);
  const workplace = options.includes('remote') ? 'remote' : options.includes('hybrid') ? 'hybrid' : options[0] ?? null;
  const { salary, salaryEstimate } = salaryOf(raw.salary);
  const html = descriptionOf(raw.description);
  const jobId = /-(\d+)$/.exec(raw.slug ?? '')?.[1] ?? plainId(raw.id);
  const url = raw.url ?? `${SITE}/jobs/${raw.slug}`;
  const summary = raw.summary?.content;
  const level = plainId(raw.careerLevel?.id ?? '');
  return {
    ...makeJob({
      ats: name,
      company: company ? plainId(company.id) : null,
      companyName: employer ?? cleanText(pageCompany?.companyName),
      jobId,
      requisitionId: null,
      title: raw.title,
      department: cleanText(raw.discipline?.localizationValue),
      location: placeOf(raw.location),
      locations: (raw.locations ?? []).map(placeOf).filter(Boolean),
      remote: workplace === 'remote',
      workplaceType: workplace,
      employmentType: EMPLOYMENT[plainId(raw.employmentType?.id ?? '')] ?? cleanText(raw.employmentType?.localizationValue),
      salary,
      postedAt: raw.activatedAt ?? null,
      updatedAt: raw.refreshedAt ?? null,
      jobUrl: url,
      applyUrl: raw.application?.__typename === 'UrlApplication' && raw.application.applyUrl ? raw.application.applyUrl : url,
      descriptionText: html ? htmlToText(html) : null,
      descriptionHtml: html,
    }),
    salaryEstimate,
    remoteOptions: options,
    seniorityLevel: cleanText(raw.careerLevel?.localizationValue) ?? Object.values(LEVELS).find(([id]) => id === level)?.[1] ?? null,
    industry: cleanText(raw.industry?.localizationValue),
    city: cleanText(raw.location?.city),
    state: cleanText(raw.location?.region),
    postalCode: cleanText(raw.location?.zipCode),
    country: cleanText(raw.location?.country?.countryCode),
    validThrough: raw.activeUntil ?? null,
    language: cleanText(raw.language),
    skills: (raw.keywords ?? []).map(cleanText).filter(Boolean),
    summary: summary ? {
      introduction: cleanText(summary.introduction),
      qualifications: (summary.qualifications ?? []).map(cleanText).filter(Boolean),
      responsibilities: (summary.keyResponsibilities ?? []).map(cleanText).filter(Boolean),
    } : null,
    companyUrl: company?.links?.public ?? null,
    companyLogo: company?.logos?.logo96px ?? null,
    companySize: cleanText(company?.companySize),
    companyIndustry: cleanText(company?.industry?.localizationValue),
    companyCity: cleanText(company?.address?.city),
  };
}

// --- Searching ----------------------------------------------------------------------------------

const JOB_FIELDS = `id slug url title activatedAt refreshedAt activeUntil language keywords remoteOptions
      location { city zipCode region country { countryCode } }
      locations { city zipCode region country { countryCode } }
      employmentType { id localizationValue } careerLevel { id localizationValue } discipline { localizationValue } industry { localizationValue }
      companyInfo { companyNameOverride company { id companyName companySize links { public } logos { logo96px } industry { localizationValue } address { city } } }
      salary { __typename ... on Salary { currency amount } ... on SalaryRange { currency minimum maximum } ... on SalaryEstimate { currency minimum maximum median } }
      application { __typename ... on UrlApplication { applyUrl } }
      summary: summaryV2 { content { introduction qualifications keyResponsibilities } }`;
const DESCRIPTION_FIELDS = `description { __typename ... on HtmlDescription { content } ... on ExternalUrlDescription { htmlContent }
        ... on TemplateData { genericDescription companyDescriptionTitle companyDescriptionContent responsibilityTitle responsibilityContent skillsTitle skillsContent weOfferTitle weOfferContent } }`;

export function searchQuery(withDescription) {
  return `query JobSearchByQuery($query: JobSearchQueryInput!, $consumer: String!, $offset: Int, $limit: Int, $sincePeriod: SincePeriod) {
  jobSearchByQuery(query: $query, consumer: $consumer, offset: $offset, limit: $limit, sincePeriod: $sincePeriod, returnAggregations: false) {
    collection { jobDetail { ... on VisibleJob { ${JOB_FIELDS}${withDescription ? `\n      ${DESCRIPTION_FIELDS}` : ''} } } }
  }
}`;
}

const CODES_QUERY = `query JobSearchByQuery($query: JobSearchQueryInput!, $consumer: String!) {
  jobSearchByQuery(query: $query, consumer: $consumer, offset: 0, limit: 1, returnAggregations: true) {
    aggregations { employmentTypes { id } careerLevels { id } remoteOptions { id } }
  }
}`;

// Reads Xing's current codes of job types, levels and remote options from its own filter list.
async function refreshCodes(http) {
  const data = await http.postJson(API, { operationName: 'JobSearchByQuery', query: CODES_QUERY, variables: { query: { keywords: 'manager' }, consumer: CONSUMER } }, { headers: HEADERS, retries: 3 });
  const aggregations = data?.data?.jobSearchByQuery?.aggregations ?? {};
  for (const item of [...(aggregations.employmentTypes ?? []), ...(aggregations.careerLevels ?? []), ...(aggregations.remoteOptions ?? [])]) {
    const [id, code] = String(item?.id ?? '').split('.');
    if (id && code) CODES[id] = code;
  }
}

export function variablesOf(search, offset) {
  const filter = {};
  for (const [key, ids] of Object.entries(search.filters)) filter[key] = { id: ids.map((id) => (CODES[id] ? `${id}.${CODES[id]}` : id)) };
  const query = {
    ...(search.what && { keywords: search.what }),
    ...(search.where && { location: { text: search.where, ...(search.radius && { radius: search.radius }) } }),
    ...(Object.keys(filter).length > 0 && { filter }),
  };
  return { query, consumer: CONSUMER, offset, limit: PAGE_SIZE, ...(search.period && { sincePeriod: search.period }) };
}

async function readPage(search, context, offset, refreshed = false) {
  const { http, includeDescription = true } = context;
  const data = await http.postJson(API, { operationName: 'JobSearchByQuery', query: searchQuery(includeDescription), variables: variablesOf(search, offset) }, { headers: HEADERS, retries: 4 });
  const errors = data?.errors ?? [];
  if (errors.some((error) => error?.id === 'FIELD_SCRAMBLING_ERROR') && !refreshed) {
    await refreshCodes(http);
    return readPage(search, context, offset, true);
  }
  const results = data?.data?.jobSearchByQuery;
  if (!results) throw new Error(`Xing did not answer the search: ${cleanText(errors[0]?.details?.description ?? errors[0]?.message) ?? 'no data'}`);
  return (results.collection ?? []).map((item) => item?.jobDetail).filter((job) => job?.id && job?.title);
}

export async function* listJobs(search, context) {
  const { log } = context;
  if (!search.what && !search.where) throw new Error('Xing needs keywords or a city to search.');
  let read = 0;
  for (let offset = 0; offset + PAGE_SIZE <= MAX_PER_SEARCH; offset += PAGE_SIZE) {
    const jobs = await readPage(search, context, offset);
    read += jobs.length;
    if (jobs.length > 0) yield jobs.map(toJob);
    if (jobs.length < PAGE_SIZE) break;
    if (offset + 2 * PAGE_SIZE > MAX_PER_SEARCH) log.info(`${search.id}: Xing shows at most 1,000 jobs per search. Search by city or with filters for more.`);
  }
  if (read === 0 && search.where) log.info(`${search.id}: Xing found no jobs. The location must be a city, such as "Berlin", "Wien" or "Zürich".`);
}

// The same job found by two searches is saved once.
export const dedupeKey = (job) => job.jobId;
