// Welcome to the Jungle: the public job API behind welcometothejungle.com. A search returns at
// most 100 jobs (10 pages of 10), so bigger searches are split by country, contract type and
// experience level. Company pages list all jobs of a company. Job details add the description,
// skills, tools and profession. The API holds no recruiter contact details.

import { makeJob } from '../core/job.js';
import { fixStatedUnits, makeSalary, normalizeInterval, yearlyMax } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'wttj';
export const title = 'Welcome to the Jungle';
export const sourceNames = ['search or company', 'searches and companies'];
export const sourceKinds = { search: ['search', 'searches'], company: ['company', 'companies'] };
export const companyConcurrency = 2;
export const detailConcurrency = 6;
export const proxyFallback = true;

const API = 'https://api.welcometothejungle.com/api/v3';
const SITE = 'https://www.welcometothejungle.com';
const SEARCH_PAGE_SIZE = 10;
const SEARCH_MAX_PAGES = 10;

export const CONTRACT_TYPES = ['full_time', 'part_time', 'internship', 'apprenticeship', 'freelance', 'temporary', 'vie', 'graduate_program', 'volunteer', 'idv', 'other'];
export const EXPERIENCE_LEVELS = ['zero_to_one', 'one_to_three', 'three_to_five', 'five_to_ten', 'more_than_ten'];
export const REMOTE_TYPES = ['fulltime', 'partial', 'punctual', 'no'];

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code) => {
  try {
    return code ? countryNames.of(String(code).toUpperCase()) : null;
  } catch {
    return code;
  }
};

// --- Sources ------------------------------------------------------------------------------------
// Searches and companies travel through the shared code as wttj:// keys.

export function searchKey({ query, countries = [], contractTypes = [], experienceLevels = [], remoteTypes = [], minSalary, onlyWithSalary }) {
  const params = new URLSearchParams({ q: query });
  for (const country of toList(countries)) params.append('country', country.toUpperCase());
  for (const type of toList(contractTypes)) params.append('contract', type);
  for (const level of toList(experienceLevels)) params.append('experience', level);
  for (const remote of toList(remoteTypes)) params.append('remote', remote);
  if (Number(minSalary) > 0) params.set('salary', String(Number(minSalary)));
  if (onlyWithSalary) params.set('withSalary', '1');
  return `wttj://search?${params}`;
}

// A company slug ("doctolib") or a company or job link on welcometothejungle.com.
export function companySlug(value) {
  const raw = String(value ?? '').trim();
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z0-9][a-z0-9-]*$/i.test(raw)) return raw.toLowerCase();
    throw new Error(`"${raw}" is not a Welcome to the Jungle company. Use the name from the company link, such as "doctolib".`);
  }
  const url = new URL(raw);
  const parts = url.pathname.split('/').filter(Boolean);
  const at = parts.indexOf('companies');
  if (!/(^|\.)welcometothejungle\.com$/i.test(url.hostname) || at < 0 || !parts[at + 1]) {
    throw new Error(`"${raw}" is not a Welcome to the Jungle company link. Open the company page and copy its address.`);
  }
  return parts[at + 1].toLowerCase();
}

// Keywords become searches with the form's filters; companies are listed in full, filtered locally.
export function prepareInput(raw) {
  const form = {
    countries: raw.countries,
    contractTypes: raw.contractTypes,
    experienceLevels: raw.experienceLevels,
    remoteTypes: raw.remoteTypes,
    minSalary: raw.minSalary,
    onlyWithSalary: raw.onlyWithSalary === true,
  };
  const queryOf = (value) => {
    if (!/^https?:\/\//i.test(value)) return value;
    const url = new URL(value);
    return url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
  };
  const searches = toList(raw.searchQueries).map((value) => searchKey({ ...form, query: queryOf(value) }));
  const filters = new URLSearchParams(searchKey({ ...form, query: '' }).split('?')[1]);
  filters.delete('q');
  const companies = toList(raw.companies).map((value) => {
    if (value.startsWith('wttj://')) return value;
    try {
      return `wttj://company/${companySlug(value)}${filters.size > 0 ? `?${filters}` : ''}`;
    } catch {
      return value;
    }
  });
  return { ...raw, companies: [...searches, ...companies] };
}

export const exampleInput = { companies: [searchKey({ query: 'python developer' })], maxItems: 50 };

function readFilters(params) {
  return {
    countries: params.getAll('country'),
    contractTypes: params.getAll('contract').filter((type) => CONTRACT_TYPES.includes(type)),
    experienceLevels: params.getAll('experience').filter((level) => EXPERIENCE_LEVELS.includes(level)),
    remoteTypes: params.getAll('remote').filter((remote) => REMOTE_TYPES.includes(remote)),
    minSalary: Number(params.get('salary')) || 0,
    onlyWithSalary: params.get('withSalary') === '1',
  };
}

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  if (raw.startsWith('wttj://search?')) {
    const params = new URLSearchParams(raw.slice('wttj://search?'.length));
    const query = params.get('q')?.trim();
    if (!query) throw new Error('Welcome to the Jungle searches need keywords, for example "python developer".');
    const filters = readFilters(params);
    return { kind: 'search', id: [query, filters.countries.join('+')].filter(Boolean).join(' in '), key: raw, query, filters };
  }
  const [slugPart, query = ''] = (raw.startsWith('wttj://company/') ? raw.slice('wttj://company/'.length) : companySlug(raw)).split('?');
  const slug = companySlug(slugPart);
  return { kind: 'company', id: slug, key: `wttj://company/${slug}`, slug, filters: readFilters(new URLSearchParams(query)) };
}

// --- Jobs -----------------------------------------------------------------------------------------

// Contract types without a shared name keep a readable form: VIE is an international internship.
const CONTRACT_NAMES = { vie: 'VIE', idv: 'IDV', graduate_program: 'graduate program' };
const readableContract = (type) => CONTRACT_NAMES[type] ?? type;
// French degree levels: Bac+5 is a master's degree.
const EDUCATION = {
  no_diploma: 'No degree', bac: 'Bac (high school)', bac_2: 'Bac+2', bac_3: 'Bac+3 (bachelor)', bac_4: 'Bac+4', bac_5: 'Bac+5 (master)', phd: 'PhD',
};
const WORKPLACE = { fulltime: 'remote', partial: 'hybrid', punctual: 'hybrid', no: 'onsite' };

const placeOf = (office) => [office?.city, countryName(office?.country_code)].filter(Boolean).join(', ') || null;
const jobUrlOf = (raw) => `${SITE}/en/companies/${raw.organization?.slug}/jobs/${raw.slug}`;
// Skills carry their name in several languages: { name: { en, fr, ... } }.
const nameOf = (item) => {
  const value = item?.name ?? item;
  return cleanText(value && typeof value === 'object' ? value.en ?? value.fr ?? Object.values(value)[0] : value);
};
const names = (list) => (Array.isArray(list) ? [...new Set(list.map(nameOf).filter(Boolean))] : []);
const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Companies type the salary in themselves, so obvious unit slips ("45" a year) are fixed.
function salaryOf(raw) {
  if (!(raw.salary_min > 0 || raw.salary_max > 0)) return null;
  const fixed = fixStatedUnits({
    min: raw.salary_min > 0 ? raw.salary_min : null,
    max: raw.salary_max > 0 ? raw.salary_max : null,
    currency: raw.salary_currency,
    interval: normalizeInterval(raw.salary_period),
  });
  return fixed && makeSalary({ ...fixed, currency: raw.salary_currency, source: 'listing' });
}

export function toJob(raw, details = null) {
  const job = details ?? {};
  const offices = job.offices ?? raw.offices ?? (raw.office ? [raw.office] : []);
  const profession = job.profession?.sub_category_name?.en ?? job.profession?.category_name?.en ?? null;
  const missions = Array.isArray(job.key_missions) && job.key_missions.length > 0
    ? `<h3>Key missions</h3><ul>${job.key_missions.map((mission) => `<li>${escapeHtml(mission)}</li>`).join('')}</ul>`
    : null;
  const sections = [job.description, missions, job.looking_for_candidate_description, job.recruitment_process]
    .filter((part) => typeof part === 'string' && part.trim());
  const descriptionHtml = sections.length > 0 ? sections.join('\n') : null;
  return {
    ...makeJob({
      ats: name,
      company: raw.organization?.slug ?? null,
      companyName: raw.organization?.name,
      jobId: raw.reference ?? job.wttj_reference,
      requisitionId: raw.wk_reference ?? null,
      title: raw.name ?? job.name,
      department: profession,
      location: placeOf(offices[0]),
      locations: offices.map(placeOf),
      remote: (job.remote ?? raw.remote) === 'fulltime',
      workplaceType: WORKPLACE[job.remote ?? raw.remote] ?? null,
      employmentType: readableContract(job.contract_type ?? raw.contract_type),
      salary: salaryOf(details ?? raw) ?? salaryOf(raw),
      postedAt: raw.published_at ?? job.published_at,
      updatedAt: raw.updated_at ?? job.updated_at,
      jobUrl: jobUrlOf(raw),
      applyUrl: job.apply_url || jobUrlOf(raw),
      descriptionText: descriptionHtml ? htmlToText(descriptionHtml) : null,
      descriptionHtml,
    }),
    skills: details ? names(job.skills) : null,
    tools: details ? names(job.tools) : null,
    experienceLevel: job.experience_level ? String(job.experience_level).toLowerCase().replace(/_/g, ' ') : null,
    educationLevel: EDUCATION[job.education_level] ?? job.education_level ?? null,
    contractDurationMonths: job.contract_duration_min || job.contract_duration_max
      ? { min: job.contract_duration_min ?? null, max: job.contract_duration_max ?? null }
      : null,
    startDate: job.start_date ?? null,
    language: job.language ?? null,
    companyIndustry: cleanText(raw.organization?.industry),
    companySize: raw.organization?.nb_employees ?? null,
    companySummary: cleanText(raw.company_summary),
    companyLogoUrl: raw.organization?.logo?.url ?? null,
  };
}

// Filters the API does not apply itself (remote type; all filters for company listings).
export function matchesFilters(raw, filters, { serverFiltered }) {
  if (filters.remoteTypes.length > 0 && !filters.remoteTypes.includes(raw.remote)) return false;
  if (serverFiltered) return true;
  if (filters.contractTypes.length > 0 && !filters.contractTypes.includes(raw.contract_type)) return false;
  const countries = (raw.offices ?? [raw.office]).map((office) => office?.country_code?.toUpperCase()).filter(Boolean);
  if (filters.countries.length > 0 && !countries.some((code) => filters.countries.includes(code))) return false;
  // Like the API: monthly pay counts as its yearly amount.
  const pay = yearlyMax(salaryOf(raw));
  if ((filters.onlyWithSalary || filters.minSalary > 0) && !(pay > 0)) return false;
  if (filters.minSalary > 0 && pay < filters.minSalary) return false;
  return true;
}

function toPartialJob(raw) {
  return { ...toJob(raw), partial: true, raw };
}

export async function completeJob(partial, source, { http, includeDescription }) {
  if (!includeDescription) return toJob(partial.raw);
  const { organization, slug } = partial.raw;
  try {
    const data = await http.getJson(`${API}/organizations/${encodeURIComponent(organization.slug)}/jobs/${encodeURIComponent(slug)}`);
    return toJob(partial.raw, data?.job ?? null);
  } catch (error) {
    // The job was closed after the search listed it.
    if (error.status === 404 || error.status === 410) return null;
    throw error;
  }
}

// --- Searching ----------------------------------------------------------------------------------

export function searchUrl(query, filters, page = 1) {
  const params = new URLSearchParams({ job_title: query });
  for (const type of filters.contractTypes) params.append('contract_type[]', type);
  for (const level of filters.experienceLevels) params.append('experience_level[]', level);
  if (filters.countries.length > 0) params.set('locations', JSON.stringify(filters.countries.map((code) => ({ country_code: code }))));
  if (filters.minSalary > 0) params.set('salary', String(filters.minSalary));
  if (filters.onlyWithSalary || filters.minSalary > 0) params.set('include_empty_salary', 'false');
  if (page > 1) params.set('page', String(page));
  return `${API}/public/jobs?${params}`;
}

// Countries and contract types divide a search cleanly; experience levels overlap but reach further.
export function chooseSplit(filters) {
  const split = (dimension, key, values) => [dimension, values.map((value) => [value, { ...filters, [key]: [value] }])];
  if (filters.countries.length > 1) return split('country', 'countries', filters.countries);
  if (filters.contractTypes.length !== 1) {
    return split('contract type', 'contractTypes', filters.contractTypes.length > 0 ? filters.contractTypes : CONTRACT_TYPES);
  }
  if (filters.experienceLevels.length !== 1) {
    return split('experience level', 'experienceLevels', filters.experienceLevels.length > 0 ? filters.experienceLevels : EXPERIENCE_LEVELS);
  }
  return null;
}

async function* searchPages(source, filters, context, label = source.id) {
  const { http, log } = context;
  const first = await http.getJson(searchUrl(source.query, filters));
  const total = Number(first?.metadata?.total) || 0;
  const limit = SEARCH_PAGE_SIZE * SEARCH_MAX_PAGES;
  const split = total > limit ? chooseSplit(filters) : null;
  if (split) {
    const [dimension, parts] = split;
    log.info(`${label}: ${total} jobs; Welcome to the Jungle lists at most ${limit} per search, so searching each ${dimension} separately.`);
    for (const [value, next] of parts) yield* searchPages(source, next, context, `${label}, ${value}`);
    return;
  }
  if (total > limit) {
    log.warning(`${label}: Welcome to the Jungle lists at most ${limit} jobs per search; ${total} match. Add countries or more precise keywords to get the rest.`);
  }
  const pages = Math.min(SEARCH_MAX_PAGES, Math.ceil(total / SEARCH_PAGE_SIZE));
  const keep = (list) => (list ?? []).filter((raw) => raw?.reference && matchesFilters(raw, filters, { serverFiltered: true }));
  yield keep(first?.data).map(toPartialJob);
  for (let page = 2; page <= pages; page++) {
    const result = await http.getJson(searchUrl(source.query, filters, page));
    // Past the last page the API repeats the tenth one.
    if (Number(result?.metadata?.page) !== page) break;
    yield keep(result?.data).map(toPartialJob);
  }
}

async function* companyPages(source, context) {
  const { http } = context;
  for (let page = 1; ; page++) {
    let result;
    try {
      result = await http.getJson(`${API}/organizations/${encodeURIComponent(source.slug)}/jobs?page=${page}`);
    } catch (error) {
      if (error.status === 404 && page === 1) {
        throw new Error(`Welcome to the Jungle company "${source.slug}" was not found. Check the name in welcometothejungle.com/en/companies/<name>.`);
      }
      throw error;
    }
    const jobs = (result?.data ?? []).filter((raw) => raw?.reference && matchesFilters(raw, source.filters, { serverFiltered: false }));
    yield jobs.map(toPartialJob);
    const pageCount = Number(result?.metadata?.page_count) || 1;
    if (page >= pageCount || Number(result?.metadata?.page) !== page) break;
  }
}

export async function* listJobs(source, context) {
  if (source.kind === 'company') yield* companyPages(source, context);
  else yield* searchPages(source, source.filters, context);
}
