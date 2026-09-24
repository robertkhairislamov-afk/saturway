import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as ashby from '../src/adapters/ashby.js';
import * as greenhouse from '../src/adapters/greenhouse.js';
import * as lever from '../src/adapters/lever.js';
import * as workday from '../src/adapters/workday.js';
import { fixture } from './helpers.js';

test('greenhouse: board names and URLs', () => {
  const id = (value) => greenhouse.parseCompany(value).id;
  assert.equal(id('airbnb'), 'airbnb');
  assert.equal(id('Door Dash'), 'doordash');
  assert.equal(id('https://boards.greenhouse.io/stripe/jobs/123'), 'stripe');
  assert.equal(id('https://job-boards.greenhouse.io/figma'), 'figma');
  assert.equal(id('https://boards.greenhouse.io/embed/job_board?for=discord'), 'discord');
  assert.equal(id('https://boards-api.greenhouse.io/v1/boards/datadog/jobs'), 'datadog');
  assert.throws(() => greenhouse.parseCompany('https://careers.airbnb.com/positions/1'), /not a Greenhouse URL/);
});

test('greenhouse: job with a structured pay range', () => {
  const [withPay, withoutPay] = fixture('greenhouse-jobs.json').jobs;
  const company = greenhouse.parseCompany('airbnb');
  const job = greenhouse.toJob(withPay, company);
  assert.equal(job.ats, 'greenhouse');
  assert.equal(job.companyName, 'Airbnb');
  assert.equal(job.title, 'Account Manager');
  assert.equal(job.department, 'Business Development');
  assert.equal(job.workplaceType, 'hybrid');
  assert.deepEqual(job.salary, { min: 46000, max: 54000, currency: 'GBP', interval: 'year', text: 'GBP 46,000–54,000 per year', source: 'ats' });
  assert.equal(job.postedAt, '2026-09-09T08:35:19.000Z');
  assert.match(job.descriptionHtml, /^<div class="content-intro">/);
  assert.ok(job.descriptionText.startsWith('Airbnb was born in 2007'));
  assert.equal(greenhouse.toJob(withoutPay, company).location, 'Tokyo, Japan');
});

test('lever: company names, EU boards and salary ranges', () => {
  assert.equal(lever.parseCompany('https://jobs.lever.co/palantir/abc').id, 'palantir');
  assert.match(lever.parseCompany('https://jobs.eu.lever.co/acme').apiUrl, /^https:\/\/api\.eu\.lever\.co\/v0\/postings\/acme/);
  const [palantir, zoox] = fixture('lever-postings.json');
  const job = lever.toJob(zoox, lever.parseCompany('zoox'), 'Zoox');
  assert.equal(job.title, 'Autonomy System Test Engineer');
  assert.equal(job.team, 'Software Platforms and Product');
  assert.equal(job.employmentType, 'full-time');
  assert.equal(job.workplaceType, 'hybrid');
  assert.deepEqual([job.salary.min, job.salary.max, job.salary.currency, job.salary.interval, job.salary.source], [144000, 193000, 'USD', 'year', 'ats']);
  assert.match(job.applyUrl, /\/apply$/);
  const other = lever.toJob(palantir, lever.parseCompany('palantir'), null);
  assert.equal(other.companyName, 'palantir');
  assert.ok(other.descriptionText.length > 100);
});

test('ashby: board names and compensation', () => {
  assert.equal(ashby.parseCompany('https://jobs.ashbyhq.com/The%20Browser%20Company/123').id, 'The Browser Company');
  assert.equal(ashby.parseCompany('ramp').key, 'ramp');
  const job = ashby.toJob(fixture('ashby-jobs.json').jobs[0], ashby.parseCompany('ramp'), 'Ramp');
  assert.equal(job.title, 'Security Engineer, Cloud');
  assert.deepEqual(job.locations, ['New York, NY (HQ)', 'Remote (Canada)', 'Remote (US)', 'Miami, FL']);
  assert.equal(job.remote, true);
  assert.equal(job.workplaceType, 'hybrid');
  assert.equal(job.employmentType, 'full-time');
  assert.deepEqual(job.salary, { min: 211400, max: 290600, currency: 'USD', interval: 'year', text: '$211.4K - $290.6K', source: 'ats' });
});

test('workday: career site URLs, including copied search filters', () => {
  const site = workday.parseCompany('https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/X/Y_JR1?jobFamilyGroup=0c40f6bd1d8f10ae43ffaefd46dc7e78&q=gpu&utm_source=li');
  assert.equal(site.id, 'nvidia/NVIDIAExternalCareerSite');
  assert.equal(site.apiBase, 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite');
  assert.deepEqual(site.appliedFacets, { jobFamilyGroup: ['0c40f6bd1d8f10ae43ffaefd46dc7e78'] });
  assert.equal(site.searchText, 'gpu');
  const recruiting = workday.parseCompany('https://wd3.myworkdaysite.com/recruiting/acme/Careers');
  assert.equal(recruiting.apiBase, 'https://wd3.myworkdaysite.com/wday/cxs/acme/Careers');
  assert.equal(recruiting.siteUrl, 'https://wd3.myworkdaysite.com/recruiting/acme/Careers');
  assert.throws(() => workday.parseCompany('https://example.com/careers'), /not a Workday career site/);
  assert.throws(() => workday.parseCompany('https://nvidia.wd5.myworkdayjobs.com/'), /no career site/);
});

test('workday: search results, job details and splitting big searches', () => {
  const search = fixture('workday-jobs.json');
  const [multi, remote, single] = search.jobPostings.map(workday.toPartialJob);
  assert.equal(multi.locations, undefined);
  assert.deepEqual(single.locations, ['India, Bengaluru']);
  assert.equal(remote.jobId, 'Senior-System-Engineer--Solution-Engineering_JR2026094');
  assert.equal(remote.postedDaysAgo, 2);
  assert.equal(workday.postedDaysAgo('Posted Today'), 0);
  assert.equal(workday.postedDaysAgo('Posted 30+ Days Ago'), 30);

  const company = workday.parseCompany('https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite');
  const job = workday.toJob(fixture('workday-job.json').jobPostingInfo, remote, company);
  assert.equal(job.requisitionId, 'JR2026094');
  assert.equal(job.postedAt, '2026-09-22T00:00:00.000Z');
  assert.equal(job.remote, true);
  assert.equal(job.employmentType, 'full-time');
  assert.equal(job.locations.length, 5);
  assert.deepEqual([job.salary.currency, job.salary.interval, job.salary.source], ['PLN', 'year', 'description']);
  assert.match(job.applyUrl, /_JR2026094\/apply$/);

  const split = workday.chooseSplit(search.facets, {});
  assert.equal(split.parameter, 'jobFamilyGroup');
  assert.notEqual(workday.chooseSplit(search.facets, { jobFamilyGroup: ['x'] })?.parameter, 'jobFamilyGroup');
});
