// Dice (dice.com): job search pages. Results are read from the page's Next.js data, 30 per page
// for at most 25 pages, so bigger searches are split by the site's own filters. Job pages add the
// full description (schema.org JobPosting) and skills. Recruiter contact details are never read.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval, salaryFromText } from '../core/salary.js';
import { htmlToText } from '../core/text.js';

export const name = 'dice';
export const title = 'Dice';
export const sourceNames = ['search', 'searches'];
export const exampleInput = { companies: ['https://www.dice.com/jobs?q=python+developer'], maxItems: 50 };
export const companyConcurrency = 2;
export const detailConcurrency = 8;
export const proxyFallback = true;

const SEARCH_URL = 'https://www.dice.com/jobs';
const PAGE_SIZE = 30;
const MAX_PAGES = 25;
const MAX_SPLIT_DEPTH = 2;
// Facets that divide a search into parts, best first: every job has exactly one employer type.
const SPLIT_FACETS = ['employerType', 'employmentType', 'workplaceTypes'];

export const WORKPLACE_TYPES = ['On-Site', 'Remote', 'Hybrid'];
export const EMPLOYMENT_TYPES = ['FULLTIME', 'PARTTIME', 'CONTRACTS', 'THIRD_PARTY'];
export const POSTED_DATES = ['ONE', 'THREE', 'SEVEN'];
export const EMPLOYER_TYPES = ['Direct Hire', 'Recruiter', 'Other'];

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// The search form of the Actor, as a dice.com search URL. Several values of a filter are joined by "|".
export function searchUrl({ query = '', location, radius, workplaceTypes, employmentTypes, postedDate, employerTypes, easyApply, willingToSponsor } = {}) {
  const params = new URLSearchParams({ q: query });
  if (location) {
    params.set('location', location);
    if (radius > 0) {
      params.set('radius', String(radius));
      params.set('radiusUnit', 'mi');
    }
  }
  const lists = { workplaceTypes, employmentType: employmentTypes, employerType: employerTypes };
  for (const [facet, values] of Object.entries(lists)) {
    if (toList(values).length > 0) params.set(`filters.${facet}`, toList(values).join('|'));
  }
  if (postedDate && POSTED_DATES.includes(postedDate)) params.set('filters.postedDate', postedDate);
  if (easyApply) params.set('filters.easyApply', 'true');
  if (willingToSponsor) params.set('filters.willingToSponsor', 'true');
  return `${SEARCH_URL}?${params}`;
}

// Keywords become searches with the form's filters; dice.com links are used as they are.
export function prepareInput(raw) {
  const form = {
    location: String(raw.location ?? '').trim(),
    radius: Number(raw.radius) || 0,
    workplaceTypes: raw.workplaceTypes,
    employmentTypes: raw.employmentTypes,
    postedDate: raw.postedDate,
    employerTypes: raw.employerTypes,
    easyApply: raw.easyApply === true,
    willingToSponsor: raw.willingToSponsor === true,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A location on its own searches every job there.
  if (companies.length === 0 && form.location) companies.push(searchUrl(form));
  return { ...raw, companies };
}

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  if (!/(^|\.)dice\.com$/i.test(url.hostname) || !/^\/jobs\/?$/.test(url.pathname)) {
    throw new Error('this is not a Dice job search link. Search on dice.com and copy the address, or enter keywords.');
  }
  url.searchParams.delete('page');
  url.searchParams.sort();
  const label = [url.searchParams.get('q') || 'all jobs', url.searchParams.get('location')].filter(Boolean).join(' in ');
  return { id: label, key: url.toString(), url: url.toString() };
}

// --- Page data ---------------------------------------------------------------------------

// Next.js streams page data as self.__next_f.push([1, "..."]) chunks.
export function flightData(html) {
  return [...String(html).matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map(([, chunk]) => JSON.parse(`"${chunk}"`))
    .join('');
}

// The data is a list of rows: "id:<json>\n", or "id:T<hex byte length>,<text>" for long texts.
export function flightRows(payload) {
  const buffer = Buffer.from(payload, 'utf8');
  const rows = [];
  let i = 0;
  while (i < buffer.length) {
    const colon = buffer.indexOf(0x3a, i);
    if (colon < 0) break;
    const header = buffer.toString('utf8', colon + 1, colon + 12);
    if (/^T[0-9a-f]+,/.test(header)) {
      const comma = buffer.indexOf(0x2c, colon);
      const length = parseInt(buffer.toString('utf8', colon + 2, comma), 16);
      i = comma + 1 + length;
      continue;
    }
    const newline = buffer.indexOf(0x0a, colon);
    const end = newline < 0 ? buffer.length : newline;
    rows.push(buffer.toString('utf8', colon + 1, end));
    i = end + 1;
  }
  return rows;
}

function* jsonRows(html, marker) {
  for (const row of flightRows(flightData(html))) {
    if (!row.includes(marker)) continue;
    try {
      yield JSON.parse(row);
    } catch {
      // Not a JSON row.
    }
  }
}

export function parseSearchPage(html) {
  for (const row of jsonRows(html, '"jobList"')) {
    const props = row?.[3];
    if (!Array.isArray(props?.jobList?.data)) continue;
    const total = Number(/([\d,]+)\s+results?/i.exec(String(props.totalResults ?? ''))?.[1]?.replace(/,/g, '') ?? 0);
    return {
      jobs: props.jobList.data.filter((job) => job?.guid),
      page: Number(props.currentPage) || 1,
      total,
      facets: props.jobList.meta?.facetQueryResults ?? [],
    };
  }
  throw new Error('The page is not a Dice search result page.');
}

function findSkills(node) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findSkills(child);
      if (found) return found;
    }
  } else if (node && typeof node === 'object') {
    if (Array.isArray(node.skills) && node.skills.every((skill) => typeof skill === 'string')) return node.skills;
    for (const child of Object.values(node)) {
      const found = findSkills(child);
      if (found) return found;
    }
  }
  return null;
}

// The job page's JobPosting data and skills; nothing else from the page is read.
export function parseJobPage(html) {
  let posting = null;
  for (const [, json] of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(json);
      if (data?.['@type'] === 'JobPosting') posting = data;
    } catch {
      // Not valid JSON.
    }
  }
  let skills = null;
  for (const row of jsonRows(html, '"skills"')) {
    skills = findSkills(row);
    if (skills) break;
  }
  const pay = posting?.baseSalary;
  const decode = (text) => htmlToText(text).replace(/\s+/g, ' ').trim();
  return {
    descriptionHtml: posting?.description?.trim() || null,
    validThrough: posting?.validThrough ?? null,
    skills: skills ? [...new Set(skills.map(decode).filter(Boolean))] : null,
    salary: pay?.minValue > 0 || pay?.maxValue > 0
      ? makeSalary({ min: pay.minValue, max: pay.maxValue, currency: pay.currency, interval: normalizeInterval(pay.unitText), source: 'listing' })
      : null,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

function workplaceOf(types) {
  if (types.includes('Hybrid')) return 'hybrid';
  if (types.includes('Remote')) return 'remote';
  if (types.includes('On-Site')) return 'onsite';
  return null;
}

export function toJob(raw, details = {}) {
  const types = Array.isArray(raw.workplaceTypes) ? raw.workplaceTypes : [];
  const descriptionHtml = details.descriptionHtml ?? null;
  return {
    ...makeJob({
      ats: name,
      company: raw.companyProfileId ?? raw.clientBrandId ?? null,
      companyName: raw.companyName,
      jobId: raw.guid,
      title: raw.title,
      location: raw.jobLocation?.displayName,
      remote: raw.isRemote === true || types.includes('Remote'),
      workplaceType: workplaceOf(types),
      employmentType: raw.employmentType,
      salary: salaryFromText(raw.salary, { known: true, source: 'listing', defaultCurrency: 'USD' }) ?? details.salary ?? null,
      postedAt: raw.postedDate,
      updatedAt: raw.modifiedDate,
      jobUrl: raw.detailsPageUrl,
      applyUrl: raw.detailsPageUrl,
      descriptionText: descriptionHtml ? htmlToText(descriptionHtml) : htmlToText(raw.summary) || null,
      descriptionHtml,
    }),
    skills: details.skills ?? null,
    easyApply: raw.easyApply === true,
    employerType: raw.employerType ?? null,
    validThrough: details.validThrough ?? null,
    companyLogoUrl: raw.companyLogoUrl ?? null,
  };
}

// A search result, filtered before its job page is loaded.
function toPartialJob(raw) {
  const job = toJob(raw);
  return { ...job, partial: true, raw };
}

export async function completeJob(partial, search, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.raw);
  try {
    return toJob(partial.raw, parseJobPage(await http.getText(partial.raw.detailsPageUrl)));
  } catch (error) {
    // The job was closed after the search listed it.
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
}

// --- Searching ----------------------------------------------------------------------------------

const withParam = (url, key, value) => {
  const next = new URL(url);
  next.searchParams.set(key, value);
  return next.toString();
};

export function chooseSplit(facets, url) {
  const applied = new URL(url).searchParams;
  for (const facetName of SPLIT_FACETS) {
    if (applied.has(`filters.${facetName}`)) continue;
    const facet = facets.find((candidate) => candidate?.facetName === facetName);
    const values = (facet?.facetResults ?? []).filter((value) => value?.count > 0 && value.value != null);
    if (values.length > 1) return { facetName, label: facet.displayName ?? facetName, values };
  }
  return null;
}

async function* searchPages(url, context, depth) {
  const { http, log } = context;
  const first = parseSearchPage(await http.getText(url, { retries: 4 }));
  if (first.total > MAX_PAGES * PAGE_SIZE) {
    const split = depth < MAX_SPLIT_DEPTH ? chooseSplit(first.facets, url) : null;
    if (split) {
      log.info(`${first.total} jobs for ${url}; Dice lists at most ${MAX_PAGES * PAGE_SIZE} per search, so searching each ${split.label.toLowerCase()} separately.`);
      for (const value of split.values) yield* searchPages(withParam(url, `filters.${split.facetName}`, String(value.value)), context, depth + 1);
      return;
    }
    log.warning(`Dice lists at most ${MAX_PAGES * PAGE_SIZE} jobs per search; ${first.total} match ${url}. Add filters to get the rest.`);
  }
  const seen = new Set(first.jobs.map((job) => job.guid));
  yield first.jobs.map(toPartialJob);
  const lastPage = Math.min(MAX_PAGES, Math.ceil(first.total / PAGE_SIZE));
  for (let page = 2; page <= lastPage; page++) {
    const result = parseSearchPage(await http.getText(withParam(url, 'page', String(page)), { retries: 4 }));
    // Past the last page Dice repeats an earlier one.
    if (result.page !== page) break;
    const fresh = result.jobs.filter((job) => !seen.has(job.guid));
    if (fresh.length === 0) break;
    for (const job of fresh) seen.add(job.guid);
    yield fresh.map(toPartialJob);
  }
}

export async function* listJobs(search, context) {
  yield* searchPages(search.url, context, 0);
}
