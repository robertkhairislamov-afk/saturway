// One search across our job sites. Keywords and countries go to the job boards that cover those
// countries (LinkedIn and Indeed everywhere, Dice, Welcome to the Jungle, StepStone, SEEK, Jobstreet,
// JobsDB, Reed, InfoJobs); career site links go to their applicant tracking system (Greenhouse,
// Lever, Ashby, Workday). Each source runs with its own adapter, and a job found on two sites is
// saved once.

import { compileTerms, matchesAny } from '../core/match.js';
import * as ashby from './ashby.js';
import * as dice from './dice.js';
import * as greenhouse from './greenhouse.js';
import * as indeed from './indeed.js';
import * as infojobs from './infojobs.js';
import * as lever from './lever.js';
import * as linkedin from './linkedin.js';
import * as reed from './reed.js';
import * as seek from './seek.js';
import * as stepstone from './stepstone.js';
import * as workday from './workday.js';
import * as wttj from './wttj.js';

export const name = 'multi';
export const title = 'Job sites';
// The run log names no single site when one of them limits requests.
export const limitNotice = 'A job site is limiting direct requests';
export const sourceNames = ['source', 'sources'];
export const companyConcurrency = 4;
export const detailConcurrency = 6;
export const proxyFallback = true;

export const COUNTRIES = {
  US: 'United States',
  CA: 'Canada',
  GB: 'United Kingdom',
  IE: 'Ireland',
  FR: 'France',
  BE: 'Belgium',
  NL: 'Netherlands',
  LU: 'Luxembourg',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  AU: 'Australia',
  NZ: 'New Zealand',
  MY: 'Malaysia',
  SG: 'Singapore',
  PH: 'Philippines',
  ID: 'Indonesia',
  HK: 'Hong Kong',
  TH: 'Thailand',
  // Covered by LinkedIn and Indeed only.
  AT: 'Austria',
  CH: 'Switzerland',
  PT: 'Portugal',
  PL: 'Poland',
  SE: 'Sweden',
  DK: 'Denmark',
  NO: 'Norway',
  FI: 'Finland',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  IN: 'India',
  JP: 'Japan',
  ZA: 'South Africa',
  BR: 'Brazil',
  MX: 'Mexico',
  VN: 'Vietnam',
  TW: 'Taiwan',
  KR: 'South Korea',
  CN: 'China',
  PK: 'Pakistan',
  GR: 'Greece',
  CZ: 'Czechia',
  HU: 'Hungary',
  RO: 'Romania',
  UA: 'Ukraine',
  TR: 'Türkiye',
  IL: 'Israel',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',
  EG: 'Egypt',
  MA: 'Morocco',
  NG: 'Nigeria',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  EC: 'Ecuador',
  UY: 'Uruguay',
  VE: 'Venezuela',
  CR: 'Costa Rica',
  PA: 'Panama',
};

// The job boards and the countries each one covers well.
export const BOARDS = {
  dice: { adapter: dice, label: 'Dice', countries: ['US'] },
  wttj: { adapter: wttj, label: 'Welcome to the Jungle', countries: ['US', 'CA', 'GB', 'IE', 'FR', 'BE', 'NL', 'LU', 'DE', 'ES', 'IT'] },
  stepstone: { adapter: stepstone, label: 'StepStone', countries: ['DE'] },
  seek: { adapter: seek, label: 'SEEK', countries: ['AU', 'NZ'] },
  jobstreet: { adapter: seek.brandAdapter('jobstreet'), label: 'Jobstreet', countries: ['MY', 'SG', 'PH', 'ID'] },
  jobsdb: { adapter: seek.brandAdapter('jobsdb'), label: 'JobsDB', countries: ['HK', 'TH'] },
  reed: { adapter: reed, label: 'Reed', countries: ['GB'] },
  infojobs: { adapter: infojobs, label: 'InfoJobs', countries: ['ES'] },
  indeed: { adapter: indeed, label: 'Indeed', countries: Object.keys(COUNTRIES).filter((code) => indeed.COUNTRIES[code]) },
  linkedin: { adapter: linkedin, label: 'LinkedIn', countries: Object.keys(COUNTRIES) },
};

// A Spanish province named like the city or region, such as "Madrid" or "Valencia".
const plain = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/\p{M}+/gu, '').trim();
export function provinceOf(place) {
  const wanted = plain(place);
  if (!wanted) return null;
  return Object.keys(infojobs.PROVINCES).find((id) => plain(infojobs.PROVINCES[id]).split('/').includes(wanted)) ?? null;
}

// Company career sites, recognized by the address of their job board.
const CAREER_SITES = {
  greenhouse: { adapter: greenhouse, host: /(^|\.)greenhouse\.io$/i },
  lever: { adapter: lever, host: /(^|\.)lever\.co$/i },
  ashby: { adapter: ashby, host: /(^|\.)ashbyhq\.com$/i },
  workday: { adapter: workday, host: /(^|\.)(myworkdayjobs|myworkdaysite)\.com$/i },
};

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

export function careerSiteOf(link) {
  try {
    const { hostname } = new URL(link);
    return Object.keys(CAREER_SITES).find((site) => CAREER_SITES[site].host.test(hostname)) ?? null;
  } catch {
    return null;
  }
}

// Dice only offers "today", "3 days" and "7 days"; the rest is filtered after the search.
function dicePosted(days) {
  if (!(days > 0) || days > 7) return undefined;
  return days <= 3 ? 'THREE' : 'SEVEN';
}

// The input of one job board for the chosen countries, as that board's own form.
function boardForms(board, { queries, countries, location, remoteOnly, postedWithinDays, onlyWithSalary }) {
  const common = { searchQueries: queries, postedWithinDays };
  if (board === 'dice') return [{ ...common, location, workplaceTypes: remoteOnly ? ['Remote'] : [], postedDate: dicePosted(postedWithinDays) }];
  // Welcome to the Jungle needs keywords and searches all the countries at once.
  if (board === 'wttj') return queries.length > 0 ? [{ ...common, countries, remoteTypes: remoteOnly ? ['fulltime'] : [], onlyWithSalary }] : [];
  if (board === 'stepstone') return [{ ...common, location, remoteTypes: remoteOnly ? ['1'] : [] }];
  if (board === 'reed') return [{ ...common, location }];
  // InfoJobs searches by province; a city that is no province searches all of Spain.
  if (board === 'infojobs') return [{ ...common, provinces: [provinceOf(location)].filter(Boolean), teleworking: remoteOnly ? ['2'] : [] }];
  // Indeed searches each country on its own site; remote jobs are an Indeed filter.
  if (board === 'indeed') return countries.map((country) => ({ ...common, country, location, workplaceTypes: remoteOnly ? ['remote'] : [] }));
  // LinkedIn needs keywords and shows visitors no remote jobs; it searches a city with its country.
  if (board === 'linkedin') {
    if (queries.length === 0 || remoteOnly) return [];
    return countries.map((country) => ({ ...common, location: location ? `${location}, ${COUNTRIES[country]}` : COUNTRIES[country] }));
  }
  return countries.map((country) => ({ ...common, country, location, workArrangements: remoteOnly ? ['3'] : [] }));
}

// A source key: multi://<site>[~<keywords for career sites>]/<the site's own key>. It starts like a
// link, so the input reader never splits it at commas.
const KEY = /^multi:\/\/([a-z]+)(?:~([^/]*))?\/(.+)$/is;
const keyOf = (site, inner, queries = []) => `multi://${site}${queries.length > 0 ? `~${queries.map(encodeURIComponent).join('|')}` : ''}/${inner}`;

export function prepareInput(raw) {
  const queries = toList(raw.searchQueries);
  const links = toList(raw.companies);
  let countries = [...new Set(toList(raw.countries).map((code) => code.toUpperCase()))].filter((code) => COUNTRIES[code]);
  // Keywords without countries search the United States; career site links alone need no country.
  if (countries.length === 0 && queries.length > 0 && links.length === 0) countries = ['US'];
  const sites = toList(raw.sources).filter((site) => BOARDS[site]);
  const form = {
    queries,
    // A city or region only makes sense for a single country.
    location: countries.length === 1 ? String(raw.location ?? '').trim() : '',
    remoteOnly: raw.remoteOnly === true,
    postedWithinDays: Number(raw.postedWithinDays) || 0,
    onlyWithSalary: raw.onlyWithSalary === true,
  };
  const keys = [];
  for (const [site, board] of Object.entries(BOARDS)) {
    if (sites.length > 0 && !sites.includes(site)) continue;
    const covered = countries.filter((code) => board.countries.includes(code));
    if (covered.length === 0) continue;
    for (const boardInput of boardForms(site, { ...form, countries: covered })) {
      for (const key of board.adapter.prepareInput(boardInput).companies) keys.push(keyOf(site, key));
    }
  }
  // On career sites the keywords must be in the job title.
  for (const link of links) {
    const site = careerSiteOf(link);
    keys.push(site ? keyOf(site, link, queries) : link);
  }
  return { ...raw, companies: keys };
}

export const exampleInput = { companies: prepareInput({ searchQueries: ['python developer'], countries: ['US'] }).companies, maxItems: 50 };

export function parseCompany(value) {
  let text = String(value ?? '').trim();
  if (!KEY.test(text)) {
    const site = careerSiteOf(text);
    if (!site) throw new Error('this is not a supported career site link. Paste the link of a Greenhouse, Lever, Ashby or Workday job board, or search with keywords and countries.');
    text = keyOf(site, text);
  }
  const [, site, keywordPart, inner] = KEY.exec(text);
  const adapter = BOARDS[site]?.adapter ?? CAREER_SITES[site]?.adapter;
  if (!adapter) throw new Error(`"${site}" is not a job site this Actor knows.`);
  const source = adapter.parseCompany(inner);
  const queries = keywordPart ? keywordPart.split('|').map(decodeURIComponent).filter(Boolean) : [];
  return {
    id: `${adapter.title}: ${source.id}`,
    key: keyOf(site, source.key, queries),
    site,
    adapter,
    inner: source,
    queries,
  };
}

export async function* listJobs(source, context) {
  // Career sites list all jobs; the keywords pick them by title. Workday also searches with them.
  const terms = CAREER_SITES[source.site] && source.queries.length > 0 ? compileTerms(source.queries) : null;
  const inner = terms ? { ...context, keywords: source.queries } : context;
  for await (const page of source.adapter.listJobs(source.inner, inner)) {
    yield terms ? page.filter((job) => matchesAny(terms, [job.title])) : page;
  }
}

export function completeJob(partial, source, context) {
  return source.adapter.completeJob ? source.adapter.completeJob(partial, source.inner, context) : partial;
}

// The same job posted on two sites: same title, company and city.
const normalize = (text) => String(text ?? '').toLowerCase().normalize('NFKD').replace(/\p{M}+/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const dedupeKey = (job) => [job.title, job.companyName, String(job.location ?? '').split(',')[0]].map(normalize).join('|');
