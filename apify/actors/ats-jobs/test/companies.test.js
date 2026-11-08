import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EMPTY_COMPANY, createCompanyCollector, departmentOf, isStaffingAgency, nameKey } from '../src/core/companies.js';
import { runScraper } from '../src/core/run.js';

const NOW = Date.parse('2026-10-20T12:00:00Z');
const daysAgo = (days) => new Date(NOW - days * 86400000).toISOString();
// Made-up employers and jobs.
const job = (company, id, fields = {}) => ({
  jobId: String(id),
  company: company.id,
  companyName: company.name,
  title: 'Account Executive',
  location: 'Austin, TX',
  country: 'US',
  remote: false,
  salary: null,
  postedAt: daysAgo(1),
  jobUrl: `https://example.com/jobs/${id}`,
  companyRating: 4.1,
  companyWebsite: 'https://www.acme-widgets.example',
  companySize: '201 to 500 Employees',
  companyIndustry: 'Machinery Manufacturing',
  ...fields,
});
const ACME = { id: '101', name: 'Acme Widgets' };
const BOLT = { id: '202', name: 'Bolt Robotics' };

test('departmentOf sorts titles into teams', () => {
  assert.equal(departmentOf('Senior Data Engineer'), 'Data & AI');
  assert.equal(departmentOf('Sales Engineer'), 'Sales');
  assert.equal(departmentOf('Engineering Manager, Platform'), 'Engineering & IT');
  assert.equal(departmentOf('Registered Nurse - ICU'), 'Healthcare');
  assert.equal(departmentOf('Customer Success Manager'), 'Customer Support');
  assert.equal(departmentOf('Forklift Operator'), 'Operations & Logistics');
  assert.equal(departmentOf('Chief of Staff'), 'Other');
});

test('isStaffingAgency reads the industry and the name', () => {
  assert.equal(isStaffingAgency({ companyName: 'Northwind', companyIndustry: 'HR Consulting' }), true);
  assert.equal(isStaffingAgency({ companyName: 'Northwind Staffing Group' }), true);
  assert.equal(isStaffingAgency({ companyName: 'Acme Widgets', companyIndustry: 'Machinery Manufacturing' }), false);
});

test('the collector groups jobs into one record per company', () => {
  const collector = createCompanyCollector();
  collector.add(job(ACME, 1, { salary: { min: 80000, max: 100000, currency: 'USD', interval: 'year' } }), 'sales in Austin');
  collector.add(job(ACME, 2, { title: 'Sales Development Rep', remote: true, postedAt: daysAgo(20), salary: { min: 60000, max: 70000, currency: 'USD', interval: 'year' } }), 'sales in Austin');
  collector.add(job(ACME, 3, { title: 'Data Analyst', location: 'Dallas, TX', postedAt: daysAgo(40), salary: { min: 30, max: 40, currency: 'USD', interval: 'hour' } }), 'analyst in Texas');
  collector.add(job(BOLT, 4, { companyWebsite: null, companyRating: null, normalizedTitle: 'director non title', title: 'Director of Sales' }), 'sales in Austin');
  collector.add(job({ id: null, name: 'Confidential' }, 5), 'sales in Austin');
  collector.add(job({ id: null, name: 'Indeed' }, 7), 'sales in Austin');
  collector.add(job({ id: '303', name: 'Northwind Staffing' }, 6), 'sales in Austin');
  const [acme, ...rest] = collector.records(NOW);
  assert.deepEqual(Object.keys(acme), Object.keys(EMPTY_COMPANY));
  assert.equal(acme.companyName, 'Acme Widgets');
  assert.equal(acme.companyId, '101');
  assert.equal(acme.companyDomain, 'acme-widgets.example');
  assert.equal(acme.jobs, 3);
  assert.equal(acme.jobsLast7Days, 1);
  assert.equal(acme.jobsLast30Days, 2);
  assert.equal(acme.remoteJobs, 1);
  assert.equal(acme.jobsWithSalary, 3);
  assert.deepEqual(acme.departments, { Sales: 2, 'Data & AI': 1 });
  assert.deepEqual(acme.locations, [{ location: 'Austin, TX', jobs: 2 }, { location: 'Dallas, TX', jobs: 1 }]);
  // The yearly pay of two jobs is the most common kind; the hourly job is left out of the range.
  assert.deepEqual(acme.salaryRange, { min: 60000, max: 100000, currency: 'USD', interval: 'year', jobs: 2 });
  assert.deepEqual(acme.searches, ['sales in Austin', 'analyst in Texas']);
  assert.equal(acme.sampleJobs[0].jobUrl, 'https://example.com/jobs/1');
  assert.equal(acme.newestJobAt, daysAgo(1));
  // Confidential employers are dropped; staffing agencies are kept and flagged unless excluded.
  assert.deepEqual(rest.map((r) => [r.companyName, r.isStaffingAgency]), [['Bolt Robotics', false], ['Northwind Staffing', true]]);
  assert.deepEqual(rest[0].topJobTitles, [{ title: 'Director of Sales', jobs: 1 }]);
  assert.equal(collector.skipped.hidden, 2);
  const strict = createCompanyCollector({ excludeStaffingAgencies: true });
  strict.add(job({ id: '303', name: 'Northwind Staffing' }, 6));
  assert.equal(strict.size, 0);
  assert.equal(strict.skipped.staffing, 1);
});

test('runs over several sites match companies by name and keep each site\'s details', () => {
  assert.equal(nameKey('Acme Widgets, Inc.'), nameKey('ACME WIDGETS'));
  assert.equal(nameKey('The Home Depot'), nameKey('Home Depot'));
  assert.notEqual(nameKey('Acme Widgets'), nameKey('Acme Robotics'));
  const collector = createCompanyCollector({ byName: true });
  collector.add({ ...job(ACME, 1), ats: 'indeed', company: 'acme-widgets', companyName: 'Acme Widgets, Inc.', companyRating: null, companySize: '201 to 500' });
  collector.add({ ...job(ACME, 2), ats: 'linkedin', company: '998877', companyName: 'ACME WIDGETS', companySize: null, companyLogo: undefined, companyLogoUrl: 'https://example.com/logo.png', industries: 'Machinery Manufacturing', companyIndustry: undefined });
  collector.add({ ...job(BOLT, 3), ats: 'linkedin', company: '112233' });
  const [acme, bolt] = collector.records(NOW);
  assert.equal(acme.jobs, 2);
  assert.equal(acme.companyId, null);
  assert.deepEqual(acme.sites, ['indeed', 'linkedin']);
  assert.equal(acme.companySize, '201 to 500');
  assert.equal(acme.companyLogo, 'https://example.com/logo.png');
  assert.equal(bolt.companyName, 'Bolt Robotics');
  // LinkedIn names the industry of the job page; staffing agencies are found by it too.
  const linkedin = createCompanyCollector({ excludeStaffingAgencies: true });
  linkedin.add({ ...job({ id: '5', name: 'Northwind' }, 4), companyIndustry: undefined, industries: 'Staffing and Recruiting' });
  assert.equal(linkedin.size, 0);
});

// --- The run in company mode ---------------------------------------------------------------------

const silentLog = { info() {}, warning() {}, error() {} };
function fakeActor({ maxCharges = Infinity } = {}) {
  const actor = {
    dataset: [],
    values: {},
    async pushData(items) { actor.dataset.push(...items); },
    async setValue(key, value) { actor.values[key] = value; },
    async setStatusMessage() {},
    getEnv: () => ({ actorTaskId: null }),
    getChargingManager: () => ({ calculateMaxEventChargeCountWithinLimit: () => maxCharges }),
    async openKeyValueStore() { return { getValue: async () => null, setValue: async () => {} }; },
    async createProxyConfiguration() { return undefined; },
  };
  return actor;
}
function fakeAdapter(pages, extra = {}) {
  return {
    name: 'fake',
    title: 'Fake',
    companyMode: true,
    exampleInput: { companies: ['sales'] },
    parseCompany: (value) => ({ id: value, key: value }),
    async *listJobs(search) { yield* pages[search.id] ?? []; },
    completeJob: async (j, search, context) => {
      assert.equal(context.includeDescription, false, 'company mode loads no descriptions');
      return j;
    },
    ...extra,
  };
}

test('company mode saves companies, most jobs first, within maxItems and the charge limit', async () => {
  const pages = {
    sales: [[job(ACME, 1), job(BOLT, 2)], [job(ACME, 3)]],
    data: [[job(ACME, 4, { title: 'Data Analyst' }), job({ id: '404', name: 'Cobalt Health' }, 5), job({ id: null, name: 'Company Confidential' }, 6)]],
  };
  let actor = fakeActor();
  let result = await runScraper(actor, fakeAdapter(pages), { companies: ['sales', 'data'], outputMode: 'companies', maxItems: 2 }, silentLog);
  assert.deepEqual(actor.dataset.map((r) => [r.companyName, r.jobs]), [['Acme Widgets', 3], ['Bolt Robotics', 1]]);
  assert.equal(result.saved, 2);
  assert.match(result.message, /Saved 2 hiring companies from 6 jobs in 2 companies \(1 jobs of unnamed or confidential employers left out, kept the 2 companies with most jobs of 3\)/);
  assert.equal(actor.values.SUMMARY.companiesFound, 3);
  assert.equal(actor.values.SUMMARY.jobsRead, 6);
  actor = fakeActor({ maxCharges: 1 });
  result = await runScraper(actor, fakeAdapter(pages), { companies: ['sales', 'data'], outputMode: 'companies' }, silentLog);
  assert.equal(actor.dataset.length, 1);
  assert.match(result.message, /maximum cost/);
});

test('company mode reads up to 20 jobs per company asked for, at least 1,000', async () => {
  // 3,000 jobs of 1,500 companies, in pages of 100.
  const pages = { sales: Array.from({ length: 30 }, (_, p) => Array.from({ length: 100 }, (_, i) => {
    const n = p * 100 + i;
    return job({ id: `c${n % 1500}`, name: `Company ${n % 1500}` }, n);
  })) };
  let actor = fakeActor();
  let result = await runScraper(actor, fakeAdapter(pages), { companies: ['sales'], outputMode: 'companies', maxItems: 10 }, silentLog);
  assert.equal(actor.values.SUMMARY.jobsRead, 1000);
  assert.equal(actor.dataset.length, 10);
  assert.match(result.message, /among the first 1000 jobs/);
  actor = fakeActor();
  await runScraper(actor, fakeAdapter(pages), { companies: ['sales'], outputMode: 'companies', maxItems: 120 }, silentLog);
  assert.equal(actor.values.SUMMARY.jobsRead, 2400);
  // Without a limit every job is read.
  actor = fakeActor();
  await runScraper(actor, fakeAdapter(pages), { companies: ['sales'], outputMode: 'companies' }, silentLog);
  assert.equal(actor.values.SUMMARY.jobsRead, 3000);
  assert.equal(actor.dataset.length, 1500);
});

test('adapters without company mode keep saving jobs', async () => {
  const actor = fakeActor();
  const warnings = [];
  await runScraper(actor, fakeAdapter({ sales: [[job(ACME, 1)]] }, { companyMode: false, completeJob: undefined }), { companies: ['sales'], outputMode: 'companies' }, { ...silentLog, warning: (m) => warnings.push(m) });
  assert.equal(actor.dataset[0].jobId, '1');
  assert.match(warnings[0], /no hiring-companies output/);
});

test('a run stops before its time limit and keeps what it found', async () => {
  const previous = process.env.ACTOR_TIMEOUT_AT;
  process.env.ACTOR_TIMEOUT_AT = new Date(Date.now() + 1500).toISOString();
  try {
    const actor = fakeActor();
    let n = 0;
    const adapter = fakeAdapter({}, {
      companyMode: false,
      completeJob: undefined,
      async *listJobs(search, context) {
        for (;;) {
          // A request that fails fast until the run stops the client, then throws "stopped".
          await context.http.getJson('http://127.0.0.1:9/never', { retries: 1 }).catch((error) => { if (error.stopped) throw error; });
          n++;
          yield [job({ id: `c${n}`, name: `Company ${n}` }, n)];
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      },
    });
    const result = await runScraper(actor, adapter, { companies: ['sales'] }, silentLog);
    assert.ok(actor.dataset.length > 0);
    assert.match(result.message, /stopped before the run's time limit/);
  } finally {
    if (previous === undefined) delete process.env.ACTOR_TIMEOUT_AT;
    else process.env.ACTOR_TIMEOUT_AT = previous;
  }
});
