// LinkedIn Jobs: the public job search LinkedIn shows to visitors who are not logged in. No login
// and no cookies. The guest search lists 10 jobs per page and at most 1,000 per search, so a
// search of the whole United States that reaches the limit is searched again state by state. For
// visitors LinkedIn filters by date, Easy Apply, company and distance, but ignores job type,
// experience level, workplace and sort order; job type and experience level are therefore checked
// on the job page. Job pages add the full description, seniority, employment type, job function,
// industries and the number of applicants. People (job posters, recruiters, employees) are never
// read. LinkedIn limits the requests from each address, so requests go through rotating proxy
// sessions, and an empty or login page is tried again from another address.

import { makeJob } from '../core/job.js';
import { salaryFromText } from '../core/salary.js';
import { cleanText, decodeEntities, htmlToText } from '../core/text.js';

export const name = 'linkedin';
export const title = 'LinkedIn';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const detailConcurrency = 16;
export const proxyFallback = true;

const API = 'https://www.linkedin.com/jobs-guest/jobs/api';
const PAGE_SIZE = 10;
// The guest search serves results up to start=990 and answers 400 beyond.
const MAX_START = 990;
// Search pages loaded at once, each from its own address.
const PAGE_BATCH = 5;

export const EXPERIENCE_LEVELS = { 1: 'Internship', 2: 'Entry level', 3: 'Associate', 4: 'Mid-Senior level', 5: 'Director', 6: 'Executive' };
export const JOB_TYPES = { F: 'Full-time', P: 'Part-time', C: 'Contract', T: 'Temporary', V: 'Volunteer', I: 'Internship', O: 'Other' };
export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
  'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];
const US_GEO_ID = '103644278';

// The search parameters of a LinkedIn link that are kept; tracking and the open job are dropped.
const KEPT_PARAMS = new Set(['keywords', 'location', 'geoId', 'distance', 'sortBy']);
const isKept = (param) => KEPT_PARAMS.has(param) || /^f_[A-Za-z0-9]+$/.test(param);

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// A search as a key: LinkedIn's own search parameters, sorted.
function keyOf(params) {
  const search = new URLSearchParams();
  for (const [param, value] of Object.entries(params)) {
    if (isKept(param) && value != null && String(value).trim() !== '') search.set(param, String(value).trim());
  }
  search.sort();
  return `linkedin://search?${search}`;
}

// The search form of the Actor, as a search key. Job types and experience levels are sent to
// LinkedIn with LinkedIn's own parameters too, in case it applies them again.
export function searchKey({ query = '', location = '', distance, experienceLevels, jobTypes, postedWithinDays, easyApply } = {}) {
  const place = String(location ?? '').trim();
  const days = Number(postedWithinDays);
  return keyOf({
    keywords: query,
    // Without a location LinkedIn refuses the search.
    location: place || 'Worldwide',
    distance: place && Number(distance) > 0 ? Number(distance) : '',
    f_E: toList(experienceLevels).filter((id) => EXPERIENCE_LEVELS[id]).join(','),
    f_JT: toList(jobTypes).filter((id) => JOB_TYPES[id]).join(','),
    // "1 day" means today and yesterday, so LinkedIn is asked for one day more and the rest is filtered.
    f_TPR: days > 0 ? `r${(days + 1) * 86400}` : '',
    f_AL: easyApply === true ? 'true' : '',
  });
}

// A job search link from linkedin.com, such as linkedin.com/jobs/search/?keywords=python&location=Berlin&f_WT=2.
export function fromLinkedInUrl(value) {
  const url = new URL(value);
  if (!/(^|\.)linkedin\.com$/i.test(url.hostname) || !/^\/jobs(?:-guest\/jobs\/api\/seeMoreJobPostings)?\/search\/?$/i.test(url.pathname)) {
    throw new Error('this is not a LinkedIn job search link. Search on linkedin.com/jobs and copy the address, or enter keywords.');
  }
  const params = Object.fromEntries(url.searchParams);
  if (!params.location && !params.geoId) params.location = 'Worldwide';
  return keyOf(params);
}

// Keywords become searches with the form's filters; LinkedIn links are used as they are.
export function prepareInput(raw) {
  const form = {
    location: raw.location,
    distance: raw.distance,
    experienceLevels: raw.experienceLevels,
    jobTypes: raw.jobTypes,
    postedWithinDays: raw.postedWithinDays,
    easyApply: raw.easyApply,
  };
  const searches = toList(raw.searchQueries ?? raw.companies).map((query) => {
    if (/^linkedin:\/\//i.test(query)) return query;
    if (/^https?:\/\//i.test(query)) {
      try {
        return fromLinkedInUrl(query);
      } catch {
        // parseCompany explains what is wrong with the link.
        return query;
      }
    }
    return searchKey({ ...form, query });
  });
  // A location on its own lists every job there.
  if (searches.length === 0 && String(form.location ?? '').trim()) searches.push(searchKey(form));
  return { ...raw, companies: searches };
}

export const exampleInput = { companies: [searchKey({ query: 'python developer', location: 'United States' })], maxItems: 50 };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let key = raw;
  if (/^https?:\/\//i.test(raw)) key = fromLinkedInUrl(raw);
  else if (!/^linkedin:\/\//i.test(raw)) key = searchKey({ query: raw });
  const params = Object.fromEntries(new URL(key.replace(/^linkedin:\/\//i, 'https://linkedin/')).searchParams);
  const where = params.location || `location ${params.geoId}`;
  return { kind: 'search', id: `${params.keywords || 'all jobs'} in ${where}`, key, params };
}

export function searchUrl(params, start = 0) {
  const search = new URLSearchParams(params);
  search.set('start', String(start));
  return `${API}/seeMoreJobPostings/search?${search}`;
}

export const jobPageUrl = (jobId) => `${API}/jobPosting/${jobId}`;
const jobUrlOf = (jobId) => `https://www.linkedin.com/jobs/view/${jobId}/`;

// --- Page data ---------------------------------------------------------------------------

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Elements that have `className` in their class list, as their opening tag and inner HTML. Only
// for elements that contain no element with their own tag name.
function byClass(html, className, tag = '[a-z][a-z0-9]*') {
  const pattern = new RegExp(`<(${tag})\\b[^>]*?\\sclass="(?:[^"]*\\s)?${escapeRe(className)}(?:\\s[^"]*)?"[^>]*>([\\s\\S]*?)</\\1>`, 'gi');
  return [...String(html ?? '').matchAll(pattern)].map((match) => ({ open: match[0].slice(0, match[0].indexOf('>') + 1), inner: match[2] }));
}

const textOf = (element) => (element ? cleanText(htmlToText(element.inner)) : null);
const firstText = (html, className, tag) => textOf(byClass(html, className, tag)[0]);
const hrefOf = (html) => {
  const href = /\shref="([^"]+)"/.exec(html ?? '')?.[1];
  return href ? decodeEntities(href) : null;
};

// A company link such as de.linkedin.com/company/acme?trk=... as the company's id and page.
function companyPage(href) {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://www.linkedin.com');
    const match = /^\/(company|school|showcase)\/([^/?#]+)/.exec(url.pathname);
    return match ? { id: decodeURIComponent(match[2]), url: `https://www.linkedin.com/${match[1]}/${match[2]}` } : null;
  } catch {
    return null;
  }
}

export const hasJobs = (html) => /urn:li:jobPosting:\d+/.test(html);
export const isJobPage = (html) => /top-card-layout__title|decoratedJobPostingId/.test(html);

// The job cards of a search page. A card is a list item; list items inside a card stay with it.
export function parseSearchPage(html) {
  const chunks = [];
  for (const part of String(html ?? '').split(/(?=<li\b)/i)) {
    if (/urn:li:jobPosting:\d+/.test(part) || chunks.length === 0) chunks.push(part);
    else chunks[chunks.length - 1] += part;
  }
  const cards = [];
  for (const chunk of chunks) {
    const jobId = /urn:li:jobPosting:(\d+)/.exec(chunk)?.[1];
    if (!jobId) continue;
    const subtitle = byClass(chunk, 'base-search-card__subtitle')[0];
    const time = /<time\b[^>]*\sdatetime="([^"]*)"[^>]*>([\s\S]*?)<\/time>/i.exec(chunk);
    const logo = /data-delayed-url="(https:\/\/media\.licdn\.com\/[^"]+)"/.exec(chunk)?.[1];
    cards.push({
      jobId,
      title: firstText(chunk, 'base-search-card__title') ?? firstText(chunk, 'sr-only'),
      companyName: textOf(subtitle),
      company: companyPage(hrefOf(subtitle?.inner)),
      location: firstText(chunk, 'job-search-card__location'),
      salaryText: firstText(chunk, 'job-search-card__salary-info'),
      insights: byClass(chunk, 'job-posting-benefits__text').map(textOf).filter(Boolean),
      postedDate: time?.[1] || null,
      postedText: time ? cleanText(htmlToText(time[2])) : null,
      logoUrl: logo ? decodeEntities(logo) : null,
    });
  }
  return cards;
}

// The job description: the inner HTML of its block, which may contain blocks itself.
function descriptionOf(html) {
  const open = /<div\b[^>]*\sclass="(?:[^"]*\s)?show-more-less-html__markup(?:\s[^"]*)?"[^>]*>/i.exec(html);
  if (!open) return null;
  const start = open.index + open[0].length;
  const tags = /<(\/?)div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 1;
  for (let tag = tags.exec(html); tag; tag = tags.exec(html)) {
    depth += tag[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.index).trim() || null;
  }
  return null;
}

// Offsite applications go through linkedin.com/jobs/view/externalApply/<id>?url=<the employer's page>.
function externalApplyUrl(value) {
  try {
    const url = new URL(value);
    return url.searchParams.get('url') || url.toString();
  } catch {
    return null;
  }
}

// Job criteria by their English labels; in another language they come in their usual order.
const CRITERIA = [['seniority', /seniority/i], ['employmentType', /employment/i], ['jobFunction', /function/i], ['industries', /industr/i]];

function criteriaOf(html) {
  const items = byClass(html, 'description__job-criteria-item', 'li').map((item) => [
    firstText(item.inner, 'description__job-criteria-subheader'),
    firstText(item.inner, 'description__job-criteria-text'),
  ]);
  const criteria = {};
  for (const [index, [label, value]] of items.entries()) {
    if (!value) continue;
    const key = CRITERIA.find(([, pattern]) => pattern.test(label ?? ''))?.[0] ?? CRITERIA[index]?.[0];
    if (key && !criteria[key]) criteria[key] = value;
  }
  return criteria;
}

// A job page from the guest API: everything but the people on it.
export function parseJobPage(html) {
  const text = String(html ?? '');
  if (!isJobPage(text)) return null;
  const org = byClass(text, 'topcard__org-name-link', 'a')[0];
  const place = byClass(text, 'topcard__flavor--bullet', 'span').find((element) => !/num-applicants/.test(element.open));
  const applyCode = /<code\b[^>]*\sid="applyUrl"[^>]*>\s*<!--\s*"([^"]+)"\s*-->/i.exec(text)?.[1];
  return {
    title: firstText(text, 'top-card-layout__title'),
    companyName: textOf(org) ?? firstText(text, 'topcard__flavor', 'span'),
    company: companyPage(hrefOf(org?.open)),
    location: textOf(place),
    postedText: firstText(text, 'posted-time-ago__text'),
    applicants: firstText(text, 'num-applicants__caption'),
    salaryText: firstText(text, 'compensation__salary'),
    descriptionHtml: descriptionOf(text),
    ...criteriaOf(text),
    applyUrl: applyCode ? externalApplyUrl(decodeEntities(applyCode)) : null,
    easyApply: /apply-link-onsite/.test(text) ? true : /apply-link-offsite/.test(text) ? false : null,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

const UNIT_MS = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000, month: 2592000000, year: 31536000000 };

// The search result gives the day ("2026-09-27"); "3 hours ago" makes it exact for recent jobs.
export function postedAt(date, text, now = Date.now()) {
  const ago = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(text ?? '');
  const unit = ago?.[2].toLowerCase();
  if (ago && (unit === 'minute' || unit === 'hour' || !date)) return new Date(now - Number(ago[1]) * UNIT_MS[unit]).toISOString();
  return date || null;
}

// "33 applicants" and "Over 200 applicants"; "Be among the first 25 applicants" gives no number.
export function applicantsCountOf(text) {
  if (!text || /first/i.test(text)) return null;
  const number = /(\d[\d,.]*)/.exec(text)?.[1];
  return number ? Number(number.replace(/[,.]/g, '')) : null;
}

// What a search's own filters say about every job it lists. LinkedIn applies Easy Apply for
// visitors, but not workplace, job type or experience level.
export function knownFrom(params = {}) {
  return { easyApply: params.f_AL === 'true' ? true : null };
}

// The job types and experience levels a search asks for, checked on each job page. Returns null
// when the search asks for none.
export function pageFilter(params = {}) {
  const labels = (value, map) => (value ? String(value).split(',').map((id) => map[id]?.toLowerCase()).filter(Boolean) : []);
  const jobTypes = labels(params.f_JT, JOB_TYPES);
  const levels = labels(params.f_E, EXPERIENCE_LEVELS);
  if (jobTypes.length === 0 && levels.length === 0) return null;
  return (page) => Boolean(page)
    && (jobTypes.length === 0 || jobTypes.includes(String(page.employmentType ?? '').toLowerCase()))
    && (levels.length === 0 || levels.includes(String(page.seniority ?? '').toLowerCase()));
}

export function toJob(card, page = null, known = {}) {
  const jobUrl = jobUrlOf(card.jobId);
  const descriptionHtml = page?.descriptionHtml ?? null;
  const descriptionText = descriptionHtml ? htmlToText(descriptionHtml) : null;
  const payText = page?.salaryText ?? card.salaryText;
  const salary = (payText ? salaryFromText(payText, { known: true, source: 'listing' }) : null)
    ?? (descriptionText ? salaryFromText(descriptionText) : null);
  const company = card.company ?? page?.company ?? null;
  const seniority = page?.seniority ?? null;
  const postedText = card.postedText ?? page?.postedText ?? null;
  return {
    ...makeJob({
      ats: name,
      company: company?.id ?? null,
      companyName: card.companyName ?? page?.companyName,
      jobId: card.jobId,
      title: card.title ?? page?.title,
      department: page?.jobFunction,
      location: card.location ?? page?.location,
      employmentType: page?.employmentType,
      salary,
      postedAt: postedAt(card.postedDate, postedText),
      jobUrl,
      applyUrl: page?.applyUrl ?? jobUrl,
      descriptionText,
      descriptionHtml,
    }),
    seniorityLevel: seniority && !/^not applicable$/i.test(seniority) ? seniority : null,
    jobFunction: page?.jobFunction ?? null,
    industries: page?.industries ?? null,
    applicants: page?.applicants ?? null,
    applicantsCount: applicantsCountOf(page?.applicants),
    easyApply: page?.easyApply ?? known.easyApply ?? null,
    insights: card.insights?.length > 0 ? card.insights : null,
    reposted: /repost/i.test(page?.postedText ?? postedText ?? ''),
    companyUrl: company?.url ?? null,
    companyLogoUrl: card.logoUrl ?? null,
  };
}

// A search result, filtered before its job page is loaded.
function toPartialJob(card, known) {
  return { ...toJob(card, null, known), partial: true, card, known };
}

// The job page is loaded for the full details, and also without them when the search asks for job
// types or experience levels, which only the job page shows.
export async function completeJob(partial, source, { http, includeDescription, log }) {
  const filter = pageFilter(source.params);
  if (!includeDescription && !filter) return toJob(partial.card, null, partial.known);
  let page;
  try {
    page = parseJobPage(await http.getText(jobPageUrl(partial.jobId), { rotate: true, accept: isJobPage, retries: 5 }));
  } catch (error) {
    // The job was taken down after the search listed it.
    if (error.status === 404 || error.status === 410) return null;
    // Blocked from every address tried: the search result is still worth saving, unless the
    // filters needed the page.
    log.warning(`${source.id}: could not load the page of job ${partial.jobId} (${error.message}); ${filter ? 'skipping it, as the filters need the page' : 'saving the search result only'}.`);
    return filter ? null : toJob(partial.card, null, partial.known);
  }
  if (filter && !filter(page)) return null;
  return toJob(partial.card, page, partial.known);
}

// --- Searching ----------------------------------------------------------------------------------

const isUnitedStates = (params) => params.geoId === US_GEO_ID || /^(?:united states(?: of america)?|usa?)$/i.test(String(params.location ?? '').trim());

// A search of the whole United States that reaches the limit is searched again in every state.
// Jobs listed for the whole country only (some remote jobs) are found among the first 1,000.
export function stateSearches(params) {
  if (!isUnitedStates(params)) return null;
  const { geoId, distance, ...rest } = params;
  return US_STATES.map((state) => [state, { ...rest, location: `${state}, United States` }]);
}

async function loadPage(http, params, start) {
  try {
    return parseSearchPage(await http.getText(searchUrl(params, start), { rotate: true, accept: hasJobs, retries: 4 }));
  } catch (error) {
    // Still empty from several addresses: the search has no more jobs.
    if (error.blocked) return [];
    throw error;
  }
}

async function* searchPages(source, params, context, seen, label = source.id) {
  const { http, log } = context;
  const known = knownFrom(params);
  let reachedLimit = false;
  batches: for (let first = 0; first <= MAX_START; first += PAGE_SIZE * PAGE_BATCH) {
    const starts = [];
    for (let start = first; start <= MAX_START && starts.length < PAGE_BATCH; start += PAGE_SIZE) starts.push(start);
    const pages = await Promise.all(starts.map((start) => loadPage(http, params, start)));
    for (const [index, cards] of pages.entries()) {
      if (cards.length === 0) break batches;
      if (starts[index] === MAX_START) reachedLimit = true;
      yield cards.filter((card) => !seen.has(card.jobId) && seen.add(card.jobId)).map((card) => toPartialJob(card, known));
    }
  }
  if (!reachedLimit) return;
  const limit = (MAX_START + PAGE_SIZE).toLocaleString('en-US');
  // With job type or experience filters every job page is loaded, so the states are left out:
  // 51 more searches could mean thousands of pages for a few matching jobs.
  const states = pageFilter(params) ? null : stateSearches(params);
  if (!states) {
    log.warning(`${label}: LinkedIn lists at most ${limit} jobs per search. Search by region or city, or use "Posted in the last days", to get the rest.`);
    return;
  }
  log.info(`${label}: LinkedIn lists at most ${limit} jobs per search, so searching each state separately.`);
  for (const [state, next] of states) yield* searchPages(source, next, context, seen, `${label}, ${state}`);
}

export async function* listJobs(source, context) {
  if (pageFilter(source.params)) {
    context.log.info(`${source.id}: LinkedIn does not filter job types and experience levels for visitors, so each job's page is checked.`);
  }
  yield* searchPages(source, source.params, context, new Set());
}
