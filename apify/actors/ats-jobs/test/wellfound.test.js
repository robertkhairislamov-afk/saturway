import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as wellfound from '../src/adapters/wellfound.js';

const fixtureHtml = readFileSync(new URL('./fixtures/wellfound-role-page.html', import.meta.url), 'utf8');
const pageData = () => JSON.parse(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(fixtureHtml)[1]);

test('wellfound: roles, places and remote become Wellfound job pages', () => {
  const { companies, remoteOnly } = wellfound.prepareInput({ searchQueries: ['Data Scientist', 'Software Engineer'], location: 'San Francisco, CA', jobTypes: ['full-time', 'contract', 'nope'], remoteOnly: false });
  assert.deepEqual(companies, [
    'https://wellfound.com/role/l/data-scientist/san-francisco?jobTypes=full-time,contract',
    'https://wellfound.com/role/l/software-engineer/san-francisco?jobTypes=full-time,contract',
  ]);
  assert.equal(remoteOnly, false);
  assert.deepEqual(wellfound.prepareInput({ searchQueries: ['Product Manager'], location: 'London', remoteOnly: true }).companies, ['https://wellfound.com/role/r/product-manager']);
  assert.deepEqual(wellfound.prepareInput({ remoteOnly: true }).companies, ['https://wellfound.com/remote']);
  assert.deepEqual(wellfound.prepareInput({ location: 'Bangalore' }).companies, ['https://wellfound.com/location/bangalore']);
  assert.deepEqual(wellfound.prepareInput({}).companies, []);
  assert.equal(wellfound.slugOf('R&D Engineer'), 'r-and-d-engineer');
  assert.equal(wellfound.slugOf('São Paulo'), 'sao-paulo');
});

test('wellfound: Wellfound links and search keys', () => {
  const ny = wellfound.parseCompany('https://wellfound.com/role/l/software-engineer/new-york?jobTypes=contract,full-time');
  assert.deepEqual([ny.role, ny.location, ny.remote, ny.jobTypes, ny.path], ['software-engineer', 'new-york', false, ['contract', 'full-time'], '/role/l/software-engineer/new-york']);
  assert.equal(ny.id, 'software engineer in new york (contract, full-time)');
  assert.equal(ny.key, 'https://wellfound.com/role/l/software-engineer/new-york?jobTypes=contract,full-time');
  // The same search with the job types in another order has the same key.
  assert.equal(wellfound.parseCompany('https://wellfound.com/role/l/software-engineer/new-york?jobTypes=full-time,contract').key, ny.key);
  const remote = wellfound.parseCompany('https://www.wellfound.com/role/r/data-scientist/');
  assert.deepEqual([remote.role, remote.location, remote.remote, remote.id], ['data-scientist', null, true, 'data scientist remote']);
  assert.equal(wellfound.parseCompany('https://wellfound.com/remote').id, 'all jobs remote');
  assert.equal(wellfound.parseCompany('https://wellfound.com/location/london').id, 'all jobs in london');
  assert.equal(wellfound.parseCompany('growth marketer').path, '/role/growth-marketer');
  assert.equal(wellfound.parseCompany('https://angel.co/role/python-developer').role, 'python-developer');
  assert.throws(() => wellfound.parseCompany('https://wellfound.com/company/acme'), /not a Wellfound job page/);
  assert.throws(() => wellfound.parseCompany('https://www.indeed.com/jobs?q=nurse'), /not a Wellfound job page/);
});

test('wellfound: pay and equity', () => {
  assert.deepEqual(wellfound.compensationOf('$150k – $250k • 0.25% – 0.5%'), {
    salary: { min: 150000, max: 250000, currency: 'USD', interval: 'year', text: '$150k – $250k', source: 'listing' },
    equity: { min: 0.25, max: 0.5, text: '0.25% – 0.5%' },
  });
  assert.deepEqual(wellfound.compensationOf('€50k – €70k').salary.currency, 'EUR');
  assert.deepEqual([wellfound.compensationOf('₹10L – ₹20L').salary.min, wellfound.compensationOf('₹10L – ₹20L').salary.max], [1000000, 2000000]);
  assert.deepEqual(wellfound.compensationOf('0.5% – 1.0%'), { salary: null, equity: { min: 0.5, max: 1, text: '0.5% – 1.0%' } });
  assert.deepEqual(wellfound.compensationOf(''), { salary: null, equity: null });
});

test('wellfound: jobs in the shared format with the startup of each job', () => {
  const { jobs, pageCount, total } = wellfound.jobsOfPage(pageData());
  assert.deepEqual([jobs.length, pageCount, total], [4, 17, 753]);
  const [first, , , remote] = jobs;
  assert.equal(first.ats, 'wellfound');
  assert.equal(first.companyName, 'Hazel');
  assert.equal(first.jobUrl, `https://wellfound.com/jobs/${first.jobId}-software-engineer`);
  assert.deepEqual([first.salary.min, first.salary.max, first.equity.min, first.equity.max], [150000, 250000, 0.25, 0.5]);
  assert.deepEqual([first.companySize, first.companyStage], ['1-10', null]);
  assert.ok(first.companyBadges.includes('Growing fast'));
  assert.match(first.companyUrl, /^https:\/\/wellfound\.com\/company\/[a-z0-9-]+$/);
  assert.match(first.postedAt, /^\d{4}-\d\d-\d\dT/);
  assert.equal(first.descriptionText, '**About the role**\n\nBuild and run our product with a small team.\n- Ship features every week\n- Work with customers');
  assert.equal(jobs[2].companyStage, 'Early Stage');
  assert.ok(!jobs[2].companyBadges.includes('Early Stage'));
  assert.deepEqual([remote.remote, remote.workplaceType, remote.remotePolicy, remote.remoteLocations, remote.employmentType], [true, 'remote', 'remote', ['United States'], 'contract']);
  const flexible = wellfound.toJob({ id: '1', slug: 'x', title: 'X', remoteConfig: { kind: 'ONSITE', wfhFlexible: true } });
  assert.deepEqual([flexible.workplaceType, flexible.workFromHomeFlexible, flexible.salary, flexible.companyName], ['hybrid', true, null, null]);
});

test('wellfound: a search reads every page, keeps the chosen job types, and explains unknown roles', async () => {
  const urls = [];
  const page = (pageCount) => fixtureHtml.replace('"pageCount": 17', `"pageCount": ${pageCount}`);
  const http = { async getText(url, options) { urls.push([url, options.redirect, options.accept(fixtureHtml), options.accept('<html>Security Check</html>')]); return page(3); } };
  const notes = [];
  const search = wellfound.parseCompany(wellfound.prepareInput({ searchQueries: ['software engineer'], location: 'New York', jobTypes: ['contract'] }).companies[0]);
  const jobs = [];
  for await (const batch of wellfound.listJobs(search, { http, log: { info: (text) => notes.push(text) } })) jobs.push(...batch);
  assert.deepEqual(urls.map(([url]) => url), [
    'https://wellfound.com/role/l/software-engineer/new-york',
    'https://wellfound.com/role/l/software-engineer/new-york?page=2',
    'https://wellfound.com/role/l/software-engineer/new-york?page=3',
  ]);
  assert.deepEqual(urls[0].slice(1), ['manual', true, false]);
  assert.equal(jobs.length, 3);
  assert.ok(jobs.every((job) => job.employmentType === 'contract'));
  assert.match(notes[0], /lists 753 jobs on 3 pages/);

  const redirected = (location) => ({ async getText() { throw Object.assign(new Error('Redirected'), { status: 303, location }); } });
  const read = async (value, http) => { for await (const batch of wellfound.listJobs(wellfound.parseCompany(value), { http, log: { info() {} } })) assert.ok(batch); };
  await assert.rejects(() => read('https://wellfound.com/role/l/astronaut-chef/new-york', redirected('https://wellfound.com/location/new-york')), /no jobs page for the role "astronaut chef"/);
  await assert.rejects(() => read('https://wellfound.com/role/l/software-engineer/atlantis', redirected('https://wellfound.com/role/software-engineer')), /no jobs page for the place "atlantis"/);
  const missing = { async getText() { throw Object.assign(new Error('Not found'), { status: 404 }); } };
  await assert.rejects(() => read('https://wellfound.com/location/atlantis', missing), /no jobs page for the place "atlantis"/);
});
