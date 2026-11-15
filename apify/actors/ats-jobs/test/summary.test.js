import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summaryFacts } from '../src/adapters/careers.js';
import { nextChecks, summarizeCompany } from '../src/core/summary.js';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse('2026-11-15T12:00:00Z');
const ago = (days) => new Date(now - days * DAY).toISOString();
const jobs = [
  { ats: 'greenhouse', companyName: 'Acme', title: 'Data Engineer', department: 'Data', location: 'Berlin', workplaceType: 'hybrid', postedAt: ago(2), salary: { min: 1 } },
  { ats: 'greenhouse', companyName: 'Acme', title: 'Account Executive', location: 'Berlin', remote: false, postedAt: ago(10) },
  { ats: 'greenhouse', companyName: 'Acme', title: 'Backend Developer', location: 'Remote', workplaceType: 'remote', postedAt: ago(40) },
  { ats: 'workday', companyName: 'Acme', title: 'Nurse', location: 'Munich', postedDaysAgo: 1 },
];

test('summary: open jobs, teams, places and recent postings of a company', () => {
  const s = summarizeCompany({ company: 'Greenhouse: acme', ats: 'greenhouse', jobs, matchingJobs: 1, savedJobs: 1, complete: true, now });
  assert.equal(s.openJobs, 4);
  assert.equal(s.companyName, 'Acme');
  assert.equal(s.newJobsLast7Days, 2);
  assert.equal(s.newJobsLast30Days, 3);
  assert.deepEqual(s.departments.map((d) => d.name), ['Data', 'Engineering & IT', 'Healthcare', 'Sales']);
  assert.deepEqual(s.locations[0], { name: 'Berlin', jobs: 2 });
  assert.equal(s.remoteJobs, 1);
  assert.equal(s.hybridJobs, 1);
  assert.equal(s.jobsWithSalary, 1);
  assert.equal(s.latestPostedAt, ago(1));
  assert.equal(s.openJobsChange7Days, null);
  assert.equal(s.previousCheckAt, null);
});

test('summary: growth from earlier checks of the user, none for an incomplete list', () => {
  const checks = [{ at: ago(35), openJobs: 1 }, { at: ago(8), openJobs: 3 }, { at: ago(1), openJobs: 5 }];
  const s = summarizeCompany({ company: 'x', ats: 'lever', jobs, matchingJobs: 0, savedJobs: 0, complete: true, checks, now });
  assert.equal(s.openJobsChange7Days, 1);
  assert.equal(s.openJobsChange30Days, 3);
  assert.equal(s.previousOpenJobs, 5);
  const partial = summarizeCompany({ company: 'x', ats: 'workday', jobs, matchingJobs: 0, savedJobs: 0, complete: false, checks, now });
  assert.equal(partial.openJobs, null);
  assert.equal(partial.newJobsLast7Days, null);
  assert.equal(partial.openJobsChange7Days, null);
  assert.equal(partial.jobsListed, 4);
});

test('summary: one check a day, for 120 days', () => {
  const checks = nextChecks([{ at: ago(200), openJobs: 1 }, { at: ago(3), openJobs: 2 }, { at: new Date(now - 3600000).toISOString(), openJobs: 3 }], 4, now);
  assert.deepEqual(checks.map((c) => c.openJobs), [2, 4]);
});

test('careers: a Workday list searched by keywords is not the whole board; its own count is used', () => {
  const workday = { platform: 'workday', inner: { id: 'nvidia/External', listedTotal: 2000 } };
  assert.equal(summaryFacts(workday, { keywords: ['data'] }, true).complete, false);
  assert.equal(summaryFacts(workday, { keywords: ['data'] }, true).openJobs, null);
  assert.equal(summaryFacts({ platform: 'find', resolved: workday }, { keywords: [] }, true).complete, true);
  const cut = summaryFacts(workday, { keywords: [] }, false);
  assert.deepEqual([cut.complete, cut.openJobs, cut.fallbackName, cut.ats], [false, 2000, 'nvidia', 'workday']);
  assert.equal(summaryFacts({ platform: 'greenhouse', inner: {} }, { keywords: ['data'] }, false).complete, true);
  const s = summarizeCompany({ company: 'x', ats: 'workday', jobs: [{ title: 'Nurse' }], complete: false, openJobs: 2000, fallbackName: 'nvidia', now });
  assert.deepEqual([s.openJobs, s.companyName, s.newJobsLast7Days], [2000, 'nvidia', null]);
  assert.equal(summarizeCompany({ company: 'x', jobs: [{ department: '1185 Account Executives (EMEA)' }], complete: true, now }).departments[0].name, 'Account Executives (EMEA)');
});
