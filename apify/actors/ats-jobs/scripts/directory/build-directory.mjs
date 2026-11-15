// Writes the checked boards into the Actor's directory: [company, platform, board], sorted by name.
import { readFileSync, writeFileSync } from 'node:fs';
const SRC = new URL('../../src', import.meta.url).pathname;
const { companyFromTitle } = await import(SRC + '/adapters/personio.js');
const { cleanText } = await import(SRC + '/core/text.js');
// Working files (run IDs, found and checked boards) go to the current directory.
const here = (f) => `${process.cwd()}/${f}`;
const checked = JSON.parse(readFileSync(here('directory-checked.json'), 'utf8'));
const raw = JSON.parse(readFileSync(here('boards-raw.json'), 'utf8'));
const old = JSON.parse(readFileSync(SRC + '/data/careers-directory.json', 'utf8'));
const known = new Map();
for (const b of raw) known.set(`${b.platform}|${b.board.toLowerCase()}`, b.company);
for (const [company, platform, board] of old) known.set(`${platform}|${board.toLowerCase()}`, company);
const rows = checked.map(([name, platform, board]) => {
  const fallback = cleanText(known.get(`${platform}|${board.toLowerCase()}`));
  let company = name;
  company = companyFromTitle(name) ?? ((platform === 'personio' || platform === 'teamtailor') ? fallback : name) ?? board;
  if (!company || /^https?:/i.test(company)) company = fallback ?? board;
  return [company, platform, board];
});
// Greenhouse serves EU boards from the same API: the board name alone is the board.
const seenBoards = new Set();
const unique = [];
for (const row of rows) {
  if (row[1] === 'greenhouse') row[2] = row[2].replace(/^https:\/\/job-boards\.eu\.greenhouse\.io\//, '');
  const k = `${row[1]}|${row[2].toLowerCase()}`;
  if (!seenBoards.has(k)) { seenBoards.add(k); unique.push(row); }
}
rows.length = 0; rows.push(...unique);
rows.sort((a, b) => a[0].localeCompare(b[0], 'en', { sensitivity: 'base' }) || a[1].localeCompare(b[1]));
writeFileSync(SRC + '/data/careers-directory.json', `[\n${rows.map((r) => `[${r.map((v) => JSON.stringify(v)).join(", ")}]`).join(',\n')}\n]\n`);
const by = {}; for (const r of rows) by[r[1]] = (by[r[1]] ?? 0) + 1;
console.log(rows.length, JSON.stringify(by), 'was', old.length);
console.log(rows.filter((r) => /jobs|career|karriere/i.test(r[0])).slice(0, 12).map((r) => r[0]).join(' | '));
