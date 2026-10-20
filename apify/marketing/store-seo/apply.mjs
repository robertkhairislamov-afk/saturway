// Shows or applies Store texts from proposals.json.
// Without --apply it only prints current vs proposed (public API, no token).
// With --apply it needs APIFY_TOKEN in the environment; the owner runs it.
//   node apply.mjs                      # compare all
//   node apply.mjs --apply indeed-jobs-scraper google-play-scraper
import { readFile } from 'node:fs/promises';

const USER = 'robertosan16';
const FIELDS = ['title', 'description', 'seoTitle', 'seoDescription'];
const LIMITS = { title: 60, seoTitle: 62, seoDescription: 160, description: 260 };

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const only = args.filter((a) => !a.startsWith('--'));
const proposals = JSON.parse(await readFile(new URL('./proposals.json', import.meta.url), 'utf8'));
const token = process.env.APIFY_TOKEN;
if (apply && !token) throw new Error('Set APIFY_TOKEN to apply changes.');

for (const [name, proposed] of Object.entries(proposals)) {
  if (only.length && !only.includes(name)) continue;
  const url = `https://api.apify.com/v2/acts/${USER}~${name}`;
  const { data: current } = await (await fetch(url)).json();
  const patch = {};
  console.log(`\n## ${name}`);
  for (const field of FIELDS) {
    if (!(field in proposed) || proposed[field] === current[field]) continue;
    const value = proposed[field];
    const warn = value.length > LIMITS[field] ? `  !! ${value.length} chars` : '';
    console.log(`${field}:\n  now: ${current[field]}\n  new: ${value}${warn}`);
    patch[field] = value;
  }
  if (!Object.keys(patch).length) { console.log('no changes'); continue; }
  if (!apply) continue;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  console.log(res.ok ? 'applied' : `failed: ${res.status} ${await res.text()}`);
}
