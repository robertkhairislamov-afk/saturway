// One lead per app publisher: the apps found for a developer are grouped, and one app page gives
// the developer's public contact: the support email and website every listing shows, plus the
// trader details (legal name, address, phone) Google shows for companies selling in the EU.
//
// Leads are for business outreach, so a developer is classed: "company" when the developer or
// legal name has a company form (Inc, GmbH, Ltd...), "business" when the support email is on the
// developer's own domain, and "individual" otherwise. An individual's email, address and phone
// are personal data and are never saved.

// A company form at the end of a name ("Spotify AB", "Samsung Electronics Co., Ltd.", "Zoho
// Corporation"). Two-letter forms count only in capitals ("Maria Sa" is a person, "Nexus SA" a
// company), and only at the end, as they also occur inside names. Some countries put the form first.
const FORM_AT_END = /[\s,.](inc|llc|l\.l\.c|ltd|limited|corp|corporation|company|co\.|gmbh|mbh|aps|oyj|sas|sarl|srl|s\.r\.l|spa|s\.p\.a|b\.v|plc|pty|pte|k\.k|kft|sro|s\.r\.o|a\.s|s\.a|s\.l|a\/s|llp|ltda|jsc|pvt|ooo|sp\. z o\.o)\.?\s*$/i;
const SHORT_FORM_AT_END = /[\s,.](AB|AG|AS|SA|BV|NV|KK|GK|OU|OÜ|UG|LP|SL|OY|CO)\.?\s*$/;
const FORM_FIRST = /^(ooo|ооо|zao|зао|oao|pao|пао|too|тоо|tov|тов|pt|cv)\s/i;
// Words only businesses use in their name, anywhere in it.
const BUSINESS_WORDS = /\b(inc|llc|ltd|gmbh|corporation|company|limited|studios?|games|technolog(y|ies)|labs|software|solutions|group|holdings|interactive|entertainment)\b/i;

// Mailbox providers anyone can sign up to: an address there says nothing about a business.
const FREE_MAIL = new Set(`gmail.com googlemail.com yahoo.com yahoo.co.uk yahoo.co.jp yahoo.fr yahoo.de yahoo.in ymail.com rocketmail.com hotmail.com hotmail.co.uk hotmail.fr hotmail.de hotmail.it outlook.com outlook.fr outlook.de live.com live.fr live.de live.it msn.com icloud.com me.com mac.com aol.com proton.me protonmail.com pm.me tutanota.com tuta.io gmx.com gmx.de gmx.net gmx.at web.de t-online.de freenet.de mail.com email.com zoho.com zohomail.com yandex.com yandex.ru ya.ru mail.ru bk.ru list.ru inbox.ru rambler.ru ukr.net qq.com foxmail.com 163.com 126.com yeah.net sina.com sina.cn sohu.com aliyun.com naver.com hanmail.net daum.net kakao.com libero.it virgilio.it tiscali.it orange.fr wanadoo.fr free.fr laposte.net sfr.fr seznam.cz wp.pl o2.pl onet.pl interia.pl rediffmail.com inbox.lv abv.bg hushmail.com fastmail.com`.split(/\s+/));

const lower = (value) => (value == null ? null : String(value).trim().toLowerCase() || null);
const stripMarks = (text) => String(text ?? '').normalize('NFKD').replace(/\p{M}+/gu, '');

export const hasCompanyForm = (name) => {
  const text = stripMarks(name).trim();
  return Boolean(text) && (FORM_AT_END.test(` ${text}`) || SHORT_FORM_AT_END.test(` ${text}`) || FORM_FIRST.test(text) || BUSINESS_WORDS.test(text));
};

export function emailDomain(email) {
  const at = lower(email)?.lastIndexOf('@') ?? -1;
  return at > 0 ? lower(email).slice(at + 1) : null;
}

export function websiteDomain(url) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

// "mail.example.co.uk" and "example.co.uk" share "example.co.uk"; good enough to match a support
// address with the website of the same business.
const SECOND_LEVEL = /^(co|com|net|org|gov|edu|ac|or|ne|go)\.[a-z]{2}$/;
export function baseDomain(domain) {
  if (!domain) return null;
  const parts = domain.split('.');
  const keep = parts.length >= 3 && SECOND_LEVEL.test(parts.slice(-2).join('.')) ? 3 : 2;
  return parts.slice(-keep).join('.');
}

// Hosts where many unrelated developers have pages: a page there is not the developer's own site.
const SHARED_HOSTS = /(^|\.)(google\.com|play\.google\.com|sites\.google\.com|github\.io|github\.com|facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|blogspot\.com|wordpress\.com|wixsite\.com|weebly\.com|notion\.site|carrd\.co|linktr\.ee|tumblr\.com|medium\.com|t\.me|discord\.gg|vk\.com)$/;

export function developerType({ developer, legalName, email, website }) {
  if (hasCompanyForm(legalName) || hasCompanyForm(developer)) return 'company';
  const mail = emailDomain(email);
  if (mail && !FREE_MAIL.has(mail)) {
    const site = websiteDomain(website);
    if (site && !SHARED_HOSTS.test(site) && baseDomain(site) === baseDomain(mail)) return 'business';
  }
  return 'individual';
}

// Apps grouped by developer, in the order they were found; one developer's apps from several
// sources and countries are one group.
export const developerKey = (name) => lower(stripMarks(name))?.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() || null;

export function groupByDeveloper(found) {
  const groups = new Map();
  for (const { app, source, country } of found) {
    const key = developerKey(app.developer);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { key, developer: app.developer, apps: new Map(), sources: new Set(), countries: new Set() });
    const group = groups.get(key);
    if (!group.apps.has(app.appId)) group.apps.set(app.appId, app);
    if (source) group.sources.add(source);
    if (country) group.countries.add(country);
  }
  return [...groups.values()];
}

// "100,000,000+" from a search list.
const installsOf = (text) => {
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
};

// The app to read the developer's contacts from: the most installed app found, else the first.
export function leadApp(group) {
  const apps = [...group.apps.values()];
  return apps.reduce((best, app) => ((installsOf(app.installs) ?? -1) > (installsOf(best.installs) ?? -1) ? app : best), apps[0]);
}

const DAY_MS = 24 * 60 * 60 * 1000;

// The lead record. `page` is the parsed app page of the lead app.
export function buildLead(group, page, { now = new Date() } = {}) {
  const legalName = page.developerLegalName ?? null;
  const type = developerType({ developer: page.developer ?? group.developer, legalName, email: page.developerEmail, website: page.developerWebsite });
  const personal = type === 'individual';
  const email = personal ? null : lower(page.developerEmail);
  const website = page.developerWebsite ?? null;
  const apps = [...group.apps.values()];
  const genres = [...new Set([page.genre, ...apps.map((app) => app.genre)].filter(Boolean))];
  return {
    developerName: page.developer ?? group.developer,
    developerId: page.developerId ?? null,
    developerUrl: page.developerUrl ?? null,
    developerType: type,
    companyName: legalName ?? (personal ? null : page.developer ?? group.developer),
    email,
    emailDomain: emailDomain(email),
    website,
    websiteDomain: websiteDomain(website),
    legalName,
    legalEmail: personal ? null : lower(page.developerLegalEmail),
    address: personal ? null : page.developerAddress ?? null,
    phone: personal ? null : page.developerPhone ?? null,
    privacyPolicyUrl: page.privacyPolicyUrl ?? null,
    topAppId: page.appId ?? null,
    topAppTitle: page.title ?? null,
    topAppUrl: page.appId ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(page.appId)}` : null,
    topAppInstalls: page.installs ?? null,
    topAppMinInstalls: page.minInstalls ?? null,
    topAppScore: page.score ?? null,
    topAppRatings: page.ratingsCount ?? null,
    topAppGenre: page.genre ?? null,
    topAppFree: page.free ?? null,
    topAppContainsAds: page.containsAds ?? null,
    topAppInAppPurchases: page.offersInAppPurchases ?? null,
    topAppUpdatedAt: page.updatedAt ?? null,
    daysSinceUpdate: page.updatedAt ? Math.max(0, Math.floor((now - Date.parse(page.updatedAt)) / DAY_MS)) : null,
    appsFound: apps.length,
    apps: apps.slice(0, 10).map((app) => ({ appId: app.appId, title: app.title ?? null, installs: app.installs ?? null, score: app.score ?? null, genre: app.genre ?? null })),
    genres,
    // The first sources that found the developer (a developer can be similar to dozens of apps).
    foundBy: [...group.sources].slice(0, 5),
    countries: [...group.countries],
  };
}

// The filters of the input, applied to a built lead.
export function passes(lead, { companiesOnly = true, requireEmail = true, requireWebsite = false, minInstalls = 0, maxInstalls = 0, updatedWithinDays = 0 } = {}) {
  if (companiesOnly && lead.developerType === 'individual') return 'individual developer';
  if (requireEmail && !lead.email) return 'no email';
  if (requireWebsite && !lead.websiteDomain) return 'no website';
  if (minInstalls > 0 && !((lead.topAppMinInstalls ?? 0) >= minInstalls)) return 'too few installs';
  if (maxInstalls > 0 && (lead.topAppMinInstalls ?? 0) > maxInstalls) return 'too many installs';
  if (updatedWithinDays > 0 && !(lead.daysSinceUpdate != null && lead.daysSinceUpdate <= updatedWithinDays)) return 'not updated recently';
  return null;
}
