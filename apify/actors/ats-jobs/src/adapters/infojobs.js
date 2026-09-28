// InfoJobs (infojobs.net): Spanish jobs through the search API behind the website, 20 jobs per page
// with the full description, salary as numbers, contract type, working hours and remote policy.
// Every page of a search is served, so nothing needs splitting, and no job page is needed.

import { makeJob } from '../core/job.js';
import { makeSalary, normalizeInterval } from '../core/salary.js';
import { cleanText } from '../core/text.js';

export const name = 'infojobs';
export const title = 'InfoJobs';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 2;
export const proxyFallback = true;

const SITE = 'https://www.infojobs.net';
const API = `${SITE}/webapp/offers/search`;

export const PROVINCES = {
  2: 'Álava/Araba', 3: 'Albacete', 4: 'Alicante/Alacant', 5: 'Almería', 6: 'Asturias', 7: 'Ávila', 8: 'Badajoz', 9: 'Barcelona',
  10: 'Burgos', 11: 'Cáceres', 12: 'Cádiz', 13: 'Cantabria', 14: 'Castellón/Castelló', 15: 'Ceuta', 16: 'Ciudad Real', 17: 'Córdoba',
  18: 'Cuenca', 19: 'Girona', 20: 'Las Palmas', 21: 'Granada', 22: 'Guadalajara', 23: 'Guipúzcoa/Gipuzkoa', 24: 'Huelva', 25: 'Huesca',
  26: 'Islas Baleares/Illes Balears', 27: 'Jaén', 28: 'A Coruña', 29: 'La Rioja', 30: 'León', 31: 'Lleida', 32: 'Lugo', 33: 'Madrid',
  34: 'Málaga', 35: 'Melilla', 36: 'Murcia', 37: 'Navarra', 38: 'Ourense', 39: 'Palencia', 40: 'Pontevedra', 41: 'Salamanca',
  42: 'Segovia', 43: 'Sevilla', 44: 'Soria', 45: 'Tarragona', 46: 'Santa Cruz de Tenerife', 47: 'Teruel', 48: 'Toledo',
  49: 'Valencia/València', 50: 'Valladolid', 51: 'Vizcaya/Bizkaia', 52: 'Zamora', 53: 'Zaragoza',
};
export const CATEGORIES = {
  10: 'Business administration', 20: 'Public administration', 30: 'Quality, production and R&D', 40: 'Purchasing, logistics and warehouse',
  50: 'Design and graphic arts', 60: 'Education and training', 70: 'Finance and banking', 80: 'Engineers and technicians',
  90: 'Real estate and construction', 100: 'Legal', 110: 'Marketing and communication', 120: 'Trades, arts and crafts',
  130: 'Human resources', 140: 'Healthcare', 150: 'IT and telecoms', 160: 'Tourism and hospitality', 170: 'Customer service',
  180: 'Other', 190: 'Sales', 200: 'Retail', 210: 'Pharmaceutical',
};
export const TELEWORKING = { 1: 'On-site', 3: 'Hybrid', 2: 'Remote only' };
export const CONTRACT_TYPES = {
  1: 'Permanent', 8: 'Fixed-term', 9: 'Seasonal permanent (fijo discontinuo)', 4: 'Part-time contract', 3: 'Training',
  6: 'Relief (de relevo)', 10: 'Self-employed', 5: 'Other',
};
export const WORKDAYS = {
  1: 'Full day', 6: 'Intensive, morning', 7: 'Intensive, afternoon', 8: 'Intensive, night', 9: 'Intensive, any time',
  2: 'Part-time, morning', 3: 'Part-time, afternoon', 4: 'Part-time, night', 5: 'Part-time, any time', 10: 'Any',
};
const LISTS = { provinceIds: PROVINCES, categoryIds: CATEGORIES, teleworkingIds: TELEWORKING, contractTypeIds: CONTRACT_TYPES, workdayIds: WORKDAYS };
const SEARCH_PARAMS = ['keyword', ...Object.keys(LISTS), 'sinceDate', 'sortBy'];

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// InfoJobs offers "24 hours", "7 days" and "15 days"; the rest is filtered after the search.
// "1 day" means today and yesterday, so it takes 7 days.
function sinceDate(days) {
  const value = Number(days);
  if (!(value > 0) || value > 15) return '';
  return value <= 7 ? '_7_DAYS' : '_15_DAYS';
}

// A search as a key: the API's own parameters, sorted; lists keep one parameter per value.
function keyOf(params) {
  const search = new URLSearchParams();
  for (const param of SEARCH_PARAMS) {
    for (const value of toList(params[param])) search.append(param, value);
  }
  search.sort();
  return `infojobs://search?${search}`;
}

// The search form of the Actor, as a search key.
export function searchKey({ query = '', provinces, categories, teleworking, contractTypes, workdays, postedWithinDays, sortBy } = {}) {
  const valid = (values, map) => toList(values).filter((id) => map[id]);
  return keyOf({
    keyword: query,
    provinceIds: valid(provinces, PROVINCES),
    categoryIds: valid(categories, CATEGORIES),
    teleworkingIds: valid(teleworking, TELEWORKING),
    contractTypeIds: valid(contractTypes, CONTRACT_TYPES),
    workdayIds: valid(workdays, WORKDAYS),
    sinceDate: sinceDate(postedWithinDays),
    sortBy: sortBy === 'RELEVANCE' ? 'RELEVANCE' : 'PUBLICATION_DATE',
  });
}

// A search link from infojobs.net, such as infojobs.net/jobsearch/search-results/list.xhtml?keyword=python&provinceIds=33.
export function fromInfoJobsUrl(value) {
  const url = new URL(value);
  if (!/(^|\.)infojobs\.net$/i.test(url.hostname) || !/search-results|\/webapp\/offers\/search/i.test(url.pathname)) {
    throw new Error('this is not an InfoJobs search link. Search on infojobs.net and copy the address, or enter keywords.');
  }
  const params = Object.fromEntries(SEARCH_PARAMS.map((param) => [param, url.searchParams.getAll(param).flatMap((item) => item.split(','))]));
  return keyOf(params);
}

// Keywords become searches with the form's filters; infojobs.net links are used as they are.
export function prepareInput(raw) {
  const form = {
    provinces: raw.provinces,
    categories: raw.categories,
    teleworking: raw.teleworking,
    contractTypes: raw.contractTypes,
    workdays: raw.workdays,
    postedWithinDays: raw.postedWithinDays,
    sortBy: raw.sortBy,
  };
  const searches = toList(raw.searchQueries ?? raw.companies).map((query) => {
    if (/^infojobs:\/\//i.test(query)) return query;
    if (/^https?:\/\//i.test(query)) {
      try {
        return fromInfoJobsUrl(query);
      } catch {
        // parseCompany explains what is wrong with the link.
        return query;
      }
    }
    return searchKey({ ...form, query });
  });
  // Provinces or categories on their own list every job there.
  if (searches.length === 0 && (toList(form.provinces).length > 0 || toList(form.categories).length > 0)) searches.push(searchKey(form));
  return { ...raw, companies: searches };
}

export const exampleInput = { companies: [searchKey({ query: 'python' })], maxItems: 50 };

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  let key = raw;
  if (/^https?:\/\//i.test(raw)) key = fromInfoJobsUrl(raw);
  else if (!/^infojobs:\/\//i.test(raw)) key = searchKey({ query: raw });
  const search = new URL(key.replace(/^infojobs:\/\//i, 'https://infojobs/')).searchParams;
  const params = Object.fromEntries(SEARCH_PARAMS.map((param) => [param, search.getAll(param)]));
  const places = params.provinceIds.map((id) => PROVINCES[id] ?? id);
  const id = `${params.keyword[0] || 'all jobs'} in ${places.length > 0 ? places.join(', ') : 'Spain'}`;
  return { kind: 'search', id, key, params };
}

export function searchUrl(params, page = 1) {
  const search = new URLSearchParams();
  for (const param of SEARCH_PARAMS) {
    for (const value of params[param] ?? []) search.append(param, value);
  }
  if (!search.has('keyword')) search.set('keyword', '');
  search.set('page', String(page));
  return `${API}?${search}`;
}

// --- Jobs ------------------------------------------------------------------------------------

function workplaceOf(label) {
  const text = String(label ?? '').toLowerCase();
  if (text.includes('teletrabajo')) return 'remote';
  if (/h[ií]brido/.test(text)) return 'hybrid';
  if (text.includes('presencial')) return 'onsite';
  return null;
}

// The contract type in English, from labels such as "Contrato indefinido".
const CONTRACTS = [
  [/indefinido/i, 'Permanent'], [/duraci[oó]n determinada|temporal/i, 'Fixed-term'], [/fijo discontinuo/i, 'Seasonal permanent'],
  [/aut[oó]nomo|freelance/i, 'Self-employed'], [/formativo|pr[aá]cticas|formaci[oó]n/i, 'Training'], [/relevo/i, 'Relief'],
  [/tiempo parcial/i, 'Part-time contract'], [/otros/i, 'Other'],
];
export const contractOf = (label) => CONTRACTS.find(([pattern]) => pattern.test(label ?? ''))?.[1] ?? cleanText(label);

// Working hours in English, from labels such as "Jornada intensiva - mañana".
const HOURS = { completa: 'Full day', intensiva: 'Intensive', parcial: 'Part-time', indiferente: 'Any' };
const SHIFTS = { 'mañana': 'morning', tarde: 'afternoon', noche: 'night', indiferente: 'any time' };
export function workdayOf(label) {
  const match = /jornada\s+(completa|intensiva|parcial|indiferente)(?:\s*-\s*(mañana|tarde|noche|indiferente))?/i.exec(label ?? '');
  if (!match) return cleanText(label);
  const shift = match[2] ? SHIFTS[match[2].toLowerCase()] : null;
  return `${HOURS[match[1].toLowerCase()]}${shift ? `, ${shift}` : ''}`;
}

function employmentOf(contract, workday) {
  if (contract === 'Self-employed') return 'contract';
  if (contract === 'Fixed-term' || contract === 'Seasonal permanent' || contract === 'Relief') return 'temporary';
  if (contract === 'Training') return 'internship';
  if (contract === 'Part-time contract' || /^Part-time/.test(workday ?? '')) return 'part-time';
  if (/^(Full day|Intensive)/.test(workday ?? '')) return 'full-time';
  return null;
}

const escapeHtml = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function toJob(offer) {
  const jobUrl = offer.link ? `https:${String(offer.link).replace(/^https?:/, '').split('?')[0]}` : null;
  const description = String(offer.description ?? '').trim();
  const pay = offer.salary;
  const contract = contractOf(offer.contractType);
  const workday = workdayOf(offer.workday);
  // The company page is infojobs.net/<name>/em-<id>, or a microsite such as <name>.ofertas-trabajo.infojobs.net.
  const companyId = /\/em-([a-z0-9]+)/i.exec(offer.companyLink ?? '')?.[1] ?? /^https?:\/\/([^./]+)\.ofertas-trabajo\.infojobs\.net/i.exec(offer.companyLink ?? '')?.[1] ?? null;
  const job = makeJob({
    ats: name,
    company: companyId,
    companyName: offer.companyName,
    jobId: offer.code,
    title: offer.title,
    location: offer.city,
    workplaceType: workplaceOf(offer.teleworking),
    employmentType: employmentOf(contract, workday),
    salary: pay?.range ? makeSalary({ min: pay.range.min, max: pay.range.max, currency: pay.currency, interval: normalizeInterval(pay.period), source: 'listing' }) : null,
    postedAt: offer.publishedAt,
    jobUrl,
    applyUrl: jobUrl,
    descriptionText: description || null,
    descriptionHtml: description ? description.split(/\n+/).map((line) => `<p>${escapeHtml(line.trim())}</p>`).join('') : null,
  });
  return {
    ...job,
    contractType: contract,
    workday,
    salaryBasis: pay?.type ? String(pay.type).toLowerCase() : null,
    executive: offer.executive === true,
    companyUrl: offer.companyLink ?? null,
    companyLogoUrl: offer.companyLogo ?? null,
  };
}

// --- Searching ----------------------------------------------------------------------------------

export async function* listJobs(search, context) {
  const { http, log } = context;
  const seen = new Set();
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const result = await http.getJson(searchUrl(search.params, page), { retries: 4 });
    if (!Array.isArray(result?.offers)) throw new Error('InfoJobs answered without a list of jobs.');
    if (page === 1) {
      pages = Number(result.navigation?.totalPages) || 1;
      log.info(`${search.id}: ${result.navigation?.totalElements ?? result.offers.length} jobs on ${pages} pages.`);
    }
    if (result.offers.length === 0) break;
    yield result.offers.filter((offer) => offer?.code && !seen.has(offer.code) && seen.add(offer.code)).map(toJob);
  }
}
