// Runs every published example task once and reports status and items. APIFY_TOKEN in the environment.
import { readFileSync } from 'node:fs';
const H = { authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'content-type': 'application/json' };
const api = async (p, o = {}) => { const r = await fetch(`https://api.apify.com/v2${p}`, { ...o, headers: H }); const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j.error)}`); return j.data; };
const only = process.argv.slice(2);
const names = [...JSON.parse(readFileSync(new URL('./tasks.json', import.meta.url), 'utf8')).map((s) => s.name), 'google-news-company-monitor'].filter((n) => !only.length || only.includes(n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < names.length; i += 10) {
  const batch = await Promise.all(names.slice(i, i + 10).map(async (n) => ({ n, run: await api(`/actor-tasks/robertosan16~${n}/runs`, { method: 'POST', body: '{}' }) })));
  for (const b of batch) {
    let run = b.run;
    while (['READY', 'RUNNING'].includes(run.status)) { await sleep(5000); run = await api(`/actor-runs/${run.id}`); }
    const ds = await api(`/datasets/${run.defaultDatasetId}`);
    console.log(run.status.padEnd(9), String(ds.itemCount).padStart(4), `${Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000)}s`.padStart(5), b.n, '|', (run.statusMessage || '').slice(0, 110));
  }
}
