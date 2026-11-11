// Public Telegram pages: the channel card (t.me/<name>) and the web preview of a channel's posts
// (t.me/s/<name>, 20 posts a page, older pages with ?before=<post id>). No login, no API key.

const NAME = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;
// Paths of t.me that are not channel names.
const RESERVED = new Set(['joinchat', 'addstickers', 'addemoji', 'share', 'proxy', 'socks', 'iv', 'login', 'contact', 'addlist', 'boost', 'setlanguage', 'confirmphone', 'invoice', 'giftcode']);

// "@name", "name", "https://t.me/name", "t.me/s/name", "https://t.me/name/123" → "name".
export function parseChannelName(value) {
  let text = String(value ?? '').trim();
  const link = /^(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/)?([^/?#\s]+)/i.exec(text);
  if (link) text = link[1];
  text = text.replace(/^@/, '');
  if (text.startsWith('+')) throw new Error('Invite links of private channels cannot be read; use the public @name.');
  if (!NAME.test(text) || RESERVED.has(text.toLowerCase())) throw new Error(`"${value}" is not a public channel name or t.me link.`);
  return text;
}

export const channelUrl = (name) => `https://t.me/${name}`;
export const previewUrl = (name, before) => `https://t.me/s/${name}${before ? `?before=${before}` : ''}`;

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };
export function htmlToText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

// "6.83M" → 6830000, "12.3K" → 12300, "845" → 845.
export function parseCount(text) {
  const m = /([\d.,]+)\s*([KMB])?/i.exec(String(text ?? '').replace(/\s/g, ''));
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * ({ K: 1e3, M: 1e6, B: 1e9 }[m[2]?.toUpperCase()] ?? 1));
}

const first = (re, html) => re.exec(html)?.[1] ?? null;

// The channel card: what kind of account the name belongs to, its title, description and the
// exact number of subscribers (channels) or members (groups). Users and bots are "other".
export function parseInfoPage(html) {
  const extra = htmlToText(first(/class="tgme_page_extra">([\s\S]*?)<\/div>/, html) ?? '');
  const titleHtml = first(/class="tgme_page_title"[^>]*>([\s\S]*?)<\/div>/, html) ?? '';
  const title = htmlToText(titleHtml).replace(/\s*✔\s*$/, '') || null;
  const verified = /verified-icon/.test(titleHtml);
  const description = htmlToText(first(/class="tgme_page_description[^"]*"[^>]*>([\s\S]*?)<\/div>/, html) ?? '') || null;
  const number = (word) => {
    const m = new RegExp(`([\\d\\s ,.]+[KMB]?)\\s*${word}`, 'i').exec(extra);
    if (!m) return null;
    const raw = m[1].trim();
    return /[KMB]$/i.test(raw) ? parseCount(raw) : Number(raw.replace(/[^\d]/g, '')) || 0;
  };
  const subscribers = number('subscribers?');
  if (subscribers != null) return { kind: 'channel', title, description, verified, subscribers, members: null, online: null };
  const members = number('members?');
  if (members != null) return { kind: 'group', title, description, verified, subscribers: null, members, online: number('online') };
  return { kind: 'other', title, description, verified, subscribers: null, members: null, online: null };
}

// Markers of paid posts: Russian ad labelling (erid, "Реклама. ООО …, ИНН …"), hashtags and
// common phrases in Russian and English.
// (\b does not work with Cyrillic letters, so word edges are checked with \p{L}.)
const AD_MARKERS = [
  /\berid\s*[:=]?\s*[\w-]{5,}/i,
  /#(?:реклама|промо|партн[её]р|ad|ads|advert|sponsored|promo|partner)(?![\p{L}\d_])/iu,
  /(?<![\p{L}])реклама\s*[.,:]\s*(?:ооо|ип|ао|пао|зао)(?![\p{L}])/iu,
  /на правах рекламы/iu,
  /(?<![\p{L}])инн\s*:?\s*\d{10,12}(?!\d)/iu,
  /\b(?:sponsored post|paid partnership|advertisement)\b/i,
];
// Links with an erid parameter are labelled ads too (Russian ad law).
export const isAdPost = (text, html = '') => AD_MARKERS.some((re) => re.test(text ?? '')) || /[?&](?:amp;)*erid=/i.test(html);

// Channel names a post links to or mentions, and the channel it was forwarded from.
function mentionsOf(html, text, self) {
  const names = new Set();
  for (const [, name] of html.matchAll(/href="https?:\/\/t\.me\/(?:s\/)?([A-Za-z][A-Za-z0-9_]{3,31})(?:[/?"])/g)) names.add(name);
  for (const [, name] of String(text).matchAll(/(?:^|[^\w@/.])@([A-Za-z][A-Za-z0-9_]{3,31})\b/g)) names.add(name);
  return [...names].filter((name) => name.toLowerCase() !== self.toLowerCase() && !RESERVED.has(name.toLowerCase()) && !/bot$/i.test(name));
}

function mediaOf(html) {
  const media = [];
  if (/tgme_widget_message_photo_wrap/.test(html)) media.push('photo');
  if (/tgme_widget_message_video_player|tgme_widget_message_roundvideo/.test(html)) media.push('video');
  if (/tgme_widget_message_document_wrap/.test(html)) media.push('document');
  if (/tgme_widget_message_poll/.test(html)) media.push('poll');
  if (/tgme_widget_message_voice/.test(html)) media.push('voice');
  return media;
}

export function parsePost(segment, self) {
  const id = first(/data-post="[^"/]+\/(\d+)"/, segment);
  if (!id) return null;
  const views = parseCount(first(/class="tgme_widget_message_views">([^<]*)</, segment));
  const date = first(/<time datetime="([^"]+)"/, segment);
  const textHtml = first(/class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/, segment) ?? '';
  const text = htmlToText(textHtml);
  let reactions = 0;
  for (const [, count] of segment.matchAll(/class="tgme_reaction[^"]*">[\s\S]*?<\/(?:tg-emoji|i|b)>(?:<\/i>)?\s*([\d.,]+[KMB]?)\s*<\/span>/g)) reactions += parseCount(count) ?? 0;
  const fwd = /class="tgme_widget_message_forwarded_from_name"(?:\s+href="https?:\/\/t\.me\/([A-Za-z0-9_]+)[^"]*")?[^>]*>([\s\S]*?)<\/(?:a|span)>/.exec(segment);
  return {
    postId: Number(id),
    url: `https://t.me/${self}/${id}`,
    date: date ? new Date(date).toISOString() : null,
    views,
    reactions,
    forwardedFrom: fwd?.[1] ?? null,
    forwardedFromName: fwd ? htmlToText(fwd[2]) || null : null,
    isAd: isAdPost(text, textHtml),
    media: mediaOf(segment),
    text,
    mentions: mentionsOf(textHtml, text, self),
  };
}

// One page of the web preview: the channel header and its posts, oldest first, plus the id to
// ask for the page before it (null on the first post of the channel).
export function parsePreview(html, self) {
  const header = {
    title: htmlToText(first(/class="tgme_channel_info_header_title"[^>]*>([\s\S]*?)<\/div>/, html) ?? '') || null,
    description: htmlToText(first(/class="tgme_channel_info_description"[^>]*>([\s\S]*?)<\/div>/, html) ?? '') || null,
    verified: /class="tgme_channel_info_header_title[^"]*"[^>]*>[\s\S]{0,400}?verified-icon/.test(html),
    counters: {},
  };
  for (const [, value, type] of html.matchAll(/class="counter_value">([^<]*)<\/span>\s*<span class="counter_type">([^<]*)</g)) header.counters[type.trim()] = parseCount(value);
  const parts = html.split(/<div class="tgme_widget_message_wrap/).slice(1);
  const posts = parts.map((part) => parsePost(part, self)).filter((post) => post && post.views != null);
  const before = Number(first(/<link rel="prev" href="\/s\/[^?"]+\?before=(\d+)"/, html)) || null;
  return { header, posts, before };
}

// ---- Analytics ------------------------------------------------------------------------------

const DAY = 86400000;
const round = (value, digits = 1) => (value == null || !Number.isFinite(value) ? null : Math.round(value * 10 ** digits) / 10 ** digits);
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);

// The main script of the channel's texts.
export function scriptOf(texts) {
  const counts = { Cyrillic: 0, Latin: 0, Thai: 0, Arabic: 0, CJK: 0, Hebrew: 0, Devanagari: 0 };
  const tests = { Cyrillic: /\p{Script=Cyrillic}/u, Latin: /\p{Script=Latin}/u, Thai: /\p{Script=Thai}/u, Arabic: /\p{Script=Arabic}/u, CJK: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u, Hebrew: /\p{Script=Hebrew}/u, Devanagari: /\p{Script=Devanagari}/u };
  for (const text of texts) for (const ch of text) for (const [name, re] of Object.entries(tests)) if (re.test(ch)) { counts[name]++; break; }
  const [best, n] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return n ? best : null;
}

// Contacts the channel publishes in its description (usually for advertising).
export function contactsOf(description) {
  const text = String(description ?? '');
  const usernames = [...new Set([...text.matchAll(/(?:^|[^\w@])@([A-Za-z][A-Za-z0-9_]{3,31})\b/g)].map((m) => `@${m[1]}`))];
  const links = [...new Set([...text.matchAll(/(?:https?:\/\/)?(?:t\.me|telegram\.me)\/[^\s,;)]+/gi)].map((m) => m[0]))];
  const emails = [...new Set([...text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map((m) => m[0].replace(/\.$/, '')))];
  const websites = [...new Set([...text.matchAll(/https?:\/\/(?!t\.me|telegram\.me)[^\s,;)]+/gi)].map((m) => m[0]))];
  return { usernames, links, emails, websites };
}

// Reach, engagement, activity and advertising of a channel from its recent posts. Views of posts
// younger than `minAgeHours` are still growing, so averages use older posts when there are any.
export function analyze({ subscribers, posts, self, now = Date.now(), cpmUsd = 5, minAgeHours = 48 }) {
  const dated = posts.filter((post) => post.date).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!dated.length) return null;
  const ageOf = (post) => now - Date.parse(post.date);
  // Views keep growing for weeks, so the statistics use recent settled posts: those 2 to 30 days
  // old when there are at least 5, otherwise the newest 20 settled posts.
  const mature = dated.filter((post) => ageOf(post) >= minAgeHours * 3600000);
  const recent = mature.filter((post) => ageOf(post) <= 30 * DAY);
  const base = recent.length >= 5 ? recent : mature.length ? mature.slice(-20) : dated;
  const views = base.map((post) => post.views);
  const avgViews = mean(views);
  const medianViews = median(views);
  const firstAt = Date.parse(dated[0].date);
  const lastAt = Date.parse(dated.at(-1).date);
  const spanDays = Math.max((lastAt - firstAt) / DAY, 1 / 24);
  const ads = dated.filter((post) => post.isAd);
  const totalViews = base.reduce((sum, post) => sum + post.views, 0);
  const totalReactions = base.reduce((sum, post) => sum + (post.reactions ?? 0), 0);
  const half = Math.floor(base.length / 2);
  const older = median(base.slice(0, half).map((post) => post.views));
  const newer = median(base.slice(half).map((post) => post.views));

  const mentioned = new Map();
  for (const post of dated) {
    const names = new Set(post.mentions);
    if (post.forwardedFrom && post.forwardedFrom.toLowerCase() !== (self ?? '').toLowerCase()) names.add(post.forwardedFrom);
    for (const name of names) mentioned.set(name, (mentioned.get(name) ?? 0) + 1);
  }

  return {
    postsAnalyzed: dated.length,
    firstPostAt: new Date(firstAt).toISOString(),
    lastPostAt: new Date(lastAt).toISOString(),
    daysSinceLastPost: round((now - lastAt) / DAY, 1),
    postsPerDay: round(dated.length > 1 ? (dated.length - 1) / spanDays : null, 2),
    avgViews: avgViews == null ? null : Math.round(avgViews),
    medianViews: medianViews == null ? null : Math.round(medianViews),
    reachPercent: subscribers ? round((avgViews / subscribers) * 100, 1) : null,
    reactionsPerPost: round(totalReactions / base.length, 1),
    engagementPercent: totalViews ? round((totalReactions / totalViews) * 100, 2) : null,
    viewsTrendPercent: older && newer && half >= 3 ? round(((newer - older) / older) * 100, 0) : null,
    forwardedPercent: round((dated.filter((post) => post.forwardedFrom || post.forwardedFromName).length / dated.length) * 100, 0),
    statsBasedOnPosts: base.length,
    adPosts: ads.length,
    adPercent: round((ads.length / dated.length) * 100, 0),
    adPostsPerWeek: round((ads.length / spanDays) * 7, 1),
    lastAdPostAt: ads.length ? ads.at(-1).date : null,
    active: now - lastAt <= 30 * DAY,
    // No price for channels silent for a month: their views come from old posts.
    estimatedPostPriceUsd: avgViews == null || now - lastAt > 30 * DAY ? null : Math.round((avgViews / 1000) * cpmUsd),
    script: scriptOf(dated.map((post) => post.text)),
    topPosts: [...base].sort((a, b) => b.views - a.views).slice(0, 3).map((post) => ({ url: post.url, date: post.date, views: post.views, text: post.text.slice(0, 160) })),
    linkedChannels: [...mentioned].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([username, mentions]) => ({ username, mentions })),
  };
}
