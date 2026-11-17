// Career-site boards from Common Crawl index blocks (downloaded with HTTP ranges, one at a time).
// Usage: node harvest-cc.mjs <crawl id> <blocks.jsonl>  →  appends to boards-cc.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const [crawl, blocksFile] = process.argv.slice(2);
// Working files go to the current directory.
const here = (f) => `${process.cwd()}/${f}`;
const out = existsSync(here('boards-cc.json')) ? JSON.parse(readFileSync(here('boards-cc.json'), 'utf8')) : {};
const SKIP_SUB = /^(www|app|api|support|partner|career|careers|jobs|help|status|docs|blog|go|info)$/i;

function boardOf(link) {
  let u; try { u = new URL(link); } catch { return null; }
  const h = u.hostname.toLowerCase(); const parts = u.pathname.split('/').filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(h)) {
    const slug = u.searchParams.get('for') ?? (['embed', 'v1', 'api'].includes(parts[0]) ? null : parts[0]);
    return slug && /^[a-z0-9_-]+$/i.test(slug) ? ['greenhouse', slug.toLowerCase()] : null;
  }
  if (/(^|\.)lever\.co$/.test(h) && parts[0] && /^[a-z0-9._-]+$/i.test(parts[0])) return ['lever', /\.eu\.lever\.co$/.test(h) ? `https://jobs.eu.lever.co/${parts[0]}` : parts[0]];
  if (/(^|\.)ashbyhq\.com$/.test(h) && parts[0] && !['api', 'embed'].includes(parts[0])) return ['ashby', decodeURIComponent(parts[0])];
  if (/myworkday(jobs|site)\.com$/.test(h)) {
    const site = parts.find((p) => !/^[a-z]{2}-[A-Z]{2}$/.test(p) && !['job', 'details', 'en-US', 'recruiting', 'wday', 'cxs'].includes(p));
    return site && h.split('.').length >= 4 ? ['workday', `https://${h}/${site}`] : null;
  }
  if (/\.jobs\.personio\.(de|com)$/.test(h) && h.split('.').length === 4) return ['personio', h.split('.')[0]];
  if (/\.teamtailor\.com$/.test(h) && h.split('.').length === 3 && !SKIP_SUB.test(h.split('.')[0])) return ['teamtailor', h.split('.')[0]];
  return null;
}

const blocks = readFileSync(blocksFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
let lines = 0;
for (const [i, b] of blocks.entries()) {
  const url = `https://data.commoncrawl.org/cc-index/collections/${crawl}/indexes/${b.file}`;
  let buf;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { range: `bytes=${b.offset}-${b.offset + b.length - 1}`, 'user-agent': 'career-directory-builder (Apify Actor developer)' }, signal: AbortSignal.timeout(60000) });
      if (res.status !== 206 && res.status !== 200) throw new Error(`HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
      break;
    } catch (e) {
      if (attempt === 4) { console.log('block failed', b.file, b.offset, e.message); }
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  if (!buf) continue;
  for (const line of gunzipSync(buf).toString('utf8').split('\n')) {
    const j = line.indexOf('{');
    if (j < 0) continue;
    lines++;
    let rec; try { rec = JSON.parse(line.slice(j)); } catch { continue; }
    if (rec.status && rec.status !== '200') continue;
    const board = boardOf(rec.url);
    if (!board) continue;
    const key = `${board[0]}|${board[1].toLowerCase()}`;
    out[key] ??= { platform: board[0], board: board[1], seen: 0, crawls: [] };
    out[key].seen++;
    if (!out[key].crawls.includes(crawl)) out[key].crawls.push(crawl);
  }
  if ((i + 1) % 20 === 0) console.log(`${crawl}: ${i + 1}/${blocks.length} blocks, ${lines} index lines, ${Object.keys(out).length} boards so far`);
  await new Promise((r) => setTimeout(r, 300));
}
writeFileSync(here('boards-cc.json'), JSON.stringify(out));
const by = {}; for (const b of Object.values(out)) by[b.platform] = (by[b.platform] ?? 0) + 1;
console.log(crawl, 'done:', lines, 'index lines;', Object.keys(out).length, 'boards', JSON.stringify(by));
