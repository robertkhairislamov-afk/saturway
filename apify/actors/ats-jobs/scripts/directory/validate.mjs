// Checks every board (found now and the current directory) on its system's public API or feed:
// it exists, has open jobs, and its company name. Gentle: 8 at a time, a pause after each.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const SRC = new URL('../../src', import.meta.url).pathname;
const A = SRC;
const workday = await import(`${A}/adapters/workday.js`);
const lever = await import(`${A}/adapters/lever.js`);
const greenhouse = await import(`${A}/adapters/greenhouse.js`);
const { blocks, tagText } = await import(`${A}/core/xml.js`);
const { cleanText, decodeEntities } = await import(`${A}/core/text.js`);
// Working files (run IDs, found and checked boards) go to the current directory.
const here = (f) => `${process.cwd()}/${f}`;
const UA = 'ats-jobs-scrapers directory builder (Apify Actor; +https://apify.com/robertosan16)';
const raw = JSON.parse(readFileSync(here('boards-raw.json'), 'utf8'));
for (const [company, platform, board] of JSON.parse(readFileSync(`${A}/data/careers-directory.json`, 'utf8'))) raw.push({ platform, board, company });
const seen = new Set();
const boards = raw.filter((b) => { const k = `${b.platform}|${b.board.toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true; });
console.log('to check', boards.length);
const req = async (url, opts = {}) => {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000), headers: { 'user-agent': UA, 'content-type': 'application/json', ...(opts.headers ?? {}) } });
  if (r.status === 429) { await new Promise((s) => setTimeout(s, 20000)); return req(url, opts); }
  if (!r.ok) throw new Error(String(r.status));
  return r;
};
const json = async (url, opts) => (await req(url, opts)).json();
const text = async (url) => (await req(url)).text();
const pageTitle = async (url) => { try { return cleanText(decodeEntities(/<title>([^<]*)<\/title>/i.exec(await text(url))?.[1] ?? '')) || null; } catch { return null; } };
async function check(b) {
  switch (b.platform) {
    case 'greenhouse': {
      const c = greenhouse.parseCompany(b.board);
      const d = await json(c.apiBase); const j = await json(`${c.apiBase}/jobs`);
      return [d.name || b.company, j.jobs?.length ?? 0];
    }
    case 'lever': { const c = lever.parseCompany(b.board); const d = await json(c.apiUrl); if (!Array.isArray(d)) throw new Error('not lever'); return [b.company, d.length]; }
    case 'ashby': {
      const d = await json(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(b.board)}`); if (!Array.isArray(d.jobs)) throw new Error('not ashby');
      return [b.company, d.jobs.length];
    }
    case 'workday': {
      const c = workday.parseCompany(b.board);
      const d = await json(`${c.apiBase}/jobs`, { method: 'POST', body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: '' }) });
      return [b.company, d.total ?? 0];
    }
    case 'personio': {
      const xml = await text(`https://${b.board}.jobs.personio.de/xml`); if (!/<workzag-jobs/i.test(xml)) throw new Error('not personio');
      const n = blocks(xml, 'position').length; if (!n) return [b.company, 0];
      const t = await pageTitle(`https://${b.board}.jobs.personio.de`);
      const name = t && !/not found/i.test(t) ? t.replace(/^(jobs|karriere|careers?|stellenangebote)\s+(at|bei)\s+/i, '').replace(/\s*[-|–]\s*(jobs|karriere|careers?|stellenangebote).*$/i, '') : null;
      return [name || b.company, n];
    }
    case 'teamtailor': {
      const xml = await text(`https://${b.board}.teamtailor.com/jobs.rss`); if (!/<rss[\s>]/i.test(xml)) throw new Error('not teamtailor');
      return [cleanText(tagText(xml.split('<item>')[0], 'title')) || b.company, blocks(xml, 'item').length];
    }
  }
  throw new Error('unknown platform');
}
const cacheFile = here('check-cache.json');
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
const keyOf = (b) => `${b.platform}|${b.board.toLowerCase()}`;
const out = []; const fails = {}; let i = 0, done = 0;
async function worker() {
  while (i < boards.length) {
    const b = boards[i++];
    const hit = cache[keyOf(b)];
    if (hit) { if (hit.jobs > 0) out.push([hit.name, b.platform, b.board, hit.jobs]); else fails[hit.error ?? 'empty'] = (fails[hit.error ?? 'empty'] ?? 0) + 1; continue; }
    try { const [name, jobs] = await check(b); cache[keyOf(b)] = { name: cleanText(name) || b.board, jobs }; if (jobs > 0) out.push([cleanText(name) || b.board, b.platform, b.board, jobs]); else fails.empty = (fails.empty ?? 0) + 1; }
    catch (e) { const k = `${b.platform}:${e.message}`.slice(0, 40); fails[k] = (fails[k] ?? 0) + 1; if (/^(404|not )/.test(e.message)) cache[keyOf(b)] = { jobs: 0, error: k }; }
    if (++done % 500 === 0) { console.log(done, 'checked,', out.length, 'with jobs'); writeFileSync(cacheFile, JSON.stringify(cache)); }
    await new Promise((r) => setTimeout(r, 150));
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
writeFileSync(cacheFile, JSON.stringify(cache));
writeFileSync(here('directory-checked.json'), JSON.stringify(out));
const by = {}; for (const x of out) by[x[1]] = (by[x[1]] ?? 0) + 1;
console.log('with open jobs', out.length, JSON.stringify(by), 'jobs', out.reduce((s, x) => s + x[3], 0));
console.log('not kept', JSON.stringify(Object.entries(fails).sort((a, b) => b[1] - a[1]).slice(0, 15)));
