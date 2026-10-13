import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as xing from '../src/adapters/xing.js';
import { fixture } from './helpers.js';

const answer = () => fixture('xing-search.json');
const rawJobs = () => answer().data.jobSearchByQuery.collection.map(({ jobDetail }) => jobDetail);

test('xing: the form and keywords become Xing search links', () => {
  const { companies, remoteOnly } = xing.prepareInput({
    searchQueries: ['data analyst'],
    location: 'München',
    distance: 30,
    jobTypes: ['fulltime', 'contract', 'nope'],
    experienceLevels: ['entry', 'manager'],
    remoteOnly: true,
    postedWithinDays: 5,
  });
  assert.equal(remoteOnly, false);
  const url = new URL(companies[0]);
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    keywords: 'data analyst', location: 'München', radius: '30', employmentType: 'FULL_TIME,CONTRACTOR', careerLevel: '2,4', remote: 'FULL_REMOTE', sincePeriod: 'last_week',
  });
  const search = xing.parseCompany(companies[0]);
  assert.equal(search.id, 'data analyst in München (30 km)');
  assert.deepEqual([search.what, search.where, search.radius, search.period], ['data analyst', 'München', 30, 'LAST_WEEK']);
  assert.deepEqual(search.filters, { employmentType: ['CONTRACTOR', 'FULL_TIME'], careerLevel: ['2', '4'], remoteOption: ['FULL_REMOTE'] });
  // Links from Xing carry its coded ids; the same search typed in the form has the same key.
  const link = xing.parseCompany('https://www.xing.com/jobs/search/ki?keywords=Data%20Analyst&location=m%C3%BCnchen&radius=30&employmentType=CONTRACTOR.0ed397,FULL_TIME.ef2fe9&careerLevel=4.83b992,2.24d1f6&remote=FULL_REMOTE.050e26&sincePeriod=last_week');
  assert.equal(link.key, search.key);
  // A city alone lists every job there; hybrid and on-site are Xing filters too.
  assert.equal(xing.parseCompany(xing.prepareInput({ location: 'Wien' }).companies[0]).id, 'all jobs in Wien');
  assert.deepEqual(xing.parseCompany(xing.prepareInput({ searchQueries: ['nurse'], workplaceTypes: ['hybrid', 'onsite'] }).companies[0]).filters, { remoteOption: ['NON_REMOTE', 'PARTLY_REMOTE'] });
  assert.equal(xing.parseCompany('pflege').id, 'pflege');
  assert.deepEqual([xing.periodOf(1), xing.periodOf(7), xing.periodOf(30), xing.periodOf(90), xing.periodOf(0)], ['LAST_24_HOURS', 'LAST_WEEK', 'LAST_MONTH', null, null]);
  assert.throws(() => xing.parseCompany('https://www.xing.com/jobs/berlin-data-analyst-158000001'), /not a Xing job search link/);
  assert.throws(() => xing.parseCompany('https://www.stepstone.de/jobs/data-analyst'), /not a Xing job search link/);
});

test('xing: searches send Xing coded ids, the place and the period', () => {
  const search = xing.parseCompany('https://www.xing.com/jobs/search?keywords=pflege&location=Wien&radius=20&employmentType=PART_TIME&careerLevel=3&sincePeriod=last_month');
  assert.deepEqual(xing.variablesOf(search, 40), {
    query: {
      keywords: 'pflege',
      location: { text: 'Wien', radius: 20 },
      filter: { careerLevel: { id: ['3.2ebf16'] }, employmentType: { id: ['PART_TIME.58889d'] } },
    },
    consumer: 'loggedout.web.jobs.conv_search_results.center',
    offset: 40,
    limit: 20,
    sincePeriod: 'LAST_MONTH',
  });
  assert.match(xing.searchQuery(true), /description \{/);
  assert.doesNotMatch(xing.searchQuery(false), /description \{/);
  assert.doesNotMatch(xing.searchQuery(true), /contactInfo|applyEmail/);
});

test('xing: jobs in the shared format with pay, estimates and company', () => {
  const [first, second, third, fourth] = rawJobs().map(xing.toJob);
  assert.equal(first.ats, 'xing');
  assert.deepEqual([first.jobId, first.title, first.companyName, first.company], ['158000001', 'Data Analyst (m/w/d)', 'Beispiel Software GmbH', '1111']);
  assert.deepEqual([first.location, first.locations], ['Berlin, Land Berlin, DE', ['Berlin, Land Berlin, DE', 'Hamburg, Hamburg, DE']]);
  assert.deepEqual([first.city, first.state, first.postalCode, first.country], ['Berlin', 'Land Berlin', '10115', 'DE']);
  assert.deepEqual([first.remote, first.workplaceType, first.remoteOptions, first.employmentType], [false, 'hybrid', ['hybrid'], 'full-time']);
  assert.deepEqual([first.salary.min, first.salary.max, first.salary.currency, first.salary.interval, first.salary.source], [60000, 75000, 'EUR', 'year', 'listing']);
  assert.equal(first.salaryEstimate, null);
  assert.deepEqual([first.seniorityLevel, first.department, first.industry], ['Professional/Experienced', 'Analysis and statistics', 'Computer software']);
  assert.deepEqual([first.postedAt, first.updatedAt, first.validThrough], ['2026-10-01T08:00:00.000Z', '2026-10-10T08:00:00.000Z', '2026-11-01T08:00:00Z']);
  assert.equal(first.applyUrl, first.jobUrl);
  assert.equal(first.descriptionHtml, '<h3>About us</h3><p>We build software for logistics.</p>\n<h3>Your tasks</h3><ul><li>Build dashboards</li><li>Define KPIs</li></ul>\n<h3>Your profile</h3><ul><li>SQL</li></ul>\n<h3>We offer</h3><p>30 days of holiday</p>');
  assert.match(first.descriptionText, /^About us\n/);
  assert.deepEqual(first.summary, { introduction: 'A data team is looking for an analyst.', qualifications: ['SQL', 'Power BI'], responsibilities: ['Build dashboards', 'Define KPIs'] });
  assert.deepEqual([first.companyUrl, first.companySize, first.companyCity], ['https://www.xing.com/pages/beispiel-software', '51-200 employees', 'Berlin']);

  // Xing's salary estimate stays apart from stated pay; another company's page is not used.
  assert.equal(second.salary, null);
  assert.deepEqual([second.salaryEstimate.min, second.salaryEstimate.median, second.salaryEstimate.max, second.salaryEstimate.source], [48000, 54500, 61000, 'estimate']);
  assert.deepEqual([second.companyName, second.company, second.companyUrl, second.companySize], ['Muster Personal GmbH', null, null, null]);
  assert.deepEqual([second.applyUrl, second.employmentType, second.workplaceType], ['https://jobs.example.com/apply/2', 'part-time', 'onsite']);

  assert.deepEqual([third.remote, third.workplaceType, third.remoteOptions], [true, 'remote', ['remote', 'hybrid']]);
  assert.deepEqual([third.salary.min, third.salary.max, third.salary.currency], [120000, 120000, 'CHF']);
  assert.deepEqual([third.companyName, third.company, third.descriptionHtml, third.summary], ['Muster AG', '3333', '<p>Own the roadmap.</p>', null]);

  assert.deepEqual([fourth.companyName, fourth.company, fourth.salary, fourth.salaryEstimate, fourth.descriptionText, fourth.workplaceType], ['Pflegeheim Beispiel', null, null, null, null, null]);
  assert.ok(xing.sameCompany('XING', 'XING - part of NEW WORK SE'));
  assert.ok(!xing.sameCompany('EUROGATE GmbH & Co. KGaA, KG, Hamburg', 'Hafen Hamburg Marketing e.V.'));
});

test('xing: a search reads pages of 20 up to the end and refreshes changed codes', async () => {
  const calls = [];
  const page = (count) => ({ data: { jobSearchByQuery: { collection: Array.from({ length: count }, (_, index) => ({ jobDetail: { ...rawJobs()[0], id: `${calls.length}${index}.x`, slug: `job-${calls.length}${index}` } })) } } });
  let scrambled = true;
  const http = {
    async postJson(url, body, options) {
      calls.push([url, body.variables, options.headers['accept-language']]);
      if (body.query.includes('aggregations')) return { data: { jobSearchByQuery: { aggregations: { employmentTypes: [{ id: 'FULL_TIME.zz9999' }], careerLevels: [], remoteOptions: [] } } } };
      if (body.variables.query.filter && scrambled) {
        scrambled = false;
        return { data: { jobSearchByQuery: null }, errors: [{ id: 'FIELD_SCRAMBLING_ERROR' }] };
      }
      return page(body.variables.offset < 40 ? 20 : 7);
    },
  };
  const notes = [];
  const search = xing.parseCompany(xing.prepareInput({ searchQueries: ['data analyst'], jobTypes: ['fulltime'] }).companies[0]);
  const jobs = [];
  for await (const batch of xing.listJobs(search, { http, log: { info: (text) => notes.push(text) }, includeDescription: false })) jobs.push(...batch);
  assert.equal(jobs.length, 47);
  assert.equal(calls[0][0], 'https://www.xing.com/graphql/api');
  assert.equal(calls[0][2], 'en');
  // The first answer named an outdated code: Xing's codes are read again and the page asked again.
  assert.deepEqual(calls.map(([, variables]) => variables.offset ?? 'codes'), [0, 'codes', 0, 20, 40]);
  assert.deepEqual(calls[2][1].query.filter, { employmentType: { id: ['FULL_TIME.zz9999'] } });
  assert.deepEqual(notes, []);

  const empty = { async postJson() { return { data: { jobSearchByQuery: { collection: [] } } }; } };
  const none = [];
  for await (const batch of xing.listJobs(xing.parseCompany(xing.prepareInput({ location: 'Atlantis' }).companies[0]), { http: empty, log: { info: (text) => none.push(text) } })) assert.ok(batch);
  assert.match(none[0], /found no jobs\. The location must be a city/);
  const broken = { async postJson() { return { data: null, errors: [{ message: 'Could not resolve fields', details: { description: 'Limit cannot be > 20' } }] }; } };
  await assert.rejects(async () => { for await (const batch of xing.listJobs(xing.parseCompany('nurse'), { http: broken, log: { info() {} } })) assert.ok(batch); }, /Xing did not answer the search: Limit cannot be > 20/);
});
