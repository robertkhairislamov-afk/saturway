// StepStone (stepstone.de): job search pages. The result list is read from the page's preloaded
// state, 25 jobs per page; StepStone serves every page of a search, so nothing needs splitting.
// Job pages add the full description, expiry date, employment type and industry (schema.org
// JobPosting). Contact details of recruiters are never read.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval, salaryFromText } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'stepstone';
export const title = 'StepStone';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const detailConcurrency = 6;
export const proxyFallback = true;

const SITE = 'https://www.stepstone.de';
const PAGE_SIZE = 25;

export const CONTRACT_TYPES = {
  222: 'Permanent',
  223: 'Fixed-term',
  220: 'Temporary agency work',
  225: 'Freelance or project',
  224: 'Entry level or trainee',
  229: 'Working student',
  228: 'Internship',
  226: 'Apprenticeship or dual study',
  227: 'Thesis (bachelor, master)',
  230: 'PhD or habilitation',
};
export const WORK_TYPES = { vollzeit: 'Full-time', teilzeit: 'Part-time' };
export const REMOTE_TYPES = { 2: 'Partly from home', 1: 'Fully remote' };
export const EXPERIENCE = { 90001: 'No experience needed', 90002: 'With experience', 90003: 'With management responsibility' };
export const LANGUAGES = { de: 'German', en: 'English' };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const slug = (text) => String(text).trim().toLowerCase().replace(/\s+/g, '-');
const unslug = (segment) => decodeURIComponent(segment).replace(/-/g, ' ');

// The search form of the Actor, as a stepstone.de search link.
export function searchUrl({ query = '', location = '', radius, contractTypes, workTypes, remoteTypes, experience, languages, postedWithinDays, sortBy } = {}) {
  const segments = ['jobs'];
  const types = toList(workTypes).filter((type) => WORK_TYPES[type]);
  if (types.length === 1) segments.push(types[0]);
  if (String(query).trim()) segments.push(slug(query));
  if (String(location).trim()) segments.push(`in-${slug(location)}`);
  const params = new URLSearchParams();
  if (String(location).trim() && Number(radius) > 0) params.set('radius', String(Number(radius)));
  for (const id of toList(contractTypes).filter((type) => CONTRACT_TYPES[type])) params.append('ct', id);
  for (const id of toList(remoteTypes).filter((type) => REMOTE_TYPES[type])) params.append('wfh', id);
  for (const id of toList(experience).filter((level) => EXPERIENCE[level])) params.append('ex', id);
  for (const id of toList(languages).filter((language) => LANGUAGES[language])) params.append('fdl', id);
  // StepStone only offers "24 hours" and "7 days"; "1 day" here means today and yesterday.
  const days = Number(postedWithinDays);
  if (days > 0 && days <= 7) params.set('ag', 'age_7');
  params.set('sort', sortBy === 'relevance' ? '1' : '2');
  return `${SITE}/${segments.map(encodeURIComponent).join('/')}?${params}`;
}

// Keywords become searches with the form's filters; stepstone.de links are used as they are.
export function prepareInput(raw) {
  const form = {
    location: String(raw.location ?? '').trim(),
    radius: raw.radius,
    contractTypes: raw.contractTypes,
    workTypes: raw.workTypes,
    remoteTypes: raw.remoteTypes,
    experience: raw.experience,
    languages: raw.languages,
    postedWithinDays: raw.postedWithinDays,
    sortBy: raw.sortBy,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A location on its own lists every job there.
  if (companies.length === 0 && form.location) companies.push(searchUrl(form));
  return { ...raw, companies };
}

export const exampleInput = { companies: [searchUrl({ query: 'python developer' })], maxItems: 50 };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  if (!/(^|\.)stepstone\.de$/i.test(url.hostname) || !/^\/jobs(\/|$)/i.test(url.pathname)) {
    throw new Error('this is not a StepStone search link. Search on stepstone.de and copy the address, or enter keywords.');
  }
  for (const param of ['page', 'action', 'of', 'rltr']) url.searchParams.delete(param);
  url.searchParams.sort();
  const segments = url.pathname.split('/').filter(Boolean).slice(1).filter((segment) => !WORK_TYPES[segment]);
  const place = segments.find((segment) => /^in-/i.test(segment));
  const keywords = segments.filter((segment) => segment !== place).map(unslug).join(' ');
  const label = `${keywords || 'all jobs'}${place ? ` in ${unslug(place.slice(3))}` : ''}`;
  return { id: label, key: url.toString(), url: url.toString() };
}

// --- Page data ---------------------------------------------------------------------------

// The JSON object assigned after a marker in a script, read by matching braces outside strings.
export function objectAfter(html, marker) {
  const text = String(html);
  const at = text.indexOf(marker);
  if (at < 0) return null;
  const start = text.indexOf('{', at + marker.length);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i >= 0 && i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  return null;
}

export function parseSearchPage(html) {
  const results = objectAfter(html, '__PRELOADED_STATE__["app-unifiedResultlist"] =')?.searchResults;
  if (!Array.isArray(results?.items)) throw new Error('The page is not a StepStone search result page.');
  // Some page versions only have "unifiedPagination"; the page count then follows from the total.
  const pagination = results.pagination ?? results.unifiedPagination ?? {};
  const total = Number(results.meta?.total ?? pagination.totalCount) || 0;
  return {
    jobs: results.items.filter((item) => item?.id && item.url),
    page: Number(pagination.page) || null,
    pageCount: Number(pagination.pageCount) || Math.ceil(total / PAGE_SIZE),
    total,
  };
}

// The job page's JobPosting data; nothing else from the page is read.
export function parseJobPage(html) {
  for (const [, json] of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(json);
      if (data?.['@type'] === 'JobPosting') return data;
    } catch {
      // Not valid JSON.
    }
  }
  return null;
}

// --- Jobs ------------------------------------------------------------------------------------

const WORKPLACE = { 1: 'remote', 2: 'hybrid' };
const listItems = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map(([, item]) => cleanText(htmlToText(item))).filter(Boolean);

function salaryOf(raw, posting) {
  const pay = raw.unifiedSalary;
  if (pay?.min > 0 || pay?.max > 0) {
    return makeSalary({ min: pay.min, max: pay.max, currency: pay.currency || 'EUR', interval: normalizeInterval(pay.period), source: 'listing' });
  }
  const base = posting?.baseSalary;
  const value = base?.value ?? {};
  if (value.minValue > 0 || value.maxValue > 0 || value.value > 0) {
    return makeSalary({
      min: value.minValue ?? value.value,
      max: value.maxValue ?? value.value,
      currency: base.currency || 'EUR',
      interval: normalizeInterval(value.unitText),
      source: 'listing',
    });
  }
  return posting?.description ? salaryFromText(htmlToText(posting.description)) : null;
}

export function toJob(raw, posting = null) {
  const jobUrl = `${SITE}${String(raw.url).split('?')[0]}`;
  const types = [].concat(posting?.employmentType ?? []);
  const locations = String(raw.location ?? '').split(/,\s*/).map(cleanText).filter(Boolean);
  const snippetHtml = raw.textSnippet ? `<p>${String(raw.textSnippet).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n+/g, '</p><p>')}</p>` : '';
  const descriptionHtml = posting?.description ?? (snippetHtml || null);
  const labels = [...(raw.labels ?? []), ...(raw.topLabels ?? [])].map((label) => label?.type);
  const job = makeJob({
      ats: name,
      company: raw.companyId != null ? String(raw.companyId) : null,
      companyName: raw.isAnonymous ? null : raw.companyName ?? posting?.hiringOrganization?.name,
      jobId: raw.id,
      title: raw.title ?? posting?.title,
      location: raw.location,
      locations,
      remote: raw.workFromHome === '1',
      workplaceType: WORKPLACE[raw.workFromHome] ?? null,
      employmentType: types[0] ?? null,
      salary: salaryOf(raw, posting),
      postedAt: raw.datePosted ?? posting?.datePosted,
      jobUrl,
      applyUrl: jobUrl,
      descriptionText: descriptionHtml ? htmlToText(descriptionHtml) : null,
      descriptionHtml,
  });
  return {
    ...job,
    // Each city once, not the whole "Berlin, Hamburg" text as well.
    locations: locations.length > 0 ? locations : job.locations,
    benefits: raw.jobBenefitsHtml ? listItems(raw.jobBenefitsHtml) : null,
    skills: Array.isArray(raw.skills) && raw.skills.length > 0 ? raw.skills.map((skill) => cleanText(skill?.name ?? skill)).filter(Boolean) : null,
    industry: cleanText(posting?.industry) ?? null,
    quickApply: labels.includes('QUICK_APPLY'),
    noCoverLetter: labels.includes('NO_COVER_LETTER'),
    validThrough: posting?.validThrough ?? null,
    companyUrl: raw.companyUrl ?? null,
    companyLogoUrl: raw.companyLogoUrl ?? null,
  };
}

// A search result, filtered before its job page is loaded.
function toPartialJob(raw) {
  return { ...toJob(raw), partial: true, raw };
}

export async function completeJob(partial, search, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.raw);
  try {
    return toJob(partial.raw, parseJobPage(await http.getText(partial.jobUrl, { retries: 4 })));
  } catch (error) {
    // The job was taken down after the search listed it.
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
}

// --- Searching ----------------------------------------------------------------------------------

const pageUrl = (url, page) => {
  const next = new URL(url);
  if (page > 1) next.searchParams.set('page', String(page));
  return next.toString();
};

export async function* listJobs(search, context) {
  const { http, log } = context;
  const seen = new Set();
  for (let page = 1; ; page++) {
    const result = parseSearchPage(await http.getText(pageUrl(search.url, page), { retries: 4 }));
    // Past the last page StepStone shows the last one again, or nothing.
    if ((result.page && result.page !== page) || result.jobs.length === 0) {
      if (page <= result.pageCount) log.warning(`${search.id}: StepStone sent page ${result.page ?? '?'} with ${result.jobs.length} jobs instead of page ${page} of ${result.pageCount}.`);
      break;
    }
    if (page === 1) log.info(`${search.id}: ${result.total} jobs on ${result.pageCount} pages.`);
    const fresh = result.jobs.filter((job) => !seen.has(job.id) && seen.add(job.id));
    yield fresh.map(toPartialJob);
    if (result.pageCount > 0 && page >= result.pageCount) break;
  }
}
