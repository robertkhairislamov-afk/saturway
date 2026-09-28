import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import * as infojobs from '../src/adapters/infojobs.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));

test('infojobs: the form, keywords and infojobs.net links become searches', () => {
  const prepared = infojobs.prepareInput({
    searchQueries: ['python', 'https://www.infojobs.net/jobsearch/search-results/list.xhtml?keyword=enfermera&provinceIds=9&teleworkingIds=2,3&sortBy=RELEVANCE'],
    provinces: ['33', '9', '999'],
    categories: ['150'],
    teleworking: ['2'],
    contractTypes: ['1'],
    workdays: ['1'],
    postedWithinDays: 1,
  });
  const [form, link] = prepared.companies.map((value) => infojobs.parseCompany(value));
  assert.deepEqual(form.params, {
    keyword: ['python'], provinceIds: ['33', '9'], categoryIds: ['150'], teleworkingIds: ['2'], contractTypeIds: ['1'], workdayIds: ['1'],
    sinceDate: ['_7_DAYS'], sortBy: ['PUBLICATION_DATE'],
  });
  assert.equal(form.id, 'python in Madrid, Barcelona');
  assert.deepEqual(link.params.teleworkingIds, ['2', '3']);
  assert.deepEqual(link.params.sortBy, ['RELEVANCE']);
  assert.equal(link.id, 'enfermera in Barcelona');
  assert.equal(infojobs.parseCompany('camarero').id, 'camarero in Spain');
  assert.throws(() => infojobs.parseCompany('https://www.indeed.es/jobs?q=python'), /not an InfoJobs search link/);
  const url = new URL(infojobs.searchUrl(form.params, 3));
  assert.equal(url.pathname, '/webapp/offers/search');
  assert.deepEqual(url.searchParams.getAll('provinceIds'), ['33', '9']);
  assert.equal(url.searchParams.get('page'), '3');
  // Without keywords the API still needs the parameter.
  assert.equal(new URL(infojobs.searchUrl(infojobs.parseCompany(infojobs.prepareInput({ provinces: ['33'] }).companies[0]).params)).searchParams.get('keyword'), '');
});

test('infojobs: Spanish labels become the shared format', () => {
  assert.equal(infojobs.contractOf('Contrato indefinido'), 'Permanent');
  assert.equal(infojobs.contractOf('Contrato de duración determinada'), 'Fixed-term');
  assert.equal(infojobs.contractOf('Contrato autónomo'), 'Self-employed');
  assert.equal(infojobs.workdayOf('Jornada intensiva - mañana'), 'Intensive, morning');
  assert.equal(infojobs.workdayOf('Jornada parcial - tarde'), 'Part-time, afternoon');
  assert.equal(infojobs.workdayOf('Jornada completa'), 'Full day');
  const [offer] = fixture('infojobs-search.json').offers;
  const variants = [
    [{ teleworking: 'Solo teletrabajo', contractType: 'Contrato autónomo', workday: 'Jornada completa' }, 'remote', 'contract'],
    [{ teleworking: 'Híbrido', contractType: 'Contrato de duración determinada', workday: 'Jornada completa' }, 'hybrid', 'temporary'],
    [{ teleworking: 'Presencial', contractType: 'Contrato indefinido', workday: 'Jornada parcial - mañana' }, 'onsite', 'part-time'],
    [{ teleworking: 'Sin especificar', contractType: 'Contrato indefinido', workday: 'Jornada completa' }, null, 'full-time'],
  ];
  for (const [changes, workplace, employment] of variants) {
    const job = infojobs.toJob({ ...offer, ...changes });
    assert.equal(job.workplaceType, workplace, JSON.stringify(changes));
    assert.equal(job.employmentType, employment, JSON.stringify(changes));
  }
});

test('infojobs: offers in the shared format', () => {
  const offers = fixture('infojobs-search.json').offers;
  const jobs = offers.map((offer) => infojobs.toJob(offer));
  const withSalary = jobs.find((job) => job.salary);
  assert.equal(withSalary.salary.currency, 'EUR');
  assert.ok(['year', 'month', 'hour'].includes(withSalary.salary.interval));
  for (const job of jobs) {
    assert.equal(job.ats, 'infojobs');
    assert.match(job.jobUrl, /^https:\/\/www\.infojobs\.net\/.+\/of-i[0-9a-f]+$/);
    assert.ok(job.descriptionText.length > 100 && job.descriptionHtml.startsWith('<p>'));
    assert.ok(job.postedAt && job.companyName && job.location);
  }
  const microsite = infojobs.toJob({ ...offers[0], companyLink: 'https://abde-bc.ofertas-trabajo.infojobs.net' });
  assert.equal(microsite.company, 'abde-bc');
});

test('infojobs: every page of a search is read, and each job once', async () => {
  const { offers, navigation } = fixture('infojobs-search.json');
  // The first page shows one promoted job twice, as InfoJobs does.
  assert.equal(offers[0].code, offers[2].code);
  const other = { ...offers[1], code: 'fffffffffffffffffffffffffffff1' };
  const requested = [];
  const http = {
    async getJson(url) {
      const page = Number(new URL(url).searchParams.get('page'));
      requested.push(page);
      // Page 2 repeats a job from page 1 and adds a new one.
      return { offers: page === 1 ? offers : [offers[1], other], navigation: { ...navigation, totalPages: 2, totalElements: 3 } };
    },
  };
  const jobs = [];
  for await (const page of infojobs.listJobs(infojobs.parseCompany('python'), { http, log: { info() {} } })) jobs.push(...page);
  assert.deepEqual(requested, [1, 2]);
  assert.deepEqual(jobs.map((job) => job.jobId), [offers[0].code, offers[1].code, other.code]);
});
