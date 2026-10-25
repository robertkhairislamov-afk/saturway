// The ad itself, read from the preview script the Transparency Center shows it with
// (displayads-formats.googleusercontent.com/ads/preview/content.js). The script builds the ad's
// HTML; the ad's texts sit in a data-p attribute as a JSON array, and app ads list their fields as
// key: 'value' pairs.

export const EMPTY_TEXT = {
  isDynamic: false,
  headline: null,
  description: null,
  displayUrl: null,
  businessName: null,
  adTexts: [],
  previewImageUrl: null,
  appName: null,
  appId: null,
  destinationUrl: null,
  callToAction: null,
};

// Undoes the escapes of a JavaScript string literal: \x3d, é, \/, \& and so on.
export function unescapeJs(text) {
  return text.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g, (_, e) => {
    if ((e[0] === 'x' && e.length === 3) || (e[0] === 'u' && e.length === 5)) return String.fromCharCode(parseInt(e.slice(1), 16));
    return { n: '\n', t: '\t', r: '\r' }[e] ?? e;
  });
}

const decodeEntities = (s) => s
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');

// The data-p arrays of a preview script. The attribute holds "%.@." and the array without its "[".
export function dataArrays(script) {
  const text = unescapeJs(script);
  const out = [];
  for (const m of text.matchAll(/data-p="%\.@\.([^"]*)"/g)) {
    try {
      out.push(JSON.parse(`[${decodeEntities(m[1])}`));
    } catch {
      // A shape we do not know; the other arrays and fields still count.
    }
  }
  return out;
}

const isUrl = (s) => /^(https?:)?\/\//i.test(s);
const isDomainLike = (s) => /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/?\S*$/i.test(s) && !/\s/.test(s);
// Buttons and labels of the ad's frame, not its copy.
const UI_LABEL = /^(by .{1,60}|visit site|website|directions|get directions|call|call now|learn more|shop now|open|install|sponsored|ad|ads|about this ad|more|menu)$/i;
const isText = (s) => /\p{L}/u.test(s)
  && s.length > 1
  && !/^[a-z0-9]+(_[a-z0-9]+)+$/.test(s)
  && !/^-?\d+$/.test(s)
  && !s.startsWith('/')
  && !/<[a-z][^>]*>/i.test(s)
  && !UI_LABEL.test(s)
  && !/^[A-Z]{2,15}( [A-Z]{2,15})?$/.test(s);
const absolute = (u) => (u.startsWith('//') ? `https:${u}` : u);

// Every string of a nested array or object, in order.
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value.trim());
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

const isLocation = (v) => Array.isArray(v) && v.length >= 6 && typeof v[0] === 'string' && /^[A-Z]{2}$/.test(v[v.length - 1] ?? '');

// Search text ad: [1, [headline, description, domain, businessName, [locations…], …]].
function searchAd(array) {
  const head = array[0];
  if (!Array.isArray(head) || head[0] !== 1 || !Array.isArray(head[1]) || typeof head[1][0] !== 'string') return null;
  const [headline, description, domain, business] = head[1];
  return {
    headline: headline || null,
    description: description || null,
    displayUrl: domain || null,
    businessName: business || null,
    adTexts: [headline, description].filter(Boolean),
  };
}

// Shopping ad: [imageUrl, productTitle, merchant].
function shoppingAd(array) {
  const head = array[0];
  if (!Array.isArray(head) || typeof head[0] !== 'string' || !/gstatic\.com\/shopping/.test(head[0])) return null;
  return {
    headline: head[1] || null,
    businessName: head[2] || null,
    adTexts: [head[1]].filter(Boolean),
    previewImageUrl: head[0],
  };
}

// Any other shape: texts in order, the first domain as the display URL and the first ad picture.
function genericAd(array) {
  const all = strings(array);
  const texts = [];
  let displayUrl = null;
  let image = null;
  for (const raw of all) {
    const s = decodeEntities(raw);
    if (!s) continue;
    if (isUrl(s)) {
      if (!image && /simgad|googleusercontent|gstatic\.com\/shopping/.test(s)) image = absolute(s);
    } else if (isDomainLike(s)) {
      displayUrl ??= s;
    } else if (isText(s) && !texts.includes(s)) {
      texts.push(s);
    }
  }
  if (texts.length === 0) return null;
  return {
    headline: texts[0],
    description: texts.slice(1).sort((a, b) => b.length - a.length)[0] ?? null,
    displayUrl,
    adTexts: texts,
    previewImageUrl: image,
  };
}

// key: 'value' pairs of app and video ads (appName, appId, destination_url, callToAction…).
function fields(script) {
  const text = unescapeJs(script);
  const out = {};
  for (const m of text.matchAll(/'?([A-Za-z_]{3,40})'?:\s*'((?:[^'\\]|\\.){1,500})'/g)) {
    if (!(m[1] in out)) out[m[1]] = unescapeJs(m[2]);
  }
  return out;
}

// The ad's texts and links from a preview script, or EMPTY_TEXT when it has none.
export function parsePreview(script) {
  if (!script) return { ...EMPTY_TEXT };
  const arrays = dataArrays(script);
  // Search ads with locations: drop the location lists from the generic texts.
  const cleaned = arrays.map((a) => JSON.parse(JSON.stringify(a, (k, v) => (isLocation(v) ? undefined : v))));
  let ad = null;
  for (const array of cleaned) {
    ad = searchAd(array) ?? shoppingAd(array) ?? genericAd(array);
    if (ad) break;
  }
  const f = fields(script);
  const app = {};
  if (f.appName && !/^\[.*\]$/.test(f.appName)) app.appName = f.appName;
  if (f.appId) app.appId = f.appId;
  const destination = f.destination_url || f.final_url;
  if (destination && isUrl(destination)) app.destinationUrl = absolute(destination);
  if (f.callToAction && !/^\[.*\]$/.test(f.callToAction)) app.callToAction = f.callToAction;
  if (!ad && (f.shortDescription || f.appName)) {
    ad = {
      headline: app.appName ?? null,
      description: f.shortDescription ?? null,
      displayUrl: f.visible_url ?? null,
      adTexts: [app.appName, f.shortDescription].filter(Boolean),
    };
  }
  if (!ad?.previewImageUrl && f.coverImage) app.previewImageUrl = absolute(f.coverImage);
  return withoutPlaceholders({ ...EMPTY_TEXT, ...ad, ...app });
}

// Dynamic search ads: Google writes the headline and display URL from the landing page when the
// ad is shown, and the preview holds a placeholder such as "<dynamically generated based on
// landing page content>" instead. Such fields are left empty and the ad is marked isDynamic.
const PLACEHOLDER = /^<\s*dynamically generated[^>]*>$/i;
export function withoutPlaceholders(ad) {
  const out = { ...ad };
  for (const key of ['headline', 'description', 'displayUrl', 'businessName']) {
    if (typeof out[key] === 'string' && PLACEHOLDER.test(out[key].trim())) {
      out[key] = null;
      out.isDynamic = true;
    }
  }
  out.adTexts = (out.adTexts || []).filter((text) => !PLACEHOLDER.test(String(text).trim()));
  return out;
}
