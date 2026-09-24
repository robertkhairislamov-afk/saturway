// Resolves Google News article links (news.google.com/rss/articles/...) to the
// publisher's own URL. Google signs each article page, so resolving takes two
// requests: read the signature from the article page, then ask batchexecute.

const BATCH_EXECUTE_URL = 'https://news.google.com/_/DotsSplashUi/data/batchexecute';

export function readSignature(html) {
  const signature = /data-n-a-sg="([^"]+)"/.exec(html)?.[1];
  const timestamp = /data-n-a-ts="([^"]+)"/.exec(html)?.[1];
  return signature && timestamp ? { signature, timestamp: Number(timestamp) } : null;
}

export function batchExecuteBody(articleId, { signature, timestamp }, ceid = 'US:en') {
  const request = JSON.stringify([
    'garturlreq',
    [['X', 'X', ['X', 'X'], null, null, 1, 1, ceid, null, 1, null, null, null, null, null, 0, 1], 'X', 'X', 1, [1, 1, 1], 1, 1, null, 0, 0, null, 0],
    articleId,
    timestamp,
    signature,
  ]);
  return new URLSearchParams({ 'f.req': JSON.stringify([[['Fbv4je', request, null, 'generic']]]) }).toString();
}

// The response is ")]}'" followed by a JSON array of RPC results.
export function parseBatchExecuteResponse(text) {
  const start = text.indexOf('[');
  if (start === -1) return null;
  let entries;
  try {
    entries = JSON.parse(text.slice(start));
  } catch {
    return null;
  }
  const entry = entries.find((e) => Array.isArray(e) && e[0] === 'wrb.fr' && e[1] === 'Fbv4je' && typeof e[2] === 'string');
  if (!entry) return null;
  const [kind, url] = JSON.parse(entry[2]);
  return kind === 'garturlres' && typeof url === 'string' && /^https?:\/\//.test(url) ? url : null;
}

export async function resolveArticleUrl(articleId, locale, fetchText) {
  const page = await fetchText(
    `https://news.google.com/rss/articles/${encodeURIComponent(articleId)}?oc=5&hl=${encodeURIComponent(locale.hl)}&gl=${locale.gl}&ceid=${encodeURIComponent(locale.ceid)}`,
  );
  const signature = readSignature(page);
  if (!signature) return null;
  const response = await fetchText(BATCH_EXECUTE_URL, {
    method: 'POST',
    body: batchExecuteBody(articleId, signature, locale.ceid),
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
  });
  return parseBatchExecuteResponse(response);
}
