import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as linkedin from '../src/adapters/linkedin.js';

const fixture = (file) => readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8');
const EMPTY = '<!DOCTYPE html>\n\n<!---->';
const quietLog = { info() {}, warning() {} };

test('linkedin: the form, keywords and linkedin.com links become searches', () => {
  const prepared = linkedin.prepareInput({
    searchQueries: [
      'data analyst',
      'https://www.linkedin.com/jobs/search/?currentJobId=4471641260&f_E=2%2C3&f_WT=2&geoId=103644278&keywords=python&location=United%20States&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true',
      'https://de.linkedin.com/jobs/search?keywords=Pflege',
    ],
    location: 'Berlin, Germany',
    distance: 25,
    experienceLevels: ['2', '4', '9'],
    jobTypes: ['F', 'C'],
    postedWithinDays: 7,
    easyApply: true,
  });
  const [form, link, bare] = prepared.companies.map((value) => linkedin.parseCompany(value));
  assert.deepEqual(form.params, {
    distance: '25',
    f_AL: 'true',
    f_E: '2,4',
    f_JT: 'F,C',
    f_TPR: `r${8 * 86400}`,
    keywords: 'data analyst',
    location: 'Berlin, Germany',
  });
  assert.equal(form.id, 'data analyst in Berlin, Germany');
  // Links keep their own filters and order and lose tracking and the open job.
  assert.deepEqual(link.params, { f_E: '2,3', f_WT: '2', geoId: '103644278', keywords: 'python', location: 'United States' });
  assert.deepEqual(bare.params, { keywords: 'Pflege', location: 'Worldwide' });
  assert.equal(linkedin.parseCompany('python').id, 'python in Worldwide');
  assert.equal(linkedin.parseCompany(linkedin.prepareInput({ location: 'Austin, Texas' }).companies[0]).id, 'all jobs in Austin, Texas');
  assert.throws(() => linkedin.parseCompany('https://www.indeed.com/jobs?q=python'), /not a LinkedIn job search link/);
  assert.throws(() => linkedin.parseCompany('https://www.linkedin.com/in/someone'), /not a LinkedIn job search link/);
  const url = new URL(linkedin.searchUrl(form.params, 20));
  assert.equal(url.pathname, '/jobs-guest/jobs/api/seeMoreJobPostings/search');
  assert.equal(url.searchParams.get('start'), '20');
  assert.equal(url.searchParams.get('location'), 'Berlin, Germany');
});

test('linkedin: job cards are read from search pages', () => {
  const cards = linkedin.parseSearchPage(fixture('linkedin-search.html'));
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.match(card.jobId, /^\d+$/);
    assert.ok(card.title && card.companyName && card.location, JSON.stringify(card));
    assert.match(card.postedDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(card.company.url, /^https:\/\/www\.linkedin\.com\/company\/[^/?]+$/);
    assert.match(card.logoUrl ?? 'https://media.licdn.com/', /^https:\/\/media\.licdn\.com\//);
  }
  assert.ok(cards.some((card) => card.insights.length > 0));
  assert.deepEqual(linkedin.parseSearchPage(EMPTY), []);
  assert.equal(linkedin.hasJobs(EMPTY), false);
  assert.equal(linkedin.hasJobs(fixture('linkedin-search.html')), true);
});

test('linkedin: a salary on the card becomes numbers', () => {
  const html = `<li><div class="base-card job-search-card" data-entity-urn="urn:li:jobPosting:42">
    <h3 class="base-search-card__title">Nurse</h3>
    <h4 class="base-search-card__subtitle"><a class="hidden-nested-link" href="https://www.linkedin.com/company/acme?trk=x">Acme</a></h4>
    <span class="job-search-card__location">Austin, TX</span>
    <span class="job-search-card__salary-info">$120,000.00 - $150,000.00</span>
    <time class="job-search-card__listdate--new" datetime="2026-09-27">2 hours ago</time></div></li>`;
  const [card] = linkedin.parseSearchPage(html);
  const job = linkedin.toJob(card);
  assert.deepEqual([job.salary.min, job.salary.max, job.salary.currency, job.salary.interval, job.salary.source], [120000, 150000, 'USD', 'year', 'listing']);
  assert.equal(job.company, 'acme');
  assert.equal(job.jobUrl, 'https://www.linkedin.com/jobs/view/42/');
  // "2 hours ago" makes the time exact.
  assert.ok(Date.now() - Date.parse(job.postedAt) >= 2 * 3600000 - 60000);
});

test('linkedin: job pages add the description, criteria and applicants, but no people', () => {
  const page = linkedin.parseJobPage(fixture('linkedin-job.html'));
  assert.equal(page.title, 'Software Development Engineer III');
  assert.equal(page.companyName, 'CLEAR');
  assert.deepEqual(page.company, { id: 'clear-by-alclear-llc', url: 'https://www.linkedin.com/company/clear-by-alclear-llc' });
  assert.equal(page.location, 'New York, NY');
  assert.equal(page.applicants, '33 applicants');
  assert.deepEqual([page.seniority, page.employmentType, page.jobFunction, page.industries], ['Not Applicable', 'Full-time', 'Engineering and Information Technology', 'Consumer Services']);
  assert.equal(page.easyApply, true);
  assert.match(page.descriptionHtml, /^<p>CLEAR is building/);
  assert.ok(!page.descriptionHtml.includes('show-more-less-html__button'));
  assert.ok(!JSON.stringify(page).includes('face-pile'));

  const card = { jobId: '4471641260', title: 'Software Development Engineer III', companyName: 'CLEAR', location: 'New York, NY', postedDate: '2026-09-25', postedText: '2 days ago', insights: [] };
  const job = linkedin.toJob(card, page);
  assert.deepEqual([job.salary.min, job.salary.max, job.salary.currency, job.salary.interval, job.salary.source], [220000, 290000, 'USD', 'year', 'description']);
  assert.equal(job.seniorityLevel, null);
  assert.equal(job.employmentType, 'full-time');
  assert.equal(job.department, 'Engineering and Information Technology');
  assert.equal(job.applicantsCount, 33);
  assert.equal(job.applyUrl, job.jobUrl);
  assert.equal(job.postedAt, '2026-09-25T00:00:00.000Z');
  assert.ok(job.descriptionText.length > 1000 && !job.descriptionText.includes('<'));
});

test('linkedin: offsite applications and pages that are no job page', () => {
  const page = linkedin.parseJobPage(fixture('linkedin-job-offsite.html'));
  assert.equal(page.easyApply, false);
  assert.equal(page.companyName, 'BFS health finance GmbH');
  assert.equal(page.location, 'Dortmund, North Rhine-Westphalia, Germany');
  assert.equal(linkedin.applicantsCountOf(page.applicants), 72);
  assert.equal(linkedin.parseJobPage('<html><body>Sign in</body></html>'), null);
  assert.equal(linkedin.isJobPage(EMPTY), false);
  const external = linkedin.parseJobPage(`<h2 class="top-card-layout__title">Chef</h2>
    <code id="applyUrl" style="display: none"><!--"https://www.linkedin.com/jobs/view/externalApply/7?url=https%3A%2F%2Fcareers%2Eexample%2Ecom%2Fjob%2F1&amp;urlHash=ab"--></code>`);
  assert.equal(external.applyUrl, 'https://careers.example.com/job/1');
});

test('linkedin: dates, applicants and what the filters of a search tell', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  assert.equal(linkedin.postedAt('2026-09-27', '3 hours ago', now), '2026-09-27T09:00:00.000Z');
  assert.equal(linkedin.postedAt('2026-09-20', '1 week ago', now), '2026-09-20');
  assert.equal(linkedin.postedAt(null, '2 days ago', now), '2026-09-25T12:00:00.000Z');
  assert.equal(linkedin.applicantsCountOf('Over 200 applicants'), 200);
  assert.equal(linkedin.applicantsCountOf('1,234 applicants'), 1234);
  assert.equal(linkedin.applicantsCountOf('Be among the first 25 applicants'), null);
  // LinkedIn applies Easy Apply for visitors, but not workplace, job type or experience level.
  assert.deepEqual(linkedin.knownFrom({ f_WT: '2', f_JT: 'F', f_E: '4', f_AL: 'true' }), { easyApply: true });
  assert.equal(linkedin.toJob({ jobId: '1', title: 'Engineer', insights: [] }, null, linkedin.knownFrom({ f_WT: '2' })).workplaceType, null);
});

test('linkedin: job types and experience levels are checked on the job page', () => {
  const page = { employmentType: 'Full-time', seniority: 'Mid-Senior level' };
  assert.equal(linkedin.pageFilter({ keywords: 'nurse' }), null);
  assert.equal(linkedin.pageFilter({ f_JT: 'F,C' })(page), true);
  assert.equal(linkedin.pageFilter({ f_JT: 'P' })(page), false);
  assert.equal(linkedin.pageFilter({ f_JT: 'F', f_E: '2,4' })(page), true);
  assert.equal(linkedin.pageFilter({ f_E: '2' })(page), false);
  assert.equal(linkedin.pageFilter({ f_E: '2' })({ employmentType: 'Full-time', seniority: 'Not Applicable' }), false);
  assert.equal(linkedin.pageFilter({ f_E: '4' })(null), false);
});

test('linkedin: a search of the whole United States can be searched state by state', () => {
  const states = linkedin.stateSearches({ keywords: 'nurse', location: 'United States', geoId: '103644278', distance: '25', f_TPR: 'r86400' });
  assert.equal(states.length, 51);
  assert.deepEqual(states[0], ['Alabama', { keywords: 'nurse', location: 'Alabama, United States', f_TPR: 'r86400' }]);
  assert.ok(linkedin.stateSearches({ geoId: '103644278' }));
  assert.ok(linkedin.stateSearches({ location: 'USA' }));
  assert.equal(linkedin.stateSearches({ location: 'Germany' }), null);
  assert.equal(linkedin.stateSearches({ location: 'Texas, United States' }), null);
});

// A fake HTTP client: `pageFor(url)` gives each page; pages the check rejects count as blocked.
function fakeHttp(pageFor) {
  const requests = [];
  return {
    requests,
    async getText(url, options = {}) {
      requests.push({ url: new URL(url), options });
      const html = pageFor(new URL(url));
      if (html instanceof Error) throw html;
      if (options.accept && !options.accept(html)) throw Object.assign(new Error('Blocked or empty page'), { blocked: true });
      return html;
    },
  };
}

const cardsHtml = (ids) => ids.map((id) => `<li><div class="base-card" data-entity-urn="urn:li:jobPosting:${id}"><h3 class="base-search-card__title">Job ${id}</h3></div></li>`).join('');

async function listAll(source, http, log = quietLog) {
  const jobs = [];
  for await (const page of linkedin.listJobs(source, { http, log })) jobs.push(...page);
  return jobs;
}

test('linkedin: pages are read from new addresses until an empty page', async () => {
  const http = fakeHttp((url) => (url.searchParams.get('start') === '0' ? fixture('linkedin-search.html') : EMPTY));
  const jobs = await listAll(linkedin.parseCompany('python'), http);
  assert.equal(jobs.length, 3);
  assert.ok(jobs.every((job) => job.partial && job.card));
  assert.ok(http.requests.every(({ options }) => options.rotate === true && options.accept === linkedin.hasJobs));
});

test('linkedin: a US search that reaches 1,000 jobs is searched again in every state', async () => {
  const messages = [];
  const log = { info: (message) => messages.push(message), warning: (message) => messages.push(message) };
  const http = fakeHttp((url) => {
    const start = Number(url.searchParams.get('start'));
    const location = url.searchParams.get('location');
    // The whole country fills every page; each state adds a job of its own and repeats one.
    if (location === 'United States' || location === 'Germany') return cardsHtml(Array.from({ length: 10 }, (_, i) => 1000 + start + i));
    const state = linkedin.US_STATES.indexOf(location.replace(', United States', ''));
    return start === 0 ? cardsHtml([100000 + state, 1000]) : EMPTY;
  });
  const jobs = await listAll(linkedin.parseCompany(linkedin.searchKey({ query: 'nurse', location: 'United States' })), http, log);
  assert.equal(jobs.length, 1000 + 51);
  assert.equal(new Set(jobs.map((job) => job.jobId)).size, jobs.length);
  assert.equal(jobs.at(-1).jobId, '100050');
  assert.ok(messages.some((message) => /searching each state separately/.test(message)));

  // Elsewhere the limit is only reported.
  messages.length = 0;
  const german = await listAll(linkedin.parseCompany(linkedin.searchKey({ query: 'pflege', location: 'Germany' })), http, log);
  assert.equal(german.length, 1000);
  assert.deepEqual(messages, ['pflege in Germany: LinkedIn lists at most 1,000 jobs per search. Search by region or city, or use "Posted in the last days", to get the rest.']);

  // Job type filters load every job page, so a US search stays within its first 1,000 jobs.
  messages.length = 0;
  const contracts = await listAll(linkedin.parseCompany(linkedin.searchKey({ query: 'nurse', location: 'United States', jobTypes: ['C'] })), http, log);
  assert.equal(contracts.length, 1000);
  assert.match(messages[0], /each job's page is checked/);
  assert.match(messages.at(-1), /at most 1,000 jobs per search/);
});

test('linkedin: job details, removed jobs and blocked job pages', async () => {
  const [card] = linkedin.parseSearchPage(fixture('linkedin-search.html'));
  const partial = { ...linkedin.toJob(card), partial: true, card, known: {} };
  const source = linkedin.parseCompany('engineer');
  const warnings = [];
  const log = { info() {}, warning: (message) => warnings.push(message) };

  const full = await linkedin.completeJob(partial, source, { http: fakeHttp(() => fixture('linkedin-job.html')), includeDescription: true, log });
  assert.equal(full.jobId, card.jobId);
  assert.equal(full.title, card.title);
  assert.ok(full.descriptionText.length > 1000);

  const gone = fakeHttp(() => Object.assign(new Error('Not found'), { status: 404 }));
  assert.equal(await linkedin.completeJob(partial, source, { http: gone, includeDescription: true, log }), null);

  const blocked = await linkedin.completeJob(partial, source, { http: fakeHttp(() => EMPTY), includeDescription: true, log });
  assert.equal(blocked.jobId, card.jobId);
  assert.equal(blocked.descriptionText, null);
  assert.equal(warnings.length, 1);

  const fast = await linkedin.completeJob(partial, source, { http: fakeHttp(() => assert.fail('no page load')), includeDescription: false, log });
  assert.equal(fast.title, card.title);

  // Job type filters need the page even without the details; the CLEAR job is full-time.
  const page = fakeHttp(() => fixture('linkedin-job.html'));
  const fullTime = linkedin.parseCompany(linkedin.searchKey({ query: 'engineer', jobTypes: ['F'] }));
  const partTime = linkedin.parseCompany(linkedin.searchKey({ query: 'engineer', jobTypes: ['P'] }));
  assert.equal((await linkedin.completeJob(partial, fullTime, { http: page, includeDescription: false, log })).employmentType, 'full-time');
  assert.equal(await linkedin.completeJob(partial, partTime, { http: page, includeDescription: false, log }), null);
  assert.equal(await linkedin.completeJob(partial, fullTime, { http: fakeHttp(() => EMPTY), includeDescription: true, log }), null);
});
