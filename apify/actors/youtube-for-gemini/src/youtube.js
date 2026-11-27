// YouTube Data API v3 (the official API): channel uploads and video details. No YouTube pages are
// read and nothing is downloaded; Gemini later analyses each video by its URL.

export const API = 'https://www.googleapis.com/youtube/v3';

// "https://youtu.be/ID", "/watch?v=ID", "/shorts/ID", "/live/ID", "/embed/ID" or the bare ID.
export function videoIdOf(text) {
  const t = String(text ?? '').trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  let url;
  try { url = new URL(/^https?:\/\//.test(t) ? t : `https://${t}`); } catch { return null; }
  if (!/(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(url.hostname)) return null;
  const id = url.hostname.endsWith('youtu.be') ? url.pathname.slice(1, 12)
    : url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|live|embed|v)\/([\w-]{11})/)?.[1];
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

// { id: 'UC...' } or { handle: '@name' } or { username: 'name' } from a channel link or handle.
export function channelRefOf(text) {
  const t = String(text ?? '').trim();
  if (/^UC[\w-]{22}$/.test(t)) return { id: t };
  if (/^@[\w.-]+$/.test(t)) return { handle: t };
  let url;
  try { url = new URL(/^https?:\/\//.test(t) ? t : `https://${t}`); } catch { return null; }
  const [first, second] = url.pathname.split('/').filter(Boolean);
  if (first?.startsWith('@')) return { handle: decodeURIComponent(first) };
  if (first === 'channel' && second) return { id: second };
  if ((first === 'user' || first === 'c') && second) return { username: second };
  return null;
}

// "PT1H2M3S" → 3723
export function durationSec(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso ?? ''));
  if (!m) return null;
  const [, d, h, min, s] = m.map((v) => Number(v ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

export function rowOf(item) {
  const sn = item.snippet ?? {};
  const seconds = durationSec(item.contentDetails?.duration);
  return {
    videoId: item.id,
    title: sn.title ?? null,
    uploadDate: sn.publishedAt ? sn.publishedAt.slice(0, 10) : null,
    durationSec: seconds,
    viewCount: item.statistics?.viewCount != null ? Number(item.statistics.viewCount) : null,
    description: sn.description ?? null,
    url: `https://www.youtube.com/watch?v=${item.id}`,
    channelTitle: sn.channelTitle ?? null,
    liveBroadcast: sn.liveBroadcastContent && sn.liveBroadcastContent !== 'none' ? sn.liveBroadcastContent : null,
    error: null,
  };
}

export function createApi({ key, fetchImpl = fetch }) {
  return async function get(path, params) {
    const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
    const res = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(30000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`YouTube Data API ${res.status}: ${body?.error?.message ?? 'error'}`);
    return body;
  };
}

// The uploads playlist of a channel (videos, Shorts and past live streams, newest first).
export async function uploadsOf(get, ref) {
  const params = { part: 'snippet,contentDetails' };
  if (ref.id) params.id = ref.id;
  else if (ref.handle) params.forHandle = ref.handle;
  else params.forUsername = ref.username;
  const res = await get('channels', params);
  const channel = res.items?.[0];
  if (!channel) throw new Error('channel not found');
  return { channelId: channel.id, title: channel.snippet?.title ?? null, uploads: channel.contentDetails?.relatedPlaylists?.uploads };
}

export async function playlistVideoIds(get, playlistId, max) {
  const ids = [];
  let pageToken;
  do {
    const res = await get('playlistItems', { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
    for (const it of res.items ?? []) if (it.contentDetails?.videoId) ids.push(it.contentDetails.videoId);
    pageToken = res.nextPageToken;
  } while (pageToken && ids.length < max);
  return ids.slice(0, max);
}

// Details of up to 50 videos per request; videos the API does not return get an error row.
export async function videoRows(get, ids) {
  const rows = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const res = await get('videos', { part: 'snippet,contentDetails,statistics', id: batch.join(','), maxResults: '50' });
    const found = new Map((res.items ?? []).map((it) => [it.id, rowOf(it)]));
    for (const id of batch) rows.push(found.get(id) ?? { videoId: id, url: `https://www.youtube.com/watch?v=${id}`, error: 'video not found, private or removed' });
  }
  return rows;
}
