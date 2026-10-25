// Uploads the built job Actors to Apify as source files and builds them. Reads APIFY_TOKEN.
// node scripts/build.mjs --out <dir> && node scripts/deploy.mjs <dir> [ats ...]
// Only Actors that already exist are updated; nothing is created or published.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ACTORS } from './actors.mjs';

const [dir, ...only] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node scripts/deploy.mjs <built dir> [ats ...]');
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('Set APIFY_TOKEN.');
const api = async (path, options = {}) => {
  const res = await fetch(`https://api.apify.com/v2${path}`, { ...options, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text).data : null;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const filesOf = (root) => {
  const files = [];
  const walk = (d) => {
    for (const entry of readdirSync(d)) {
      if (['node_modules', 'storage', '.git'].includes(entry)) continue;
      const path = join(d, entry);
      if (statSync(path).isDirectory()) walk(path);
      else files.push({ name: relative(root, path), format: 'TEXT', content: readFileSync(path, 'utf8') });
    }
  };
  walk(root);
  return files;
};

// Each build takes 4 GB and the account has 64 GB for all runs and builds, so at most 8 at once.
const MAX_BUILDS = 8;
const waitFor = async (b) => {
  let build = await api(`/actor-builds/${b.id}`);
  while (['READY', 'RUNNING'].includes(build.status)) {
    await sleep(5000);
    build = await api(`/actor-builds/${b.id}`);
  }
  console.log(`${b.name}: build ${build.buildNumber} ${build.status}`);
};

const names = only.length ? only : Object.keys(ACTORS);
const builds = [];
for (const ats of names) {
  if (builds.length >= MAX_BUILDS) await waitFor(builds.shift());
  const folder = join(dir, ats);
  const meta = JSON.parse(readFileSync(join(folder, '.actor', 'actor.json'), 'utf8'));
  const actor = await api(`/acts/robertosan16~${meta.name}`);
  const files = filesOf(folder);
  await api(`/acts/${actor.id}/versions/${meta.version}`, {
    method: 'PUT',
    body: JSON.stringify({ versionNumber: meta.version, sourceType: 'SOURCE_FILES', buildTag: 'latest', sourceFiles: files }),
  });
  const build = await api(`/acts/${actor.id}/builds?version=${meta.version}&tag=latest`, { method: 'POST' });
  builds.push({ name: meta.name, id: build.id });
  console.log(`${meta.name}: ${files.length} files uploaded, build ${build.buildNumber} started`);
}
for (const b of builds) await waitFor(b);
