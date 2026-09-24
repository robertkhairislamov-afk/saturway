// Runs one ATS adapter: reads every company board, filters the jobs, optionally skips jobs seen
// in earlier runs, respects the item limits and the user's maximum charge, and saves the jobs.

import { createJobFilter } from './filters.js';
import { createHttpClient } from './http.js';
import { normalizeInput } from './input.js';
import { nextSeenIds, openSeenJobs } from './state.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';
const DETAIL_BATCH = 48;

export async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

function parseCompanies(adapter, values, log) {
  const companies = [];
  const rejected = [];
  const keys = new Set();
  for (const value of values) {
    try {
      const company = adapter.parseCompany(value);
      if (keys.has(company.key)) continue;
      keys.add(company.key);
      companies.push({ ...company, input: value });
    } catch (error) {
      const message = error instanceof TypeError ? 'this is not a valid name or URL.' : error.message;
      log.warning(`Skipping "${value}": ${message}`);
      rejected.push({ input: value, company: null, jobsFound: 0, jobsMatched: 0, jobsSaved: 0, error: message });
    }
  }
  return { companies, rejected };
}

export async function runScraper(Actor, adapter, rawInput, log) {
  // Adapters whose sources are not company boards (Dice searches) turn their input into sources first.
  const input = normalizeInput(adapter.prepareInput ? adapter.prepareInput(rawInput) : rawInput, adapter.exampleInput);
  const [one, many] = adapter.sourceNames ?? ['company', 'companies'];
  if (input.usedExample) log.warning(`No ${many} in the input; scraping the example ${adapter.title} ${one} ${input.companies.join(', ')}.`);

  const { companies, rejected } = parseCompanies(adapter, input.companies, log);
  if (companies.length === 0) throw new Error(`No ${adapter.title} ${one} could be read from the input. ${rejected[0]?.error ?? ''}`.trim());

  const proxyConfiguration = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const http = createHttpClient({
    proxyConfiguration,
    // Sites that limit direct requests (Dice) continue through Apify Proxy.
    fallbackProxy: adapter.proxyFallback ? () => Actor.createProxyConfiguration({ useApifyProxy: true }) : undefined,
    onFallback: () => log.info(`${adapter.title} is limiting direct requests; continuing through Apify Proxy.`),
  });
  const context = { http, log, keywords: input.keywords, includeDescription: input.includeDescription };
  const filter = createJobFilter(input);
  const seenJobs = input.onlyNew ? await openSeenJobs(Actor, adapter.name) : null;
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);

  let saved = 0;
  let finished = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);

  const toOutput = (job, scrapedAt) => {
    if (input.includeDescription) return { ...job, scrapedAt };
    const { descriptionText, descriptionHtml, ...rest } = job;
    return { ...rest, scrapedAt };
  };

  async function scrapeCompany(company) {
    const stats = { input: company.input, company: company.id, jobsFound: 0, jobsMatched: 0, jobsSaved: 0, error: null };
    const before = seenJobs ? await seenJobs.load(company.key) : null;
    if (before?.size === 0) log.info(`${company.id}: first run with "Only new jobs"; saving all current jobs and remembering them for next time.`);
    const listed = new Set();
    const handled = new Set();
    let listingComplete = true;
    const room = () => Math.min(roomLeft(), input.maxItemsPerCompany > 0 ? input.maxItemsPerCompany - stats.jobsSaved : Infinity);

    // Saves as many jobs as the limits allow and reports whether all of them fit.
    async function save(jobs) {
      const taken = jobs.slice(0, Math.max(0, room()));
      saved += taken.length;
      stats.jobsSaved += taken.length;
      for (const job of taken) handled.add(job.jobId);
      if (taken.length > 0) {
        const scrapedAt = new Date().toISOString();
        await Actor.pushData(taken.map((job) => toOutput(job, scrapedAt)));
      }
      return taken.length === jobs.length;
    }

    async function loadDetails(partials) {
      const jobs = await mapWithConcurrency(partials, adapter.detailConcurrency ?? 8, async (partial) => {
        try {
          return await adapter.completeJob(partial, company, context);
        } catch (error) {
          log.warning(`${company.id}: could not load job ${partial.jobId}: ${error.message}`);
          return null;
        }
      });
      const matching = [];
      for (const job of jobs) {
        if (!job) continue;
        if (filter.matches(job)) matching.push(job);
        else handled.add(job.jobId);
      }
      return matching;
    }

    // Partial jobs (Workday) wait in a queue so their details load in large parallel batches.
    const queue = [];
    async function processQueue(all) {
      while (queue.length > 0 && (all || !adapter.completeJob || queue.length >= Math.min(DETAIL_BATCH, room()))) {
        const space = room();
        if (space <= 0) return false;
        // Details are loaded only for as many jobs as can still be saved.
        const batch = queue.splice(0, adapter.completeJob ? Math.min(DETAIL_BATCH, space) : queue.length);
        const matching = adapter.completeJob ? await loadDetails(batch) : batch;
        stats.jobsMatched += matching.length;
        if (!(await save(matching))) return false;
      }
      return true;
    }

    try {
      for await (const page of adapter.listJobs(company, context)) {
        if (room() <= 0) {
          listingComplete = false;
          break;
        }
        for (const job of page) {
          if (!job?.jobId || listed.has(job.jobId)) continue;
          listed.add(job.jobId);
          stats.jobsFound++;
          if (before?.has(job.jobId)) continue;
          if (filter.matches(job)) queue.push(job);
          else handled.add(job.jobId);
        }
        if (!(await processQueue(false))) {
          listingComplete = false;
          break;
        }
      }
      if (listingComplete && !(await processQueue(true))) listingComplete = false;
    } catch (error) {
      stats.error = error.message;
      listingComplete = false;
      log.warning(`${company.id}: ${error.message}`);
    }

    if (seenJobs && (!stats.error || handled.size > 0)) {
      await seenJobs.save(company.key, nextSeenIds({ before, listed, handled, listingComplete }));
    }
    if (before) stats.jobsNew = [...listed].filter((id) => !before.has(id)).length;
    log.info(`${company.id}: ${stats.jobsFound} jobs${before ? `, ${stats.jobsNew} new` : ''}, ${stats.jobsMatched} matching, ${stats.jobsSaved} saved.`);
    return stats;
  }

  const results = await mapWithConcurrency(companies, adapter.companyConcurrency ?? 5, async (company) => {
    if (roomLeft() <= 0) return { input: company.input, company: company.id, jobsFound: 0, jobsMatched: 0, jobsSaved: 0, error: null, skipped: 'limit reached' };
    const stats = await scrapeCompany(company);
    finished++;
    await Actor.setStatusMessage(`Saved ${saved} jobs from ${finished} of ${companies.length} ${many}`);
    return stats;
  });

  const summary = [...results, ...rejected];
  await Actor.setValue('SUMMARY', { ats: adapter.name, jobsSaved: saved, companies: summary });

  const failed = results.filter((result) => result.error);
  if (failed.length === results.length) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} ${many} failed. First error: ${failed[0].error}`);
  }
  let stopped = null;
  if (saved >= budget) stopped = 'stopped at the maximum cost per run';
  else if (input.maxItems > 0 && saved >= input.maxItems) stopped = `stopped at the limit of ${input.maxItems} jobs`;
  const notes = [];
  if (failed.length > 0) notes.push(`${failed.length} failed`);
  if (rejected.length > 0) notes.push(`${rejected.length} skipped as invalid`);
  if (stopped) notes.push(stopped);
  const companiesText = `${results.length} ${results.length === 1 ? one : many}`;
  const message = saved === 0 && failed.length === 0 && !stopped
    ? `No ${input.onlyNew ? 'new ' : ''}jobs matched the filters in ${companiesText}.`
    : `Saved ${saved} ${input.onlyNew ? 'new ' : ''}jobs from ${companiesText}${notes.length > 0 ? ` (${notes.join(', ')})` : ''}.`;
  log.info(message);
  return { saved, message, summary };
}
