// Creates or updates the public example tasks from tasks.json and publishes them. APIFY_TOKEN in the environment. node publish.mjs [task-name ...]
import { readFileSync } from 'node:fs';
const H = { authorization: `Bearer ${process.env.APIFY_TOKEN}`, 'content-type': 'application/json' };
const api = async (p, o = {}) => { const r = await fetch(`https://api.apify.com/v2${p}`, { ...o, headers: H }); const j = await r.json(); if (!r.ok) throw new Error(`${r.status} ${JSON.stringify(j.error)}`); return j.data; };
const only = process.argv.slice(2);
const specs = JSON.parse(readFileSync(new URL('./tasks.json', import.meta.url), 'utf8')).filter((s) => !only.length || only.includes(s.name));
const mine = (await api('/actor-tasks?limit=1000')).items;
for (const s of specs) {
  try {
  const actor = await api(`/acts/robertosan16~${s.actor}`);
  let task = mine.find((t) => t.name === s.name);
  const body = { name: s.name, title: s.title, description: s.description, input: s.input, options: { build: 'latest', memoryMbytes: s.memory ?? 512, timeoutSecs: 3600 } };
  task = task ? await api(`/actor-tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(body) })
              : await api('/actor-tasks', { method: 'POST', body: JSON.stringify({ actId: actor.id, ...body }) });
  const pub = await api(`/actor-tasks/${task.id}`, { method: 'PUT', body: JSON.stringify({
    publicConfig: { seoTitle: s.seoTitle, seoDescription: s.seoDescription, inputSchemaFields: s.fields, datasetView: s.view ?? 'overview' },
    isPublic: true,
  }) });
  console.log('OK ', s.actor, '->', s.name, '| public:', Boolean(pub.publicConfig?.publishedAt ?? pub.isPublic), '|', `https://apify.com/robertosan16/${s.actor}/examples/${s.name}`);
  } catch (error) {
    console.log('ERR', s.actor, '->', s.name, error.message.slice(0, 300));
  }
}
