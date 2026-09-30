// Indeed: the job search API of Indeed's mobile app (apis.indeed.com/graphql), in 62 countries.
// Search results carry the whole job, so no job pages are opened. Indeed lists at most about
// 1,000 jobs per search, newest first, so a bigger search goes on in further rounds with the jobs
// older than the last one read. Recruiters and their contact details are never read.

import { isoDate, makeJob } from '../core/job.js';
import { makeSalary } from '../core/salary.js';
import { cleanText, htmlToText } from '../core/text.js';

export const name = 'indeed';
export const title = 'Indeed';
export const sourceNames = ['search', 'searches'];
export const companyConcurrency = 3;
export const proxyFallback = true;

const API = 'https://apis.indeed.com/graphql';
// The public key and identity of Indeed's iPhone app, which the job search API expects. The
// language and country go with each search.
const APP_HEADERS = {
  'indeed-api-key': '161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8',
  'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1',
  'indeed-app-info': 'appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone',
};
const PAGE_SIZE = 100;
// A round that lists this many jobs has probably reached Indeed's limit of about 1,000.
const CAPPED = 800;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_RADIUS = 25;

// Countries with an Indeed site: name, the subdomain of its indeed.com site, and the language the
// API needs to include salaries (English where the country's Indeed site offers it).
export const COUNTRIES = {
  US: ['United States', 'www', 'en-US'], GB: ['United Kingdom', 'uk', 'en-GB'], CA: ['Canada', 'ca', 'en-CA'],
  AU: ['Australia', 'au', 'en-AU'], NZ: ['New Zealand', 'nz', 'en-NZ'], IE: ['Ireland', 'ie', 'en-IE'],
  IN: ['India', 'in', 'en-IN'], SG: ['Singapore', 'sg', 'en-SG'], MY: ['Malaysia', 'malaysia', 'en-MY'],
  PH: ['Philippines', 'ph', 'en-PH'], ID: ['Indonesia', 'id', 'en-ID'], TH: ['Thailand', 'th', 'th-TH'],
  VN: ['Vietnam', 'vn', 'vi-VN'], HK: ['Hong Kong', 'hk', 'en-HK'], TW: ['Taiwan', 'tw', 'zh-TW'],
  JP: ['Japan', 'jp', 'ja-JP'], KR: ['South Korea', 'kr', 'ko-KR'], CN: ['China', 'cn', 'zh-CN'],
  PK: ['Pakistan', 'pk', 'en-PK'], DE: ['Germany', 'de', 'de-DE'], AT: ['Austria', 'at', 'de-AT'],
  CH: ['Switzerland', 'ch', 'de-CH'], FR: ['France', 'fr', 'fr-FR'], BE: ['Belgium', 'be', 'en-BE'],
  NL: ['Netherlands', 'nl', 'nl-NL'], LU: ['Luxembourg', 'lu', 'fr-LU'], ES: ['Spain', 'es', 'es-ES'],
  PT: ['Portugal', 'pt', 'pt-PT'], IT: ['Italy', 'it', 'it-IT'], GR: ['Greece', 'gr', 'el-GR'],
  PL: ['Poland', 'pl', 'pl-PL'], CZ: ['Czechia', 'cz', 'cs-CZ'], HU: ['Hungary', 'hu', 'hu-HU'],
  RO: ['Romania', 'ro', 'ro-RO'], UA: ['Ukraine', 'ua', 'uk-UA'], SE: ['Sweden', 'se', 'sv-SE'],
  NO: ['Norway', 'no', 'nb-NO'], DK: ['Denmark', 'dk', 'da-DK'], FI: ['Finland', 'fi', 'fi-FI'],
  TR: ['Türkiye', 'tr', 'tr-TR'], IL: ['Israel', 'il', 'he-IL'], AE: ['United Arab Emirates', 'ae', 'en-AE'],
  SA: ['Saudi Arabia', 'sa', 'en-SA'], QA: ['Qatar', 'qa', 'en-QA'], KW: ['Kuwait', 'kw', 'en-KW'],
  BH: ['Bahrain', 'bh', 'en-BH'], OM: ['Oman', 'om', 'en-OM'], EG: ['Egypt', 'eg', 'en-EG'],
  MA: ['Morocco', 'ma', 'fr-MA'], NG: ['Nigeria', 'ng', 'en-NG'], ZA: ['South Africa', 'za', 'en-ZA'],
  BR: ['Brazil', 'br', 'pt-BR'], MX: ['Mexico', 'mx', 'es-MX'], AR: ['Argentina', 'ar', 'es-AR'],
  CL: ['Chile', 'cl', 'es-CL'], CO: ['Colombia', 'co', 'es-CO'], PE: ['Peru', 'pe', 'es-PE'],
  EC: ['Ecuador', 'ec', 'es-EC'], UY: ['Uruguay', 'uy', 'es-UY'], VE: ['Venezuela', 've', 'es-VE'],
  CR: ['Costa Rica', 'cr', 'es-CR'], PA: ['Panama', 'pa', 'es-PA'],
};
// Indeed measures the search radius in miles here and in kilometres everywhere else.
const MILES = new Set(['US', 'GB']);
// Links of Indeed's older country domains, such as indeed.co.uk or indeed.de.
const OLD_DOMAINS = {
  'co.uk': 'GB', de: 'DE', fr: 'FR', ca: 'CA', 'com.au': 'AU', 'co.in': 'IN', nl: 'NL', es: 'ES', it: 'IT',
  ch: 'CH', at: 'AT', be: 'BE', ie: 'IE', 'com.br': 'BR', 'com.mx': 'MX', jp: 'JP', 'com.sg': 'SG', hk: 'HK',
  'co.za': 'ZA', ae: 'AE', pl: 'PL', pt: 'PT', se: 'SE', 'co.nz': 'NZ',
};

// Indeed's codes for job attributes, the same in every country: the Actor's option, the code and
// its name. Indeed's own links use the same option names for job types (jt=fulltime).
export const JOB_TYPES = {
  fulltime: ['CF3CP', 'Full-time'], parttime: ['75GKK', 'Part-time'], permanent: ['5QWDV', 'Permanent'],
  contract: ['NJXCK', 'Contract'], temporary: ['4HKF7', 'Temporary'], internship: ['VDTG7', 'Internship'],
  apprenticeship: ['CPAHG', 'Apprenticeship'], seasonal: ['9SYVT', 'Seasonal'], freelance: ['ZG59D', 'Freelance'],
  fixedterm: ['T9BXE', 'Fixed term'], casual: ['CJWTS', 'Casual'], perdiem: ['TQKYQ', 'Per diem'],
};
export const WORKPLACES = { remote: ['DSQF7', 'Remote'], hybrid: ['PAXZC', 'Hybrid'], onsite: ['SWG7T', 'In-person'] };
export const LEVELS = { none: ['D7S5D', 'No experience needed'], entry: ['Y4JG9', 'Entry level'], mid: ['DN563', 'Mid-level'], senior: ['UB7SC', 'Senior level'] };
// Indeed's older link filter explvl(ENTRY_LEVEL).
const LINK_LEVELS = { ENTRY_LEVEL: 'entry', MID_LEVEL: 'mid', SENIOR_LEVEL: 'senior' };

const codeSet = (map) => new Set(Object.values(map).map(([code]) => code));
// Job types, levels and workplaces under the same names in every country (Indeed Switzerland
// calls full-time "100%").
const NAMES = Object.fromEntries([JOB_TYPES, WORKPLACES, LEVELS].flatMap((map) => Object.values(map)));
const TYPE_CODES = codeSet(JOB_TYPES);
const LEVEL_CODES = codeSet(LEVELS);
const WORKPLACE_CODES = codeSet(WORKPLACES);
// Benefits and schedules Indeed tags jobs with; every other tag (skills, education, licenses,
// languages) goes to `attributes`.
const BENEFITS = new Set([
  'EY33Q', 'FQJ2X', 'RZAT2', 'HW4J4', 'AWHEP', 'ZFPXV', 'FFZ8X', 'SXFZX', '49JNT', 'WGW7U', 'HJUWZ', 'CFRGS',
  'Y2WS5', '9TE9M', 'Z9VRJ', 'SX7Z5', 'ZPEF8', 'SENX8', 'FVKX2', 'YQ98H', 'KBRYN', 'QXB7R', 'G85UP', '7KV6C',
  'NPHPU', '72VVG', 'KFTUZ', '87RUM', 'X9FXB', 'VSMR9', 'MJT3E', 'VGCMH', '76F3G', 'WZ9TD', 'HY5VT', '2SNT5',
  'N83EH', '3K96F', 'ZMB6W', 'AV9NF', 'USD42', '6XT6J', '4C2ZW', 'BR3R3', 'NA9HP', '79D7W', 'BW7JZ', 'ZA2SS',
  '4WUF7', 'UXH7Y', 'H99VT', '4EH26', 'YDH5H', 'TZV2T', 'QKUHC', '4ZN8U', 'JGSQQ', 'YJ8XR', 'PXKDN', '6XHWW',
  '6KBT8', '2H7FY', 'DG55F', 'Y7QC7', 'N3E3Y', '8NCA8',
]);
const SCHEDULES = new Set([
  'SAP7A', 'PMS5Q', 'FDF8V', '9EYHQ', 'K8AKP', 'H3N5U', 'SUDVY', '5GUGE', 'EQHS8', '5WFZM', '7SRRR', 'FM8WH',
  'CPB8T', 'KMSZD', 'VDB9U',
]);

const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);
const codesOf = (values, map) => [...new Set(toList(values).map((value) => map[value.toLowerCase()]?.[0]).filter(Boolean))];

export function countryOfHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/^(www|m)\./, '');
  if (host === 'indeed.com') return 'US';
  const sub = /^([a-z]+)\.indeed\.com$/.exec(host)?.[1];
  if (sub) return Object.keys(COUNTRIES).find((code) => COUNTRIES[code][1] === sub) ?? null;
  return OLD_DOMAINS[/^indeed\.(.+)$/.exec(host)?.[1]] ?? null;
}

// The search form of the Actor, as an Indeed search link. Filters with several options (full-time
// or part-time) use Indeed's own "any of" form: attr(CF3CP|75GKK,OR).
export function searchUrl({ country = 'US', query = '', location = '', distance, jobTypes, workplaceTypes, levels, easyApply = false, postedWithinDays } = {}) {
  const code = COUNTRIES[String(country).toUpperCase()] ? String(country).toUpperCase() : 'US';
  const params = new URLSearchParams();
  const what = String(query ?? '').trim();
  const where = String(location ?? '').trim();
  if (what) params.set('q', what);
  if (where) params.set('l', where);
  if (where && distance !== undefined && distance !== null && distance !== '' && Number(distance) >= 0) params.set('radius', String(Math.round(Number(distance))));
  if (Number(postedWithinDays) > 0) params.set('fromage', String(Math.round(Number(postedWithinDays))));
  const groups = [codesOf(jobTypes, JOB_TYPES), codesOf(workplaceTypes, WORKPLACES), codesOf(levels, LEVELS)].filter((codes) => codes.length > 0);
  if (groups.length > 0) params.set('sc', `0kf:${groups.map((codes) => `attr(${codes.join('|')}${codes.length > 1 ? ',OR' : ''})`).join('')};`);
  if (easyApply) params.set('iafilter', '1');
  const search = params.toString();
  return `https://${COUNTRIES[code][1]}.indeed.com/jobs${search ? `?${search}` : ''}`;
}

// Keywords become searches with the form's filters; indeed.com links are used as they are.
export function prepareInput(raw) {
  const form = {
    country: raw.country,
    location: raw.location,
    distance: raw.distance,
    jobTypes: raw.jobTypes,
    workplaceTypes: raw.workplaceTypes,
    levels: raw.experienceLevels,
    easyApply: raw.easyApplyOnly === true,
    postedWithinDays: raw.postedWithinDays,
  };
  const queries = toList(raw.searchQueries ?? raw.companies);
  const companies = queries.map((query) => (/^https?:\/\//i.test(query) ? query : searchUrl({ ...form, query })));
  // A location on its own lists every job there.
  if (companies.length === 0 && String(form.location ?? '').trim()) companies.push(searchUrl(form));
  return { ...raw, companies };
}

export const exampleInput = { companies: [searchUrl({ query: 'python developer', location: 'New York, NY' })], maxItems: 50 };

const unslug = (text) => decodeURIComponent(text ?? '').replace(/-/g, ' ').replace(/\s+,/g, ',').trim();

// Filters of an Indeed link: attr(...) groups of the sc parameter (each one "any of"), older job
// type and experience filters, and the "easily apply" filter.
function linkGroups(params) {
  const sc = params.get('sc') ?? '';
  const groups = [...sc.matchAll(/attr\(([^)]*)\)/g)].map(([, inner]) => inner.replace(/,\s*OR$/i, '').split('|').map((code) => code.trim()).filter(Boolean));
  const types = [...toList(params.get('jt')), ...[...sc.matchAll(/jt\(([a-z]+)\)/g)].map(([, type]) => type)];
  const levels = [...toList(params.get('explvl')), ...[...sc.matchAll(/explvl\(([A-Z_]+)\)/g)].map(([, level]) => level)].map((level) => LINK_LEVELS[level.toUpperCase()]).filter(Boolean);
  groups.push(codesOf(types, JOB_TYPES), codesOf(levels, LEVELS));
  return groups.filter((codes) => codes.length > 0);
}

export function parseCompany(value) {
  const raw = String(value ?? '').trim();
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : searchUrl({ query: raw }));
  const country = countryOfHost(url.hostname);
  // Search links: /jobs?q=nurse&l=Leeds, or the older /q-nurse-l-leeds-jobs.html.
  const seo = /^\/(?:q-(.+?))?(?:-?l-(.+?))?-jobs\.html$/i.exec(url.pathname);
  if (!country || !(/^\/(m\/)?jobs\/?$/i.test(url.pathname) || seo)) {
    throw new Error('this is not an Indeed search link. Search on indeed.com and copy the address, or enter keywords.');
  }
  const params = url.searchParams;
  const what = cleanText(params.get('q') ?? (seo?.[1] ? unslug(seo[1]) : '')) ?? '';
  const where = cleanText(params.get('l') ?? (seo?.[2] ? unslug(seo[2]) : '')) ?? '';
  const radius = Number(params.get('radius'));
  const days = Number(params.get('fromage'));
  const groups = linkGroups(params);
  const search = {
    kind: 'search',
    country,
    what,
    where,
    radius: where ? (Number.isFinite(radius) && params.get('radius') !== null && radius >= 0 ? Math.round(radius) : DEFAULT_RADIUS) : null,
    days: days > 0 ? Math.round(days) : 0,
    groups,
    easyApply: params.get('iafilter') === '1',
  };
  // The key holds everything that changes the results, in a fixed order.
  const key = new URLSearchParams();
  for (const [param, part] of [['q', what], ['l', where], ['radius', search.radius], ['fromage', search.days || null], ['sc', groups.map((codes) => [...codes].sort().join('|')).sort().join(';')], ['iafilter', search.easyApply ? '1' : null]]) {
    if (part !== null && part !== '') key.set(param, String(part));
  }
  return {
    ...search,
    id: `${what || 'all jobs'} in ${where ? `${where}, ` : ''}${COUNTRIES[country][0]}`,
    key: `https://${COUNTRIES[country][1]}.indeed.com/jobs?${key}`,
  };
}

// --- Jobs ------------------------------------------------------------------------------------

const INTERVALS = { HOUR: 'hour', DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };
const cents = (value) => (Number.isFinite(value) ? Math.round(value * 100) / 100 : null);

// Pay the employer states: a range, one amount, or "from" or "up to" an amount.
export function salaryOf(compensation) {
  const base = compensation?.baseSalary;
  const range = base?.range;
  if (!range) return null;
  const salary = makeSalary({
    min: cents(range.min ?? range.value),
    max: cents(range.max ?? range.value),
    currency: compensation.currencyCode,
    interval: INTERVALS[base.unitOfWork] ?? null,
    source: 'listing',
  });
  if (!salary) return null;
  if (range.__typename === 'AtLeast') return { ...salary, text: `From ${salary.text}` };
  if (range.__typename === 'AtMost') return { ...salary, text: `Up to ${salary.text}` };
  return salary;
}

// A job tagged both remote and in-person is partly remote.
function workplaceOf(codes) {
  if (codes.has('PAXZC') || (codes.has('DSQF7') && codes.has('SWG7T'))) return 'hybrid';
  if (codes.has('DSQF7')) return 'remote';
  return codes.has('SWG7T') ? 'onsite' : null;
}

// Full-time and part-time say more than permanent, which goes with either.
const TYPE_ORDER = ['CF3CP', '75GKK', 'NJXCK', '4HKF7', 'VDTG7', 'CPAHG', '9SYVT', 'ZG59D', 'T9BXE', 'CJWTS', 'TQKYQ', '5QWDV'];

export function toJob(raw, country = 'US') {
  const site = `https://${(COUNTRIES[country] ?? COUNTRIES.US)[1]}.indeed.com`;
  const tags = (raw.attributes ?? []).filter((tag) => tag?.key && cleanText(tag.label));
  const codes = new Set(tags.map((tag) => tag.key));
  const labelsOf = (wanted) => [...new Set(tags.filter((tag) => wanted(tag.key)).map((tag) => NAMES[tag.key] ?? cleanText(tag.label)))];
  const typeCode = TYPE_ORDER.find((code) => codes.has(code));
  const employer = raw.employer ?? {};
  const dossier = employer.dossier ?? {};
  const place = raw.location ?? {};
  const html = raw.description?.html ?? null;
  const jobUrl = `${site}/viewjob?jk=${raw.key}`;
  const workplace = workplaceOf(codes);
  const job = makeJob({
    ats: name,
    company: employer.relativeCompanyPageUrl ? employer.relativeCompanyPageUrl.split('/').pop() : null,
    companyName: employer.name ?? raw.source?.name,
    jobId: raw.key,
    title: raw.title,
    department: cleanText(raw.occupations?.[0]?.label?.replace(/\s+Occupations$/i, '')),
    location: place.formatted?.long ?? null,
    remote: workplace === 'remote',
    workplaceType: workplace,
    employmentType: typeCode ? NAMES[typeCode] : null,
    salary: salaryOf(raw.compensation),
    postedAt: raw.datePublished ?? raw.dateOnIndeed,
    jobUrl,
    applyUrl: raw.url ?? jobUrl,
    descriptionText: html ? htmlToText(html) : null,
    descriptionHtml: html,
  });
  return {
    ...job,
    jobTypes: labelsOf((code) => TYPE_CODES.has(code)),
    seniorityLevel: labelsOf((code) => LEVEL_CODES.has(code))[0] ?? null,
    benefits: labelsOf((code) => BENEFITS.has(code)),
    schedule: labelsOf((code) => SCHEDULES.has(code)),
    attributes: labelsOf((code) => !TYPE_CODES.has(code) && !LEVEL_CODES.has(code) && !WORKPLACE_CODES.has(code) && !BENEFITS.has(code) && !SCHEDULES.has(code)),
    easyApply: (raw.indeedApply?.scopes?.length ?? 0) > 0,
    urgentlyHiring: raw.hiringDemand?.isUrgentHire ?? null,
    hiringMultipleCandidates: raw.hiringDemand?.isHighVolumeHiring ?? null,
    listedAt: isoDate(raw.dateOnIndeed),
    city: cleanText(place.city),
    state: cleanText(place.admin1Code),
    postalCode: cleanText(place.postalCode),
    country: place.countryCode ?? country,
    normalizedTitle: cleanText(raw.normalizedTitle),
    language: raw.language ?? null,
    sourceName: cleanText(raw.source?.name),
    companyUrl: employer.relativeCompanyPageUrl ? `${site}${employer.relativeCompanyPageUrl}` : null,
    companyWebsite: dossier.links?.corporateWebsite ?? null,
    companyLogo: dossier.images?.squareLogoUrl ?? null,
    companySize: cleanText(dossier.employerDetails?.employeesLocalizedLabel),
    companyRevenue: cleanText(dossier.employerDetails?.revenueLocalizedLabel),
    companyIndustry: cleanText(dossier.employerDetails?.industry),
  };
}

// --- Searching ----------------------------------------------------------------------------------

const JOB_FIELDS = `key title normalizedTitle datePublished dateOnIndeed language url
  location { countryCode admin1Code city postalCode formatted { long } }
  compensation { currencyCode baseSalary { unitOfWork range { __typename ... on Range { min max } ... on AtLeast { min } ... on AtMost { max } ... on Exactly { value } } } }
  attributes { key label }
  occupations { label }
  indeedApply { scopes }
  hiringDemand { isUrgentHire isHighVolumeHiring }
  source { name }
  employer { name relativeCompanyPageUrl dossier { employerDetails { industry employeesLocalizedLabel revenueLocalizedLabel } images { squareLogoUrl } links { corporateWebsite } } }`;

// Keywords and a location are sent only when set: the API refuses empty ones.
export function searchQuery({ what, where, description }) {
  const declared = [what ? '$what: String' : null, where ? '$location: JobSearchLocationInput' : null, '$limit: Int', '$cursor: String', '$filters: [JobSearchFilterInput!]!'];
  const args = [what ? 'what: $what' : null, where ? 'location: $location' : null, 'limit: $limit', 'cursor: $cursor', 'filters: $filters'];
  return `query JobSearch(${declared.filter(Boolean).join(', ')}) {
  jobSearch(${args.filter(Boolean).join(', ')}) {
    pageInfo { nextCursor }
    results { job { ${JOB_FIELDS}${description ? ' description { html }' : ''} } }
  }
}`;
}

// The filters of one round: the posting date window in hours ago (`from` is the newer end, `to`
// the older one), the attribute codes the jobs must all have, and "easily apply".
export function filtersOf(search, codes, { from = 0, to = null } = {}) {
  const filters = [];
  if (from > 0 || to != null) {
    filters.push({ date: { field: 'dateOnIndeed', ...(to != null ? { start: `${to}h` } : {}), ...(from > 0 ? { end: `${from}h` } : {}) } });
  }
  if (codes.length > 0) filters.push({ keyword: { field: 'attributes', keys: codes } });
  if (search.easyApply) filters.push({ keyword: { field: 'indeedApplyScope', keys: ['DESKTOP'] } });
  return filters;
}

// Indeed matches all codes of one filter, so "any of" groups become one search per combination.
export function combinations(groups) {
  return groups.reduce((combos, group) => combos.flatMap((combo) => group.map((code) => [...combo, code])), [[]]);
}

async function* readRound(search, context, codes, window, round) {
  const { http, includeDescription = true, now } = context;
  const query = searchQuery({ what: search.what, where: search.where, description: includeDescription });
  let cursor = null;
  do {
    const variables = { limit: PAGE_SIZE, cursor, filters: filtersOf(search, codes, window) };
    if (search.what) variables.what = search.what;
    if (search.where) variables.location = { where: search.where, radius: search.radius ?? DEFAULT_RADIUS, radiusUnit: MILES.has(search.country) ? 'MILES' : 'KILOMETERS' };
    const [, , locale] = COUNTRIES[search.country];
    const headers = { ...APP_HEADERS, 'indeed-co': search.country, 'indeed-locale': locale, 'accept-language': `${locale},en;q=0.8` };
    const data = await http.postJson(API, { query, variables }, { headers, retries: 4 });
    if (data?.errors?.length) throw new Error(`Indeed did not run the search: ${data.errors[0].message}`);
    const result = data?.data?.jobSearch;
    const jobs = (result?.results ?? []).map((item) => item?.job).filter((job) => job?.key);
    round.count += jobs.length;
    for (const job of jobs) {
      if (job.dateOnIndeed) round.oldest = Math.max(round.oldest ?? 0, (now - job.dateOnIndeed) / HOUR_MS);
    }
    if (jobs.length === 0) break;
    yield jobs.map((job) => toJob(job, search.country));
    cursor = result?.pageInfo?.nextCursor ?? null;
  } while (cursor);
}

export async function* listJobs(search, context) {
  const { log } = context;
  const inner = { ...context, now: context.now ?? Date.now() };
  // "Posted in the last N days" counts whole days, so Indeed is asked for one day more.
  const oldest = search.days > 0 ? (search.days + 1) * 24 : null;
  let noticed = false;
  for (const codes of combinations(search.groups)) {
    let from = 0;
    for (;;) {
      const round = { count: 0, oldest: null };
      yield* readRound(search, inner, codes, { from, to: oldest }, round);
      if (round.count < CAPPED || round.oldest == null) break;
      if (!noticed) {
        log.info(`${search.id}: Indeed lists at most about 1,000 jobs per search, so the older jobs are read in further rounds.`);
        noticed = true;
      }
      // The next round starts at the hour of the oldest job read; the jobs read twice are skipped.
      const next = Math.floor(round.oldest);
      from = next > from ? next : from + 1;
      if (oldest != null && from >= oldest) break;
    }
  }
}

// The same job found by two searches is saved once.
export const dedupeKey = (job) => job.jobId;
