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
  assert.throws(() => stepstone.parseCompany('https://www.indeed.de/jobs?q=python'), /not a StepStone search or company link/);
  assert.throws(() => stepstone.parseCompany('https://www.stepstone.de/cmp/de/inovex-gmbh-24494'), /not a StepStone search or company link/);
  // Company pages list all jobs of one employer.
  const company = stepstone.parseCompany('https://www.stepstone.de/cmp/de/inovex-GmbH-24494/jobs.html?page=2');
  assert.equal(company.url, 'https://www.stepstone.de/cmp/de/inovex-gmbh-24494/jobs');
  assert.equal(company.companyId, '24494');
  assert.equal(company.id, 'inovex gmbh (company)');
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
  // StepStone now also gives full addresses.
  assert.equal(stepstone.toJob({ ...raw, url: `https://www.stepstone.de${raw.url}` }).jobUrl, partial.jobUrl);
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

test('stepstone: company pages give the company details, read once per company', async () => {
  const html = fixture('stepstone-company.html');
  const details = stepstone.parseCompanyPage(html);
  assert.equal(details.id, '24494');
  assert.equal(details.companySize, '251-1000');
  assert.equal(details.companyIndustry, 'IT & Tech');
  assert.equal(details.companyFounded, 1999);
  assert.equal(details.companyHeadquarters, 'Ludwig-Erhard-Allee 6, Karlsruhe');
  assert.equal(details.companyJobsCount, 6);
  assert.ok(details.companySummary.startsWith('inovex ist') && !details.companySummary.includes('<'));
  assert.equal(stepstone.parseCompanyPage('<html></html>'), null);
  // A company page is also a job list.
  assert.equal(stepstone.parseSearchPage(html).jobs.length, 2);

  const [raw] = stepstone.parseSearchPage(fixture('stepstone-search.html')).jobs;
  let reads = 0;
  const context = { includeDescription: false, log: {}, options: { includeCompanyDetails: true }, http: { getText: async () => { reads++; return html; } } };
  const search = stepstone.parseCompany('python');
  const one = await stepstone.completeJob({ raw }, search, context);
  const two = await stepstone.completeJob({ raw: { ...raw, id: 'other' } }, search, context);
  assert.equal(reads, 1);
  assert.equal(one.companySize, '251-1000');
  assert.equal(two.companyFounded, 1999);
  // Without the option no company page is read and the fields stay empty.
  const plain = await stepstone.completeJob({ raw }, search, { ...context, options: {}, stepstoneCompanies: undefined });
  assert.equal(plain.companySize, null);
  assert.equal(reads, 1);
});

test('stepstone: excluded companies and recruitment agencies are left out', async () => {
  const items = stepstone.parseSearchPage(fixture('stepstone-search.html')).jobs;
  const agency = { ...items[2], id: 'agency', companyName: 'Hays AG' };
  const zeitarbeit = { ...items[2], id: 'zeit', companyName: 'Muster Personaldienstleistungen GmbH' };
  const page = fixture('stepstone-search.html');
  const run = async (options, extra = []) => {
    const jobs = [];
    // The fixture's jobs plus two agencies, on one page.
    const context = { http: { getText: async () => page.replace('"items":[', `"items":[${extra.map((item) => JSON.stringify(item)).join(',')}${extra.length ? ',' : ''}`) }, log: { info() {}, warning() {} }, options };
    for await (const batch of stepstone.listJobs({ ...stepstone.parseCompany('python'), id: 'python' }, context)) { jobs.push(...batch); break; }
    return jobs.map((job) => job.companyName);
  };
  const all = await run({}, [agency, zeitarbeit]);
  assert.ok(all.includes('Hays AG') && all.includes('inovex GmbH'));
  const noAgencies = await run({ excludeRecruitmentAgencies: true }, [agency, zeitarbeit]);
  assert.ok(!noAgencies.includes('Hays AG') && !noAgencies.includes('Muster Personaldienstleistungen GmbH') && noAgencies.includes('inovex GmbH'));
  const noInovex = await run({ excludeCompanies: ['inovex'] });
  assert.ok(!noInovex.includes('inovex GmbH') && noInovex.length === 2);
});
