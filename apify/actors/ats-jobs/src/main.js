// One code base for the Greenhouse, Lever, Ashby and Workday Actors. The ATS comes from the
// ATS_PLATFORM environment variable or from the Actor name, for example "lever-jobs-scraper".

import { readFileSync } from 'node:fs';

import { Actor, log } from 'apify';

import { ADAPTERS } from './adapters/index.js';
import { runScraper } from './core/run.js';

function platform() {
  if (process.env.ATS_PLATFORM) return process.env.ATS_PLATFORM;
  try {
    const actor = JSON.parse(readFileSync(new URL('../.actor/actor.json', import.meta.url), 'utf8'));
    return actor.name.split('-')[0];
  } catch {
    return undefined;
  }
}

await Actor.init();

try {
  const name = platform();
  const adapter = ADAPTERS[name];
  if (!adapter) throw new Error(`Unknown ATS "${name}". Set ATS_PLATFORM to one of: ${Object.keys(ADAPTERS).join(', ')}.`);
  const { message } = await runScraper(Actor, adapter, (await Actor.getInput()) ?? {}, log);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
