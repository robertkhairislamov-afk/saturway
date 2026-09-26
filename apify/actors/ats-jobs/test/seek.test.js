import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as seek from '../src/adapters/seek.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));

test('seek: the form, keywords and SEEK links become searches', () => {
  const prepared = seek.prepareInput({
    searchQueries: ['python developer', 'https://www.seek.com.au/data-engineer-jobs-in-information-communication-technology/in-All-Melbourne-VIC?worktype=242'],
    country: 'NZ',
    location: 'Auckland',
    classifications: ['6281', 'unknown'],
    workTypes: ['242', '244'],
    workArrangements: ['3'],
    postedWithinDays: 3,
    minSalary: 100000,
  });
  const [form, link] = prepared.companies.map((key) => seek.parseCompany(key));
  assert.equal(form.site, 'NZ');
  assert.equal(form.id, 'python developer in Auckland');
  assert.deepEqual(
    [form.params.classification, form.params.worktype, form.params.workarrangement, form.params.daterange, form.params.salaryrange, form.params.salarytype, form.params.sortmode],
    ['6281', '242,244', '3', '4', '100000-', 'annual', 'ListedDate'],
  );
  assert.equal(link.site, 'AU');
  assert.equal(link.id, 'data engineer in All Melbourne VIC');
  assert.deepEqual([link.params.classification, link.params.worktype, link.params.sortmode], ['6281', '242', 'KeywordRelevance']);
  assert.equal(seek.parseCompany('nurse').key, seek.parseCompany(seek.searchKey({ query: 'nurse' })).key);
  assert.throws(() => seek.parseCompany('https://www.indeed.com/jobs?q=nurse'), /not a SEEK search link/);
  // A location on its own lists every job there.
  assert.equal(seek.parseCompany(seek.prepareInput({ location: 'Perth WA' }).companies[0]).id, 'all jobs in Perth WA');
});

test('seek: search requests carry the site and filters', () => {
  const url = new URL(seek.searchUrl('NZ', { keywords: 'nurse', worktype: '243', where: '' }, 3));
  assert.equal(url.hostname, 'www.seek.co.nz');
  assert.equal(url.searchParams.get('siteKey'), 'NZ-Main');
  assert.equal(url.searchParams.get('where'), 'All New Zealand');
  assert.equal(url.searchParams.get('worktype'), '243');
  assert.equal(url.searchParams.get('page'), '3');
  assert.equal(url.searchParams.get('pageSize'), '55');
});

test('seek: big searches split by classification, work type, then salary band', () => {
  const [dimension, parts] = seek.chooseSplit({ keywords: 'developer' });
  assert.equal(dimension, 'classification');
  assert.equal(parts.length, Object.keys(seek.CLASSIFICATIONS).length);
  assert.equal(seek.chooseSplit({ classification: '6281' })[0], 'work type');
  const [, bands] = seek.chooseSplit({ classification: '6281', worktype: '242', salaryrange: '100000-', salarytype: 'annual' });
  assert.deepEqual(bands.map(([, next]) => next.salaryrange), ['100000-110000', '110000-130000', '130000-160000', '160000-200000', '200000-']);
  assert.equal(seek.chooseSplit({ classification: '6281', worktype: '242', salaryrange: '110000-130000' }), null);
});

test('seek: search results and job details in the shared format', () => {
  const { data } = fixture('seek-search.json');
  const partial = seek.toJob(data[0]);
  assert.equal(partial.ats, 'seek');
  assert.equal(partial.jobUrl, `https://www.seek.com.au/job/${data[0].id}`);
  assert.equal(partial.department, 'Information & Communication Technology');
  assert.equal(partial.workplaceType, 'hybrid');
  assert.equal(partial.employmentType, 'full-time');
  assert.ok(partial.descriptionHtml.includes('<li>'));
  const full = seek.toJob(data[0], fixture('seek-job.json'));
  assert.ok(full.descriptionText.length > 500 && !full.descriptionText.includes('<'));
  assert.match(full.validThrough, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(full.country, 'Australia');
  const paid = data.map((raw) => seek.toJob(raw)).filter((job) => job.salary);
  assert.ok(paid.length >= 2 && paid.every((job) => job.salary.currency === 'AUD' && job.salary.interval === 'year'));
  assert.equal(seek.toJob(data[1], null, 'NZ').salary.currency, 'NZD');
});

test('seek: bare salary numbers on full-time jobs are thousands a year', () => {
  const pick = (salary) => salary && [salary.min, salary.max, salary.interval];
  assert.deepEqual(pick(seek.salaryOf('85 - 105', 'Full time', 'AU')), [85000, 105000, 'year']);
  assert.deepEqual(pick(seek.salaryOf('85 - 105', 'Contract/Temp', 'AU')), [85, 105, 'hour']);
  assert.deepEqual(pick(seek.salaryOf('$56 - $60 p.h.', 'Full time', 'AU')), [56, 60, 'hour']);
  assert.equal(seek.salaryOf('Competitive salary + bonus', 'Full time', 'AU'), null);
  // On the Asian sites pay without a period is monthly, even when it looks hourly or yearly.
  assert.deepEqual(pick(seek.salaryOf('Rp 3.000.000', 'Full time', 'ID')), [3000000, 3000000, 'month']);
  assert.deepEqual(pick(seek.salaryOf('HK$20,000 – HK$25,000 + year-end bonus', 'Full time', 'HK')), [20000, 25000, 'month']);
  assert.deepEqual(pick(seek.salaryOf('$6 – $7 per hour', 'Full time', 'PH')), [6, 7, 'hour']);
  assert.equal(seek.salaryOf('$6 – $7 per hour', 'Full time', 'PH').currency, 'USD');
  assert.deepEqual(pick(seek.salaryOf('Php50,000-Php60,000', 'Full time', 'PH')), [50000, 60000, 'month']);
  assert.equal(seek.salaryOf('MW Hay Grade 17 + Flexible Working Arrangements', 'Full time', 'AU'), null);
  assert.deepEqual(pick(seek.salaryOf('100k - 120k + super', 'Full time', 'AU')), [100000, 120000, 'year']);
  assert.deepEqual(pick(seek.salaryOf('EA7 (38 hours) - $99,550.81 + super', 'Full time', 'AU')), [99550.81, 99550.81, 'year']);
});

test('jobstreet and jobsdb: the same code with their own sites, names and links', () => {
  const jobstreet = seek.brandAdapter('jobstreet');
  const jobsdb = seek.brandAdapter('jobsdb');
  assert.equal(jobstreet.name, 'jobstreet');
  assert.equal(jobsdb.title, 'JobsDB');
  // Keywords search the brand's first site, or the chosen country.
  assert.equal(jobstreet.parseCompany('nurse').site, 'MY');
  assert.equal(jobstreet.parseCompany(jobstreet.prepareInput({ searchQueries: ['nurse'], country: 'PH' }).companies[0]).site, 'PH');
  assert.equal(jobsdb.parseCompany(jobsdb.prepareInput({ searchQueries: ['nurse'] }).companies[0]).site, 'HK');
  // Links from current and old domains.
  const link = jobstreet.parseCompany('https://sg.jobstreet.com/software-engineer-jobs/in-Central-Region?worktype=242');
  assert.deepEqual([link.site, link.id, link.params.worktype], ['SG', 'software engineer in Central Region', '242']);
  assert.equal(jobstreet.parseCompany('https://www.jobstreet.com.my/accountant-jobs').site, 'MY');
  assert.equal(jobsdb.parseCompany('https://th.jobsdb.com/jobs').id, 'all jobs in Thailand');
  assert.throws(() => jobsdb.parseCompany('https://www.indeed.com/jobs?q=nurse'), /not a JobsDB search link. Search on hk\.jobsdb\.com, th\.jobsdb\.com/);
  // Asian sites search the whole country without a "where".
  assert.equal(new URL(seek.searchUrl('TH', { keywords: 'nurse' })).searchParams.get('where'), null);
  assert.equal(new URL(seek.searchUrl('ID', { keywords: 'nurse' })).hostname, 'id.jobstreet.com');
  // Jobs carry the brand of their site.
  const [raw] = JSON.parse(readFileSync(new URL('./fixtures/seek-search.json', import.meta.url), 'utf8')).data;
  const job = seek.toJob(raw, null, 'HK');
  assert.equal(job.ats, 'jobsdb');
  assert.equal(job.jobUrl, `https://hk.jobsdb.com/job/${raw.id}`);
});
