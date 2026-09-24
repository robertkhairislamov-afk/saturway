import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as dice from '../src/adapters/dice.js';

const page = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('dice: the search form and links become search URLs', () => {
  const url = new URL(dice.searchUrl({
    query: 'python developer',
    location: 'Austin, TX',
    radius: 25,
    workplaceTypes: ['Remote', 'Hybrid'],
    employmentTypes: ['CONTRACTS'],
    postedDate: 'THREE',
    easyApply: true,
  }));
  assert.equal(url.searchParams.get('q'), 'python developer');
  assert.equal(url.searchParams.get('location'), 'Austin, TX');
  assert.equal(url.searchParams.get('radius'), '25');
  assert.equal(url.searchParams.get('filters.workplaceTypes'), 'Remote|Hybrid');
  assert.equal(url.searchParams.get('filters.employmentType'), 'CONTRACTS');
  assert.equal(url.searchParams.get('filters.postedDate'), 'THREE');
  assert.equal(url.searchParams.get('filters.easyApply'), 'true');

  const prepared = dice.prepareInput({ searchQueries: ['java', 'https://www.dice.com/jobs?q=go&page=3'], location: 'Remote' });
  assert.equal(new URL(prepared.companies[0]).searchParams.get('location'), 'Remote');
  assert.equal(prepared.companies[1], 'https://www.dice.com/jobs?q=go&page=3');
  assert.equal(dice.prepareInput({ location: 'Boston, MA' }).companies.length, 1);

  const search = dice.parseCompany('https://www.dice.com/jobs?q=go&page=3&location=Denver');
  assert.equal(search.id, 'go in Denver');
  assert.ok(!search.url.includes('page='));
  assert.equal(dice.parseCompany('rust engineer').id, 'rust engineer');
  assert.throws(() => dice.parseCompany('https://www.indeed.com/jobs?q=go'), /not a Dice job search link/);
});

test('dice: search pages give jobs, paging and facets', () => {
  const result = dice.parseSearchPage(page('dice-search.html'));
  assert.equal(result.jobs.length, 3);
  assert.equal(result.page, 1);
  assert.ok(result.total > 30);
  const split = dice.chooseSplit(result.facets, 'https://www.dice.com/jobs?q=python');
  assert.equal(split.facetName, 'employerType');
  assert.notEqual(dice.chooseSplit(result.facets, 'https://www.dice.com/jobs?q=python&filters.employerType=Recruiter').facetName, 'employerType');
  assert.throws(() => dice.parseSearchPage('<html></html>'), /not a Dice search result page/);
});

test('dice: jobs in the shared format, with salary from the listing', () => {
  const [raw] = dice.parseSearchPage(page('dice-search.html')).jobs;
  const job = dice.toJob(raw);
  assert.equal(job.ats, 'dice');
  assert.equal(job.jobId, raw.guid);
  assert.equal(job.title, raw.title);
  assert.equal(job.companyName, raw.companyName);
  assert.equal(job.jobUrl, `https://www.dice.com/job-detail/${raw.guid}`);
  assert.match(job.postedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(['full-time', 'contract', 'part-time'].includes(job.employmentType));
  assert.ok(['onsite', 'remote', 'hybrid'].includes(job.workplaceType));
  assert.equal(typeof job.easyApply, 'boolean');
  if (raw.salary && /\d/.test(raw.salary)) {
    assert.equal(job.salary.source, 'listing');
    assert.ok(job.salary.min > 0 && job.salary.currency === 'USD');
  }
});

test('dice: job pages add the description, skills and posting data', () => {
  const details = dice.parseJobPage(page('dice-job.html'));
  assert.ok(details.descriptionHtml.length > 500);
  assert.ok(details.skills.includes('Apache Kafka'));
  assert.ok(details.skills.every((skill) => !skill.includes('&amp;')));
  assert.match(details.validThrough, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual([details.salary.min, details.salary.max, details.salary.currency, details.salary.interval], [150100, 206450, 'USD', 'year']);
  const [raw] = dice.parseSearchPage(page('dice-search.html')).jobs;
  const job = dice.toJob({ ...raw, salary: 'Depends on Experience' }, details);
  assert.equal(job.salary.min, 150100);
  assert.ok(job.descriptionText.length > 300 && !job.descriptionText.includes('<'));
  assert.equal(job.skills.length, details.skills.length);
});

test('dice: flight data rows skip long texts and keep JSON rows', () => {
  const payload = '1:{"a":1}\n2:T5,hello3:["x"]\n';
  assert.deepEqual(dice.flightRows(payload), ['{"a":1}', '["x"]']);
});
