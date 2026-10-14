import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runScraper } from '../src/core/run.js';

const silentLog = { info() {}, warning() {}, error() {} };

// A minimal stand-in for the Apify SDK: a dataset, key-value stores and a charging limit.
function fakeActor({ maxCharges = Infinity, taskId = null } = {}) {
  const stores = new Map();
  const actor = {
    dataset: [],
    values: {},
    stores,
    async pushData(items) { actor.dataset.push(...items); },
    async setValue(key, value) { actor.values[key] = value; },
    async setStatusMessage() {},
    getEnv: () => ({ actorTaskId: taskId }),
    getChargingManager: () => ({ calculateMaxEventChargeCountWithinLimit: () => maxCharges }),
    async openKeyValueStore(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return { getValue: async (key) => store.get(key) ?? null, setValue: async (key, value) => store.set(key, value) };
    },
    async createProxyConfiguration() { return undefined; },
  };
  return actor;
}

const job = (company, id, fields = {}) => ({ jobId: id, title: `Engineer ${id}`, company, locations: [], remote: false, ...fields });

// A fake ATS whose boards list jobs in pages; "broken" fails.
function fakeAdapter(boards, { partial = false } = {}) {
  return {
    name: 'fake',
    title: 'Fake',
    exampleInput: { companies: ['alpha'] },
    parseCompany(value) {
      if (value.includes(' ')) throw new Error('bad name');
      return { id: value, key: value };
    },
    async *listJobs(company) {
      if (company.id === 'broken') throw new Error('board is down');
      for (const page of boards[company.id] ?? []) {
        yield page.map((j) => (partial ? { ...j, partial: true } : j));
      }
    },
    ...(partial ? { completeJob: async (j) => ({ ...j, partial: undefined, department: 'Sales' }) } : {}),
  };
}

test('saves matching jobs from every company and reports a summary', async () => {
  const actor = fakeActor();
  const adapter = fakeAdapter({ alpha: [[job('alpha', 1), job('alpha', 2, { title: 'Designer' })]], beta: [[job('beta', 3)]] });
  const result = await runScraper(actor, adapter, { companies: ['alpha', 'beta', 'bad name'], keywords: ['engineer'] }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId).sort(), [1, 3]);
  assert.ok(actor.dataset.every((j) => j.scrapedAt));
  assert.equal(result.saved, 2);
  assert.equal(actor.values.SUMMARY.companies.length, 3);
  assert.match(result.message, /Saved 2 jobs from 2 companies \(1 skipped as invalid\)/);
});

test('respects maxItems, maxItemsPerCompany and the maximum charge', async () => {
  const boards = { alpha: [[1, 2, 3].map((id) => job('alpha', id)), [4, 5].map((id) => job('alpha', id))], beta: [[job('beta', 6), job('beta', 7)]] };
  let actor = fakeActor();
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha', 'beta'], maxItemsPerCompany: 2 }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId).sort(), [1, 2, 6, 7]);
  actor = fakeActor();
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha', 'beta'], maxItems: 4 }, silentLog);
  assert.equal(actor.dataset.length, 4);
  actor = fakeActor({ maxCharges: 3 });
  const result = await runScraper(actor, fakeAdapter(boards), { companies: ['alpha', 'beta'] }, silentLog);
  assert.equal(actor.dataset.length, 3);
  assert.match(result.message, /maximum cost/);
});

test('only new jobs: the first run saves everything, the next runs only new jobs', async () => {
  const actor = fakeActor({ taskId: 'task1' });
  const boards = { alpha: [[job('alpha', 1), job('alpha', 2)]] };
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha'], onlyNew: true }, silentLog);
  assert.equal(actor.dataset.length, 2);
  boards.alpha = [[job('alpha', 2), job('alpha', 3)]];
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha'], onlyNew: true }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId), [1, 2, 3]);
  // A job cut off by a limit is not remembered, so it comes back next time.
  boards.alpha = [[job('alpha', 4), job('alpha', 5)]];
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha'], onlyNew: true, maxItems: 1 }, silentLog);
  await runScraper(actor, fakeAdapter(boards), { companies: ['alpha'], onlyNew: true }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId), [1, 2, 3, 4, 5]);
});

test('partial jobs are completed before the final filter, and descriptions can be left out', async () => {
  const actor = fakeActor();
  const boards = { alpha: [[job('alpha', 1, { descriptionText: 'x', descriptionHtml: '<p>x</p>' }), job('alpha', 2)]] };
  await runScraper(actor, fakeAdapter(boards, { partial: true }), { companies: ['alpha'], departments: ['sales'], includeDescription: false }, silentLog);
  assert.equal(actor.dataset.length, 2);
  assert.ok(actor.dataset.every((j) => j.department === 'Sales' && !('descriptionText' in j)));
});

test('an empty input scrapes the example board, and a run fails only when every company fails', async () => {
  const actor = fakeActor();
  await runScraper(actor, fakeAdapter({ alpha: [[job('alpha', 1)]] }), {}, silentLog);
  assert.equal(actor.dataset.length, 1);
  const partlyBroken = await runScraper(fakeActor(), fakeAdapter({ alpha: [[job('alpha', 1)]] }), { companies: ['alpha', 'broken'] }, silentLog);
  assert.match(partlyBroken.message, /\(1 failed: broken\)/);
  await assert.rejects(runScraper(fakeActor(), fakeAdapter({}), { companies: ['broken'] }, silentLog), /board is down/);
  await assert.rejects(runScraper(fakeActor(), fakeAdapter({}), { companies: ['bad name'] }, silentLog), /bad name/);
});

test('adapters with a dedupe key skip the same job from another source, not from the same one', async () => {
  const actor = fakeActor();
  const adapter = {
    ...fakeAdapter({
      alpha: [[job('alpha', 1, { title: 'Nurse' }), job('alpha', 2, { title: 'Nurse' })]],
      beta: [[job('beta', 3, { title: 'Nurse' }), job('beta', 4, { title: 'Doctor' })]],
    }),
    companyConcurrency: 1,
    dedupeKey: (j) => j.title,
  };
  const result = await runScraper(actor, adapter, { companies: ['alpha', 'beta'] }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId), [1, 2, 4]);
  assert.equal(result.saved, 3);
  assert.equal(actor.values.SUMMARY.companies.find((c) => c.company === 'beta').duplicates, 1);
});

test('once other sources fill the run, the remaining details are not loaded', async () => {
  const actor = fakeActor();
  const statuses = [];
  actor.setStatusMessage = async (text) => { statuses.push(text); };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const loaded = [];
  const adapter = {
    name: 'fake',
    title: 'Fake',
    detailConcurrency: 1,
    parseCompany: (value) => ({ id: value, key: value, label: value.toUpperCase() }),
    async *listJobs(company) {
      if (company.id === 'fast') {
        await sleep(10);
        yield [1, 2, 3].map((id) => job('fast', `f${id}`));
      } else {
        yield [1, 2, 3, 4].map((id) => ({ ...job('slow', `s${id}`), partial: true }));
      }
    },
    async completeJob(partial) {
      if (partial.company === 'slow') {
        loaded.push(partial.jobId);
        await sleep(40);
      }
      return { ...partial, partial: undefined };
    },
  };
  const result = await runScraper(actor, adapter, { companies: ['slow', 'fast'], maxItems: 3, onlyNew: false }, silentLog);
  assert.deepEqual(actor.dataset.map((j) => j.jobId), ['f1', 'f2', 'f3']);
  // The slow source started one job page before the fast one filled the run, then stopped.
  assert.deepEqual(loaded, ['s1']);
  assert.match(result.message, /stopped at the limit of 3 jobs/);
  // Progress names the sources in progress and ends with every source finished.
  assert.ok(statuses.some((text) => /^Saved 0 jobs, finished 0 of 2 companies; working on SLOW/.test(text)));
  assert.ok(statuses.some((text) => /working on SLOW, FAST|working on FAST, SLOW/.test(text)));
  assert.equal(statuses.at(-1), 'Saved 3 jobs, finished 2 of 2 companies');
});

test('a source stopped because the run is full is not reported as failed', async () => {
  const actor = fakeActor();
  const warnings = [];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const adapter = {
    name: 'fake',
    title: 'Fake',
    parseCompany: (value) => ({ id: value, key: value }),
    async *listJobs(company) {
      if (company.id === 'fast') {
        yield [1, 2].map((id) => job('fast', `f${id}`));
        return;
      }
      await sleep(30);
      // What the HTTP client throws for a request in progress when the run stops it.
      throw Object.assign(new Error('Stopped before the next page'), { stopped: true, retryable: false });
    },
  };
  const result = await runScraper(actor, adapter, { companies: ['slow', 'fast'], maxItems: 2 }, { ...silentLog, warning: (text) => warnings.push(text) });
  assert.equal(actor.dataset.length, 2);
  assert.ok(actor.values.SUMMARY.companies.every((company) => company.error === null));
  assert.deepEqual(warnings, []);
  assert.doesNotMatch(result.message, /failed/);
});
