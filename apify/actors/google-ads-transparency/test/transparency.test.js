import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createClient, mapLimit, problemOf } from '../src/http.js';
import { parsePreview, unescapeJs } from '../src/preview.js';
import { readInput } from '../src/sources.js';
import {
  creativesRequest, nameMatches, parseCreativeDetail, parseCreatives, parseStartUrl, parseSuggestions, pickAdvertisers, regionId,
} from '../src/transparency.js';

// Answers shaped like the Transparency Center's, for an invented advertiser.
const CREATIVES = {
  1: [
    { 1: 'AR100', 2: 'CR1', 3: { 3: { 2: '<img src="https://tpc.googlesyndication.com/archive/simgad/111" height="250" width="300">' }, 5: true }, 4: 1, 6: { 1: '1700000000' }, 7: { 1: '1790000000' }, 12: 'Example Shoes Ltd', 13: 900, 14: 'example-shoes.com' },
    { 1: 'AR100', 2: 'CR2', 3: { 1: { 4: 'https://displayads-formats.googleusercontent.com/ads/preview/content.js?creativeId=2' } }, 4: 3, 6: { 1: '1780000000' }, 7: { 1: '1790000000' }, 12: 'Example Shoes Ltd', 13: 12, 14: 'example-shoes.com' },
  ],
  2: 'NEXT',
  4: '3000',
  5: '4000',
};
const SUGGESTIONS = {
  1: [
    { 1: { 1: 'Examplex', 2: 'AR1', 3: 'BG', 4: { 2: { 1: '5', 2: '5' } } } },
    { 1: { 1: 'Example Shoes Ltd', 2: 'AR100', 3: 'GB', 4: { 2: { 1: '3000', 2: '4000' } }, 5: true } },
    { 1: { 1: 'EXAMPLE SRL', 2: 'AR2', 3: 'IT', 4: { 2: { 1: '8', 2: '8' } } } },
    { 2: { 1: 'example.com' } },
  ],
};
const DETAIL = {
  1: {
    1: 'AR100', 2: 'CR1', 4: { 1: '1790000000' },
    5: [{ 3: { 2: '<img src="https://tpc.googlesyndication.com/archive/simgad/111" height="250" width="300">' } }, { 1: { 4: 'https://displayads-formats.googleusercontent.com/ads/preview/content.js?creativeId=9' } }],
    17: [{ 1: 2276, 2: '1000', 3: '2000', 4: 20251024, 5: 20261017, 8: [{ 1: 3, 2: '1000', 3: '2000' }] }, { 1: 2756, 5: 20261020 }],
    19: { 2: '2000', 3: '3000', 8: [{ 1: 3, 2: '2000', 3: '3000' }, { 1: 5, 3: '1000' }] },
    22: { 1: 'Example Shoes Ltd' },
  },
};

// A preview script holds the ad as an escaped data-p attribute inside a JavaScript string.
const script = (array) => {
  const attr = `%.@.${JSON.stringify(array).slice(1)}`.replace(/"/g, '&quot;').replace(/&(?!quot;)/g, '&amp;');
  const html = `<div data-p="${attr}"></div>`;
  return `(function(){var h='${html.replace(/\\/g, '\\\\').replace(/[<>="&]/g, (c) => `\\x${c.charCodeAt(0).toString(16)}`)}';})();`;
};

test('region codes, names and anywhere', () => {
  assert.equal(regionId('US'), 2840);
  assert.equal(regionId('de'), 2276);
  assert.equal(regionId('United Kingdom'), 2826);
  assert.equal(regionId('ANYWHERE'), null);
  assert.throws(() => regionId('XX'), /Unknown region/);
});

test('creatives request carries the filters as field numbers', () => {
  const r = creativesRequest({ domain: 'example.com', region: 2840, platforms: ['SEARCH', 'YOUTUBE'], format: 'VIDEO', startDate: '2026-09-01', endDate: '2026-10-20', pageToken: 'T' });
  assert.deepEqual(r, { 2: 100, 3: { 4: 3, 6: 20260901, 7: 20261020, 8: [2840], 12: { 1: 'example.com', 2: true }, 14: [3, 5] }, 4: 'T', 7: { 1: 1, 2: 30, 3: 2840 } });
  assert.deepEqual(creativesRequest({ advertiserIds: ['AR1'], region: null })[7], { 1: 1, 2: 30 });
});

test('ads from a search page', () => {
  const page = parseCreatives(CREATIVES);
  assert.equal(page.nextPageToken, 'NEXT');
  assert.deepEqual([page.totalLow, page.totalHigh], [3000, 4000]);
  const [image, video] = page.ads;
  assert.equal(image.format, 'TEXT');
  assert.equal(image.imageUrl, 'https://tpc.googlesyndication.com/archive/simgad/111');
  assert.deepEqual([image.width, image.height], [300, 250]);
  assert.equal(image.firstShown, '2023-11-14T22:13:20.000Z');
  assert.equal(image.shownForDays, 900);
  assert.equal(image.domain, 'example-shoes.com');
  assert.equal(video.format, 'VIDEO');
  assert.match(video.previewUrl, /content\.js/);
});

test('ad details: variations, countries and impressions', () => {
  const d = parseCreativeDetail(DETAIL);
  assert.equal(d.advertiserName, 'Example Shoes Ltd');
  assert.equal(d.variations.length, 2);
  assert.match(d.variations[1].previewUrl, /creativeId=9/);
  assert.deepEqual(d.regions[0], { region: 'DE', firstShown: '2025-10-24', lastShown: '2026-10-17', impressions: { min: 1000, max: 2000 }, platformImpressions: [{ platform: 'SEARCH', impressions: { min: 1000, max: 2000 } }] });
  assert.equal(d.regions[1].region, 'CH');
  assert.equal(d.regions[1].impressions, null);
  assert.deepEqual(d.platformImpressions[1], { platform: 'YOUTUBE', impressions: { min: 0, max: 1000 } });
});

test('brand names match whole words, most ads first', () => {
  assert.ok(nameMatches('Example Shoes Ltd', 'example'));
  assert.ok(nameMatches('EXAMPLE SRL', 'Example'));
  assert.ok(nameMatches('Example Shoes Ltd', 'example sho'));
  assert.ok(!nameMatches('Examplex', 'example'));
  const s = parseSuggestions(SUGGESTIONS);
  assert.deepEqual(s.domains, ['example.com']);
  assert.deepEqual(pickAdvertisers(s, 'example', 5).map((a) => a.advertiserId), ['AR100', 'AR2']);
  assert.equal(s.advertisers[1].verified, true);
});

test('Transparency Center links', () => {
  assert.deepEqual(parseStartUrl('https://adstransparency.google.com/advertiser/AR123/creative/CR456?region=US'), { kind: 'creative', advertiserId: 'AR123', creativeId: 'CR456', region: 'US' });
  assert.equal(parseStartUrl('https://adstransparency.google.com/advertiser/AR123?region=anywhere').kind, 'advertiser');
  assert.equal(parseStartUrl('https://adstransparency.google.com/?region=US&domain=www.example.com').domain, 'example.com');
  assert.throws(() => parseStartUrl('https://example.com/'), /not an Ads Transparency/);
});

test('input: brands, websites, IDs and links are told apart', () => {
  const input = readInput({ queries: ['Example Shoes', 'https://www.Example.com/shop', 'AR12345678901234567890', 'https://adstransparency.google.com/advertiser/AR1/creative/CR2'], domains: ['example.com'], region: 'gb', platforms: ['youtube'] });
  assert.deepEqual(input.targets.map((t) => t.kind), ['query', 'domain', 'advertiser', 'creative']);
  assert.equal(input.region, 2826);
  assert.equal(input.regionLabel, 'GB');
  assert.deepEqual(input.platforms, ['YOUTUBE']);
  assert.equal(input.includeAdText, true);
  assert.throws(() => readInput({ queries: ['x.com'], platforms: ['TV'] }), /Unknown platform/);
  assert.throws(() => readInput({ queries: ['x.com'], startDate: '2026-10-02', endDate: '2026-10-01' }), /after/);
  const warnings = [];
  assert.equal(readInput({}, (m) => warnings.push(m)).targets[0].domain, 'nike.com');
  assert.equal(warnings.length, 1);
});

test('preview: search text ad without its locations', () => {
  const ad = parsePreview(script([[1, ['Example® Official Site', 'Shop shoes & socks.', 'example.com', 'Example', [['Example Store', '1 Main St', '', 'Springfield', 'IL', '62701', 'US']]]]]));
  assert.equal(ad.headline, 'Example® Official Site');
  assert.equal(ad.description, 'Shop shoes & socks.');
  assert.equal(ad.displayUrl, 'example.com');
  assert.equal(ad.businessName, 'Example');
  assert.deepEqual(ad.adTexts, ['Example® Official Site', 'Shop shoes & socks.']);
});

test('preview: shopping product', () => {
  const ad = parsePreview(script([['https://encrypted-tbn1.gstatic.com/shopping?q=tbn:abc', 'Example Runner Shoes, Size 9', 'Example Store']]));
  assert.equal(ad.headline, 'Example Runner Shoes, Size 9');
  assert.equal(ad.businessName, 'Example Store');
  assert.equal(ad.previewImageUrl, 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:abc');
});

test('preview: other layouts keep the copy and drop buttons, links and HTML', () => {
  const ad = parsePreview(script([null, [{ 1: [null, 'By Example', 'Visit Site', 'CALL', '/aclk?sa=L&ai=x', 'New Running Shoes', 'Lightweight shoes for every run. Free returns.', 'www.example.com/', '<div style="x">y</div>', 'https://tpc.googlesyndication.com/simgad/5', 'sporting_goods_store', '-12345']}]]));
  assert.equal(ad.headline, 'New Running Shoes');
  assert.equal(ad.description, 'Lightweight shoes for every run. Free returns.');
  assert.equal(ad.displayUrl, 'www.example.com/');
  assert.equal(ad.previewImageUrl, 'https://tpc.googlesyndication.com/simgad/5');
  assert.deepEqual(ad.adTexts, ['New Running Shoes', 'Lightweight shoes for every run. Free returns.']);
});

test('preview: app ad fields', () => {
  const js = "var d={appId: 'com.example.app',appName: 'Example: Run Tracker',shortDescription: 'Track runs \\x26 shoes',callToAction: 'INSTALL',destination_url: 'https://play.google.com/store/apps/details?id\\x3dcom.example.app',visible_url: 'play.google.com/store',rating: '[Rating (Reviews)]'};";
  const ad = parsePreview(js);
  assert.equal(ad.appId, 'com.example.app');
  assert.equal(ad.headline, 'Example: Run Tracker');
  assert.equal(ad.description, 'Track runs & shoes');
  assert.equal(ad.destinationUrl, 'https://play.google.com/store/apps/details?id=com.example.app');
  assert.equal(ad.callToAction, 'INSTALL');
  assert.equal(parsePreview(null).headline, null);
  assert.equal(unescapeJs('a\\x3db\\/c\\&d'), 'a=b/c&d');
});

test('client retries the check page on a new address and stops on 400', async () => {
  const answers = [
    { status: 200, text: '<html>Our systems have detected unusual traffic from your computer network</html>' },
    { status: 200, text: JSON.stringify(CREATIVES) },
  ];
  const fetchImpl = async () => {
    const a = answers.shift();
    return { status: a.status, text: async () => a.text };
  };
  const client = createClient({ fetchImpl, backoffMs: 1 });
  const json = await client.rpc('SearchService/SearchCreatives', {});
  assert.equal(json[2], 'NEXT');
  assert.equal(client.stats.checkPages, 1);
  const bad = createClient({ fetchImpl: async () => ({ status: 400, text: async () => 'bad' }), backoffMs: 1 });
  await assert.rejects(bad.rpc('X/Y', {}), /rejected the request/);
  assert.equal(bad.stats.requests, 1);
  assert.equal(problemOf({ status: 200, text: '{"1":[]}' }), null);
});

test('mapLimit keeps the order', async () => {
  assert.deepEqual(await mapLimit([3, 1, 2], 2, async (n) => { await new Promise((r) => setTimeout(r, n)); return n * 10; }), [30, 10, 20]);
});

test('client moves to the fallback proxy when Google keeps limiting', async () => {
  const used = [];
  const proxy = (name) => ({ newUrl: async () => { used.push(name); return `http://${name}.invalid:8000`; } });
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return calls <= 3 ? { status: 429, text: async () => 'Too Many Requests' } : { status: 200, text: async () => '{"1":[]}' };
  };
  const client = createClient({ proxyConfiguration: proxy('dc'), fallbackProxyConfiguration: proxy('res'), fetchImpl, backoffMs: 1 });
  await client.rpc('SearchService/SearchCreatives', {});
  assert.equal(client.stats.fallback, true);
  assert.equal(client.stats.limited, 3);
  assert.deepEqual(used, ['dc', 'dc', 'dc', 'res']);
});
