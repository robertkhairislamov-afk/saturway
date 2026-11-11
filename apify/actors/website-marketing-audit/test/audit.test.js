import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { SOCIAL_HOSTS, auditPage, cmsOf, contactPageOf, contactsOf, containerTrackingOf, scoreOf, seoOf, trackingOf } from '../src/audit.js';
import { isAllowed, parseRobots } from '../src/robots.js';
import { fromDatasetItem, normalizeWebsite } from '../src/sources.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');

const PAGE = `<!doctype html><html lang="th"><head><title>Sea View Spa Pattaya</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Thai massage in Pattaya">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234567"></script>
<script>gtag('config', 'G-ABC1234567'); gtag('config', 'AW-123456789');</script>
<script>!function(f,b,e,v,n,t,s){}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '1234567890123');</script>
<link rel="stylesheet" href="/wp-content/themes/spa/style.css">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"DaySpa","name":"Sea View"}</script>
</head><body><h1>Sea View Spa</h1>
<a href="https://wa.me/66812345678">WhatsApp</a> <a href="https://lin.ee/abcd123">LINE</a>
<a href="https://www.facebook.com/seaviewspa">Facebook</a> <a href="https://www.instagram.com/seaviewspa/">IG</a>
<a href="mailto:booking@seaviewspa.com">Email</a> <a href="tel:+66 81 234 5678">Call</a>
<a href="/contact-us/">Contact</a> <a href="https://other.com/contact">x</a>
<footer>© 2019 Sea View Spa</footer></body></html>`;

test('tracking and ad pixels on the page', () => {
  const t = trackingOf(PAGE);
  assert.equal(t.metaPixel, true);
  assert.deepEqual(t.metaPixelIds, ['1234567890123']);
  assert.equal(t.googleAnalytics, true);
  assert.deepEqual(t.googleAnalyticsIds, ['G-ABC1234567']);
  assert.equal(t.googleAds, true);
  assert.equal(t.tiktokPixel, false);
  assert.equal(trackingOf('<html><body>Hello</body></html>').metaPixel, false);
});

test('tags hidden in a Google Tag Manager container', () => {
  const container = containerTrackingOf(fixture('gtm-excerpt.js'));
  assert.equal(container.metaPixel, true);
  assert.equal(container.googleAds, true);
  assert.ok(container.googleAdsIds.includes('AW-786649265'));
  assert.ok(container.googleAnalyticsIds.includes('G-KJL05B1DJZ'));
  const audit = auditPage('<html><head><title>x</title><script src="https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12"></script></head></html>', { finalUrl: 'https://x.com/', containers: [fixture('gtm-excerpt.js')] });
  assert.equal(audit.tracking.metaPixel, true);
  assert.ok(audit.foundInTagManager.includes('metaPixel') && audit.foundInTagManager.includes('googleAds'));
  assert.ok(audit.adPixels.includes('Meta'));
});

test('CMS, chat, social, contacts and SEO basics', () => {
  assert.equal(cmsOf(PAGE).cms, 'WordPress');
  const audit = auditPage(PAGE, { finalUrl: 'https://seaviewspa.com/', responseTimeMs: 400, bytes: 2048 });
  assert.deepEqual(audit.chat, ['WhatsApp', 'LINE']);
  assert.equal(audit.social.facebook, 'https://www.facebook.com/seaviewspa');
  assert.equal(audit.social.instagram, 'https://www.instagram.com/seaviewspa');
  assert.equal(audit.social.line, 'https://lin.ee/abcd123');
  assert.deepEqual(audit.contacts.emails, ['booking@seaviewspa.com']);
  assert.deepEqual(audit.contacts.phones, ['+66812345678']);
  const seo = seoOf(PAGE);
  assert.deepEqual([seo.title, seo.language, seo.mobileViewport, seo.h1, seo.copyrightYear], ['Sea View Spa Pattaya', 'th', true, 'Sea View Spa', 2019]);
  assert.deepEqual(seo.structuredData, ['DaySpa']);
  assert.equal(contactPageOf(PAGE, 'https://seaviewspa.com/'), 'https://seaviewspa.com/contact-us/');
  assert.deepEqual(contactsOf('<img src="logo@2x.png"> write to Info@Shop.co.th.').emails, ['info@shop.co.th']);
});

test('score and gaps', () => {
  const full = auditPage(PAGE, { finalUrl: 'https://seaviewspa.com/' });
  const r = scoreOf(full, { year: 2026 });
  assert.equal(r.adTracking, true);
  assert.deepEqual(r.adPixels, ['Meta', 'Google Ads']);
  assert.equal(r.marketingScore, 90); // only the other pixels (5) and an old copyright (5) missing
  assert.ok(r.gaps.some((gap) => /Copyright 2019/.test(gap)));
  const bare = auditPage('<html><body>Welcome</body></html>', { finalUrl: 'http://old.example/', responseTimeMs: 4500 });
  assert.equal(bare.marketingScore, 5); // only the copyright check passes (no year shown)
  assert.ok(bare.gaps[0].startsWith('No HTTPS'));
  assert.ok(bare.gaps.some((gap) => /Slow server/.test(gap)));
  assert.ok(bare.gaps.some((gap) => /No email/.test(gap)));
});

test('a real Pattaya website', () => {
  const audit = auditPage(fixture('pattaya-tours.html'), { finalUrl: 'https://pattaya-tours.ru/' });
  assert.ok(audit.chat.includes('WhatsApp'));
  assert.ok(audit.contacts.emails.includes('info@pattaya-tours.ru'));
  assert.ok(audit.social.instagram);
  assert.equal(audit.tracking.yandexMetrica, true);
});

test('robots.txt rules', () => {
  const rules = parseRobots('User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nDisallow: /admin\nAllow: /admin/public\nDisallow: /*.pdf$\n');
  assert.equal(isAllowed(rules, '/'), true);
  assert.equal(isAllowed(rules, '/admin/x'), false);
  assert.equal(isAllowed(rules, '/admin/public/page'), true);
  assert.equal(isAllowed(rules, '/file.pdf'), false);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow: /'), '/'), false);
  assert.equal(isAllowed(parseRobots('User-agent: *\nDisallow:'), '/'), true);
});

test('websites and Google Maps dataset items', () => {
  assert.equal(normalizeWebsite('seaviewspa.com').href, 'https://seaviewspa.com/');
  assert.equal(normalizeWebsite('http://x.co.th/page#top').href, 'http://x.co.th/page');
  assert.equal(normalizeWebsite('localhost'), null);
  const item = fromDatasetItem({ title: 'Sea View Spa', categoryName: 'Day spa', website: 'https://seaviewspa.com/', url: 'https://www.google.com/maps/place/?q=place_id:abc', totalScore: 4.6, reviewsCount: 120, phone: '+66 81 234 5678' });
  assert.equal(item.website, 'https://seaviewspa.com/');
  assert.deepEqual([item.lead.businessName, item.lead.category, item.lead.rating, item.lead.reviewsCount], ['Sea View Spa', 'Day spa', 4.6, 120]);
  assert.ok(item.lead.mapsUrl.includes('google.com/maps'));
  assert.equal(fromDatasetItem({ title: 'No site', url: 'https://www.google.com/maps/place/x' }).website, null);
  assert.ok(SOCIAL_HOSTS.test('facebook.com') && SOCIAL_HOSTS.test('m.facebook.com') && !SOCIAL_HOSTS.test('seaviewspa.com'));
});
