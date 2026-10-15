// Apple App Store: the public iTunes Search and Lookup APIs (itunes.apple.com/search and /lookup)
// and the top chart feeds (itunes.apple.com/<country>/rss/...). No login, no app pages: a chart
// lists up to 100 apps, which are then looked up 100 at a time for their full data.

export const BASE = 'https://itunes.apple.com';
// Apps per lookup request, and the most a search returns.
export const LOOKUP_BATCH = 100;
export const SEARCH_LIMIT = 200;
export const MAX_CHART_DEPTH = 100;

// Chart: the Actor's option, Apple's feed and its name.
export const CHARTS = {
  top_free: ['topfreeapplications', 'Top free iPhone apps'],
  top_paid: ['toppaidapplications', 'Top paid iPhone apps'],
  top_grossing: ['topgrossingapplications', 'Top grossing iPhone apps'],
  top_free_ipad: ['topfreeipadapplications', 'Top free iPad apps'],
  top_paid_ipad: ['toppaidipadapplications', 'Top paid iPad apps'],
  top_grossing_ipad: ['topgrossingipadapplications', 'Top grossing iPad apps'],
  new: ['newapplications', 'New apps'],
  new_free: ['newfreeapplications', 'New free apps'],
  new_paid: ['newpaidapplications', 'New paid apps'],
};

// App Store categories (genre ids) that have charts; 7001–7019 are kinds of games.
export const GENRES = {
  ALL: 'All apps', 6000: 'Business', 6001: 'Weather', 6002: 'Utilities', 6003: 'Travel', 6004: 'Sports',
  6005: 'Social Networking', 6006: 'Reference', 6007: 'Productivity', 6008: 'Photo & Video', 6009: 'News',
  6010: 'Navigation', 6011: 'Music', 6012: 'Lifestyle', 6013: 'Health & Fitness', 6014: 'Games', 6015: 'Finance',
  6016: 'Entertainment', 6017: 'Education', 6018: 'Books', 6020: 'Medical', 6021: 'Magazines & Newspapers',
  6023: 'Food & Drink', 6024: 'Shopping', 6026: 'Developer Tools', 6027: 'Graphics & Design',
  7001: 'Games: Action', 7002: 'Games: Adventure', 7003: 'Games: Casual', 7004: 'Games: Board', 7005: 'Games: Card',
  7006: 'Games: Casino', 7009: 'Games: Family', 7011: 'Games: Music', 7012: 'Games: Puzzle', 7013: 'Games: Racing',
  7014: 'Games: Role Playing', 7015: 'Games: Simulation', 7016: 'Games: Sports', 7017: 'Games: Strategy',
  7018: 'Games: Trivia', 7019: 'Games: Word',
};

const store = (country) => String(country).toLowerCase();

export const chartUrl = (chart, genre, country, depth) =>
  `${BASE}/${store(country)}/rss/${CHARTS[chart][0]}/limit=${Math.min(depth, MAX_CHART_DEPTH)}${genre && genre !== 'ALL' ? `/genre=${genre}` : ''}/json`;

export const searchUrl = (term, country, limit = SEARCH_LIMIT) =>
  `${BASE}/search?${new URLSearchParams({ term, country: store(country), entity: 'software', limit: String(Math.min(limit, SEARCH_LIMIT)) })}`;

// Apps by id (or by bundle id), up to LOOKUP_BATCH in one request.
export function lookupUrl(ids, country) {
  const numeric = ids.every((id) => /^\d+$/.test(id));
  const params = new URLSearchParams({ [numeric ? 'id' : 'bundleId']: ids.join(','), country: store(country), entity: 'software' });
  return `${BASE}/lookup?${params}`;
}

export const developerUrl = (developerId, country) =>
  `${BASE}/lookup?${new URLSearchParams({ id: developerId, country: store(country), entity: 'software', limit: String(SEARCH_LIMIT) })}`;

// An app as the user gives it: 389801252, id389801252, a bundle id such as com.spotify.client, or
// an App Store link (apps.apple.com/us/app/instagram/id389801252).
export function parseAppId(value) {
  const text = String(value ?? '').trim();
  const fromLink = /apps\.apple\.com\/.*?\/id(\d+)/i.exec(text) ?? /itunes\.apple\.com\/.*?\/id(\d+)/i.exec(text);
  if (fromLink) return fromLink[1];
  const id = /^(?:id)?(\d{5,})$/i.exec(text);
  if (id) return id[1];
  if (/^[a-z][\w-]*(\.[\w-]+)+$/i.test(text) && !/^https?:/i.test(text)) return text;
  throw new Error('use an App Store link, a numeric app id such as 389801252, or a bundle id such as com.spotify.client.');
}

// A developer as the user gives it: a numeric id or a developer link
// (apps.apple.com/us/developer/meta-platforms-inc/id284882218).
export function parseDeveloperId(value) {
  const text = String(value ?? '').trim();
  const fromLink = /apps\.apple\.com\/.*?\/developer\/.*?\/?id(\d+)/i.exec(text);
  if (fromLink) return fromLink[1];
  const id = /^(?:id)?(\d{5,})$/i.exec(text);
  if (id) return id[1];
  throw new Error('use a developer link such as https://apps.apple.com/us/developer/meta-platforms-inc/id284882218 or its numeric id.');
}

// App ids of a chart feed, in chart order.
export function parseChart(feed) {
  const entries = [].concat(feed?.feed?.entry ?? []);
  return entries.map((entry) => entry?.id?.attributes?.['im:id']).filter(Boolean).map(String);
}

const clean = (url) => (url ? String(url).replace(/[?&]uo=\d+$/, '') : null);
const num = (value) => (value === undefined || value === null || value === '' || Number.isNaN(Number(value)) ? null : Number(value));
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

// One app from the Search or Lookup API, in the output format.
export function toApp(raw) {
  const price = num(raw.price);
  return {
    appId: String(raw.trackId),
    bundleId: text(raw.bundleId),
    url: clean(raw.trackViewUrl),
    title: text(raw.trackName),
    developer: text(raw.artistName),
    developerId: raw.artistId ? String(raw.artistId) : null,
    developerUrl: clean(raw.artistViewUrl),
    seller: text(raw.sellerName),
    developerWebsite: text(raw.sellerUrl),
    genre: text(raw.primaryGenreName),
    genreId: raw.primaryGenreId ? String(raw.primaryGenreId) : null,
    categories: (raw.genres ?? []).map(text).filter(Boolean),
    score: num(raw.averageUserRating),
    ratingsCount: num(raw.userRatingCount),
    scoreCurrentVersion: num(raw.averageUserRatingForCurrentVersion),
    ratingsCountCurrentVersion: num(raw.userRatingCountForCurrentVersion),
    free: price === null ? null : price === 0,
    price,
    currency: text(raw.currency),
    priceText: text(raw.formattedPrice),
    contentRating: text(raw.trackContentRating ?? raw.contentAdvisoryRating),
    advisories: (raw.advisories ?? []).map(text).filter(Boolean),
    releasedAt: text(raw.releaseDate),
    updatedAt: text(raw.currentVersionReleaseDate),
    version: text(raw.version),
    recentChanges: text(raw.releaseNotes),
    minIosVersion: text(raw.minimumOsVersion),
    sizeBytes: num(raw.fileSizeBytes),
    languages: raw.languageCodesISO2A ?? [],
    iPadSupport: (raw.supportedDevices ?? []).some((device) => /^iPad/i.test(device)),
    gameCenter: raw.isGameCenterEnabled === true,
    description: text(raw.description),
    icon: text(raw.artworkUrl512 ?? raw.artworkUrl100),
    screenshots: raw.screenshotUrls ?? [],
    ipadScreenshots: raw.ipadScreenshotUrls ?? [],
  };
}

// Apps of a Search or Lookup answer, without the developer record a developer lookup starts with.
export const appsOf = (answer) => (answer?.results ?? []).filter((item) => item?.wrapperType === 'software' && item.trackId).map(toApp);
