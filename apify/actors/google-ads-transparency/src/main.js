import { Actor, log } from 'apify';

import { createClient, mapLimit } from './http.js';
import { EMPTY_TEXT, parsePreview } from './preview.js';
import { readInput } from './sources.js';
import {
  PAGE_SIZE, adUrl, advertiserRequest, advertiserUrl, creativeRequest, creativesRequest, parseAdvertiser,
  parseCreativeDetail, parseCreatives, parseSuggestions, pickAdvertisers, suggestionsRequest,
} from './transparency.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
// Previews and details loaded at once.
const CONCURRENCY = 8;
// Creative IDs kept in the only-new memory.
const MAX_REMEMBERED = 200000;

// Every ad record has the same keys in the same order; missing values are null.
const EMPTY_AD = {
  advertiserId: null, advertiserName: null, domain: null, creativeId: null, format: null, adUrl: null,
  firstShown: null, lastShown: null, shownForDays: null,
  ...EMPTY_TEXT,
  imageUrl: null, width: null, height: null, previewUrl: null,
  variationCount: null, variations: null, regions: null, impressions: null, platformImpressions: null,
  region: null, source: null, scrapedAt: null,
};
const EMPTY_ADVERTISER = {
  advertiserId: null, name: null, legalName: null, country: null, verified: null, adCountLow: null, adCountHigh: null,
  adsFound: null, domain: null, advertiserUrl: null, region: null, source: null, scrapedAt: null,
};

await Actor.init();

async function proxyFor(config) {
  if (config && !config.useApifyProxy && !config.proxyUrls?.length) return undefined;
  try {
    return await Actor.createProxyConfiguration(config ?? { useApifyProxy: true });
  } catch (error) {
    log.warning(`This proxy is not available (${error.message}); running without a proxy.`);
    return undefined;
  }
}

// With Apify Proxy datacenter addresses (the default), residential addresses take over when Google
// keeps limiting them. A proxy the user chose otherwise is used as it is.
async function fallbackFor(config) {
  const datacenter = !config || (config.useApifyProxy && !(config.apifyProxyGroups ?? []).some((g) => /RESIDENTIAL/i.test(g)) && !config.proxyUrls?.length);
  if (!datacenter) return undefined;
  try {
    return await Actor.createProxyConfiguration({ useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'] });
  } catch {
    return undefined;
  }
}

try {
  const input = readInput((await Actor.getInput()) ?? {}, (message) => log.warning(message));
  const proxyConfiguration = await proxyFor(input.proxyConfiguration);
  const client = createClient({ proxyConfiguration, fallbackProxyConfiguration: await fallbackFor(input.proxyConfiguration) });
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);
  const summary = [];
  const filters = { region: input.region, platforms: input.platforms, format: input.format, startDate: input.startDate, endDate: input.endDate };

  // Only-new mode: creative IDs saved by earlier runs.
  let memory = null;
  let seenBefore = new Set();
  if (input.onlyNewAds && input.resultType === 'ads') {
    memory = await Actor.openKeyValueStore(input.monitorStoreName);
    seenBefore = new Set((await memory.getValue('SEEN_CREATIVES')) ?? []);
    log.info(`Only new ads: ${seenBefore.size} ad(s) remembered from earlier runs in the store "${input.monitorStoreName}".`);
  }
  const newlySeen = [];

  log.info(`${input.targets.length} target(s), region ${input.regionLabel}${input.platforms.length ? `, platforms ${input.platforms.join(', ')}` : ''}${input.format ? `, ${input.format} ads` : ''}.`);

  // Variations, regions and impressions of one ad.
  const detailOf = async (ad) => {
    try {
      return parseCreativeDetail(await client.rpc('LookupService/GetCreativeById', creativeRequest({ ...ad, region: input.region })));
    } catch (error) {
      log.debug(`Details of ${ad.creativeId}: ${error.message}`);
      return null;
    }
  };

  // Adds the ad text and the details to a page of ads, then saves them.
  async function saveAds(ads, row) {
    const scrapedAt = new Date().toISOString();
    const records = await mapLimit(ads, CONCURRENCY, async (ad) => {
      // Google shows most text ads as a picture; their text is usually in a variation, which only
      // the details list. So the details are loaded for such ads whenever the ad text is wanted.
      const wantDetail = input.includeDetails || (input.includeAdText && !ad.previewUrl);
      const detail = wantDetail ? await detailOf(ad) : null;
      const record = { ...EMPTY_AD, ...ad, adUrl: adUrl(ad.advertiserId, ad.creativeId, input.region) };
      if (detail) {
        record.advertiserName ??= detail.advertiserName;
        record.lastShown ??= detail.lastShown;
        if (!record.firstShown) record.firstShown = detail.regions.map((r) => r.firstShown).filter(Boolean).sort()[0] ?? null;
        if (!record.imageUrl && !record.previewUrl) Object.assign(record, detail.variations[0] ?? {});
        if (input.includeDetails) {
          record.variationCount = detail.variations.length;
          record.variations = detail.variations;
          record.regions = detail.regions;
          record.impressions = detail.impressions;
          record.platformImpressions = detail.platformImpressions;
        }
      }
      if (input.includeAdText) {
        const previewUrl = record.previewUrl ?? detail?.variations.find((v) => v.previewUrl)?.previewUrl;
        if (previewUrl) Object.assign(record, parsePreview(await client.preview(previewUrl)));
      }
      return { ...record, region: input.regionLabel, source: row.source, scrapedAt };
    });
    const batch = records.slice(0, roomLeft());
    if (batch.length > 0) await Actor.pushData(batch);
    for (const r of batch) {
      if (r.headline || r.description || r.appName) row.withText++;
      if (memory) newlySeen.push(r.creativeId);
    }
    row.saved += batch.length;
    saved += batch.length;
  }

  // Pages through the ads of a website or of advertisers and saves them.
  async function scrapeAds(search, row) {
    let pageToken = null;
    const seen = new Set();
    do {
      const room = Math.min(roomLeft(), input.maxAdsPerSearch - row.found);
      if (room <= 0) break;
      await Actor.setStatusMessage(`Saved ${saved} ads. ${row.source}: ${row.found} found.`).catch(() => {});
      const page = parseCreatives(await client.rpc('SearchService/SearchCreatives', creativesRequest({ ...search, ...filters, pageSize: PAGE_SIZE, pageToken })));
      if (row.pages === 0) {
        row.totalLow = page.totalLow;
        row.totalHigh = page.totalHigh;
      }
      row.pages++;
      const fresh = page.ads.filter((ad) => !seen.has(ad.creativeId));
      fresh.forEach((ad) => seen.add(ad.creativeId));
      const wanted = fresh.slice(0, room);
      row.found += wanted.length;
      const toSave = wanted.filter((ad) => !seenBefore.has(ad.creativeId));
      row.skippedSeen += wanted.length - toSave.length;
      if (toSave.length > 0) await saveAds(toSave, row);
      pageToken = page.nextPageToken;
      if (fresh.length === 0) break;
    } while (pageToken);
  }

  for (const [index, target] of input.targets.entries()) {
    if (roomLeft() <= 0) break;
    const row = { source: target.label, advertisers: [], totalLow: null, totalHigh: null, pages: 0, found: 0, saved: 0, withText: 0, skippedSeen: 0, error: null };
    summary.push(row);
    try {
      if (input.resultType === 'advertisers') {
        await saveAdvertisers(target, row);
      } else if (target.kind === 'creative') {
        await saveCreative(target, row);
      } else if (target.kind === 'domain') {
        await scrapeAds({ domain: target.domain }, row);
      } else if (target.kind === 'advertiser') {
        row.advertisers.push(target.advertiserId);
        await scrapeAds({ advertiserIds: [target.advertiserId] }, row);
      } else {
        const matches = pickAdvertisers(parseSuggestions(await client.rpc('SearchService/SearchSuggestions', suggestionsRequest(target.query))), target.query, input.maxAdvertisersPerQuery);
        if (matches.length === 0) {
          log.warning(`${target.label}: no advertiser with this name. Try the brand's website (such as brand.com) or its advertiser ID.`);
        }
        for (const advertiser of matches) {
          if (roomLeft() <= 0) break;
          row.advertisers.push(`${advertiser.name} (${advertiser.advertiserId})`);
          const before = row.found;
          row.found = 0;
          await scrapeAds({ advertiserIds: [advertiser.advertiserId] }, row);
          row.found += before;
        }
      }
      log.info(`${target.label}: ${row.totalHigh !== null ? `${row.totalLow}–${row.totalHigh} ads in the Transparency Center, ` : ''}${row.saved} saved${input.resultType === 'ads' && input.includeAdText ? ` (${row.withText} with ad text)` : ''}${row.skippedSeen ? `, ${row.skippedSeen} seen in earlier runs` : ''}; ${saved} in total.`);
    } catch (error) {
      row.error = error.message;
      log.warning(`${target.label}: ${error.message}${row.saved > 0 ? ` (${row.saved} saved before the error)` : ''}`);
    }
    if (input.targets.length > 1) await Actor.setStatusMessage(`Saved ${saved}; ${index + 1} of ${input.targets.length} targets done.`).catch(() => {});
  }

  // One ad from its Transparency Center link.
  async function saveCreative(target, row) {
    const detail = await detailOf(target);
    if (!detail) throw new Error('the ad was not found in this region');
    row.found = 1;
    if (seenBefore.has(target.creativeId)) {
      row.skippedSeen++;
      return;
    }
    await saveAds([{
      advertiserId: detail.advertiserId,
      creativeId: detail.creativeId,
      advertiserName: detail.advertiserName,
      lastShown: detail.lastShown,
      ...detail.variations[0],
    }], row);
  }

  // Name, country and ad count (in the region, with the filters) of one advertiser.
  async function advertiserInfo(advertiserId) {
    const info = parseAdvertiser(await client.rpc('LookupService/GetAdvertiserById', advertiserRequest({ advertiserId, region: input.region })));
    if (!info) throw new Error('advertiser not found');
    const page = parseCreatives(await client.rpc('SearchService/SearchCreatives', creativesRequest({ advertiserIds: [advertiserId], ...filters, pageSize: 1 })));
    return { ...info, adCountLow: page.totalLow ?? 0, adCountHigh: page.totalHigh ?? 0 };
  }

  // Advertisers: matches of a brand name, the accounts behind a website's ads, or one advertiser ID.
  async function saveAdvertisers(target, row) {
    const scrapedAt = new Date().toISOString();
    const base = { region: input.regionLabel, source: target.label, scrapedAt };
    let rows = [];
    if (target.kind === 'query') {
      const { advertisers } = parseSuggestions(await client.rpc('SearchService/SearchSuggestions', suggestionsRequest(target.query)));
      rows = pickAdvertisers({ advertisers }, target.query, 10)
        .map((a) => ({ ...EMPTY_ADVERTISER, ...a, advertiserUrl: advertiserUrl(a.advertiserId, input.region), ...base }));
    } else if (target.kind === 'domain') {
      const byAdvertiser = new Map();
      let pageToken = null;
      do {
        const page = parseCreatives(await client.rpc('SearchService/SearchCreatives', creativesRequest({ domain: target.domain, ...filters, pageToken })));
        if (row.pages === 0) {
          row.totalLow = page.totalLow;
          row.totalHigh = page.totalHigh;
        }
        row.pages++;
        for (const ad of page.ads) {
          row.found++;
          const entry = byAdvertiser.get(ad.advertiserId) ?? { advertiserId: ad.advertiserId, name: ad.advertiserName, adsFound: 0 };
          entry.adsFound++;
          byAdvertiser.set(ad.advertiserId, entry);
        }
        pageToken = page.ads.length > 0 ? page.nextPageToken : null;
      } while (pageToken && row.found < input.maxAdsPerSearch);
      const accounts = [...byAdvertiser.values()].sort((a, b) => b.adsFound - a.adsFound).slice(0, roomLeft());
      rows = await mapLimit(accounts, CONCURRENCY, async (a) => ({
        ...EMPTY_ADVERTISER, ...a, ...(await advertiserInfo(a.advertiserId).catch(() => ({}))), adsFound: a.adsFound,
        domain: target.domain, advertiserUrl: advertiserUrl(a.advertiserId, input.region), ...base,
      }));
    } else {
      const info = await advertiserInfo(target.advertiserId);
      rows = [{ ...EMPTY_ADVERTISER, ...info, advertiserUrl: advertiserUrl(target.advertiserId, input.region), ...base }];
    }
    const batch = rows.slice(0, roomLeft());
    if (batch.length > 0) await Actor.pushData(batch);
    row.saved += batch.length;
    saved += batch.length;
  }

  if (client.stats.fallback) log.info('Google limited the datacenter addresses, so the rest of the run used residential addresses.');
  if (roomLeft() <= 0) log.info('Reached the item limit or the maximum charge for this run; stopping.');
  if (memory && newlySeen.length > 0) {
    const all = [...seenBefore, ...newlySeen];
    await memory.setValue('SEEN_CREATIVES', all.slice(-MAX_REMEMBERED));
  }

  await Actor.setValue('SUMMARY', { saved, region: input.regionLabel, resultType: input.resultType, targets: summary, requests: client.stats });
  const failed = summary.filter((row) => row.error);
  if (summary.length > 0 && failed.length === summary.length && saved === 0) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} targets failed. First error: ${failed[0].error}`);
  }
  const noun = input.resultType === 'ads' ? 'ads' : 'advertisers';
  const message = `Saved ${saved} ${noun} from ${summary.length} target(s)${failed.length > 0 ? ` (${failed.length} stopped by an error)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
