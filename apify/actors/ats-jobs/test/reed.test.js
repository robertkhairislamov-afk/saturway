import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as reed from '../src/adapters/reed.js';

const fixture = (file) => readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');

test('reed: the form, keywords and reed.co.uk links become searches', () => {
  const prepared = reed.prepareInput({
    searchQueries: ['data analyst', 'https://www.reed.co.uk/jobs/nurse-jobs-in-leeds?pageno=3&parttime=True'],
    location: 'Greater Manchester',
    distance: 20,
    minSalary: 40000,
    jobTypes: ['perm', 'contract', 'nope'],
    hours: ['fulltime'],
    employerTypes: ['direct'],
    graduate: true,
    postedWithinDays: 1,
  });
  const [form, link] = prepared.companies.map((value) => reed.parseCompany(value));
  const url = new URL(form.url);
  assert.equal(url.pathname, '/jobs/data-analyst-jobs-in-greater-manchester');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    contract: 'True', datecreatedoffset: 'LastThreeDays', direct: 'True', fulltime: 'True', graduate: 'True', perm: 'True', proximity: '20', salaryfrom: '40000',
  });
  assert.equal(form.id, 'data analyst in greater manchester');
  assert.equal(link.id, 'nurse in leeds');
  assert.equal(new URL(link.url).searchParams.get('pageno'), null);
  assert.equal(reed.parseCompany('python').url, 'https://www.reed.co.uk/jobs/python-jobs');
  assert.equal(reed.parseCompany(reed.prepareInput({ location: 'Bristol' }).companies[0]).id, 'all jobs in bristol');
  assert.throws(() => reed.parseCompany('https://www.indeed.co.uk/jobs?q=python'), /not a Reed search link/);
});

test('reed: search results in the shared format, with hidden salaries left out', () => {
  const page = reed.parseSearchPage(fixture('reed-search.html'));
  assert.equal(page.jobs.length, 3);
  assert.ok(page.total > 25);
  const [shown, hidden, daily] = page.jobs.map((listing) => reed.toJob(listing));
  assert.equal(shown.ats, 'reed');
  assert.equal(shown.salary.currency, 'GBP');
  assert.equal(shown.salary.interval, 'year');
  assert.ok(shown.salary.min >= 20000);
  // "Competitive salary": the numbers behind it are not shown on the site.
  assert.equal(hidden.salary, null);
  assert.equal(daily.salary.interval, 'day');
  assert.equal(daily.employmentType, 'contract');
  assert.match(shown.jobUrl, /^https:\/\/www\.reed\.co\.uk\/jobs\/[^/]+\/\d+$/);
  assert.ok(['onsite', 'hybrid', 'remote'].includes(shown.workplaceType));
  assert.ok(shown.descriptionText.length > 20);
  assert.throws(() => reed.parseSearchPage('<html></html>'), /not a Reed search result page/);
});

test('reed: the job page adds the description, contract, sector and location', async () => {
  const details = reed.parseJobPage(fixture('reed-job.html'));
  const listing = { jobDetail: { jobId: details.id, jobTitle: details.title, ouName: 'E.ON', isFullTime: true }, url: `/jobs/aws-python-software-engineer/${details.id}` };
  const job = reed.toJob(listing, details);
  assert.equal(job.contractType, 'Permanent');
  assert.equal(job.employmentType, 'full-time');
  assert.equal(job.hours, 'full-time');
  assert.equal(job.country, 'United Kingdom');
  assert.equal(job.region, 'South East England');
  assert.equal(job.postedBy, 'employer');
  assert.ok(job.sector && job.category && job.department);
  assert.ok(job.descriptionText.length > 500 && !job.descriptionText.includes('<'));
  // This employer hides the salary ("Competitive salary").
  assert.equal(job.salary, null);

  const partial = { ...reed.toJob(listing), partial: true, listing, jobUrl: 'https://www.reed.co.uk/jobs/x/1' };
  const http = (answer) => ({ async getText() { if (answer instanceof Error) throw answer; return answer; } });
  assert.equal((await reed.completeJob(partial, {}, { http: http(fixture('reed-job.html')), includeDescription: true })).contractType, 'Permanent');
  assert.equal(await reed.completeJob(partial, {}, { http: http(Object.assign(new Error('gone'), { status: 404 })), includeDescription: true }), null);
  const closed = fixture('reed-job.html').replace('"isLive":true', '"isLive":false');
  assert.equal(await reed.completeJob(partial, {}, { http: http(closed), includeDescription: true }), null);
});
