import { Actor, log } from 'apify';

import { createHttpClient } from './http.js';
import { EMPTY_RECORD, readInput, tasksOf } from './sources.js';

// Pay-per-event: the platform charges this event for every item pushed to the default dataset.
const ITEM_EVENT = 'apify-default-dataset-item';

await Actor.init();

try {
  const input = readInput((await Actor.getInput()) ?? {}, (message) => log.warning(message));
  const proxy = input.proxyConfiguration?.useApifyProxy || input.proxyConfiguration?.proxyUrls?.length
    ? await Actor.createProxyConfiguration(input.proxyConfiguration)
    : undefined;
  const fetchJson = createHttpClient({
    proxyConfiguration: proxy,
    fallbackProxy: () => Actor.createProxyConfiguration({ useApifyProxy: true }),
    onFallback: () => log.info('The App Store is limiting direct requests; continuing through Apify Proxy.'),
  });
  const budget = Actor.getChargingManager().calculateMaxEventChargeCountWithinLimit(ITEM_EVENT);
  let saved = 0;
  const roomLeft = () => Math.min(input.maxItems > 0 ? input.maxItems - saved : Infinity, budget - saved);
  const summary = [];
  const tasks = tasksOf(input, fetchJson);
  log.info(`${tasks.length} source(s) in ${input.countries.length} countr${input.countries.length === 1 ? 'y' : 'ies'}.`);
  for (const [index, task] of tasks.entries()) {
    if (roomLeft() <= 0) {
      log.info('Reached the item limit or the maximum charge for this run; stopping.');
      break;
    }
    const where = `${task.label} (${task.country})`;
    try {
      const apps = await task.load();
      const scrapedAt = new Date().toISOString();
      const records = apps.slice(0, Math.max(0, roomLeft())).map((app, i) => ({
        ...EMPTY_RECORD,
        ...app,
        ...task.context,
        rank: task.ranked ? i + 1 : null,
        country: task.country,
        scrapedAt,
      }));
      if (records.length > 0) await Actor.pushData(records);
      saved += records.length;
      summary.push({ source: where, found: apps.length, saved: records.length, error: null });
      log.info(`${where}: ${apps.length} app(s), ${records.length} saved, ${saved} in total.`);
    } catch (error) {
      summary.push({ source: where, found: 0, saved: 0, error: error.message });
      log.warning(`${where}: ${error.message}`);
    }
    await Actor.setStatusMessage(`Saved ${saved} apps; ${index + 1} of ${tasks.length} sources done`);
  }
  await Actor.setValue('SUMMARY', { saved, sources: summary });
  const failed = summary.filter((row) => row.error);
  if (summary.length > 0 && failed.length === summary.length) {
    throw new Error(failed.length === 1 ? failed[0].error : `All ${failed.length} sources failed. First error: ${failed[0].error}`);
  }
  const message = `Saved ${saved} apps from ${summary.length} source(s)${failed.length > 0 ? ` (${failed.length} failed)` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(error.message);
}
