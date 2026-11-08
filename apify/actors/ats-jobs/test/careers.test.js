import assert from 'node:assert/strict';
import { test } from 'node:test';

import { boardCandidates, directorySize, nameKey, parseCompany, prepareInput } from '../src/adapters/careers.js';

test('careers: names, domains and links become boards to read or to look up', () => {
  assert.equal(nameKey('Door Dash, Inc.'), 'doordash');
  assert.equal(nameKey('https://www.notion.so/careers'), 'notion');
  assert.equal(nameKey('stripe.com'), 'stripe');
  assert.deepEqual(boardCandidates('Door Dash, Inc.'), ['doordash', 'door-dash', 'door_dash', 'door']);
  const { companies } = prepareInput({ companies: ['https://jobs.lever.co/zoox', 'Some New Startup', '1Password'] });
  assert.equal(companies[0], 'careers://lever/https://jobs.lever.co/zoox');
  assert.equal(companies[1], 'careers://find/Some New Startup');
  // In the directory: read at once, no lookup.
  assert.equal(companies[2], 'careers://ashby/1password');
  assert.equal(parseCompany(companies[1]).platform, 'find');
  assert.equal(parseCompany(companies[2]).inner.id, '1password');
});

test('careers: searching all companies needs title keywords and adds every directory board once', () => {
  assert.throws(() => prepareInput({ searchAllCompanies: true }), /needs title keywords/);
  const ashbyOnly = prepareInput({ searchAllCompanies: true, keywords: ['engineer'], platforms: ['ashby'], companies: ['1Password'] }).companies;
  assert.equal(ashbyOnly[0], 'careers://ashby/1password');
  assert.ok(!ashbyOnly.includes('careers://dir-ashby/1password'));
  assert.ok(ashbyOnly.slice(1).every((key) => key.startsWith('careers://dir-ashby/')));
  const all = prepareInput({ searchAllCompanies: true, keywords: ['engineer'] }).companies;
  assert.equal(all.length, directorySize());
  const source = parseCompany(all.find((key) => key.startsWith('careers://dir-greenhouse/')));
  assert.equal(source.fromDirectory, true);
  assert.equal(source.platform, 'greenhouse');
});
