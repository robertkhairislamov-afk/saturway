// The same Android app in other stores, found by its package name (com.spotify.music is the same
// app everywhere): Samsung Galaxy Store and Xiaomi GetApps app pages, F-Droid's public API and
// package page. Search pages are not used (Galaxy Store's robots.txt closes /search).

const decode = (s) => String(s ?? '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const textOf = (html) => decode(String(html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() || null;
const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && String(v ?? '').match(/\d/) ? n : null;
};
// "11M+" → 11000000, "500K+" → 500000
export function countOf(text) {
  const m = /([\d.,]+)\s*([KMB])?/i.exec(String(text ?? ''));
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ''));
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[String(m[2] ?? '').toUpperCase()] ?? 1;
  return Number.isFinite(base) ? Math.round(base * mult) : null;
}

export const PACKAGE = /^[a-zA-Z][\w]*(\.[a-zA-Z0-9_]+)+$/;

// A package name from a Galaxy Store, GetApps or F-Droid link, or null.
export function packageFromLink(value) {
  const t = String(value ?? '').trim();
  let url;
  try { url = new URL(t); } catch { return null; }
  const host = url.hostname;
  let pkg = null;
  if (/galaxystore\.samsung\.com$/.test(host)) pkg = url.pathname.match(/\/detail\/([^/?#]+)/)?.[1];
  else if (/app\.mi\.com$/.test(host)) pkg = url.searchParams.get('id');
  else if (/f-droid\.org$/.test(host)) pkg = url.pathname.match(/\/packages\/([^/?#]+)/)?.[1];
  return pkg && PACKAGE.test(pkg) ? pkg : null;
}

export const samsungUrl = (pkg) => `https://galaxystore.samsung.com/detail/${encodeURIComponent(pkg)}`;
export const xiaomiUrl = (pkg) => `https://global.app.mi.com/details?id=${encodeURIComponent(pkg)}`;
export const fdroidApiUrl = (pkg) => `https://f-droid.org/api/v1/packages/${encodeURIComponent(pkg)}`;
export const fdroidPageUrl = (pkg) => `https://f-droid.org/en/packages/${encodeURIComponent(pkg)}/`;

// Galaxy Store app page: its schema.org SoftwareApplication block.
export function parseSamsung(html, pkg) {
  let app = null;
  for (const m of String(html).matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const d = JSON.parse(m[1]);
      if (d?.['@type'] === 'SoftwareApplication') app = d;
    } catch { /* another block */ }
  }
  if (!app?.name) return null;
  const price = num(app.offers?.price);
  return {
    store: 'Samsung Galaxy Store',
    appId: pkg,
    url: samsungUrl(pkg),
    title: app.name,
    developer: app.author?.name ? String(app.author.name).replace(/^©\s*[\d–-]*\s*/, '').trim() || null : null,
    genre: app.applicationCategory ?? null,
    score: num(app.aggregateRating?.ratingValue),
    ratingsCount: num(app.aggregateRating?.ratingCount),
    free: price === null ? null : price === 0,
    price,
    currency: app.offers?.priceCurrency && app.offers.priceCurrency !== '$' ? app.offers.priceCurrency : (app.offers?.priceCurrency === '$' ? 'USD' : null),
    contentRating: app.contentRating ?? null,
    description: app.description ?? null,
    icon: app.image ?? null,
  };
}

// GetApps app page: title, developer and the labelled facts (Ratings, Downloads, Version, ...).
export function parseXiaomi(html, pkg) {
  const page = String(html);
  const title = textOf(page.match(/class="app-info__title[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
  if (!title) return null;
  const label = (name) => decode(page.match(new RegExp(`aria-label="${name}:([^"]*)"`))?.[1] ?? '').trim() || null;
  return {
    store: 'Xiaomi GetApps',
    appId: pkg,
    url: xiaomiUrl(pkg),
    title,
    developer: textOf(page.match(/class="app-info__developer[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1]),
    genre: label('Category'),
    score: num(label('Ratings')),
    installs: label('Downloads'),
    minInstalls: countOf(label('Downloads')),
    version: label('Version'),
    sizeText: label('Size'),
    summary: textOf(page.match(/class="app-info__brief[^"]*"[^>]*>([\s\S]*?)<\/p>/)?.[1]),
  };
}

// F-Droid package page: name, summary, licence and the newest version's date.
export function parseFdroid(html, api, pkg) {
  const page = String(html);
  const title = textOf(page.match(/class="[^"]*package-name[^"]*"[^>]*>([\s\S]*?)<\//)?.[1]);
  if (!title) return null;
  const added = [...page.matchAll(/Added on ([A-Z][a-z]{2} \d{1,2}, \d{4})/g)].map((m) => m[1]);
  const date = (s) => { const d = s ? new Date(`${s} UTC`) : null; return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null; };
  const suggested = api?.packages?.find((p) => p.versionCode === api.suggestedVersionCode) ?? api?.packages?.[0];
  return {
    store: 'F-Droid',
    appId: pkg,
    url: fdroidPageUrl(pkg),
    title,
    summary: textOf(page.match(/class="[^"]*package-summary[^"]*"[^>]*>([\s\S]*?)<\//)?.[1]),
    license: textOf(page.match(/(?:License|Licence)[\s\S]{0,80}?<a[^>]*>([\s\S]*?)<\/a>/)?.[1]),
    free: true,
    price: 0,
    version: suggested?.versionName ?? null,
    updatedAt: date(added[0]),
    releasedAt: date(added.at(-1)),
  };
}
