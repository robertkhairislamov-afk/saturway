import assert from 'node:assert/strict';
import { test } from 'node:test';

import { makeSalary, normalizeInterval, salaryFromText } from '../src/core/salary.js';

const pick = (salary) => salary && [salary.min, salary.max, salary.currency, salary.interval];

test('salaryFromText reads common pay range formats', () => {
  assert.deepEqual(pick(salaryFromText('Salary: $274,456.00 - $334,600.00/yr. This range')), [274456, 334600, 'USD', 'year']);
  assert.deepEqual(pick(salaryFromText('The base salary range is 168,000 USD - 264,500 USD for Level 4, and 196,000 USD - 310,500 USD for Level 5.')), [168000, 310500, 'USD', 'year']);
  assert.deepEqual(pick(salaryFromText('Compensation: £45k–£55k per annum')), [45000, 55000, 'GBP', 'year']);
  assert.deepEqual(pick(salaryFromText('Gehalt: €60.000 – €80.000 brutto, base salary')), [60000, 80000, 'EUR', 'year']);
  assert.deepEqual(pick(salaryFromText('The pay range for this role is $25.00 - $30.00 per hour.')), [25, 30, 'USD', 'hour']);
  assert.deepEqual(pick(salaryFromText('Hourly rate: $20 - $25. Full time, 40 hours per week.')), [20, 25, 'USD', 'hour']);
  assert.deepEqual(pick(salaryFromText('40 hours per week. The salary range is $120,000 - $150,000.')), [120000, 150000, 'USD', 'year']);
  assert.deepEqual(pick(salaryFromText('Base pay: $120K - $150,000 depending on level')), [120000, 150000, 'USD', 'year']);
  assert.deepEqual(pick(salaryFromText('CAD $100,000 - $120,000 base salary')), [100000, 120000, 'CAD', 'year']);
  assert.deepEqual(pick(salaryFromText('The base salary range is 230,250 PLN - 399,100 PLN for Level 4')), [230250, 399100, 'PLN', 'year']);
});

test('salaryFromText ignores amounts that are not pay ranges', () => {
  assert.equal(salaryFromText('We raised $50M - $100M from top investors.'), null);
  assert.equal(salaryFromText('An average deal size of $100k+ and 1M+ quota.'), null);
  assert.equal(salaryFromText('Internet stipend of $10 - $20 per month.'), null);
  assert.equal(salaryFromText('A team of 10 - 20 people founded in 2019 - 2020.'), null);
  assert.equal(salaryFromText(''), null);
});

test('makeSalary and normalizeInterval build one salary shape', () => {
  assert.equal(normalizeInterval('per-hour-wage'), 'hour');
  assert.equal(normalizeInterval('1 YEAR'), 'year');
  assert.equal(normalizeInterval('Mexico Monthly Pay Range'), 'month');
  assert.equal(normalizeInterval('NONE'), null);
  assert.deepEqual(makeSalary({ min: 100000, max: 120000, currency: 'usd', interval: 'year', source: 'ats' }), {
    min: 100000, max: 120000, currency: 'USD', interval: 'year', text: 'USD 100,000–120,000 per year', source: 'ats',
  });
  assert.equal(makeSalary({ min: 0, max: null, source: 'ats' }), null);
});

test('salaryFromText reads known pay fields, including single amounts', () => {
  const read = (text) => pick(salaryFromText(text, { known: true, source: 'listing', defaultCurrency: 'USD' }));
  assert.deepEqual(read('$$68 - $68.25 per hour'), [68, 68.25, 'USD', 'hour']);
  assert.deepEqual(read('$$150,100-$206,450 per year'), [150100, 206450, 'USD', 'year']);
  assert.deepEqual(read('$68.25/hr'), [68.25, 68.25, 'USD', 'hour']);
  assert.deepEqual(read('100000 - 120000'), [100000, 120000, 'USD', 'year']);
  assert.deepEqual(read('Up to $90K'), [null, 90000, 'USD', 'year']);
  assert.equal(salaryFromText('Depends on Experience', { known: true }), null);
  assert.equal(salaryFromText('$68.25/hr'), null);
});

