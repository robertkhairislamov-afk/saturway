// Builds one self-contained folder per Actor, ready for `apify push` (which uploads only the
// current folder). `apify push` skips files ignored by git, so for pushing, build outside the
// repository: node scripts/build.mjs --out /tmp/ats-actors [ats ...]. The default is dist/.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ACTORS, actorJson, datasetSchema, familySection, inputSchema, integrationsSection, outputSchema } from './actors.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outRoot = outIndex >= 0 ? resolve(args.splice(outIndex, 2)[1]) : join(root, 'dist');
const names = args.length > 0 ? args : Object.keys(ACTORS);

const DOCKERFILE = (ats) => `FROM apify/actor-node:22

COPY --chown=myuser:myuser package*.json ./
RUN npm --quiet set progress=false && npm install --omit=dev --omit=optional && rm -r ~/.npm

COPY --chown=myuser:myuser . ./
ENV ATS_PLATFORM=${ats}

CMD npm start --silent
`;

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

for (const ats of names) {
  if (!ACTORS[ats]) throw new Error(`Unknown Actor "${ats}". Use: ${Object.keys(ACTORS).join(', ')}.`);
  const out = join(outRoot, ats);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, '.actor'), { recursive: true });

  writeFileSync(join(out, '.actor', 'actor.json'), json(actorJson(ats)));
  writeFileSync(join(out, '.actor', 'input_schema.json'), json(inputSchema(ats)));
  writeFileSync(join(out, '.actor', 'dataset_schema.json'), json(datasetSchema(ats)));
  writeFileSync(join(out, '.actor', 'output_schema.json'), json(outputSchema(ats)));
  writeFileSync(join(out, 'Dockerfile'), DOCKERFILE(ats));
  writeFileSync(join(out, '.dockerignore'), 'node_modules\nstorage\n.git\n');
  // Integrations and the list of the other job scrapers go before the closing line of the README.
  const readme = readFileSync(join(root, 'readme', `${ats}.md`), 'utf8');
  const closing = readme.lastIndexOf('\nMissing a field or a feature?');
  const added = `${integrationsSection(ats)}\n${familySection(ats)}`;
  writeFileSync(join(out, 'README.md'), closing >= 0 ? `${readme.slice(0, closing + 1)}${added}\n${readme.slice(closing + 1)}` : `${readme}\n${added}`);
  cpSync(join(root, 'src'), join(out, 'src'), { recursive: true });

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  delete pkg.scripts.build;
  delete pkg.scripts.test;
  writeFileSync(join(out, 'package.json'), json({ ...pkg, name: ACTORS[ats].name, description: ACTORS[ats].description }));
  cpSync(join(root, 'package-lock.json'), join(out, 'package-lock.json'));
  console.log(`Built ${out}`);
}
