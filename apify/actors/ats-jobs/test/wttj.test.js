import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as wttj from '../src/adapters/wttj.js';
import { fixture } from './helpers.js';

test('wttj: keywords and companies become sources with the form filters', () => {
  const prepared = wttj.prepareInput({
    searchQueries: ['python developer', 'https://www.welcometothejungle.com/en/jobs?query=data%20analyst'],
    companies: ['https://www.welcometothejungle.com/fr/companies/doctolib/jobs', 'Not a company!'],
    countries: ['fr', 'BE'],
    contractTypes: ['full_time'],
    remoteTypes: ['fulltime'],
  });
  assert.equal(prepared.companies.length, 4);
  const search = wttj.parseCompany(prepared.companies[0]);
  assert.equal(search.kind, 'search');
  assert.equal(search.query, 'python developer');
  assert.equal(search.id, 'python developer in FR+BE');
  assert.deepEqual(search.filters.countries, ['FR', 'BE']);
  assert.deepEqual(search.filters.contractTypes, ['full_time']);
  assert.equal(wttj.parseCompany(prepared.companies[1]).query, 'data analyst');
  const company = wttj.parseCompany(prepared.companies[2]);
  assert.deepEqual([company.kind, company.slug, company.key], ['company', 'doctolib', 'wttj://company/doctolib']);
  assert.deepEqual(company.filters.remoteTypes, ['fulltime']);
  assert.throws(() => wttj.parseCompany(prepared.companies[3]), /not a Welcome to the Jungle company/);
  assert.throws(() => wttj.parseCompany(wttj.searchKey({ query: ' ' })), /need keywords/);
});

test('wttj: search requests carry the filters the API understands', () => {
  const filters = { countries: ['FR', 'BE'], contractTypes: ['internship'], experienceLevels: ['zero_to_one'], remoteTypes: [], minSalary: 40000, onlyWithSalary: false };
  const url = new URL(wttj.searchUrl('data analyst', filters, 3));
  assert.equal(url.searchParams.get('job_title'), 'data analyst');
  assert.deepEqual(url.searchParams.getAll('contract_type[]'), ['internship']);
  assert.deepEqual(url.searchParams.getAll('experience_level[]'), ['zero_to_one']);
  assert.deepEqual(JSON.parse(url.searchParams.get('locations')), [{ country_code: 'FR' }, { country_code: 'BE' }]);
  assert.equal(url.searchParams.get('salary'), '40000');
  assert.equal(url.searchParams.get('include_empty_salary'), 'false');
  assert.equal(url.searchParams.get('page'), '3');
});

test('wttj: big searches split by country, then contract type, then experience level', () => {
  const none = { countries: [], contractTypes: [], experienceLevels: [], remoteTypes: [], minSalary: 0, onlyWithSalary: false };
  const [dimension, parts] = wttj.chooseSplit({ ...none, countries: ['FR', 'GB'], contractTypes: ['full_time'] });
  assert.equal(dimension, 'country');
  assert.deepEqual(parts.map(([value, next]) => [value, next.countries, next.contractTypes]), [['FR', ['FR'], ['full_time']], ['GB', ['GB'], ['full_time']]]);
  assert.equal(wttj.chooseSplit({ ...none, countries: ['FR'] })[1].length, wttj.CONTRACT_TYPES.length);
  assert.equal(wttj.chooseSplit({ ...none, contractTypes: ['full_time'] })[0], 'experience level');
  assert.equal(wttj.chooseSplit({ ...none, contractTypes: ['full_time'], experienceLevels: ['zero_to_one'] }), null);
});

test('wttj: search results in the shared format, with local filters', () => {
  const { data } = fixture('wttj-search.json');
  const job = wttj.toJob(data[0]);
  assert.equal(job.ats, 'wttj');
  assert.equal(job.jobId, data[0].reference);
  assert.equal(job.companyName, data[0].organization.name);
  assert.match(job.jobUrl, /^https:\/\/www\.welcometothejungle\.com\/en\/companies\/[^/]+\/jobs\/[^/]+$/);
  assert.match(job.location, /, [A-Z][a-z]+/);
  assert.equal(job.salary.source, 'listing');
  assert.equal(job.salary.interval, 'year');
  const none = { countries: [], contractTypes: [], experienceLevels: [], remoteTypes: [], minSalary: 0, onlyWithSalary: false };
  assert.ok(wttj.matchesFilters(data[0], none, { serverFiltered: false }));
  assert.ok(!wttj.matchesFilters(data[0], { ...none, remoteTypes: ['impossible'] }, { serverFiltered: true }));
  assert.ok(!wttj.matchesFilters(data[0], { ...none, countries: ['ZZ'] }, { serverFiltered: false }));
  assert.ok(wttj.matchesFilters(data[0], { ...none, countries: ['ZZ'] }, { serverFiltered: true }));
  const company = fixture('wttj-company.json');
  assert.ok(company.data.every((raw) => wttj.toJob(raw).company === 'doctolib'));
});

test('wttj: salaries typed in the wrong unit are fixed, also for the minimum salary filter', () => {
  const [base] = fixture('wttj-search.json').data;
  const raw = (min, max, period) => ({ ...base, salary_min: min, salary_max: max, salary_currency: 'EUR', salary_period: period });
  const pick = (salary) => salary && [salary.min, salary.max, salary.interval, salary.text];
  assert.deepEqual(pick(wttj.toJob(raw(34, 48, 'yearly')).salary), [34000, 48000, 'year', 'EUR 34,000–48,000 per year']);
  assert.deepEqual(pick(wttj.toJob(raw(1200, null, 'yearly')).salary), [1200, null, 'month', 'EUR 1,200 per month']);
  assert.equal(wttj.toJob(raw(1, 1, 'yearly')).salary, null);
  assert.equal(wttj.toJob(raw(0, 0, 'monthly')).salary, null);
  const filters = { countries: [], contractTypes: [], experienceLevels: [], remoteTypes: [], minSalary: 20000, onlyWithSalary: false };
  const local = { serverFiltered: false };
  assert.ok(wttj.matchesFilters(raw(34, 48, 'yearly'), filters, local));
  assert.ok(wttj.matchesFilters(raw(1800, null, 'monthly'), filters, local));
  assert.ok(!wttj.matchesFilters(raw(1200, null, 'monthly'), filters, local));
  assert.ok(!wttj.matchesFilters(raw(null, null, null), filters, local));
});

test('wttj: job details add the description, key missions, skills and tools', () => {
  const [raw] = fixture('wttj-search.json').data;
  const job = wttj.toJob(raw, fixture('wttj-job.json').job);
  assert.ok(job.descriptionHtml.includes('<h3>Key missions</h3>'));
  assert.ok(job.descriptionText.length > 200 && !job.descriptionText.includes('<'));
  assert.ok(job.skills.length > 0 && job.skills.every((skill) => typeof skill === 'string' && !skill.includes('[object')));
  assert.ok(Array.isArray(job.tools));
  assert.match(job.applyUrl, /^https?:\/\//);
  assert.ok(job.department);
  assert.equal(job.salary.min > 0, true);
  const levels = wttj.toJob(raw, { ...fixture('wttj-job.json').job, experience_level: '4_TO_5_YEARS', education_level: 'bac_5' });
  assert.equal(levels.experienceLevel, '4 to 5 years');
  assert.equal(levels.educationLevel, 'Bac+5 (master)');
  assert.equal(wttj.toJob({ ...raw, contract_type: 'apprenticeship' }).employmentType, 'apprenticeship');
  assert.equal(wttj.toJob({ ...raw, contract_type: 'internship' }).employmentType, 'internship');
  assert.equal(wttj.toJob({ ...raw, contract_type: 'graduate_program' }).employmentType, 'graduate program');
});
