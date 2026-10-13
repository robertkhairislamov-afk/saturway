// Wellfound (formerly AngelList Talent): startup jobs from Wellfound's public job pages by role,
// location or remote, such as wellfound.com/role/l/software-engineer/new-york. Each page carries
// up to 20 startups with their open jobs, the full description and the company's stage, size and
// badges, so no job pages are opened. Recruiters and their contact details are never read.

import { makeJob } from '../core/job.js';
import { salaryFromText } from '../core/salary.js';
import { cleanText } from '../core/text.js';

export const name = 'wellfound';
export const title = 'Wellfound';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const proxyFallback = true;

const SITE = 'https://wellfound.com';

// Job types Wellfound uses: the Actor's option and its name.
export const JOB_TYPES = { 'full-time': 'Full-time', contract: 'Contract', internship: 'Internship', cofounder: 'Co-founder' };
const SIZES = {
  SIZE_1_10: '1-10', SIZE_11_50: '11-50', SIZE_51_200: '51-200', SIZE_201_500: '201-500',
  SIZE_501_1000: '501-1000', SIZE_1001_5000: '1001-5000', SIZE_5000_PLUS: '5000+',
};
const REMOTE_KINDS = { REMOTE: 'remote', ONSITE: 'onsite', ONSITE_OR_REMOTE: 'onsite or remote' };

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// "Data Scientist" → data-scientist, "San Francisco, CA" → san-francisco.
export function slugOf(text) {
  return String(text ?? '').split(',')[0].normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// The page of a role, a role in a place, a remote role, a place, or all remote jobs.
export function searchUrl({ role = '', location = '', remote = false } = {}) {
  const roleSlug = slugOf(role);
  const place = slugOf(location);
  if (remote) return `${SITE}${roleSlug ? `/role/r/${roleSlug}` : '/remote'}`;
  if (roleSlug && place) return `${SITE}/role/l/${roleSlug}/${place}`;
  if (roleSlug) return `${SITE}/role/${roleSlug}`;
  if (place) return `${SITE}/location/${place}`;
  return null;
}

export function prepareInput(raw) {
  const roles = toList(raw.searchQueries ?? raw.companies);
  const types = toList(raw.jobTypes).filter((type) => JOB_TYPES[type]);
  const form = { location: raw.location, remote: raw.remoteOnly === true };
  const withTypes = (url) => (url && types.length > 0 ? `${url}${url.includes('?') ? '&' : '?'}jobTypes=${types.join(',')}` : url);
  const companies = roles.map((role) => (/^https?:\/\//i.test(role) ? role : withTypes(searchUrl({ ...form, role })))).filter(Boolean);
  // A location or "remote" on its own lists every job there.
  if (companies.length === 0) {
    const url = searchUrl(form);
    if (url) companies.push(withTypes(url));
  }
  // Remote jobs are picked by the page; the shared remote filter would drop "onsite or remote" jobs.
  return { ...raw, companies, remoteOnly: false };
}

export const exampleInput = { companies: [searchUrl({ role: 'software engineer', location: 'New York' })], maxItems: 50 };

const PAGE_PATH = /^\/(?:role\/(?:l\/([a-z0-9-]+)\/([a-z0-9-]+)|r\/([a-z0-9-]+)|([a-z0-9-]+))|location\/([a-z0-9-]+)|(remote))\/?$/;
const unslug = (slug) => slug.replace(/-/g, ' ');

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ role: raw }));
  const host = url.hostname.replace(/^www\./, '');
  const match = /^(wellfound\.com|angel\.co)$/.test(host) ? PAGE_PATH.exec(url.pathname) : null;
  if (!match) throw new Error('this is not a Wellfound job page. Use a role, a location, or a link such as https://wellfound.com/role/l/software-engineer/new-york.');
  const [, lRole, lPlace, rRole, role, place, remote] = match;
  const search = {
    kind: 'search',
    role: lRole ?? rRole ?? role ?? null,
    location: lPlace ?? place ?? null,
    remote: Boolean(rRole || remote),
    jobTypes: toList(String(url.searchParams.get('jobTypes') ?? '').split(',')).filter((type) => JOB_TYPES[type]),
  };
  const path = url.pathname.replace(/\/$/, '');
  const types = [...search.jobTypes].sort();
  const what = search.role ? unslug(search.role) : 'all jobs';
  const where = search.remote ? 'remote' : search.location ? `in ${unslug(search.location)}` : '';
  return {
    ...search,
    path,
    id: [what, where, types.length > 0 ? `(${types.join(', ')})` : ''].filter(Boolean).join(' '),
    key: `${SITE}${path}${types.length > 0 ? `?jobTypes=${types.join(',')}` : ''}`,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

// "$114k – $148k • 0.1% – 1.0%": pay and equity. Indian pay comes in lakhs ("₹10L").
export function compensationOf(text) {
  const [payPart, ...rest] = String(text ?? '').split('•').map((part) => part.trim());
  const payText = /%/.test(payPart) ? '' : payPart;
  const equityText = [payPart, ...rest].find((part) => /%/.test(part)) ?? null;
  const lakhs = payText.replace(/(\d+(?:\.\d+)?)\s*L\b/g, (_, amount) => String(Math.round(Number(amount) * 100000)));
  const salary = payText ? salaryFromText(lakhs, { known: true, source: 'listing' }) : null;
  const percents = equityText ? [...equityText.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1])) : [];
  return {
    salary: salary ? { ...salary, text: payText } : null,
    equity: percents.length > 0 ? { min: percents[0], max: percents[percents.length - 1], text: equityText } : null,
  };
}

const companyBadges = (startup, refs) => (startup?.badges ?? []).map((badge) => refs[badge?.__ref]).filter(Boolean);

export function toJob(raw, startup = {}, badges = []) {
  const kind = raw.remoteConfig?.kind ?? null;
  const remote = raw.remote === true || kind === 'REMOTE';
  const workplace = kind === 'REMOTE' ? 'remote' : kind === 'ONSITE' ? (raw.remoteConfig?.wfhFlexible ? 'hybrid' : 'onsite') : null;
  const { salary, equity } = compensationOf(raw.compensation);
  const locations = (raw.locationNames ?? []).map((place) => cleanText(place)).filter(Boolean);
  const stage = badges.find((badge) => badge.name === 'COMPANY_STAGE_BADGE');
  const job = makeJob({
    ats: name,
    company: startup.slug ?? null,
    companyName: startup.name,
    jobId: raw.id,
    title: raw.title,
    department: raw.primaryRoleTitle,
    location: locations[0] ?? (remote ? 'Remote' : null),
    locations,
    remote,
    workplaceType: workplace,
    employmentType: raw.jobType,
    salary,
    postedAt: Number(raw.liveStartAt) > 0 ? raw.liveStartAt * 1000 : null,
    jobUrl: `${SITE}/jobs/${raw.id}-${raw.slug}`,
    descriptionText: cleanText(raw.description) ? String(raw.description).replace(/\r\n/g, '\n').trim() : null,
    descriptionHtml: null,
  });
  return {
    ...job,
    remotePolicy: REMOTE_KINDS[kind] ?? null,
    workFromHomeFlexible: raw.remoteConfig ? raw.remoteConfig.wfhFlexible === true : null,
    remoteLocations: (raw.acceptedRemoteLocationNames ?? []).map((place) => cleanText(place)).filter(Boolean),
    equity,
    experienceYearsMin: Number.isFinite(raw.yearsExperienceMin) ? raw.yearsExperienceMin : null,
    experienceYearsMax: Number.isFinite(raw.yearsExperienceMax) ? raw.yearsExperienceMax : null,
    companyPitch: cleanText(startup.highConcept),
    companySize: SIZES[startup.companySize] ?? null,
    companyStage: stage?.label ?? null,
    companyBadges: badges.filter((badge) => badge !== stage).map((badge) => badge.label).filter(Boolean),
    companyLogo: startup.logoUrl ?? null,
    companyUrl: startup.slug ? `${SITE}/company/${startup.slug}` : null,
  };
}

// The jobs of one page with their startups, from the page's Apollo data.
export function jobsOfPage(data) {
  const refs = data?.props?.pageProps?.apolloState?.data ?? {};
  const talent = refs.ROOT_QUERY?.talent ?? {};
  const resultsKey = Object.keys(talent).find((key) => key.startsWith('seoLandingPageJobSearchResults'));
  const results = resultsKey ? talent[resultsKey] : null;
  const jobs = [];
  for (const ref of results?.startups ?? []) {
    const startup = refs[ref?.__ref];
    if (!startup) continue;
    const badges = companyBadges(startup, refs);
    for (const jobRef of startup.highlightedJobListings ?? []) {
      const raw = refs[jobRef?.__ref];
      if (raw?.id) jobs.push(toJob(raw, startup, badges));
    }
  }
  return { jobs, pageCount: results?.pageCount ?? null, total: results?.totalJobCount ?? null };
}

const NEXT_DATA = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

// Which part of the search Wellfound does not know, judged by the page it redirects to.
function unknownPage(search, location) {
  const target = String(location ?? '');
  const roleKnown = search.role && target.includes(`/${search.role}`);
  if (search.role && !roleKnown) return `Wellfound has no jobs page for the role "${unslug(search.role)}". Roles are Wellfound's job titles, such as "software engineer", "data scientist", "product manager" or "account executive".`;
  return `Wellfound has no jobs page for the place "${unslug(search.location ?? '')}". Use a city, such as "new york", "san francisco", "london" or "bangalore", or a country, such as "united states" or "india".`;
}

export async function* listJobs(search, context) {
  const { http, log } = context;
  let pageCount = 1;
  for (let page = 1; page <= pageCount; page += 1) {
    const url = `${SITE}${search.path}${page > 1 ? `?page=${page}` : ''}`;
    let html;
    try {
      // Wellfound's security check page has no job data; it is retried like a rate limit. An
      // unknown role or place is redirected to a wider page, which is not what was asked for.
      html = await http.getText(url, { accept: (text) => NEXT_DATA.test(text), retries: 4, redirect: 'manual' });
    } catch (error) {
      if (error.status === 404 || (error.status >= 300 && error.status < 400)) throw new Error(unknownPage(search, error.location));
      throw error;
    }
    const { jobs, pageCount: pages, total } = jobsOfPage(JSON.parse(NEXT_DATA.exec(html)[1]));
    if (page === 1) {
      pageCount = pages ?? 1;
      log.info(`${search.id}: Wellfound lists ${total ?? 'some'} jobs on ${pageCount} pages, showing up to 3 jobs per startup.`);
    }
    if (jobs.length === 0) break;
    // Wellfound's pages have no job type filter, so the types are picked here.
    yield search.jobTypes.length > 0 ? jobs.filter((job) => search.jobTypes.includes(job.employmentType)) : jobs;
  }
}

// The same job found by two searches is saved once.
export const dedupeKey = (job) => job.jobId;
