import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { baseDomain, buildLead, developerType, emailDomain, groupByDeveloper, hasCompanyForm, leadApp, passes, websiteDomain } from '../src/leads.js';
import { parseAppPage, parseSearchPage } from '../src/play.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

test('the Google Play code is the same as in the Google Play Scraper', () => {
  for (const file of ['play.js', 'http.js', 'chart-request.json']) {
    assert.equal(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'), readFileSync(new URL(`../../google-play/src/${file}`, import.meta.url), 'utf8'), file);
  }
});

test('company forms: at the end, two-letter forms only in capitals, and business words', () => {
  for (const name of ['Spotify AB', 'Samsung Electronics Co.,  Ltd.', 'Zoho Corporation', 'InShot Inc.', 'Kiloo ApS', 'Nexus SA', 'OOO Yandex', 'PT Gojek Indonesia', 'Rovio Entertainment Oyj', 'RobTop Games', 'Tap Studio']) {
    assert.ok(hasCompanyForm(name), name);
  }
  for (const name of ['Krosbits', 'Apps As Art', 'Maria Sa', 'Mike Ag', 'John Smith', 'recorder & smart apps', '', null]) {
    assert.ok(!hasCompanyForm(name), String(name));
  }
});

test('developer type: company, business on its own domain, or individual', () => {
  assert.equal(developerType({ developer: 'Krosbits', email: 'Support@Krosbits.com', website: 'https://www.krosbits.com/app' }), 'business');
  assert.equal(developerType({ developer: 'Y', email: 'hi@mail.y.co.uk', website: 'y.co.uk' }), 'business');
  assert.equal(developerType({ developer: 'John', email: 'john@gmail.com', website: 'https://john.com' }), 'individual');
  assert.equal(developerType({ developer: 'X', email: 'a@x.github.io', website: 'https://x.github.io' }), 'individual');
  assert.equal(developerType({ developer: 'Maria', legalName: 'Maria Studio s.r.o.', email: 'maria@gmail.com' }), 'company');
  assert.deepEqual([emailDomain('A@B.Com'), emailDomain('nope'), websiteDomain('www.site.io/x'), baseDomain('a.b.example.com.au'), baseDomain('shop.example.co.uk')], ['b.com', null, 'site.io', 'example.com.au', 'example.co.uk']);
});

test('apps are grouped by developer; the most installed app gives the contacts', () => {
  const apps = parseSearchPage(fixture('search.html'));
  const found = [...apps.map((app) => ({ app, source: 'search "x"', country: 'US' })), { app: { ...apps[0], appId: 'other.app', installs: '1+' }, source: 'similar', country: 'GB' }];
  const groups = groupByDeveloper(found);
  assert.equal(groups.length, new Set(apps.map((app) => app.developer)).size);
  const first = groups[0];
  assert.equal(first.apps.size, 2);
  assert.deepEqual([...first.countries], ['US', 'GB']);
  assert.equal(leadApp(first).appId, apps[0].appId);
});

test('a lead from an app page: company contacts, and nothing personal for individuals', () => {
  const page = parseAppPage(fixture('app-spotify.html'));
  const group = groupByDeveloper([{ app: { appId: page.appId, developer: page.developer, title: page.title, installs: page.installs }, source: 'search "music"', country: 'US' }])[0];
  const lead = buildLead(group, page, { now: new Date('2026-11-10T00:00:00Z') });
  assert.equal(lead.developerType, 'company');
  assert.equal(lead.email, 'support@spotify.com');
  assert.equal(lead.websiteDomain, 'spotify.com');
  assert.equal(lead.companyName, 'Spotify AB');
  assert.equal(lead.topAppMinInstalls, 1000000000);
  assert.ok(lead.daysSinceUpdate > 0);
  assert.deepEqual(lead.foundBy, ['search "music"']);
  assert.equal(passes(lead, {}), null);
  assert.equal(passes(lead, { maxInstalls: 1000000 }), 'too many installs');
  assert.equal(passes(lead, { minInstalls: 2e9 }), 'too few installs');
  assert.equal(passes(lead, { updatedWithinDays: 1 }), 'not updated recently');

  const person = buildLead(group, { ...page, developer: 'Jane Doe', developerLegalName: null, developerEmail: 'jane.doe@gmail.com', developerWebsite: 'https://janedoe.dev', developerAddress: 'Home 1', developerPhone: '+1 555' });
  assert.equal(person.developerType, 'individual');
  assert.deepEqual([person.email, person.legalEmail, person.address, person.phone, person.companyName], [null, null, null, null, null]);
  assert.equal(passes(person, {}), 'individual developer');
  assert.equal(passes(person, { companiesOnly: false }), 'no email');
  assert.equal(passes(person, { companiesOnly: false, requireEmail: false }), null);
});
