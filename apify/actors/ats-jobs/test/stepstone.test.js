import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as stepstone from '../src/adapters/stepstone.js';

const fixture = (file) => readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');

test('stepstone: the form, keywords and stepstone.de links become searches', () => {
  const prepared = stepstone.prepareInput({
    searchQueries: ['data analyst', 'https://www.stepstone.de/jobs/teilzeit/marketing/in-hamburg?radius=30&action=facet_selected&page=3'],
    location: 'Frankfurt am Main',
    radius: 30,
    contractTypes: ['222', '229', 'unknown'],
    workTypes: ['teilzeit'],
    remoteTypes: ['2'],
    experience: ['90002'],
    languages: ['en'],
    postedWithinDays: 3,
  });
  const [form, link] = prepared.companies.map((value) => stepstone.parseCompany(value));
  const url = new URL(form.url);
  assert.equal(url.pathname, '/jobs/teilzeit/data-analyst/in-frankfurt-am-main');
  assert.deepEqual(url.searchParams.getAll('ct'), ['222', '229']);
  assert.deepEqual(
    ['radius', 'wfh', 'ex', 'fdl', 'ag', 'sort'].map((param) => url.searchParams.get(param)),
    ['30', '2', '90002', 'en', 'age_7', '2'],
  );
  assert.equal(form.id, 'data analyst in frankfurt am main');
  assert.equal(link.id, 'marketing in hamburg');
  assert.equal(new URL(link.url).searchParams.get('page'), null);
  assert.equal(new URL(link.url).searchParams.get('action'), null);
  assert.equal(stepstone.parseCompany('c++').url, stepstone.parseCompany(stepstone.searchUrl({ query: 'c++' })).url);
  assert.match(new URL(stepstone.searchUrl({ query: 'c++' })).pathname, /^\/jobs\/c%2B%2B$/);
  assert.throws(() => stepstone.parseCompany('https://www.indeed.de/jobs?q=python'), /not a StepStone search link/);
  assert.equal(stepstone.parseCompany(stepstone.prepareInput({ location: 'Köln' }).companies[0]).id, 'all jobs in köln');
});

test('stepstone: search pages are read from the preloaded state', () => {
  const page = stepstone.parseSearchPage(fixture('stepstone-search.html'));
  assert.equal(page.jobs.length, 3);
  assert.equal(page.page, 1);
  assert.ok(page.pageCount > 1 && page.total > 25);
  assert.throws(() => stepstone.parseSearchPage('<html></html>'), /not a StepStone search result page/);
  // Page versions with only "unifiedPagination" still give the page count.
  const unified = fixture('stepstone-search.html').replace('"pagination":', '"unifiedPagination":');
  assert.equal(stepstone.parseSearchPage(unified).pageCount, page.pageCount);
  const noPages = fixture('stepstone-search.html').replace('"pagination":', '"otherPagination":');
  assert.equal(stepstone.parseSearchPage(noPages).pageCount, Math.ceil(page.total / 25));
  assert.deepEqual(stepstone.objectAfter('x = {"a":"}{\\"","b":{"c":1}}; y', 'x ='), { a: '}{"', b: { c: 1 } });
});

test('stepstone: jobs in the shared format, with the job page details', () => {
  const [raw] = stepstone.parseSearchPage(fixture('stepstone-search.html')).jobs;
  const partial = stepstone.toJob(raw);
  assert.equal(partial.ats, 'stepstone');
  assert.equal(partial.jobUrl, `https://www.stepstone.de${raw.url.split('?')[0]}`);
  assert.deepEqual(partial.locations, raw.location.split(', '));
  assert.equal(partial.workplaceType, 'hybrid');
  assert.ok(partial.benefits.length > 0 && partial.benefits.every((benefit) => !benefit.includes('<')));
  const full = stepstone.toJob(raw, stepstone.parseJobPage(fixture('stepstone-job.html')));
  assert.equal(full.employmentType, 'full-time');
  assert.ok(full.descriptionText.length > 1000 && !full.descriptionText.includes('<'));
  assert.match(full.validThrough, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(full.industry);
  assert.equal(stepstone.parseJobPage('<html></html>'), null);
});
