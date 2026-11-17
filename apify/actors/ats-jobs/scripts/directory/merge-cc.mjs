// Adds the boards found in Common Crawl (boards-cc.json) to boards-raw.json, the list validate.mjs
// checks. Boards already in the list keep their company name from the job postings.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const here = (f) => `${process.cwd()}/${f}`;
const raw = existsSync(here('boards-raw.json')) ? JSON.parse(readFileSync(here('boards-raw.json'), 'utf8')) : [];
const cc = JSON.parse(readFileSync(here('boards-cc.json'), 'utf8'));
const keys = new Set(raw.map((b) => `${b.platform}|${b.board.toLowerCase()}`));
let added = 0;
for (const [key, b] of Object.entries(cc)) {
  if (keys.has(key)) continue;
  raw.push({ platform: b.platform, board: b.board, company: null, seen: b.seen, countries: [] });
  keys.add(key);
  added++;
}
writeFileSync(here('boards-raw.json'), JSON.stringify(raw));
console.log(`added ${added} boards from Common Crawl; ${raw.length} to check`);
