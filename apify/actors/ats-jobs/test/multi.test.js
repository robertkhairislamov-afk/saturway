import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as multi from '../src/adapters/multi.js';
import { normalizeInput } from '../src/core/input.js';

const sitesOf = (keys) => keys.map((key) => /^multi:\/\/([a-z]+)/.exec(key)[1]);

test('multi: countries pick the job boards that cover them', () => {
  const { companies } = multi.prepareInput({ searchQueries: ['data analyst'], countries: ['us', 'DE', 'AU', 'MY', 'HK', 'XX'] });
  assert.deepEqual([...new Set(sitesOf(companies))].sort(), ['dice', 'glassdoor', 'indeed', 'jobsdb', 'jobstreet', 'linkedin', 'seek', 'stepstone', 'wttj']);
  // LinkedIn, Indeed and Glassdoor search every country on its own.
  assert.equal(sitesOf(companies).filter((site) => site === 'linkedin').length, 5);
  assert.equal(sitesOf(companies).filter((site) => site === 'indeed').length, 5);
  assert.equal(sitesOf(companies).filter((site) => site === 'glassdoor').length, 5);
  // Welcome to the Jungle searches all its countries at once.
  const wttjSources = companies.filter((key) => key.startsWith('multi://wttj/')).map((key) => multi.parseCompany(key));
  assert.equal(wttjSources.length, 1);
  assert.deepEqual(wttjSources[0].inner.filters.countries, ['US', 'DE']);
  // Chosen sites only.
  assert.deepEqual(sitesOf(multi.prepareInput({ searchQueries: ['nurse'], countries: ['AU', 'US'], sources: ['seek'] }).companies), ['seek']);
  // Keywords without countries search the United States.
  assert.deepEqual(sitesOf(multi.prepareInput({ searchQueries: ['nurse'] }).companies).sort(), ['dice', 'glassdoor', 'indeed', 'linkedin', 'wttj']);
  // Countries that only LinkedIn, Indeed and Glassdoor cover.
  assert.deepEqual(sitesOf(multi.prepareInput({ searchQueries: ['nurse'], countries: ['IN', 'TR'] }).companies), ['indeed', 'indeed', 'glassdoor', 'glassdoor', 'linkedin', 'linkedin']);
  assert.equal(multi.parseCompany(multi.prepareInput({ searchQueries: ['nurse'], countries: ['TR'], sources: ['indeed'] }).companies[0]).id, 'Indeed: nurse in Türkiye');
});

test('multi: Reed searches the UK, InfoJobs Spain by province', () => {
  const sources = (input) => multi.prepareInput({ searchQueries: ['nurse'], ...input }).companies.map((key) => multi.parseCompany(key));
  assert.deepEqual(sources({ countries: ['GB', 'ES'] }).map((source) => source.site).sort(), ['glassdoor', 'glassdoor', 'indeed', 'indeed', 'infojobs', 'linkedin', 'linkedin', 'reed', 'wttj']);
  const [reed] = sources({ countries: ['GB'], location: 'Leeds', sources: ['reed'] });
  assert.match(reed.inner.url, /\/jobs\/nurse-jobs-in-leeds$/);
  const [madrid] = sources({ countries: ['ES'], location: 'Madrid', sources: ['infojobs'] });
  assert.deepEqual(madrid.inner.params.provinceIds, ['33']);
  const [remote] = sources({ countries: ['ES'], location: 'Bilbao', remoteOnly: true, sources: ['infojobs'] });
  assert.deepEqual([remote.inner.params.provinceIds, remote.inner.params.teleworkingIds], [[], ['2']]);
  assert.equal(multi.provinceOf('valència'), '49');
  assert.equal(multi.provinceOf('Bizkaia'), '51');
});

test('multi: LinkedIn searches a city with its country, and no remote jobs', () => {
  const place = (input) => multi.prepareInput({ searchQueries: ['python'], sources: ['linkedin'], ...input }).companies
    .map((key) => multi.parseCompany(key).inner.params.location);
  assert.deepEqual(place({ countries: ['DE'], location: 'Berlin' }), ['Berlin, Germany']);
  assert.deepEqual(place({ countries: ['DE', 'FR'], location: 'Berlin' }), ['Germany', 'France']);
  assert.deepEqual(place({ countries: ['US'], remoteOnly: true }), []);
  const [key] = multi.prepareInput({ searchQueries: ['python'], countries: ['US'], sources: ['linkedin'], postedWithinDays: 1 }).companies;
  const source = multi.parseCompany(key);
  assert.equal(source.id, 'LinkedIn: python in United States');
  assert.equal(source.inner.params.f_TPR, `r${2 * 86400}`);
});

test('multi: a location applies only to a single country, filters reach every board', () => {
  const [one] = multi.prepareInput({ searchQueries: ['python'], countries: ['DE'], location: 'Berlin', sources: ['stepstone'] }).companies;
  assert.match(multi.parseCompany(one).inner.url, /\/jobs\/python\/in-berlin/);
  const [two] = multi.prepareInput({ searchQueries: ['python'], countries: ['DE', 'FR'], location: 'Berlin', sources: ['stepstone'] }).companies;
  assert.doesNotMatch(multi.parseCompany(two).inner.url, /in-berlin/);
  const remote = multi.prepareInput({ searchQueries: ['python'], countries: ['US', 'AU'], remoteOnly: true, postedWithinDays: 3 }).companies.map((key) => multi.parseCompany(key));
  const bySite = Object.fromEntries(remote.map((source) => [source.site, source.inner]));
  assert.match(bySite.dice.url, /filters\.workplaceTypes=Remote/);
  assert.match(bySite.dice.url, /filters\.postedDate=THREE/);
  assert.deepEqual(bySite.wttj.filters.remoteTypes, ['fulltime']);
  assert.equal(bySite.seek.params.workarrangement, '3');
  assert.equal(bySite.seek.params.daterange, '4');
  assert.deepEqual([bySite.indeed.groups, bySite.indeed.days], [[['DSQF7']], 3]);
  assert.deepEqual([bySite.glassdoor.filters, bySite.glassdoor.days], [{ remoteWorkType: '1' }, 3]);
});

test('multi: Glassdoor searches a city of the country, and needs keywords or a place', () => {
  const [berlin] = multi.prepareInput({ searchQueries: ['python'], countries: ['DE'], location: 'Berlin', sources: ['glassdoor'] }).companies.map((key) => multi.parseCompany(key));
  assert.equal(berlin.id, 'Glassdoor: python in Berlin, Germany');
  assert.deepEqual([berlin.inner.country, berlin.inner.where], ['DE', 'Berlin']);
  assert.deepEqual(sitesOf(multi.prepareInput({ countries: ['DE'], location: 'Berlin', sources: ['glassdoor'] }).companies), ['glassdoor']);
  assert.deepEqual(sitesOf(multi.prepareInput({ countries: ['DE'], companies: ['https://jobs.lever.co/zoox'], sources: ['glassdoor'] }).companies), ['lever']);
});

test('multi: career site links are recognized and keep the keywords as a title filter', async () => {
  const { companies } = multi.prepareInput({
    searchQueries: ['data engineer', 'a|b'],
    companies: ['https://boards.greenhouse.io/airbnb', 'https://jobs.lever.co/zoox', 'https://jobs.ashbyhq.com/ramp', 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite', 'https://example.com/careers'],
  });
  // Career links alone search no job board.
  assert.deepEqual(sitesOf(companies.slice(0, 4)), ['greenhouse', 'lever', 'ashby', 'workday']);
  assert.equal(companies[4], 'https://example.com/careers');
  assert.throws(() => multi.parseCompany(companies[4]), /not a supported career site link/);
  const greenhouse = multi.parseCompany(companies[0]);
  assert.deepEqual(greenhouse.queries, ['data engineer', 'a|b']);
  assert.equal(greenhouse.id, 'Greenhouse: airbnb');
  // The keys survive the input reader, which splits plain names at commas.
  const keys = multi.prepareInput({ searchQueries: ['sales, marketing'], countries: ['US'], location: 'New York, NY' }).companies;
  assert.deepEqual(normalizeInput({ companies: keys }).companies, keys);
  // Career site jobs are kept only when the title matches.
  const source = {
    site: 'greenhouse',
    queries: ['data engineer'],
    inner: {},
    adapter: { async *listJobs() { yield [{ jobId: '1', title: 'Senior Data Engineer' }, { jobId: '2', title: 'Designer' }]; } },
  };
  const pages = [];
  for await (const page of multi.listJobs(source, {})) pages.push(page.map((job) => job.jobId));
  assert.deepEqual(pages, [['1']]);
});

test('multi: the example takes a few jobs from each site', () => {
  const example = normalizeInput({}, multi.exampleInput);
  assert.equal(example.usedExample, true);
  assert.deepEqual([example.maxItems, example.maxItemsPerCompany], [50, 10]);
  assert.deepEqual([...new Set(sitesOf(example.companies))].sort(), ['dice', 'glassdoor', 'indeed', 'linkedin', 'wttj']);
  // An input of its own keeps its own limits.
  assert.equal(normalizeInput({ companies: example.companies }, multi.exampleInput).maxItemsPerCompany, 0);
});

test('multi: the same job on two sites has one key', () => {
  const a = multi.dedupeKey({ title: 'Senior Software Engineer', companyName: 'Zoë GmbH', location: 'Berlin, Germany' });
  const b = multi.dedupeKey({ title: 'senior software-engineer', companyName: 'Zoe GmbH', location: 'Berlin' });
  assert.equal(a, b);
  assert.notEqual(a, multi.dedupeKey({ title: 'Senior Software Engineer', companyName: 'Zoë GmbH', location: 'Munich' }));
});
