// Reed (reed.co.uk): UK job search pages. The results are read from the page's Next.js data, 25
// jobs per page, and Reed serves every page of a search, so nothing needs splitting. Job pages add
// the full description, contract type, working hours, sector and full location. Salaries the
// employer hides ("Competitive salary", "Salary negotiable") stay empty, although the page carries
// numbers for them. Recruiters and their contact details are never read.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'reed';
export const title = 'Reed';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const detailConcurrency = 8;
export const proxyFallback = true;

const SITE = 'https://www.reed.co.uk';
const PAGE_SIZE = 25;

export const JOB_TYPES = { perm: 'Permanent', contract: 'Contract', temp: 'Temporary' };
export const HOURS = { fulltime: 'Full-time', parttime: 'Part-time' };
export const EMPLOYERS = { direct: 'Direct employers', agency: 'Recruitment agencies' };

// Codes of the search results.
const CONTRACTS = { 1: 'Permanent', 2: 'Contract', 4: 'Temporary' };
const SALARY_INTERVALS = { 1: 'hour', 2: 'day', 3: 'week', 4: 'month', 5: 'year' };
const CURRENCIES = { 1: 'GBP' };
// Salary description flags of a pay the employer hides: negotiable, commission, competitive.
const HIDDEN_SALARY = 16 | 32 | 64;
const OWNER_TYPES = { 1: 'agency', 2: 'employer' };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const slug = (text) => String(text ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean).map(encodeURIComponent).join('-');
const unslug = (text) => decodeURIComponent(text).replace(/-/g, ' ');

// Reed offers "today", "last 3 days", "last week" and "last 2 weeks"; the rest is filtered after the
// search. "1 day" means today and yesterday, so it takes the last 3 days.
function dateOffset(days) {
  const value = Number(days);
  if (!(value > 0) || value > 14) return null;
  if (value <= 2) return 'LastThreeDays';
  return value <= 7 ? 'LastWeek' : 'LastTwoWeeks';
}

// The search form of the Actor, as a reed.co.uk search link.
export function searchUrl({ query = '', location = '', distance, minSalary, maxSalary, jobTypes, hours, employerTypes, graduate, postedWithinDays } = {}) {
  const what = slug(query);
  const where = slug(location);
  const path = what ? `${what}-jobs${where ? `-in-${where}` : ''}` : where ? `jobs-in-${where}` : '';
  const params = new URLSearchParams();
  if (where && distance !== undefined && distance !== null && distance !== '' && Number(distance) >= 0) params.set('proximity', String(Number(distance)));
  if (Number(minSalary) > 0) params.set('salaryfrom', String(Number(minSalary)));
  if (Number(maxSalary) > 0) params.set('salaryto', String(Number(maxSalary)));
  for (const type of toList(jobTypes).filter((id) => JOB_TYPES[id])) params.set(type, 'True');
  for (const type of toList(hours).filter((id) => HOURS[id])) params.set(type, 'True');
  for (const type of toList(employerTypes).filter((id) => EMPLOYERS[id])) params.set(type, 'True');
  if (graduate === true) params.set('graduate', 'True');
  const offset = dateOffset(postedWithinDays);
  if (offset) params.set('datecreatedoffset', offset);
  params.sort();
  const search = params.toString();
  return `${SITE}/jobs${path ? `/${path}` : ''}${search ? `?${search}` : ''}`;
}

// Keywords become searches with the form's filters; reed.co.uk links are used as they are.
export function prepareInput(raw) {
  const form = {
    location: String(raw.location ?? '').trim(),
    distance: raw.distance,
    minSalary: raw.minSalary,
    maxSalary: raw.maxSalary,
    jobTypes: raw.jobTypes,
    hours: raw.hours,
    employerTypes: raw.employerTypes,
    graduate: raw.graduate === true,
    postedWithinDays: raw.postedWithinDays,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A location on its own lists every job there.
  if (companies.length === 0 && form.location) companies.push(searchUrl(form));
  return { ...raw, companies };
}

export const exampleInput = { companies: [searchUrl({ query: 'python developer', location: 'London' })], maxItems: 50 };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  if (!/(^|\.)reed\.co\.uk$/i.test(url.hostname) || !/^\/jobs(\/|$)/i.test(url.pathname)) {
    throw new Error('this is not a Reed search link. Search on reed.co.uk and copy the address, or enter keywords.');
  }
  url.hostname = 'www.reed.co.uk';
  url.searchParams.delete('pageno');
  url.searchParams.sort();
  const segment = url.pathname.split('/').filter(Boolean)[1] ?? '';
  const match = /^(?:(.+?)-)?jobs(?:-in-(.+))?$/i.exec(segment) ?? [];
  const label = `${match[1] ? unslug(match[1]) : 'all jobs'} in ${match[2] ? unslug(match[2]) : 'the UK'}`;
  return { kind: 'search', id: label, key: url.toString(), url: url.toString() };
}

// --- Page data ---------------------------------------------------------------------------

function pageProps(html) {
  const json = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(String(html ?? ''))?.[1];
  return json ? JSON.parse(json).props?.pageProps ?? null : null;
}

export function parseSearchPage(html) {
  const results = pageProps(html)?.searchResults;
  if (!Array.isArray(results?.jobs)) throw new Error('The page is not a Reed search result page.');
  return { jobs: results.jobs.filter((job) => job?.jobDetail?.jobId && job.url), total: Number(results.count) || 0 };
}

// The job's details on its own page; nothing about the people behind it is read.
export function parseJobPage(html) {
  return pageProps(html)?.consolidatedJobDetails?.jobDetails ?? null;
}

// --- Jobs ------------------------------------------------------------------------------------

function salaryOf(card, details) {
  const pay = details?.jobSalary;
  if (pay) {
    if (pay.isCompetitiveHideSalary || pay.isNegotiableHideSalary || pay.hasCommissionHideSalary) return null;
    return makeSalary({ min: pay.from, max: pay.to, currency: CURRENCIES[pay.currencyId] ?? null, interval: normalizeInterval(pay.type?.name), text: cleanText(pay.displaySalary), source: 'listing' });
  }
  if (Number(card.salaryDescription) & HIDDEN_SALARY) return null;
  return makeSalary({ min: card.salaryFrom, max: card.salaryTo, currency: CURRENCIES[card.salaryCurrencyId] ?? null, interval: SALARY_INTERVALS[card.salaryType] ?? null, source: 'listing' });
}

// Contract jobs and temporary jobs first; otherwise the working hours.
function employmentOf(contract, fullTime, partTime) {
  if (/contract/i.test(contract ?? '')) return 'contract';
  if (/temp/i.test(contract ?? '')) return 'temporary';
  if (partTime && !fullTime) return 'part-time';
  return fullTime ? 'full-time' : null;
}

const WORKPLACES = { onsite: 'onsite', hybrid: 'hybrid', remote: 'remote' };

export function toJob(listing, details = null) {
  const card = listing.jobDetail;
  const jobUrl = `${SITE}${String(listing.url).split('?')[0]}`;
  const place = details?.jobLocation ?? null;
  const contract = details?.jobContractType?.name ?? CONTRACTS[card.jobType] ?? null;
  const fullTime = details?.jobEmploymentHours?.isFullTime ?? card.isFullTime;
  const partTime = details?.jobEmploymentHours?.isPartTime ?? card.isPartTime;
  const workplace = WORKPLACES[String(card.workingOption ?? place?.inferredJobLocationType ?? '').toLowerCase()] ?? null;
  const descriptionHtml = details?.description ?? null;
  const snippet = cleanText(card.jobDescriptionSnippet);
  const sector = details?.jobSector;
  const job = makeJob({
    ats: name,
    company: card.ouId != null ? String(card.ouId) : null,
    companyName: card.ouName ?? listing.profileName ?? details?.jobOwner?.ouName,
    jobId: card.jobId,
    title: card.jobTitle ?? details?.title,
    department: sector?.parentName ?? card.taxonomyLevel1,
    location: place?.locationName ?? card.displayLocationName,
    remote: place?.isRemoteJob === true || workplace === 'remote',
    workplaceType: workplace,
    employmentType: employmentOf(contract, fullTime, partTime),
    salary: salaryOf(card, details),
    postedAt: card.displayDate ?? card.dateCreated,
    updatedAt: card.dateUpdated,
    jobUrl,
    applyUrl: jobUrl,
    descriptionText: descriptionHtml ? htmlToText(descriptionHtml) : snippet,
    descriptionHtml: descriptionHtml ?? (snippet ? `<p>${snippet.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>` : null),
  });
  return {
    ...job,
    contractType: contract,
    hours: fullTime && partTime ? 'full-time or part-time' : fullTime ? 'full-time' : partTime ? 'part-time' : null,
    sector: sector?.name ?? null,
    category: details?.breadcrumbs?.length ? details.breadcrumbs.join(' / ') : [card.taxonomyLevel1, card.taxonomyLevel2].filter(Boolean).join(' / ') || null,
    county: place?.countyName ?? card.countyLocation ?? null,
    region: place?.regionName ?? null,
    postcode: place?.postCode ?? null,
    country: place?.countryName ?? null,
    postedBy: details ? (details.isAgency ? 'agency' : details.isEmployer ? 'employer' : null) : OWNER_TYPES[card.ouType] ?? null,
    easyApply: card.isEasyApply === true,
    graduate: details?.isGraduate ?? null,
    reference: cleanText(details?.jobOwner?.reference) ?? null,
    validThrough: card.expiryDate ?? details?.expiryDate ?? null,
    companyUrl: listing.ouUrl ? `${SITE}${listing.ouUrl}` : null,
  };
}

// A search result, filtered before its job page is loaded.
function toPartialJob(listing) {
  return { ...toJob(listing), partial: true, listing };
}

export async function completeJob(partial, search, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.listing);
  try {
    const details = parseJobPage(await http.getText(partial.jobUrl, { retries: 4 }));
    // A job that is no longer live was taken down after the search listed it.
    if (details && details.isLive === false) return null;
    return toJob(partial.listing, details);
  } catch (error) {
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
}

// --- Searching ----------------------------------------------------------------------------------

const pageUrl = (url, page) => {
  const next = new URL(url);
  if (page > 1) next.searchParams.set('pageno', String(page));
  return next.toString();
};

export async function* listJobs(search, context) {
  const { http, log } = context;
  const seen = new Set();
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    let result;
    try {
      result = parseSearchPage(await http.getText(pageUrl(search.url, page), { retries: 4 }));
    } catch (error) {
      // Past the last page Reed answers 404.
      if (page > 1 && error.status === 404) break;
      throw error;
    }
    if (page === 1) {
      pages = Math.ceil(result.total / PAGE_SIZE);
      log.info(`${search.id}: ${result.total} jobs on ${pages} pages.`);
    }
    const fresh = result.jobs.filter((job) => !seen.has(job.jobDetail.jobId) && seen.add(job.jobDetail.jobId));
    if (result.jobs.length === 0) break;
    yield fresh.map(toPartialJob);
  }
}
