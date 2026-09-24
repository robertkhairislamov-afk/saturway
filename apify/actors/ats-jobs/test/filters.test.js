import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createJobFilter } from '../src/core/filters.js';
import { compileTerms, matchesAny } from '../src/core/match.js';

const job = (fields) => ({
  title: 'Senior Software Engineer', department: 'Engineering', team: 'Platform', location: 'Berlin, Germany',
  locations: ['Berlin, Germany'], remote: false, postedAt: '2026-09-20T10:00:00Z', salary: null, ...fields,
});

test('terms match whole words with common endings, phrases and prefixes', () => {
  const match = (terms, value) => matchesAny(compileTerms(terms), [value]);
  assert.ok(match(['engineer'], 'Senior Software Engineer'));
  assert.ok(match(['engineer'], 'Engineers Team'));
  assert.ok(match(['engineer'], 'Engineering Manager'));
  assert.ok(match(['intern'], 'Software Engineer, Internship'));
  assert.ok(!match(['intern'], 'International Sales'));
  assert.ok(!match(['java'], 'JavaScript Developer'));
  assert.ok(match(['data*'], 'Database Administrator'));
  assert.ok(match(['front end'], 'Front-End Developer'));
  assert.ok(match(['AI'], 'AI Researcher'));
  assert.ok(!match(['AI'], 'Aircraft Mechanic'));
  assert.ok(match(['c++'], 'C++ Developer'));
  assert.ok(match(['CA'], 'San Francisco, CA'));
  assert.ok(!match(['CA'], 'Canada'));
});

test('filter checks title, location, remote, department, date and salary', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  assert.ok(createJobFilter({ keywords: ['engineer'], excludeKeywords: ['intern'] }, now).matches(job()));
  assert.ok(!createJobFilter({ excludeKeywords: ['senior'] }, now).matches(job()));
  assert.ok(createJobFilter({ locations: ['Germany'] }, now).matches(job()));
  assert.ok(!createJobFilter({ locations: ['London'] }, now).matches(job()));
  assert.ok(createJobFilter({ locations: ['Remote'] }, now).matches(job({ location: 'Anywhere', locations: [], remote: true })));
  assert.ok(!createJobFilter({ remoteOnly: true }, now).matches(job()));
  assert.ok(createJobFilter({ departments: ['platform'] }, now).matches(job()));
  assert.ok(!createJobFilter({ departments: ['sales'] }, now).matches(job()));
  assert.ok(createJobFilter({ postedWithinDays: 4 }, now).matches(job()));
  assert.ok(!createJobFilter({ postedWithinDays: 3 }, now).matches(job()));
  assert.ok(!createJobFilter({ onlyWithSalary: true }, now).matches(job()));
});

test('partial jobs are rejected only on the fields they have', () => {
  const now = new Date('2026-09-24T12:00:00Z');
  const partial = { partial: true, title: 'Data Engineer', location: undefined, locations: undefined, postedDaysAgo: 30 };
  assert.ok(createJobFilter({ locations: ['Germany'], departments: ['sales'], onlyWithSalary: true, remoteOnly: true }, now).matches(partial));
  assert.ok(!createJobFilter({ postedWithinDays: 7 }, now).matches(partial));
  assert.ok(!createJobFilter({ locations: ['Germany'] }, now).matches({ ...partial, location: 'India, Pune', locations: ['India, Pune'] }));
  assert.ok(!createJobFilter({ keywords: ['designer'] }, now).matches(partial));
});
