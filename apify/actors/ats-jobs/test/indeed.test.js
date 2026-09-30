import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as indeed from '../src/adapters/indeed.js';
import { fixture } from './helpers.js';

const HOUR = 60 * 60 * 1000;

test('indeed: the form and keywords become Indeed search links', () => {
  const { companies } = indeed.prepareInput({
    searchQueries: ['software engineer'],
    country: 'gb',
    location: 'London',
    distance: 10,
    jobTypes: ['fulltime', 'contract', 'nope'],
    workplaceTypes: ['hybrid'],
    experienceLevels: ['entry'],
    easyApplyOnly: true,
    postedWithinDays: 7,
  });
  const url = new URL(companies[0]);
  assert.equal(url.hostname, 'uk.indeed.com');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    q: 'software engineer', l: 'London', radius: '10', fromage: '7', sc: '0kf:attr(CF3CP|NJXCK,OR)attr(PAXZC)attr(Y4JG9);', iafilter: '1',
  });
  const search = indeed.parseCompany(companies[0]);
  assert.equal(search.id, 'software engineer in London, United Kingdom');
  assert.equal(search.country, 'GB');
  assert.deepEqual([search.what, search.where, search.radius, search.days, search.easyApply], ['software engineer', 'London', 10, 7, true]);
  assert.deepEqual(search.groups, [['CF3CP', 'NJXCK'], ['PAXZC'], ['Y4JG9']]);
  // The same search with the options in another order has the same key.
  const reordered = indeed.prepareInput({ searchQueries: ['software engineer'], country: 'GB', location: 'London', distance: 10, jobTypes: ['contract', 'fulltime'], workplaceTypes: ['hybrid'], experienceLevels: ['entry'], easyApplyOnly: true, postedWithinDays: 7 });
  assert.equal(indeed.parseCompany(reordered.companies[0]).key, search.key);
  // A location alone lists every job there; plain keywords search the United States.
  assert.equal(indeed.parseCompany(indeed.prepareInput({ location: 'Austin, TX' }).companies[0]).id, 'all jobs in Austin, TX, United States');
  const plain = indeed.parseCompany('nurse');
  assert.deepEqual([plain.country, plain.what, plain.where, plain.radius, plain.groups], ['US', 'nurse', '', null, []]);
  assert.equal(indeed.searchUrl({ country: 'XX' }), 'https://www.indeed.com/jobs');
});

test('indeed: links from Indeed sites in every country', () => {
  const berlin = indeed.parseCompany('https://de.indeed.com/jobs?q=python&l=Berlin&radius=15&fromage=3&sc=0kf%3Aattr%28DSQF7%29%3B&vjk=abc');
  assert.deepEqual([berlin.country, berlin.what, berlin.where, berlin.radius, berlin.days, berlin.groups], ['DE', 'python', 'Berlin', 15, 3, [['DSQF7']]]);
  const leeds = indeed.parseCompany('https://www.indeed.co.uk/q-data-analyst-l-leeds-jobs.html');
  assert.deepEqual([leeds.country, leeds.what, leeds.where, leeds.radius], ['GB', 'data analyst', 'leeds', 25]);
  const older = indeed.parseCompany('https://www.indeed.com/jobs?q=nurse&jt=parttime&explvl=ENTRY_LEVEL&sort=date');
  assert.deepEqual(older.groups, [['75GKK'], ['Y4JG9']]);
  assert.equal(indeed.parseCompany('https://malaysia.indeed.com/jobs?q=sales').country, 'MY');
  assert.equal(indeed.countryOfHost('ca.indeed.com'), 'CA');
  assert.equal(indeed.countryOfHost('indeed.com'), 'US');
  assert.equal(indeed.countryOfHost('example.com'), null);
  assert.throws(() => indeed.parseCompany('https://www.reed.co.uk/jobs/nurse-jobs'), /not an Indeed search link/);
  assert.throws(() => indeed.parseCompany('https://www.indeed.com/cmp/Deloitte'), /not an Indeed search link/);
});

test('indeed: jobs in the shared format with salaries, job types and benefits', () => {
  const [yearly, hourly, upTo, unpaid] = fixture('indeed-search.json').data.jobSearch.results.map(({ job }) => indeed.toJob(job));
  assert.equal(yearly.ats, 'indeed');
  assert.equal(yearly.jobId, '59481e3778178d50');
  assert.equal(yearly.jobUrl, 'https://www.indeed.com/viewjob?jk=59481e3778178d50');
  assert.match(yearly.applyUrl, /^https:\/\//);
  assert.deepEqual([yearly.salary.currency, yearly.salary.interval, yearly.salary.source], ['USD', 'year', 'listing']);
  assert.ok(yearly.salary.min > 10000 && yearly.salary.max >= yearly.salary.min);
  assert.equal(yearly.employmentType, 'full-time');
  assert.deepEqual(yearly.jobTypes, ['Full-time']);
  assert.equal(yearly.seniorityLevel, 'Senior level');
  assert.ok(yearly.benefits.includes('Health insurance'));
  assert.ok(yearly.schedule.includes('Day shift'));
  assert.ok(!yearly.attributes.includes('Health insurance'));
  assert.equal(hourly.salary.interval, 'hour');
  assert.match(String(hourly.salary.min), /^\d+(\.\d{1,2})?$/);
  assert.match(upTo.salary.text, /^Up to USD [\d,.]+ per hour$/);
  assert.equal(upTo.salary.min, null);
  assert.equal(unpaid.salary, null);
  for (const job of [yearly, hourly, upTo, unpaid]) {
    assert.match(job.postedAt, /^\d{4}-\d\d-\d\dT/);
    assert.match(job.listedAt, /^\d{4}-\d\d-\d\dT/);
    assert.equal(job.descriptionText, 'About the role\n• Provide patient care.\n• Work with the care team.');
    assert.equal(typeof job.easyApply, 'boolean');
    assert.equal(job.country, 'US');
  }
  // Jobs of other countries link to that country's Indeed site.
  assert.match(indeed.toJob({ key: 'abc', title: 'Nurse' }, 'GB').jobUrl, /^https:\/\/uk\.indeed\.com\/viewjob\?jk=abc$/);
});

test('indeed: salaries, workplaces and names of job types', () => {
  const pay = (range, unitOfWork = 'HOUR', currencyCode = 'USD') => indeed.salaryOf({ currencyCode, baseSalary: { unitOfWork, range } });
  assert.deepEqual(pay({ __typename: 'Range', min: 48.33000183105469, max: 77.33000183105469 }), { min: 48.33, max: 77.33, currency: 'USD', interval: 'hour', text: 'USD 48.33–77.33 per hour', source: 'listing' });
  assert.deepEqual([pay({ __typename: 'Exactly', value: 50 }).min, pay({ __typename: 'Exactly', value: 50 }).max], [50, 50]);
  assert.equal(pay({ __typename: 'AtLeast', min: 100000 }, 'YEAR').text, 'From USD 100,000 per year');
  assert.equal(pay({ __typename: 'AtMost', max: 3000 }, 'MONTH', 'GBP').text, 'Up to GBP 3,000 per month');
  assert.equal(pay({}), null);
  assert.equal(indeed.salaryOf(null), null);
  const tagged = (...keys) => indeed.toJob({ key: 'k', title: 'T', attributes: keys.map((key) => ({ key, label: key === 'CF3CP' ? '100%' : key })) });
  assert.equal(tagged('DSQF7').workplaceType, 'remote');
  assert.equal(tagged('DSQF7').remote, true);
  assert.equal(tagged('DSQF7', 'SWG7T').workplaceType, 'hybrid');
  assert.equal(tagged('PAXZC').remote, false);
  assert.equal(tagged('SWG7T').workplaceType, 'onsite');
  // Indeed Switzerland calls full-time "100%".
  assert.deepEqual(tagged('5QWDV', 'CF3CP').jobTypes, ['Permanent', 'Full-time']);
  assert.equal(tagged('5QWDV', 'CF3CP').employmentType, 'full-time');
  assert.equal(tagged('ZG59D').employmentType, 'contract');
});

test('indeed: queries and filters', () => {
  const query = indeed.searchQuery({ what: '', where: 'Austin, TX', description: false });
  assert.doesNotMatch(query, /\$what|description/);
  assert.match(query, /location: \$location/);
  assert.match(indeed.searchQuery({ what: 'nurse', where: '', description: true }), /what: \$what[\s\S]*description \{ html \}/);
  const search = { easyApply: true };
  assert.deepEqual(indeed.filtersOf(search, ['CF3CP'], { from: 0, to: null }), [
    { keyword: { field: 'attributes', keys: ['CF3CP'] } },
    { keyword: { field: 'indeedApplyScope', keys: ['DESKTOP'] } },
  ]);
  assert.deepEqual(indeed.filtersOf({}, [], { from: 5, to: 192 }), [{ date: { field: 'dateOnIndeed', start: '192h', end: '5h' } }]);
  assert.deepEqual(indeed.filtersOf({}, [], { from: 5, to: null }), [{ date: { field: 'dateOnIndeed', end: '5h' } }]);
  assert.deepEqual(indeed.combinations([['A', 'B'], ['C']]), [['A', 'C'], ['B', 'C']]);
  assert.deepEqual(indeed.combinations([]), [[]]);
});

// Pages of a fake API: `count` jobs from `newest` hours ago, one hour older every `perHour` jobs.
function page(prefix, count, newest, perHour, now, next) {
  const results = Array.from({ length: count }, (_, index) => ({ job: { key: `${prefix}${index}`, title: 'Nurse', dateOnIndeed: now - (newest + index / perHour) * HOUR } }));
  return { data: { jobSearch: { pageInfo: { nextCursor: next }, results } } };
}

test('indeed: a search past the limit of about 1,000 jobs goes on with older jobs', async () => {
  const now = Date.UTC(2026, 8, 30, 12);
  const calls = [];
  // Round one: 900 jobs over 9 pages, down to 3.6 hours ago. Round two, from 3 hours ago: 40 jobs.
  const responses = [
    ...Array.from({ length: 9 }, (_, index) => page(`a${index}-`, 100, index * 0.4, 250, now, index < 8 ? `c${index}` : null)),
    page('b-', 40, 3.5, 250, now, null),
  ];
  const http = { async postJson(url, body, options) { calls.push({ url, body, options }); return responses.shift(); } };
  const notes = [];
  const search = indeed.parseCompany(indeed.searchUrl({ country: 'DE', query: 'Pflege', location: 'Berlin', postedWithinDays: 7 }));
  const jobs = [];
  for await (const batch of indeed.listJobs(search, { http, log: { info: (text) => notes.push(text) }, now })) jobs.push(...batch);
  assert.equal(jobs.length, 940);
  assert.equal(calls.length, 10);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /at most about 1,000 jobs per search/);
  const first = calls[0];
  assert.equal(first.url, 'https://apis.indeed.com/graphql');
  assert.deepEqual([first.options.headers['indeed-co'], first.options.headers['indeed-locale']], ['DE', 'de-DE']);
  assert.deepEqual(first.body.variables.location, { where: 'Berlin', radius: 25, radiusUnit: 'KILOMETERS' });
  // Seven days ask Indeed for eight; the second round starts at the hour of the oldest job read.
  assert.deepEqual(first.body.variables.filters, [{ date: { field: 'dateOnIndeed', start: '192h' } }]);
  assert.equal(calls[1].body.variables.cursor, 'c0');
  assert.deepEqual(calls[9].body.variables.filters, [{ date: { field: 'dateOnIndeed', start: '192h', end: '3h' } }]);
  assert.equal(calls[9].body.variables.cursor, null);
  assert.equal(jobs[0].jobUrl, 'https://de.indeed.com/viewjob?jk=a0-0');
});

test('indeed: "any of" filters run one search each, and API errors stop the search', async () => {
  const bodies = [];
  const http = { async postJson(url, body) { bodies.push(body); return page(`j${bodies.length}-`, 2, 1, 10, Date.now(), null); } };
  const search = indeed.parseCompany(indeed.searchUrl({ query: 'nurse', jobTypes: ['fulltime', 'parttime'], workplaceTypes: ['remote'] }));
  const jobs = [];
  for await (const batch of indeed.listJobs(search, { http, log: { info() {} } })) jobs.push(...batch);
  assert.equal(jobs.length, 4);
  assert.deepEqual(bodies.map((body) => body.variables.filters[0].keyword.keys), [['CF3CP', 'DSQF7'], ['75GKK', 'DSQF7']]);
  assert.equal(bodies[0].variables.what, 'nurse');
  assert.equal('location' in bodies[0].variables, false);
  const failing = { async postJson() { return { errors: [{ message: 'Invalid date filter' }] }; } };
  await assert.rejects(async () => {
    for await (const batch of indeed.listJobs(indeed.parseCompany('nurse'), { http: failing, log: { info() {} } })) assert.ok(batch);
  }, /Indeed did not run the search: Invalid date filter/);
});
