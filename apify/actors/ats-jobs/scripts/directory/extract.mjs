// Career-site boards in the apply links of harvest runs (new and 8.11), for all six systems.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const SRC = new URL('../../src', import.meta.url).pathname;
const H = { authorization: `Bearer ${process.env.APIFY_TOKEN}` };
// Working files (run IDs, found and checked boards) go to the current directory.
const here = (f) => `${process.cwd()}/${f}`;
const runs = [...JSON.parse(readFileSync(here('harvest-runs.json'), 'utf8')).map((r) => r.id), ...(existsSync(here('old-runs.json')) ? JSON.parse(readFileSync(here('old-runs.json'), 'utf8')) : [])];
const boards = new Map();
const short = new Map();
const add = (platform, board, company, country) => {
  if (!board) return;
  const k = `${platform}|${board.toLowerCase()}`;
  if (!boards.has(k)) boards.set(k, { platform, board, company, seen: 0, countries: [] });
  const b = boards.get(k); b.seen++; if (country && !b.countries.includes(country)) b.countries.push(country);
};
const SKIP_SUB = /^(www|app|api|support|partner|career|jobs|help)$/i;
function boardOf(link) {
  let u; try { u = new URL(link); } catch { return null; }
  const h = u.hostname.toLowerCase(); const parts = u.pathname.split('/').filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(h)) {
    const slug = u.searchParams.get('for') ?? (parts[0] === 'embed' ? null : parts[0]);
    if (!slug) return null;
    return ['greenhouse', /\.eu\.greenhouse\.io$/.test(h) ? `https://job-boards.eu.greenhouse.io/${slug}` : slug.toLowerCase()];
  }
  if (/(^|\.)lever\.co$/.test(h) && parts[0]) return ['lever', /\.eu\.lever\.co$/.test(h) ? `https://jobs.eu.lever.co/${parts[0]}` : parts[0]];
  if (/(^|\.)ashbyhq\.com$/.test(h) && parts[0]) return ['ashby', decodeURIComponent(parts[0])];
  if (/myworkday(jobs|site)\.com$/.test(h)) {
    const site = parts.find((p) => !/^[a-z]{2}-[A-Z]{2}$/.test(p) && !['job', 'details', 'en-US', 'recruiting'].includes(p));
    return site ? ['workday', `https://${h}/${site}`] : null;
  }
  if (/\.jobs\.personio\.(de|com)$/.test(h)) return ['personio', h.split('.')[0]];
  if (/\.teamtailor\.com$/.test(h) && h.split('.').length === 3 && !SKIP_SUB.test(h.split('.')[0])) return ['teamtailor', h.split('.')[0]];
  return null;
}
{
  let total = 0;
  for (const id of runs) {
    const run = (await fetch(`https://api.apify.com/v2/actor-runs/${id}`, { headers: H }).then((r) => r.json())).data;
    if (run.status !== 'SUCCEEDED' && run.status !== 'ABORTED' && run.status !== 'TIMED-OUT') { console.log('skip', id, run.status); continue; }
    for (let offset = 0; ; offset += 10000) {
      const items = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=true&fields=applyUrl,companyName,country&limit=10000&offset=${offset}`, { headers: H }).then((r) => r.json());
      for (const it of items) {
        total++;
        if (/^https?:\/\/grnh\.se\//.test(it.applyUrl ?? '')) { short.set(it.applyUrl, it.companyName); continue; }
        const b = boardOf(it.applyUrl); if (b) add(b[0], b[1], it.companyName, it.country);
      }
      if (items.length < 10000) break;
    }
  }
  // grnh.se short links: Greenhouse's own redirect names the board (cached from earlier rounds).
  const cacheFile = here('grnh-cache.json');
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  const todo = [...short.keys()].filter((l) => !(l in cache)); let i = 0;
  await Promise.all(Array.from({ length: 6 }, async () => { while (i < todo.length) { const l = todo[i++]; try { const r = await fetch(l, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'ats-jobs-scrapers directory builder (Apify Actor)' } }); cache[l] = r.headers.get('location'); } catch { cache[l] = null; } } }));
  writeFileSync(cacheFile, JSON.stringify(cache));
  for (const [l, company] of short) { const b = cache[l] && boardOf(cache[l]); if (b) add(b[0], b[1], company); }
  const list = [...boards.values()];
  writeFileSync(here('boards-raw.json'), JSON.stringify(list));
  const by = {}; for (const b of list) by[b.platform] = (by[b.platform] ?? 0) + 1;
  console.log('jobs', total, 'short links', short.size, 'boards', list.length, JSON.stringify(by));
}
