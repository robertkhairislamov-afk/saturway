import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { parseCompany as careersSource, dedupeKey, prepareInput } from '../src/adapters/careers.js';
import { careerSiteOf } from '../src/adapters/multi.js';
import * as personio from '../src/adapters/personio.js';
import * as teamtailor from '../src/adapters/teamtailor.js';
import { blocks, tagText } from '../src/core/xml.js';

const text = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('xml: blocks and tag text with CDATA and entities', () => {
  const xml = '<a><b>x &amp; y</b><b><![CDATA[<p>z</p>]]></b><tt:c>q</tt:c><tt:cs><tt:c>r</tt:c></tt:cs></a>';
  assert.deepEqual(blocks(xml, 'b').length, 2);
  assert.equal(tagText(xml, 'b'), 'x & y');
  assert.equal(tagText('<b><![CDATA[<p>z</p>]]></b>', 'b'), '<p>z</p>');
  assert.deepEqual(blocks(xml, 'tt:c'), ['q', 'r']);
  assert.equal(tagText(xml, 'missing'), null);
});

test('personio: company names, links and jobs from the XML feed', () => {
  assert.equal(personio.parseCompany('https://acme.jobs.personio.de/job/123').id, 'acme');
  assert.equal(personio.parseCompany('acme.jobs.personio.com').feedUrl, 'https://acme.jobs.personio.de/xml');
  assert.equal(personio.parseCompany('Acme').id, 'acme');
  assert.throws(() => personio.parseCompany('https://example.com/jobs'), /not a Personio career site/);
  const company = personio.parseCompany('personio');
  const positions = blocks(text('personio.xml'), 'position');
  assert.equal(positions.length, 2);
  const job = personio.toJob(positions[0], company, 'Personio');
  assert.equal(job.ats, 'personio');
  assert.equal(job.title, 'Business Development Representative (d/f/m)');
  assert.equal(job.department, 'Go to Market');
  assert.equal(job.location, 'Berlin');
  assert.equal(job.employmentType, 'full-time');
  assert.equal(job.postedAt, '2026-11-11T17:43:42.000Z');
  assert.equal(job.jobUrl, 'https://personio.jobs.personio.de/job/2885178');
  assert.match(job.descriptionText, /How you'll make an impact/);
  assert.match(job.descriptionHtml, /<h3>/);
});

test('teamtailor: company names, links and jobs from the RSS feed', () => {
  assert.equal(teamtailor.parseCompany('https://acme.teamtailor.com/jobs/123-x').id, 'acme');
  assert.equal(teamtailor.parseCompany('acme').feedUrl, 'https://acme.teamtailor.com/jobs.rss');
  assert.throws(() => teamtailor.parseCompany('https://app.teamtailor.com/companies/x'), /not a Teamtailor career site/);
  const items = blocks(text('teamtailor.rss'), 'item');
  assert.equal(items.length, 2);
  const job = teamtailor.toJob(items[0], teamtailor.parseCompany('career'), 'Teamtailor');
  assert.equal(job.ats, 'teamtailor');
  assert.equal(job.title, 'Customer Success Manager - French Speaking');
  assert.equal(job.jobId, '8742767');
  assert.equal(job.department, 'Customer Success');
  assert.equal(job.workplaceType, 'hybrid');
  assert.deepEqual(job.locations, ['Stockholm, Sweden', 'Barcelona, Spain']);
  assert.match(job.descriptionText, /Teamtailor/);
  assert.ok(!/&lt;/.test(job.descriptionHtml));
});

test('the new systems are recognized from links in both job Actors', () => {
  assert.equal(careerSiteOf('https://acme.jobs.personio.de/'), 'personio');
  assert.equal(careerSiteOf('https://acme.teamtailor.com/jobs'), 'teamtailor');
  const { companies } = prepareInput({ companies: ['https://acme.jobs.personio.de', 'https://acme.teamtailor.com/jobs'] });
  assert.equal(companies[0], 'careers://personio/https://acme.jobs.personio.de');
  assert.equal(careersSource(companies[1]).platform, 'teamtailor');
  assert.equal(careersSource(companies[1]).inner.id, 'acme');
});

test('careers: one job reached by a name and by a link is saved once', () => {
  const job = { ats: 'personio', company: 'tado', jobId: '1' };
  assert.equal(dedupeKey(job), dedupeKey({ ...job }));
  assert.notEqual(dedupeKey(job), dedupeKey({ ...job, ats: 'teamtailor' }));
});

test('personio: the company part of a career page title', () => {
  assert.equal(personio.companyFromTitle('Jobs at tado GmbH'), 'tado GmbH');
  assert.equal(personio.companyFromTitle('Karriere - Viehoff Gruppe | Wir können Optik'), 'Viehoff Gruppe');
  assert.equal(personio.companyFromTitle('Camunda Careers'), 'Camunda');
  assert.equal(personio.companyFromTitle('Jobsity'), 'Jobsity');
  assert.equal(personio.companyFromTitle('Jobs bei'), null);
  assert.equal(personio.companyFromTitle('https://www.example.com/karriere/'), null);
});

test('workday: a search for the best matches only reads the first pages and does not split', async () => {
  const workday = await import('../src/adapters/workday.js');
  const company = workday.parseCompany('https://acme.wd1.myworkdayjobs.com/External');
  let calls = 0;
  const http = {
    postJson: async (_url, body) => {
      calls++;
      const postings = Array.from({ length: 20 }, (_, i) => ({ title: `Data engineer ${body.offset + i}`, externalPath: `/job/x/${body.offset + i}`, locationsText: 'Remote' }));
      return { total: 5000, jobPostings: postings, facets: [{ facetParameter: 'locations', values: [{ id: 'a', count: 2500 }, { id: 'b', count: 2500 }] }] };
    },
  };
  let jobs = 0;
  for await (const page of workday.listJobs(company, { http, log: { info() {}, warning() {} }, keywords: ['data engineer'], resultLimit: 100 })) jobs += page.length;
  assert.equal(jobs, 100);
  assert.equal(calls, 5);
});

test('careers: boards on a shared API host are read at most four at a time', async () => {
  const { gently } = await import('../src/adapters/careers.js');
  let active = 0;
  let most = 0;
  async function* board() {
    active++;
    most = Math.max(most, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    yield [1];
    active--;
  }
  const read = async (platform) => { for await (const page of gently(platform, board())) void page; };
  await Promise.all(Array.from({ length: 12 }, () => read('greenhouse')));
  assert.equal(most, 4);
  most = 0;
  await Promise.all(Array.from({ length: 12 }, () => read('teamtailor')));
  assert.equal(most, 12);
});

test('careers: directory boards get two short tries, options of the caller still win', async () => {
  const { quick } = await import('../src/adapters/careers.js');
  const seen = [];
  const http = { getJson: async (u, o) => seen.push(o), getText: async (u, o) => seen.push(o), postJson: async (u, d, o) => seen.push(o), stats: {} };
  const q = quick(http);
  await q.getJson('x');
  await q.getText('x', { retries: 1 });
  await q.postJson('x', {}, { timeoutMs: 5000 });
  assert.deepEqual(seen, [{ retries: 2, timeoutMs: 15000 }, { retries: 1, timeoutMs: 15000 }, { retries: 2, timeoutMs: 5000 }]);
  assert.equal(q.stats, http.stats);
});

test('careers: after Workday limits requests, the other directory Workday boards are skipped', async () => {
  const careers = await import('../src/adapters/careers.js');
  careers.workdayLimit.reached = false;
  const { companies } = careers.prepareInput({ searchAllCompanies: true, keywords: ['engineer'], platforms: ['workday'] });
  let calls = 0;
  let warned = 0;
  const http = { postJson: async () => { calls++; throw Object.assign(new Error('HTTP 429'), { status: 429 }); }, getJson: async () => { calls++; throw Object.assign(new Error('HTTP 429'), { status: 429 }); }, getText: async () => { calls++; throw Object.assign(new Error('HTTP 429'), { status: 429 }); }, stats: {} };
  const context = { http, log: { info() {}, debug() {}, warning() { warned++; } }, keywords: ['engineer'] };
  for (const key of companies.slice(0, 5)) for await (const page of careers.listJobs(careers.parseCompany(key), context)) void page;
  assert.equal(warned, 1);
  assert.ok(careers.workdayLimit.reached);
  const afterFirst = calls;
  for (const key of companies.slice(5, 10)) for await (const page of careers.listJobs(careers.parseCompany(key), context)) void page;
  assert.equal(calls, afterFirst);
  careers.workdayLimit.reached = false;
});
