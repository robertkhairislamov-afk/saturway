// Career Page Jobs Scraper: open jobs from company career sites on Greenhouse, Lever, Ashby,
// Workday, Personio and Teamtailor. A company can be given by its job board link, its website domain or just its name (the
// Actor finds its board); or every company in the built-in directory is searched at once, with
// the title, location and other filters picking the jobs.

import { readFileSync } from 'node:fs';

import * as ashby from './ashby.js';
import * as greenhouse from './greenhouse.js';
import * as lever from './lever.js';
import * as personio from './personio.js';
import * as teamtailor from './teamtailor.js';
import { CAREER_SITES, careerSiteOf } from './multi.js';
import * as workday from './workday.js';

export const name = 'careers';
export const title = 'Career sites';
export const sourceNames = ['company', 'companies'];
// Most boards answer in one request, so many companies are read at once. Greenhouse, Lever and Ashby
// serve every company from one API host, so at most a few of their boards are read at a time; Workday,
// Personio and Teamtailor boards each have their own host.
export const companyConcurrency = 24;
const SHARED_HOST_SLOTS = 4;
// Workday career sites share Workday's servers too, and Workday limits busy addresses.
const SHARED_HOSTS = new Set(['greenhouse', 'lever', 'ashby', 'workday']);
const slots = new Map();

// A directory search reads thousands of boards: a slow or broken board is given up after two short
// tries instead of holding a reader for minutes (a board named by the user keeps the full retries).
const QUICK = { retries: 2, timeoutMs: 15000 };
export const quick = (http) => ({
  ...http,
  getJson: (url, options) => http.getJson(url, { ...QUICK, ...options }),
  getText: (url, options) => http.getText(url, { ...QUICK, ...options }),
  postJson: (url, data, options) => http.postJson(url, data, { ...QUICK, ...options }),
});

export async function* gently(platform, jobs) {
  if (!SHARED_HOSTS.has(platform)) {
    yield* jobs;
    return;
  }
  const slot = slots.get(platform) ?? { active: 0, waiting: [] };
  slots.set(platform, slot);
  if (slot.active >= SHARED_HOST_SLOTS) await new Promise((resolve) => slot.waiting.push(resolve));
  else slot.active++;
  try {
    yield* jobs;
  } finally {
    // The slot passes straight to the next waiting board, or is freed.
    const next = slot.waiting.shift();
    if (next) next();
    else slot.active--;
  }
}
export const detailConcurrency = 8;
// One free summary record per company read: open jobs, teams, places, recent postings, growth.
export const companySummary = true;
// What the company summary needs to know about a board. complete: the jobs listed are all its open
// jobs. Greenhouse, Lever, Ashby, Personio and Teamtailor list a whole board in one answer. Workday
// lists pages, and with keywords searches on its server, so its list then holds only the matching
// jobs; without keywords its first page tells how many jobs it has.
export function summaryFacts(source, input, listedToEnd) {
  const found = source.resolved ?? source;
  const workday = found.platform === 'workday';
  const complete = !workday || (listedToEnd && input.keywords.length === 0);
  return {
    ats: found.platform,
    companyName: found.directoryName ?? null,
    fallbackName: workday ? String(found.inner?.id ?? '').split('/')[0] || null : null,
    complete,
    openJobs: workday && !complete && input.keywords.length === 0 ? found.inner?.listedTotal ?? null : null,
  };
}

// Jobs read per Workday board when searching the whole directory: Workday lists the best matches
// for the keywords first, and thousands of boards are read in one search.
const DIRECTORY_WORKDAY_LIMIT = 100;

// Once Workday answers "too many requests" during a directory search, the rest of its boards are
// skipped for this run instead of asking every one of them.
export const workdayLimit = { reached: false };

export const PLATFORMS = { greenhouse: 'Greenhouse', lever: 'Lever', ashby: 'Ashby', workday: 'Workday', personio: 'Personio', teamtailor: 'Teamtailor' };

// The directory: companies whose boards were found and checked, as [name, platform, board].
const DIRECTORY = JSON.parse(readFileSync(new URL('../data/careers-directory.json', import.meta.url), 'utf8'));
export const directorySize = () => DIRECTORY.length;
const NAME_OF = new Map(DIRECTORY.map(([company, platform, board]) => [`${platform}|${board.toLowerCase()}`, company]));

// "Door Dash, Inc." and "doordash.com" are found under "doordash".
const SUFFIXES = /\b(inc|llc|ltd|limited|corp|corporation|co|company|gmbh|ag|sa|bv|plc|pty|group|holdings|technologies|technology|labs|hq)\b\.?/g;
export function nameKey(text) {
  let value = String(text ?? '').trim().toLowerCase();
  try {
    if (/^https?:\/\//.test(value) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/.test(value)) {
      const host = new URL(/^https?:\/\//.test(value) ? value : `https://${value}`).hostname.replace(/^(www|careers|jobs)\./, '');
      value = host.split('.').slice(0, -1).join(' ') || host;
    }
  } catch { /* a plain name */ }
  return value.normalize('NFKD').replace(/\p{M}+/gu, '').replace(SUFFIXES, ' ').replace(/[^a-z0-9]+/g, '');
}
const BY_NAME = new Map();
for (const [company, platform, board] of DIRECTORY) {
  for (const k of new Set([nameKey(company), nameKey(board)])) if (k && !BY_NAME.has(k)) BY_NAME.set(k, [platform, board]);
}

const ADAPTERS = { greenhouse, lever, ashby, workday, personio, teamtailor };
const toList = (value) => (Array.isArray(value) ? value : value ? [value] : []).map((item) => String(item).trim()).filter(Boolean);

// Source keys start like links, so the input reader never splits them at commas:
// careers://<platform>/<board> for a known board, careers://find/<name or domain> to look one up,
// careers://dir-<platform>/<board> for a board added by "Search all companies".
const KEY = /^careers:\/\/([a-z-]+)\/(.+)$/is;
const keyOf = (platform, inner) => `careers://${platform}/${inner}`;

export function prepareInput(raw) {
  const keys = toList(raw.companies).map((text) => {
    const platform = careerSiteOf(text);
    if (platform) return keyOf(platform, text);
    const known = BY_NAME.get(nameKey(text));
    return known ? keyOf(known[0], known[1]) : keyOf('find', text);
  });
  if (raw.searchAllCompanies === true) {
    // Without title keywords, every company would mean hundreds of thousands of jobs.
    if (toList(raw.keywords).length === 0) throw new Error('Searching every company needs title keywords, for example "data engineer". Add them under Filters, or name the companies.');
    const platforms = toList(raw.platforms).filter((p) => PLATFORMS[p]);
    const named = new Set(keys);
    for (const [, platform, board] of DIRECTORY) {
      if ((platforms.length === 0 || platforms.includes(platform)) && !named.has(keyOf(platform, board))) keys.push(keyOf(`dir-${platform}`, board));
    }
  }
  return { ...raw, companies: [...new Set(keys)] };
}

export const exampleInput = { companies: ['airbnb', 'https://jobs.lever.co/zoox', 'ramp'], maxItems: 50, maxItemsPerCompany: 20 };

export function parseCompany(value) {
  let text = String(value ?? '').trim();
  if (!KEY.test(text)) {
    const platform = careerSiteOf(text);
    text = platform ? keyOf(platform, text) : keyOf('find', text);
  }
  const [, prefixed, inner] = KEY.exec(text);
  const fromDirectory = prefixed.startsWith('dir-');
  const platform = fromDirectory ? prefixed.slice(4) : prefixed;
  if (platform === 'find') {
    if (!nameKey(inner)) throw new Error('enter a company name, its website or the link of its job board.');
    return { id: inner, key: keyOf('find', inner), platform, name: inner };
  }
  const adapter = ADAPTERS[platform];
  if (!adapter) throw new Error(`"${platform}" is not a career site this Actor knows.`);
  const source = adapter.parseCompany(inner);
  const directoryName = fromDirectory ? NAME_OF.get(`${platform}|${inner.toLowerCase()}`) : undefined;
  return { id: `${adapter.title}: ${source.id}`, key: keyOf(prefixed, source.key), platform, adapter, inner: source, fromDirectory, directoryName };
}

// Board names to try for a company: "Door Dash" → doordash, door-dash, door_dash.
export function boardCandidates(text) {
  const words = String(text ?? '').trim().toLowerCase().normalize('NFKD').replace(/\p{M}+/gu, '')
    .replace(/^https?:\/\//, '').replace(/^(www|careers|jobs)\./, '').replace(/\.[a-z.]+(\/.*)?$/, '')
    .replace(SUFFIXES, ' ').split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set([words.join(''), words.join('-'), words.join('_'), words[0]].filter((w) => w && w.length >= 2))];
}

// Whether a board exists on each platform, asked from its public API. Workday boards have no
// guessable address, so they are found only by link or in the directory.
const PROBES = [
  ['greenhouse', (slug) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}`],
  ['lever', (slug) => `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json&limit=1`],
  ['ashby', (slug) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`],
  // XML feeds: a board exists when the feed answers with its root element.
  ['personio', (slug) => `https://${encodeURIComponent(slug)}.jobs.personio.de/xml`, /<workzag-jobs/i],
  ['teamtailor', (slug) => `https://${encodeURIComponent(slug)}.teamtailor.com/jobs.rss`, /<rss[\s>]/i],
];
export async function findBoard(text, http) {
  for (const slug of boardCandidates(text)) {
    for (const [platform, url, feed] of PROBES) {
      try {
        if (feed) {
          if (feed.test(await http.getText(url(slug), { retries: 2 }))) return { platform, board: slug };
          continue;
        }
        const data = await http.getJson(url(slug), { retries: 2 });
        // Lever answers an unknown company with an error object, the others with 404.
        if (platform === 'lever' && !Array.isArray(data)) continue;
        if (platform === 'ashby' && !Array.isArray(data?.jobs)) continue;
        return { platform, board: slug };
      } catch (error) {
        if (error.stopped) throw error;
      }
    }
  }
  return null;
}

// The same board can come in twice (a company name and a link to its board): its jobs are saved once.
export const dedupeKey = (job) => `${job.ats}|${job.company}|${job.jobId}`;

export async function* listJobs(source, context) {
  let found = source;
  if (source.platform === 'find') {
    const board = await findBoard(source.name, context.http);
    if (!board) throw new Error(`no Greenhouse, Lever, Ashby, Personio or Teamtailor job board found for "${source.name}". Paste the link of its career site (Workday boards are found only by link).`);
    context.log.info(`${source.name}: found its job board on ${PLATFORMS[board.platform]} (${board.board}).`);
    found = parseCompany(keyOf(board.platform, board.board));
    source.resolved = found;
  }
  if (!found.fromDirectory) {
    yield* gently(found.platform, found.adapter.listJobs(found.inner, context));
    return;
  }
  // A directory board that closed or moved since it was checked is skipped quietly: the search is
  // across all companies, not about this one.
  if (found.platform === 'workday' && workdayLimit.reached) return;
  try {
    // Workday searches by keyword with the best matches first and pages of 20; a big employer can
    // list thousands of loose matches, so a directory search reads only the first ones.
    let listed = 0;
    const limit = found.platform === 'workday' ? DIRECTORY_WORKDAY_LIMIT : undefined;
    for await (const page of gently(found.platform, found.adapter.listJobs(found.inner, { ...context, http: quick(context.http), resultLimit: limit, directoryName: found.directoryName }))) {
      yield page;
      listed += page.length;
      if (found.platform === 'workday' && listed >= DIRECTORY_WORKDAY_LIMIT) break;
    }
  } catch (error) {
    if (error.stopped) throw error;
    if (found.platform === 'workday' && error.status === 429 && !workdayLimit.reached) {
      workdayLimit.reached = true;
      context.log.warning?.('Workday is limiting requests from this server; the remaining Workday companies are skipped in this search.');
    }
    context.log.debug?.(`${found.id}: skipped (${error.message}).`);
  }
}

export function completeJob(partial, source, context) {
  const found = source.resolved ?? source;
  return found.adapter.completeJob ? found.adapter.completeJob(partial, found.inner, context) : partial;
}
