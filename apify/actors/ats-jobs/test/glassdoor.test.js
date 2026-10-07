import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as glassdoor from '../src/adapters/glassdoor.js';
import { fixture } from './helpers.js';

const views = () => fixture('glassdoor-search.json')[0].data.jobListings.jobListings.map(({ jobview }) => jobview);

test('glassdoor: the form and keywords become Glassdoor search links', () => {
  const { companies } = glassdoor.prepareInput({
    searchQueries: ['software engineer'],
    country: 'th',
    location: 'Bangkok',
    distance: 20,
    jobTypes: ['fulltime', 'contract', 'nope'],
    experienceLevels: ['entry', 'director'],
    remoteOnly: true,
    easyApplyOnly: true,
    minCompanyRating: '4',
    postedWithinDays: 7,
  });
  const url = new URL(companies[0]);
  assert.equal(url.hostname, 'www.glassdoor.com');
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    'sc.keyword': 'software engineer', locKeyword: 'Bangkok', locT: 'N', locId: '229', radius: '25', fromAge: '7',
    jobType: 'fulltime,contract', seniorityType: 'entrylevel,director', remoteWorkType: '1', applicationType: '1', minRating: '4.0',
  });
  const search = glassdoor.parseCompany(companies[0]);
  assert.equal(search.id, 'software engineer in Bangkok, Thailand');
  assert.deepEqual([search.country, search.what, search.where, search.place, search.days], ['TH', 'software engineer', 'Bangkok', null, 7]);
  assert.deepEqual(search.levels, ['entrylevel', 'director']);
  assert.deepEqual(search.filters, { jobType: 'fulltime,contract', remoteWorkType: '1', applicationType: '1', minRating: '4.0', radius: '25' });
  // The same search with the options in another order has the same key.
  const reordered = glassdoor.prepareInput({ searchQueries: ['Software Engineer'], country: 'TH', location: 'bangkok', distance: 25, jobTypes: ['contract', 'fulltime'], experienceLevels: ['director', 'entry'], remoteOnly: true, easyApplyOnly: true, minCompanyRating: 4, postedWithinDays: 7 });
  assert.equal(glassdoor.parseCompany(reordered.companies[0]).key, search.key);
  // A location alone lists every job there; plain keywords search the whole United States.
  assert.equal(glassdoor.parseCompany(glassdoor.prepareInput({ location: 'Austin, TX' }).companies[0]).id, 'all jobs in Austin, TX, United States');
  const plain = glassdoor.parseCompany('nurse');
  assert.deepEqual([plain.country, plain.what, plain.where, plain.place, plain.levels], ['US', 'nurse', '', { type: 'COUNTRY', id: 1 }, []]);
  assert.equal(new URL(glassdoor.searchUrl({ country: 'XX', location: 'Boston', distance: 500 })).searchParams.get('radius'), '100');
});

test('glassdoor: links from Glassdoor sites in every country', () => {
  const nyc = glassdoor.parseCompany('https://www.glassdoor.com/Job/new-york-ny-data-analyst-jobs-SRCH_IL.0,11_IC1132348_KO12,24.htm?fromAge=3&jobType=fulltime&sortBy=date_desc');
  assert.deepEqual([nyc.country, nyc.what, nyc.where, nyc.place, nyc.days, nyc.filters], ['US', 'data analyst', '', { type: 'CITY', id: 1132348 }, 3, { jobType: 'fulltime' }]);
  assert.equal(nyc.id, 'data analyst in new york ny');
  const london = glassdoor.parseCompany('https://www.glassdoor.co.uk/Job/london-nurse-jobs-SRCH_IL.0,6_IC2671300_KO7,12.htm');
  assert.deepEqual([london.country, london.what, london.place], ['GB', 'nurse', { type: 'CITY', id: 2671300 }]);
  const india = glassdoor.parseCompany('https://www.glassdoor.com/Job/india-java-jobs-SRCH_IL.0,5_IN115_KO6,10.htm');
  assert.deepEqual([india.country, india.what, india.place, india.id], ['IN', 'java', { type: 'COUNTRY', id: 115 }, 'java in India']);
  const berlin = glassdoor.parseCompany('https://de.glassdoor.ch/Job/python-jobs-SRCH_KO0,6.htm');
  assert.deepEqual([berlin.country, berlin.what, berlin.place], ['CH', 'python', { type: 'COUNTRY', id: 226 }]);
  const older = glassdoor.parseCompany('https://nl.glassdoor.be/Job/jobs.htm?sc.keyword=verpleegkundige&locT=S&locId=3058&seniorityType=entrylevel,boss');
  assert.deepEqual([older.country, older.what, older.place, older.levels], ['BE', 'verpleegkundige', { type: 'STATE', id: 3058 }, ['entrylevel']]);
  assert.equal(glassdoor.countryOfHost('glassdoor.com.au'), 'AU');
  assert.equal(glassdoor.countryOfHost('www.glassdoor.com'), 'US');
  assert.equal(glassdoor.countryOfHost('glassdoor.com.evil.example'), null);
  assert.equal(glassdoor.countryOfHost('notglassdoor.com'), null);
  assert.throws(() => glassdoor.parseCompany('https://www.indeed.com/jobs?q=nurse'), /not a Glassdoor search link/);
  assert.throws(() => glassdoor.parseCompany('https://www.glassdoor.com/Reviews/index.htm'), /not a Glassdoor search link/);
});

test('glassdoor: jobs in the shared format with salaries, estimates and company details', () => {
  const now = Date.UTC(2026, 9, 7);
  const [yearly, hourly, estimated, remote] = views().map((view) => glassdoor.toJob(view, 'US', now));
  assert.equal(yearly.ats, 'glassdoor');
  assert.equal(yearly.jobId, '1010225215460');
  assert.match(yearly.jobUrl, /^https:\/\/www\.glassdoor\.com\/job-listing\/.+\?jl=1010225215460$/);
  assert.equal(yearly.applyUrl, yearly.jobUrl);
  assert.deepEqual(yearly.salary, { min: 95351, max: 102351, currency: 'USD', interval: 'year', text: 'USD 95,351–102,351 per year', source: 'listing' });
  assert.equal(yearly.salaryEstimate, null);
  assert.equal(yearly.postedAt, '2026-09-08T00:00:00.000Z');
  assert.deepEqual([yearly.employmentType, yearly.jobTypes, yearly.city, yearly.state, yearly.country], ['full-time', ['Full-time'], 'Brooklyn', 'NY', 'US']);
  assert.deepEqual([yearly.companyName, yearly.company, yearly.companyRating, yearly.companySize, yearly.companyFounded], ['The New York Foundling', '252591', 3.4, '1001 to 5000 Employees', 1869]);
  assert.equal(yearly.companyWebsite, 'https://www.nyfoundling.org');
  assert.equal(yearly.companyUrl, 'https://www.glassdoor.com/Overview/Working-at-The-New-York-Foundling-EI_IE252591.11,33.htm');
  assert.deepEqual([hourly.salary.interval, hourly.salary.min, hourly.salary.max], ['hour', 60, 63]);
  assert.deepEqual(hourly.jobTypes, ['Full-time', 'Part-time']);
  assert.equal(hourly.normalizedTitle, null);
  // Glassdoor's own estimate is kept apart from pay the employer states.
  assert.equal(estimated.salary, null);
  assert.deepEqual([estimated.salaryEstimate.min, estimated.salaryEstimate.median, estimated.salaryEstimate.max, estimated.salaryEstimate.source], [81144, 97659, 117536, 'estimate']);
  assert.deepEqual([estimated.easyApply, estimated.sponsored, estimated.employmentType, estimated.companyRevenue], [true, true, 'contract', null]);
  assert.deepEqual([remote.remote, remote.workplaceType, remote.city, remote.state, remote.salary, remote.salaryEstimate], [true, 'remote', null, 'Pennsylvania', null, null]);
  for (const job of [yearly, hourly, estimated, remote]) {
    assert.equal(job.descriptionText, null);
    assert.equal(job.seniorityLevel, null);
    assert.match(job.companyLogo, /^https:\/\/media\.glassdoor\.com\//);
  }
  // Without a date, the age in days counts; the country comes from Glassdoor's country id.
  const bare = glassdoor.toJob({ header: { ageInDays: 2, jobCountryId: 96, locationName: 'Berlin', locationType: 'C' }, job: { listingId: 5 } }, 'US', now);
  assert.deepEqual([bare.postedAt, bare.country, bare.city, bare.state, bare.jobUrl], ['2026-10-05T00:00:00.000Z', 'DE', 'Berlin', null, 'https://www.glassdoor.com/job-listing/j?jl=5']);
  assert.equal(glassdoor.companyUrlOf(9079, 'Google'), 'https://www.glassdoor.com/Overview/Working-at-Google-EI_IE9079.11,17.htm');
  assert.equal(glassdoor.companyUrlOf(0, 'Google'), null);
});

// A fake Glassdoor API: answers searches from `pages` in order and records each request.
function fakeApi(pages, { places = [] } = {}) {
  const calls = [];
  return {
    calls,
    http: {
      async getJson(url) {
        calls.push({ url });
        return places;
      },
      async postJson(url, body, options) {
        calls.push({ url, body, options });
        const next = pages.shift();
        return typeof next === 'function' ? next(body) : next;
      },
    },
  };
}
const listing = (ids, remaining) => [{ data: { jobListings: { totalJobsCount: remaining, jobListings: ids.map((id) => ({ jobview: { header: { jobTitleText: `Job ${id}` }, job: { listingId: id } } })) } } }];
const range = (from, count) => Array.from({ length: count }, (_, index) => from + index);
const collect = async (search, context) => {
  const jobs = [];
  for await (const page of glassdoor.listJobs(search, context)) jobs.push(...page);
  return jobs;
};

test('glassdoor: a search goes past 30 pages with the jobs read so far excluded', async () => {
  const { http, calls } = fakeApi([
    listing(range(1, 100), 250),
    listing(range(101, 100), 150),
    // Glassdoor fails to fill a page of a long search: asked for again.
    listing([], 0),
    listing(range(201, 40), 50),
    // The last few jobs are kept back: the search ends.
    listing([], 10),
  ], { places: [{ locationId: 3, locationType: 'C', label: 'Springfield, IL', country2LetterIso: 'US' }, { locationId: 2671300, locationType: 'C', label: 'London, England', country2LetterIso: 'GB' }] });
  const notes = [];
  const search = glassdoor.parseCompany(glassdoor.searchUrl({ country: 'GB', query: 'nurse', location: 'London', postedWithinDays: 7 }));
  const jobs = await collect(search, { http, log: { info: (text) => notes.push(text) }, retryDelayMs: 1 });
  assert.equal(jobs.length, 240);
  assert.equal(new Set(jobs.map((job) => job.jobId)).size, 240);
  assert.match(calls[0].url, /autocomplete\/location\?.*term=London$/);
  const searches = calls.filter((call) => call.body);
  assert.equal(searches.length, 5);
  const [first] = searches[0].body;
  assert.equal(searches[0].url, 'https://api.glassdoor.com/graph');
  assert.equal(searches[0].options.headers['apollographql-client-name'], 'job-search-next');
  // The London of the United Kingdom, not the first suggestion; seven days ask Glassdoor for eight.
  assert.deepEqual([first.variables.locationId, first.variables.locationType, first.variables.keyword, first.variables.pageNumber], [2671300, 'CITY', 'nurse', 1]);
  assert.deepEqual(first.variables.filterParams, [{ filterKey: 'fromAge', values: '8' }]);
  assert.deepEqual(first.variables.excludeJobListingIds, []);
  assert.equal(searches[1].body[0].variables.excludeJobListingIds.length, 100);
  assert.equal(searches[3].body[0].variables.excludeJobListingIds.length, 200);
  assert.deepEqual(notes, []);
});

test('glassdoor: experience levels run one search each, and errors stop the search', async () => {
  const { http, calls } = fakeApi([listing([1, 2], 2), listing([3], 1)]);
  const search = glassdoor.parseCompany(glassdoor.searchUrl({ query: 'nurse', levels: ['entry', 'midsenior'], jobTypes: ['parttime'] }));
  const jobs = await collect(search, { http, log: { info() {} } });
  assert.deepEqual(jobs.map((job) => [job.jobId, job.seniorityLevel]), [['1', 'Entry level'], ['2', 'Entry level'], ['3', 'Mid-senior level']]);
  assert.deepEqual(calls.map((call) => call.body[0].variables.filterParams), [
    [{ filterKey: 'jobType', values: 'parttime' }, { filterKey: 'seniorityType', values: 'entrylevel' }],
    [{ filterKey: 'jobType', values: 'parttime' }, { filterKey: 'seniorityType', values: 'midseniorlevel' }],
  ]);
  assert.deepEqual([calls[0].body[0].variables.locationType, calls[0].body[0].variables.locationId], ['COUNTRY', 1]);

  const failing = fakeApi([[{ errors: [{ message: 'An Error Occurred' }], data: { jobListings: null } }]]);
  await assert.rejects(() => collect(glassdoor.parseCompany('nurse'), { http: failing.http, log: { info() {} } }), /Glassdoor did not run the search: An Error Occurred/);
  // Glassdoor answers a whole country without keywords with jobs from anywhere.
  await assert.rejects(() => collect(glassdoor.parseCompany('https://www.glassdoor.co.uk/Job/united-kingdom-jobs-SRCH_IL.0,14_IN2.htm'), { http: fakeApi([]).http, log: { info() {} } }), /needs keywords to search a whole country/);
  const nowhere = fakeApi([], { places: [{ locationId: 9, locationType: 'C', label: 'Paris, TX', country2LetterIso: 'US' }] });
  await assert.rejects(() => collect(glassdoor.parseCompany(glassdoor.searchUrl({ country: 'DE', query: 'koch', location: 'Paris' })), { http: nowhere.http, log: { info() {} } }), /does not know "Paris" in Germany/);
});

test('glassdoor: descriptions load several jobs per request', async () => {
  const { http, calls } = fakeApi([
    (body) => [{ data: Object.fromEntries(Object.keys(body[0].variables).map((alias) => [alias, { job: { description: `<p>About job ${body[0].variables[alias]}</p><ul><li>Care</li></ul>` } }])) }],
    () => [{ data: { j0: null, j1: { job: { description: '<p>Last</p>' } } } }],
  ]);
  const context = { http, log: { warning() {} }, includeDescription: true };
  const jobs = range(1, 12).map((id) => glassdoor.toJob({ header: {}, job: { listingId: id } }));
  const full = await Promise.all(jobs.map((job) => glassdoor.completeJob(job, null, context)));
  assert.equal(calls.length, 2);
  assert.equal(Object.keys(calls[0].body[0].variables).length, 10);
  assert.match(calls[0].body[0].query, /^query JobDescriptions\(\$j0: Long!, .*\$j9: Long!\) \{\n {2}j0: jobView\(listingId: \$j0/);
  assert.deepEqual(calls[1].body[0].variables, { j0: 11, j1: 12 });
  assert.equal(full[0].descriptionText, 'About job 1\n• Care');
  assert.equal(full[0].descriptionHtml, '<p>About job 1</p><ul><li>Care</li></ul>');
  // A job Glassdoor has no view for keeps everything else.
  assert.deepEqual([full[10].descriptionText, full[10].title, full[11].descriptionText], [null, null, 'Last']);

  const warnings = [];
  const broken = { async postJson() { throw new Error('HTTP 503'); } };
  const kept = await glassdoor.completeJob(jobs[0], null, { http: broken, log: { warning: (text) => warnings.push(text) }, includeDescription: true });
  assert.equal(kept.jobId, '1');
  assert.match(warnings[0], /did not send some job descriptions: HTTP 503/);
  const untouched = fakeApi([]);
  assert.equal(await glassdoor.completeJob(jobs[0], null, { http: untouched.http, includeDescription: false }), jobs[0]);
  assert.equal(untouched.calls.length, 0);
});
