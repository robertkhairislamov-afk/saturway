// Website marketing audit for agencies and lead qualification: for every website (or every
// business of a Google Maps Scraper dataset), which tracking and ad pixels, analytics, CMS, chat
// and booking tools it uses, its social profiles and contacts, SEO basics, a marketing score and
// the gaps to pitch. One home page per site (and its contact page when the home page has no
// contacts), robots.txt respected.

import { Actor, log } from 'apify';
import { EnvHttpProxyAgent, ProxyAgent, fetch } from 'undici';

import { SOCIAL_HOSTS, auditPage, contactPageOf } from './audit.js';
import { isAllowed, parseRobots } from './robots.js';
import { fromDatasetItem, normalizeWebsite } from './sources.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const CONCURRENCY = 8;
const TIMEOUT_MS = 20000;
const MAX_BYTES = 3 * 1024 * 1024;
// An honest name for the site owners' logs, with a link to what the tool does.
const USER_AGENT = 'Mozilla/5.0 (compatible; WebsiteMarketingAudit/0.1; +https://apify.com/robertosan16/website-marketing-audit)';
const EXAMPLE_INPUT = { websites: ['https://www.apify.com', 'https://wordpress.org'] };
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;

const toList = (value) => (Array.isArray(value) ? value : value ? String(value).split(/[\s,]+/) : []).map((item) => String(item).trim()).filter(Boolean);

await Actor.init();

try {
  const raw = (await Actor.getInput()) ?? {};
  const datasetId = String(raw.datasetId ?? '').trim();
  const input = toList(raw.websites).length || datasetId ? raw : { ...raw, ...EXAMPLE_INPUT };
  if (input !== raw) log.warning('No websites or dataset in the input; auditing two example sites.');
  const maxSites = Number(input.maxSites ?? 1000);
  if (!Number.isInteger(maxSites) || maxSites < 1) throw new Error('"maxSites" must be a whole number, 1 or more.');
  const includeNoWebsite = input.includeNoWebsite !== false;
  const checkContactPage = input.checkContactPage !== false;
  const maxScore = input.maxMarketingScore == null || input.maxMarketingScore === '' ? null : Number(input.maxMarketingScore);
  if (maxScore != null && !(maxScore >= 0 && maxScore <= 100)) throw new Error('"maxMarketingScore" must be a number from 0 to 100.');

  const proxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const dispatcher = async () => (proxy ? new ProxyAgent(await proxy.newUrl()) : envAgent);

  async function load(url, { timeoutMs = TIMEOUT_MS } = {}) {
    const agent = await dispatcher();
    const started = Date.now();
    try {
      const res = await fetch(url, { dispatcher: agent, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs), headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'en-US,en;q=0.9' } });
      const responseTimeMs = Date.now() - started;
      const type = res.headers.get('content-type') ?? '';
      const buffer = Buffer.from(await res.arrayBuffer());
      return { status: res.status, url: res.url || url, type, text: buffer.subarray(0, MAX_BYTES).toString('utf8'), bytes: buffer.length, responseTimeMs };
    } finally {
      if (agent && agent !== envAgent) agent.close().catch(() => {});
    }
  }

  // Google Tag Manager containers, once per container id.
  const containerCache = new Map();
  function containerOf(id) {
    if (!containerCache.has(id)) {
      containerCache.set(id, load(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`, { timeoutMs: 15000 })
        .then((res) => (res.status === 200 ? res.text : null))
        .catch(() => null));
    }
    return containerCache.get(id);
  }

  const robotsCache = new Map();
  async function robotsFor(origin) {
    if (!robotsCache.has(origin)) {
      robotsCache.set(origin, load(`${origin}/robots.txt`, { timeoutMs: 10000 })
        .then((res) => (res.status === 200 && !/text\/html/i.test(res.type) ? parseRobots(res.text) : []))
        .catch(() => []));
    }
    return robotsCache.get(origin);
  }

  // Sources: websites from the input, then businesses from the dataset.
  const sources = toList(input.websites).map((website) => ({ website, lead: {} }));
  if (datasetId) {
    const client = Actor.apifyClient.dataset(datasetId);
    for (let offset = 0; ; offset += 1000) {
      const { items } = await client.listItems({ offset, limit: 1000, clean: true });
      sources.push(...items.map(fromDatasetItem));
      if (items.length < 1000) break;
    }
    log.info(`Read ${sources.length - toList(input.websites).length} businesses from dataset ${datasetId}.`);
  }

  const seen = new Set();
  const tasks = [];
  const summary = { saved: 0, audited: 0, noWebsite: 0, socialOnly: 0, unreachable: 0, robotsBlocked: 0, duplicates: 0, filteredOut: 0 };
  for (const source of sources) {
    const url = normalizeWebsite(source.website);
    const key = url ? url.hostname.replace(/^www\./, '').toLowerCase() + url.pathname.replace(/\/$/, '') : null;
    if (key && seen.has(key)) { summary.duplicates++; continue; }
    if (key) seen.add(key);
    if (!url && !includeNoWebsite) continue;
    tasks.push({ ...source, url });
    if (tasks.length >= maxSites) break;
  }

  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  const year = new Date().getFullYear();

  async function audit({ website, url, lead }) {
    const base = { ...lead, website: website ?? null, domain: url ? url.hostname.replace(/^www\./, '') : null, checkedAt: new Date().toISOString() };
    if (!url) {
      summary.noWebsite++;
      return { ...base, status: 'no website', marketingScore: 0, adTracking: false, gaps: ['No website: the business is found only on maps and social media'] };
    }
    if (SOCIAL_HOSTS.test(url.hostname.replace(/^www\./, ''))) {
      summary.socialOnly++;
      return { ...base, status: 'social page only', marketingScore: 0, adTracking: false, gaps: ['No own website: the listed website is a social media or map page'] };
    }
    const robots = await robotsFor(url.origin);
    if (!isAllowed(robots, url.pathname || '/')) {
      summary.robotsBlocked++;
      return { skip: true }; // not read, not saved, not charged
    }
    let page;
    let sslError = false;
    try {
      page = await load(url.href);
    } catch (error) {
      // A broken certificate: the site may still open over plain HTTP.
      if (url.protocol === 'https:') {
        try {
          page = await load(url.href.replace(/^https:/, 'http:'));
          sslError = !page.url.startsWith('https:');
        } catch {
          page = null;
        }
      }
      if (!page) {
        summary.unreachable++;
        return { ...base, status: 'unreachable', error: error.cause?.code ?? error.message, marketingScore: 0, adTracking: false, gaps: ['The website does not open'] };
      }
    }
    if ([401, 403, 429].includes(page.status)) {
      // Bot protection, not a broken site: nothing to audit, nothing charged.
      summary.protected = (summary.protected ?? 0) + 1;
      return { skip: true };
    }
    if (page.status >= 400) {
      summary.unreachable++;
      return { ...base, status: 'unreachable', httpStatus: page.status, finalUrl: page.url, marketingScore: 0, adTracking: false, gaps: [`The website answers with an error (HTTP ${page.status})`] };
    }
    if (!/html/i.test(page.type) && !/<html/i.test(page.text.slice(0, 2000))) {
      summary.notHtml = (summary.notHtml ?? 0) + 1;
      return { skip: true };
    }
    let contactHtml = '';
    let contactPageUrl = null;
    const first = auditPage(page.text, { finalUrl: page.url });
    if (checkContactPage && !first.contacts.emails.length) {
      contactPageUrl = contactPageOf(page.text, page.url);
      if (contactPageUrl && isAllowed(await robotsFor(new URL(contactPageUrl).origin), new URL(contactPageUrl).pathname)) {
        contactHtml = await load(contactPageUrl).then((res) => (res.status < 400 ? res.text : '')).catch(() => '');
      }
    }
    const containers = (await Promise.all(first.tracking.googleTagManagerIds.slice(0, 2).map(containerOf))).filter(Boolean);
    const result = auditPage(page.text, { finalUrl: page.url, responseTimeMs: page.responseTimeMs, bytes: page.bytes, contactHtml, containers });
    if (sslError) result.gaps.unshift('Broken HTTPS certificate: browsers show a security warning');
    summary.audited++;
    const { tracking, seo, contacts, ...rest } = result;
    return {
      ...base,
      status: 'ok',
      httpStatus: page.status,
      finalUrl: rest.finalUrl,
      marketingScore: rest.marketingScore,
      adTracking: rest.adTracking,
      adPixels: rest.adPixels,
      foundInTagManager: rest.foundInTagManager,
      gaps: rest.gaps,
      emails: contacts.emails,
      phones: contacts.phones,
      contactPageUrl: contactHtml ? contactPageUrl : null,
      cms: rest.cms,
      technologies: rest.technologies,
      ...tracking,
      chat: rest.chat,
      booking: rest.booking,
      social: rest.social,
      https: rest.https,
      sslError,
      responseTimeMs: rest.responseTimeMs,
      pageSizeKb: rest.pageSizeKb,
      ...seo,
      copyrightOutdated: seo.copyrightYear != null && seo.copyrightYear < year - 1,
    };
  }

  log.info(`Auditing ${tasks.length} websites and businesses.`);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < tasks.length && saved < budget) {
      const task = tasks[next++];
      let record;
      try {
        record = await audit(task);
      } catch (error) {
        record = { ...task.lead, website: task.website, status: 'error', error: error.message, gaps: [] };
      }
      done++;
      if (record.skip) {
        summary.skipped = (summary.skipped ?? 0) + 1;
      } else if (maxScore != null && record.marketingScore != null && record.marketingScore > maxScore) {
        summary.filteredOut++;
      } else if (saved < budget) {
        saved++;
        await Actor.pushData(record);
      }
      if (done % 10 === 0 || done === tasks.length) await Actor.setStatusMessage(`Checked ${done} of ${tasks.length}; ${saved} saved`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(CONCURRENCY, tasks.length)) }, worker));

  summary.saved = saved;
  await Actor.setValue('SUMMARY', summary);
  const message = `Saved ${saved} records: ${summary.audited} websites audited, ${summary.noWebsite} without a website, ${summary.unreachable} unreachable.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
