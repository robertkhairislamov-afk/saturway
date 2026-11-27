import { Actor, log } from 'apify';

import { channelRefOf, createApi, playlistVideoIds, uploadsOf, videoIdOf, videoRows } from './youtube.js';

await Actor.init();
const input = (await Actor.getInput()) ?? {};
const key = input.youtubeApiKey || process.env.YOUTUBE_API_KEY;
if (!key) {
  await Actor.fail('Add a YouTube Data API v3 key in the input (YouTube Data API key) or as the YOUTUBE_API_KEY environment variable of the Actor.');
}
const get = createApi({ key });
const skip = new Set((input.skipIds ?? []).map((s) => String(s).trim()).filter(Boolean));

const ids = [];
const bad = [];
for (const text of input.videoUrls ?? []) {
  const id = videoIdOf(text);
  if (id) ids.push(id);
  else bad.push({ videoId: null, url: String(text), error: 'not a YouTube video link' });
}
if (input.channelUrl) {
  const ref = channelRefOf(input.channelUrl);
  if (!ref) {
    bad.push({ videoId: null, url: input.channelUrl, error: 'not a YouTube channel link' });
  } else {
    try {
      const channel = await uploadsOf(get, ref);
      const max = Math.min(Math.max(Number(input.maxVideos ?? 50), 1), 5000);
      // Skipped videos do not count towards the limit.
      const listed = await playlistVideoIds(get, channel.uploads, max + skip.size);
      ids.push(...listed.filter((id) => !skip.has(id)).slice(0, max));
      log.info(`${channel.title}: ${listed.length} uploads listed.`);
    } catch (error) {
      bad.push({ videoId: null, url: input.channelUrl, error: error.message });
    }
  }
}
if (!ids.length && !bad.length) await Actor.fail('Add video links or a channel.');

const wanted = [...new Set(ids)].filter((id) => !skip.has(id));
const rows = [...bad];
try {
  rows.push(...(await videoRows(get, wanted)));
} catch (error) {
  rows.push(...wanted.map((id) => ({ videoId: id, url: `https://www.youtube.com/watch?v=${id}`, error: error.message })));
}
await Actor.pushData(rows);
const failed = rows.filter((r) => r.error).length;
await Actor.setStatusMessage(`Saved ${rows.length - failed} videos${failed ? `; ${failed} with an error` : ''}.`, { isStatusMessageTerminal: true });
if (rows.length && failed === rows.length) await Actor.fail(rows[0].error);
await Actor.exit();
