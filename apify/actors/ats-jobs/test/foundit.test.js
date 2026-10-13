import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as foundit from '../src/adapters/foundit.js';
import { fixture } from './helpers.js';

const IN = 'www.foundit.in';

test('foundit: the form and keywords become Foundit search links', () => {
  const { companies, remoteOnly } = foundit.prepareInput({
    searchQueries: ['data analyst'],
    location: 'Bangalore; Pune',
    experienceYears: 3,
    postedWithinDays: 7,
    remoteOnly: true,
    sortBy: 'date',
  });
  assert.equal(remoteOnly, false);
  const url = new URL(companies[0]);
  assert.equal(url.hostname, IN);
  assert.deepEqual(Object.fromEntries(url.searchParams), { query: 'data analyst', locations: 'Bangalore,Pune', experience: '3', jobFreshness: '7', jobTypes: 'Work From Home', sort: '2' });
  const search = foundit.parseCompany(companies[0]);
  assert.equal(search.id, 'data analyst in Bangalore,Pune');
  assert.deepEqual(search.params, { query: 'data analyst', locations: 'Bangalore,Pune', experience: '3', jobFreshness: '7', jobTypes: 'Work From Home', sort: '2' });
  // The same search with the places in another order and other case has the same key.
  assert.equal(foundit.parseCompany(foundit.prepareInput({ searchQueries: ['Data Analyst'], location: 'pune;bangalore', experienceYears: 3, postedWithinDays: 7, remoteOnly: true, sortBy: 'date' }).companies[0]).key, search.key);

  // Outside India a search keeps to the chosen country; the Gulf countries share one site.
  const gulf = foundit.parseCompany(foundit.prepareInput({ searchQueries: ['accountant'], country: 'SA' }).companies[0]);
  assert.deepEqual([gulf.host, gulf.params.locations, gulf.id], ['www.founditgulf.com', 'Saudi Arabia', 'accountant in Saudi Arabia (Gulf)']);
  assert.equal(foundit.parseCompany(foundit.prepareInput({ country: 'sg' }).companies[0]).id, 'all jobs in Singapore');
  assert.deepEqual(foundit.prepareInput({}).companies, []);
  assert.equal(foundit.parseCompany('nurse').id, 'nurse in India');

  // Foundit's own links: search pages and SEO pages.
  const seo = foundit.parseCompany('https://www.foundit.in/search/python-developer-jobs-in-bangalore');
  assert.deepEqual(seo.params, { query: 'python developer', locations: 'bangalore' });
  const link = foundit.parseCompany('https://www.foundit.sg/srp/results?query=nurse&locations=Singapore&jobFreshness=14&searchId=abc');
  assert.deepEqual([link.host, link.params], ['www.foundit.sg', { query: 'nurse', locations: 'Singapore', jobFreshness: '14' }]);
  assert.throws(() => foundit.parseCompany('https://www.foundit.in/job/java-developer-70000001'), /not a Foundit search link/);
  assert.throws(() => foundit.parseCompany('https://www.naukri.com/java-jobs'), /not a Foundit search link/);
  assert.throws(() => foundit.parseCompany('https://www.foundit.in/srp/results?experience=3'), /needs keywords or a location/);
});

test('foundit: search results without promoted repeats, in the shared format', () => {
  const listed = foundit.listedJobsOf(fixture('foundit-search.json'));
  assert.deepEqual(listed.map((job) => job.jobId), [70000001, 70000002, 70000003]);
  const [first, second, third] = listed.map((raw) => foundit.toJob(raw, IN));
  assert.equal(first.ats, 'foundit');
  assert.deepEqual([first.jobId, first.title, first.companyName, first.company], ['70000001', 'Java Developer', 'Beispiel Tech Pvt Ltd', '1001']);
  assert.deepEqual([first.salary.min, first.salary.max, first.salary.currency, first.salary.interval], [600000, 900000, 'INR', 'year']);
  assert.deepEqual([first.experienceYearsMin, first.experienceYearsMax, first.applicants, first.quickApply], [3, 6, 42, true]);
  assert.deepEqual([first.location, first.country, first.employmentType, first.department], ['Pune, India', 'IN', 'full-time', 'IT']);
  assert.equal(first.jobUrl, 'https://www.foundit.in/job/java-developer-beispiel-tech-pvt-ltd-pune-india-70000001');
  assert.equal(first.applyUrl, first.jobUrl);
  assert.equal(first.companyUrl, 'https://www.foundit.in/search/beispiel-tech-pvt-ltd-1001-jobs-career');
  assert.deepEqual(first.skills, ['Java', 'Spring Boot', 'SQL']);
  assert.match(first.postedAt, /^2026-/);
  assert.ok(!('recruiterName' in first));

  // No experience and no pay stated; remote by Foundit's "Work From Home" type.
  assert.deepEqual([second.salary, second.experienceYearsMin, second.experienceYearsMax], [null, null, null]);
  assert.deepEqual([second.remote, second.workplaceType, second.employerType, second.urgentlyHiring], [true, 'remote', 'consultant', true]);
  assert.equal(second.applyUrl, 'https://careers.example.com/apply/2');
  // A hidden company and hidden pay stay empty; "Other" is no industry.
  assert.deepEqual([third.companyName, third.salary, third.industries], [null, null, []]);
  // Without the job's record, a Gulf job's country is not guessed.
  assert.equal(foundit.toJob(listed[0], 'www.founditgulf.com').country, null);
});

test('foundit: the job record adds the description, every place and the skills', async () => {
  const [raw] = foundit.listedJobsOf(fixture('foundit-search.json'));
  const calls = [];
  const http = { async getJson(url, options) { calls.push([url, options.headers.referer]); return fixture('foundit-job.json'); } };
  const partial = { ...foundit.toJob(raw, IN), partial: true, raw, host: IN };
  const job = await foundit.completeJob(partial, null, { http, includeDescription: true });
  assert.deepEqual(calls, [['https://www.foundit.in/middleware/jobdetail/70000001', 'https://www.foundit.in/srp/results']]);
  assert.equal(job.descriptionHtml, '<p><strong>About the role</strong></p><ul><li>Build services in Java</li><li>Review code</li></ul>');
  assert.match(job.descriptionText, /About the role/);
  assert.deepEqual(job.locations, ['Pune, Maharashtra, India', 'Bengaluru, Karnataka, India']);
  assert.deepEqual([job.city, job.state, job.country, job.employerType], ['Pune', 'Maharashtra', 'IN', 'company']);
  assert.deepEqual(job.skills, ['Java', 'Spring Boot']);
  assert.deepEqual(job.jobTypes, ['Permanent Job']);
  // The employer's address, email and phone are not part of the output.
  assert.doesNotMatch(JSON.stringify(job), /Example Street|\*\*\*|Example Recruiter/);

  const skipped = await foundit.completeJob(partial, null, { http: { async getJson() { throw new Error('no request expected'); } }, includeDescription: false });
  assert.equal(skipped.descriptionText, null);
  const gone = await foundit.completeJob(partial, null, { http: { async getJson() { throw Object.assign(new Error('Not found'), { status: 404 }); } }, includeDescription: true });
  assert.equal(gone, null);
});

test('foundit: a search reads pages of 100 and stops when Foundit repeats its last page', async () => {
  const urls = [];
  const page = (ids, total) => ({ jobSearchResponse: { data: ids.map((id, order) => ({ ...fixture('foundit-search.json').jobSearchResponse.data[0], jobId: id, id: String(id), order })), meta: { paging: { total } } } });
  const pages = [page([1, 2, 3], 50000), page([4, 5], 50000), page([4, 5], 50000)];
  const http = { async getJson(url, options) { urls.push([url, options.headers.referer]); return pages[urls.length - 1]; } };
  const notes = [];
  const search = foundit.parseCompany(foundit.prepareInput({ searchQueries: ['sales'], country: 'AE', location: 'Dubai' }).companies[0]);
  const jobs = [];
  for await (const batch of foundit.listJobs(search, { http, log: { info: (text) => notes.push(text) } })) jobs.push(...batch);
  assert.deepEqual(jobs.map((job) => job.jobId), ['1', '2', '3', '4', '5']);
  assert.ok(jobs.every((job) => job.partial && job.host === 'www.founditgulf.com'));
  assert.equal(urls.length, 3);
  assert.equal(urls[1][0], 'https://www.founditgulf.com/middleware/jobsearch?start=100&sort=1&limit=100&query=sales&locations=Dubai');
  assert.equal(urls[0][1], 'https://www.founditgulf.com/srp/results');
  assert.match(notes[0], /Foundit lists 50000 jobs/);
  assert.match(notes[1], /Foundit showed 5 of its 50000 jobs/);

  // A short list ends with its total.
  const short = { async getJson() { return page([7, 8], 2); } };
  const few = [];
  for await (const batch of foundit.listJobs(foundit.parseCompany('nurse'), { http: short, log: { info() {} } })) few.push(...batch);
  assert.deepEqual(few.map((job) => job.jobId), ['7', '8']);
});
