// Foundit (formerly Monster India, Monster Gulf and Monster Singapore): the JSON API behind
// Foundit's own search pages (/middleware/jobsearch), on its sites for India, the Gulf,
// Singapore, Malaysia, the Philippines and Hong Kong. Up to 100 jobs per request; the full
// description comes from the job's own API (/middleware/jobdetail), only for jobs that are saved.
// Recruiters' names and the contact details of employers are never read.

import { makeJob } from '../core/job.js';
import { makeSalary } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'foundit';
export const title = 'Foundit';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 3;
export const detailConcurrency = 16;
export const proxyFallback = true;

const PAGE_SIZE = 100;
// Foundit lists about 10,000 jobs per search; further pages repeat the last one.
export const MAX_PER_SEARCH = 10000;

const GULF = 'www.founditgulf.com';
// Countries: name and Foundit site. The Gulf site covers the Gulf countries and Egypt.
export const COUNTRIES = {
  IN: ['India', 'www.foundit.in'],
  AE: ['United Arab Emirates', GULF], SA: ['Saudi Arabia', GULF], QA: ['Qatar', GULF], KW: ['Kuwait', GULF],
  OM: ['Oman', GULF], BH: ['Bahrain', GULF], EG: ['Egypt', GULF],
  SG: ['Singapore', 'www.foundit.sg'], MY: ['Malaysia', 'www.foundit.my'], PH: ['Philippines', 'www.foundit.com.ph'], HK: ['Hong Kong', 'www.foundit.hk'],
};
const SITES = [...new Set(Object.values(COUNTRIES).map(([, host]) => host))];
const COUNTRY_OF_HOST = Object.fromEntries(Object.entries(COUNTRIES).filter(([, [, host]], index, all) => all.findIndex(([, [, other]]) => other === host) === index).map(([code, [, host]]) => [host, code]));
// Search link parameters that are passed on as they are.
const LINK_FILTERS = ['locations', 'experience', 'experienceRanges', 'jobFreshness', 'jobTypes', 'functions', 'industries', 'roles', 'companies', 'jobCities', 'employerTypes', 'salaryRanges', 'quickApplyJobs', 'qualifications', 'sort'];
const REMOTE_TYPE = 'Work From Home';

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// The search form of the Actor, as a Foundit search link. Outside India, a search without a city
// is limited to the chosen country.
export function searchUrl({ country = 'IN', query = '', location = '', experience, postedWithinDays, remoteOnly = false, sortByDate = false } = {}) {
  const code = COUNTRIES[String(country).toUpperCase()] ? String(country).toUpperCase() : 'IN';
  const [countryName, host] = COUNTRIES[code];
  const params = new URLSearchParams();
  const what = String(query ?? '').trim();
  const where = toList(String(location ?? '').split(/[;|]/)).join(',');
  if (what) params.set('query', what);
  if (where) params.set('locations', where);
  else if (code !== 'IN') params.set('locations', countryName);
  if (experience !== undefined && experience !== null && experience !== '' && Number(experience) >= 0) params.set('experience', String(Math.round(Number(experience))));
  if (Number(postedWithinDays) > 0) params.set('jobFreshness', String(Math.round(Number(postedWithinDays))));
  if (remoteOnly) params.set('jobTypes', REMOTE_TYPE);
  if (sortByDate) params.set('sort', '2');
  return `https://${host}/srp/results?${params}`;
}

// Keywords become searches with the form's filters; Foundit links are used as they are.
export function prepareInput(raw) {
  const form = {
    country: raw.country,
    location: raw.location,
    experience: raw.experienceYears,
    postedWithinDays: raw.postedWithinDays,
    remoteOnly: raw.remoteOnly === true,
    sortByDate: raw.sortBy === 'date',
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A city or a country on its own lists every job there.
  if (companies.length === 0 && (String(form.location ?? '').trim() || (form.country && String(form.country).toUpperCase() !== 'IN'))) companies.push(searchUrl(form));
  // Remote jobs are picked by Foundit's "Work From Home" filter.
  return { ...raw, companies, remoteOnly: false };
}

export const exampleInput = { companies: [searchUrl({ query: 'data analyst', location: 'Bangalore' })], maxItems: 50 };

const unslug = (text) => cleanText(decodeURIComponent(text ?? '').replace(/-/g, ' ')) ?? '';

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  const host = url.hostname.toLowerCase().replace(/^(?:m|www)\./, 'www.');
  const params = new URLSearchParams();
  const seo = /^\/search\/(.+?)-jobs(?:-in-(.+?))?\/?$/i.exec(url.pathname);
  if (!SITES.includes(host) || !(seo || /^\/srp\/results\/?$/i.test(url.pathname))) {
    throw new Error('this is not a Foundit search link. Search on foundit.in, founditgulf.com or another Foundit site and copy the address, or enter keywords.');
  }
  // Foundit's own search pages: /search/python-developer-jobs-in-bangalore.
  if (seo) {
    params.set('query', unslug(seo[1]));
    if (seo[2]) params.set('locations', unslug(seo[2]));
  } else {
    const query = cleanText(url.searchParams.get('query'));
    if (query) params.set('query', query);
  }
  for (const key of LINK_FILTERS) {
    const filter = cleanText(url.searchParams.get(key));
    if (filter && !params.has(key)) params.set(key, filter);
  }
  if (!params.get('query') && !params.get('locations')) throw new Error('Foundit needs keywords or a location to search.');
  // The key holds everything that changes the results, in a fixed order.
  const key = new URLSearchParams([...params].map(([param, filter]) => [param, param === 'query' ? filter.toLowerCase() : filter.split(',').map((item) => item.trim().toLowerCase()).sort().join(',')]).sort(([a], [b]) => a.localeCompare(b)));
  const country = COUNTRY_OF_HOST[host];
  const where = params.get('locations') ?? COUNTRIES[country][0];
  const site = host === GULF ? ' (Gulf)' : '';
  return {
    kind: 'search',
    host,
    params: Object.fromEntries(params),
    id: `${params.get('query') || 'all jobs'} in ${where}${site}`,
    key: `https://${host}/srp/results?${key}`,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

const yearsOf = (value) => (Number.isFinite(value?.years) ? value.years : null);
const time = (value) => (Number(value) > 0 ? new Date(Number(value)).toISOString() : null);
// Placeholders Foundit shows instead of a company or a place.
const known = (value) => {
  const text = cleanText(value);
  return text && !/^(confidential|not specified|n\/?a)$/i.test(text) ? text : null;
};

// Pay on Foundit is a range per year in the site's currency; 0 means the employer did not state it.
export function salaryOf(raw) {
  if (raw.hideSalary || raw.jobSalaryConfidential) return null;
  const min = raw.minimumSalary?.absoluteValue;
  const max = raw.maximumSalary?.absoluteValue;
  return makeSalary({ min, max, currency: raw.maximumSalary?.currency ?? raw.minimumSalary?.currency ?? raw.currencyCode, interval: 'year', source: 'listing' });
}

const siteOf = (host) => `https://${host}`;

// A search result or a job's own record, in the shared format. `detail` is the job's record from
// /middleware/jobdetail, with the description and every location.
export function toJob(raw, host, detail = null) {
  const site = siteOf(host);
  const jobUrl = `${site}${raw.seoJdUrl ?? raw.jdUrl ?? `/job/${raw.jobId}`}`;
  const places = detail?.locations?.length
    ? detail.locations.map((place) => [cleanText(place.city)?.split(' / ')[0], cleanText(place.state), cleanText(place.country)].filter(Boolean).join(', ')).filter(Boolean)
    : [cleanText(raw.locations)].filter(Boolean);
  const types = [...(raw.jobTypes ?? []), ...(detail?.jobTypes ?? [])].map(cleanText).filter(Boolean);
  const remote = types.includes(REMOTE_TYPE) || places.some((place) => /^remote\b/i.test(place));
  const html = detail?.description && cleanText(htmlToText(detail.description)) ? detail.description : null;
  const company = detail?.company ?? null;
  const skills = detail?.itSkills?.length
    ? detail.itSkills.map((skill) => cleanText(skill?.text)).filter(Boolean)
    : String(raw.skills ?? '').split(',').map(cleanText).filter(Boolean);
  const firstPlace = detail?.locations?.[0];
  // "0 to 0 years" means the job states no experience.
  const [minYears, maxYears] = [yearsOf(raw.minimumExperience), yearsOf(raw.maximumExperience)];
  const statesYears = maxYears > 0;
  return {
    ...makeJob({
      ats: name,
      company: Number(raw.companyId) > 0 ? String(raw.companyId) : null,
      companyName: raw.hideCompanyName ? null : known(raw.companyName),
      jobId: String(raw.jobId),
      requisitionId: null,
      title: raw.title,
      department: cleanText(raw.functions?.[0]),
      location: places[0] ?? null,
      locations: places,
      remote,
      workplaceType: remote ? 'remote' : null,
      employmentType: cleanText(raw.employmentTypes?.[0]),
      salary: salaryOf(raw),
      postedAt: time(raw.createdAt),
      jobUrl,
      applyUrl: raw.applyUrl || raw.redirectUrl || jobUrl,
      descriptionText: html ? htmlToText(html) : null,
      descriptionHtml: html,
    }),
    experienceYearsMin: statesYears ? minYears : null,
    experienceYearsMax: statesYears ? maxYears : null,
    jobTypes: [...new Set(types)],
    roles: (raw.roles ?? []).map(cleanText).filter(Boolean),
    functions: (raw.functions ?? []).map(cleanText).filter(Boolean),
    industries: (raw.industries ?? []).map(cleanText).filter((industry) => industry && industry !== 'Other'),
    skills,
    applicants: Number.isFinite(raw.totalApplicants) ? raw.totalApplicants : null,
    validThrough: time(raw.closedAt),
    quickApply: raw.quickApplyJob === 1,
    urgentlyHiring: raw.isUrgentlyHiring === true,
    city: cleanText(firstPlace?.city)?.split(' / ')[0] ?? null,
    state: cleanText(firstPlace?.state),
    // The Gulf site lists several countries; without the job's record its country is not known.
    country: cleanText(firstPlace?.isoCode) ?? (host === GULF ? null : COUNTRY_OF_HOST[host] ?? null),
    employerType: cleanText(company?.employerType ?? raw.employerTypes?.[0])?.toLowerCase() ?? null,
    companyUrl: raw.seoCompanyUrl ? `${site}${raw.seoCompanyUrl}` : null,
  };
}

// A search result before its description is loaded.
function toPartialJob(raw, host) {
  return { ...toJob(raw, host), partial: true, raw, host };
}

// Foundit's API answers only requests from its own pages.
const headersOf = (host) => ({ accept: 'application/json', referer: `${siteOf(host)}/srp/results` });

export async function completeJob(partial, search, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.raw, partial.host);
  try {
    const data = await http.getJson(`${siteOf(partial.host)}/middleware/jobdetail/${partial.jobId}`, { headers: headersOf(partial.host), retries: 4 });
    return toJob(partial.raw, partial.host, data?.jobDetailResponse ?? null);
  } catch (error) {
    // The job was taken down after the search listed it.
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
}

// --- Searching ----------------------------------------------------------------------------------

// Results carry a place in the list (`order`); promoted jobs repeated between them have none.
export const listedJobsOf = (data) => (data?.jobSearchResponse?.data ?? []).filter((job) => job?.jobId && job.order !== undefined && job.order !== '' && job.order !== null);

export function searchApiUrl(search, start) {
  const params = new URLSearchParams({ start: String(start), sort: '1', limit: String(PAGE_SIZE), ...search.params });
  return `${siteOf(search.host)}/middleware/jobsearch?${params}`;
}

export async function* listJobs(search, context) {
  const { http, log } = context;
  const seen = new Set();
  let total = null;
  for (let start = 0; start < MAX_PER_SEARCH; start += PAGE_SIZE) {
    const data = await http.getJson(searchApiUrl(search, start), { headers: headersOf(search.host), retries: 4 });
    if (start === 0) {
      total = data?.jobSearchResponse?.meta?.paging?.total ?? null;
      log.info(`${search.id}: Foundit lists ${total ?? 'some'} jobs.`);
    }
    const jobs = listedJobsOf(data).filter((job) => !seen.has(String(job.jobId)));
    // Past the end of a long list Foundit repeats its last page.
    if (jobs.length === 0) break;
    for (const job of jobs) seen.add(String(job.jobId));
    yield jobs.map((job) => toPartialJob(job, search.host));
    if (total !== null && start + PAGE_SIZE >= total) break;
  }
  if (total !== null && total > seen.size + PAGE_SIZE) log.info(`${search.id}: Foundit showed ${seen.size} of its ${total} jobs; it shows about 10,000 per search. Search by city or with filters for more.`);
}

// The same job found by two searches is saved once.
export const dedupeKey = (job) => job.jobId;
