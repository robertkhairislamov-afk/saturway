// What a website's home page shows about its marketing: tracking and ad pixels, analytics, CMS,
// chat and booking tools, social profiles, contacts and SEO basics, scored with a list of gaps an
// agency can offer to fix. Everything is read from the page's HTML, like a browser would get it.

const has = (re, html) => re.test(html);
const unique = (values) => [...new Set(values.filter(Boolean))];
const idsOf = (re, html) => unique([...html.matchAll(re)].map((m) => m[1]));

// Tracking and advertising tags. Tags that Google Tag Manager loads later are not in the HTML.
export function trackingOf(html) {
  const gtag = has(/googletagmanager\.com\/gtag\/js|gtag\(\s*['"]config['"]/i, html);
  return {
    metaPixel: has(/connect\.facebook\.net[^"'\s]{0,30}fbevents\.js|fbq\(\s*['"]init['"]|facebook\.com\\?\/tr\?id=/i, html),
    metaPixelIds: idsOf(/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{8,20})/gi, html),
    googleAnalytics: gtag && has(/\bG-[A-Z0-9]{6,12}\b/, html) || has(/google-analytics\.com\/(?:analytics|ga)\.js/i, html),
    googleAnalyticsIds: gtag ? idsOf(/['"/=](G-[A-Z0-9]{6,12})\b/g, html) : [],
    universalAnalyticsIds: idsOf(/\b(UA-\d{4,10}-\d{1,4})\b/g, html),
    googleTagManager: has(/googletagmanager\.com\/gtm\.js|\bGTM-[A-Z0-9]{4,8}\b/, html),
    googleTagManagerIds: idsOf(/\b(GTM-[A-Z0-9]{4,8})\b/g, html),
    googleAds: has(/\bAW-\d{6,12}\b|googleadservices\.com\/pagead\/conversion/i, html),
    googleAdsIds: idsOf(/\b(AW-\d{6,12})\b/g, html),
    tiktokPixel: has(/analytics\.tiktok\.com|ttq\.load\(/i, html),
    linkedinInsight: has(/snap\.licdn\.com|_linkedin_partner_id/i, html),
    pinterestTag: has(/s\.pinimg\.com\/ct\/core\.js|pintrk\(\s*['"]load/i, html),
    snapPixel: has(/sc-static\.net\/scevent|snaptr\(\s*['"]init/i, html),
    xPixel: has(/static\.ads-twitter\.com\/uwt\.js|twq\(\s*['"]init/i, html),
    microsoftAds: has(/bat\.bing\.com\/bat\.js/i, html),
    lineTag: has(/d\.line-scdn\.net\/n\/line_tag|tr\.line\.me\/tag/i, html),
    yandexMetrica: has(/mc\.yandex\.(?:ru|com)\/(?:metrika|watch)|\bym\(\s*\d{5,}/i, html),
    vkPixel: has(/vk\.com\/rtrg|top-fwz1\.mail\.ru/i, html),
    hotjar: has(/static\.hotjar\.com|\bhjid\s*:/i, html),
    microsoftClarity: has(/clarity\.ms\/tag/i, html),
  };
}

// Tags configured in a Google Tag Manager container (the script the browser loads from
// googletagmanager.com/gtm.js?id=GTM-…): Google tags appear there by their ids.
export function containerTrackingOf(js) {
  const text = String(js ?? '');
  const tracking = trackingOf(text);
  const ga = idsOf(/\b(G-(?!X{6,})[A-Z0-9]{6,12})\b/g, text);
  const ads = idsOf(/\b(AW-\d{6,12})\b/g, text);
  return { ...tracking, googleAnalytics: tracking.googleAnalytics || ga.length > 0, googleAnalyticsIds: ga, googleAds: tracking.googleAds || ads.length > 0, googleAdsIds: ads, googleTagManager: true };
}

// Tags on the page and in its tag manager containers together, and which ones only the
// containers showed.
export function mergeTracking(page, containers) {
  const merged = { ...page };
  const hidden = [];
  for (const container of containers) {
    for (const [key, value] of Object.entries(container)) {
      if (Array.isArray(value)) merged[key] = unique([...(merged[key] ?? []), ...value]);
      else if (value && !merged[key]) {
        merged[key] = true;
        if (key !== 'googleTagManager' && !hidden.includes(key)) hidden.push(key);
      }
    }
  }
  return { tracking: merged, foundInTagManager: hidden };
}

const CMS = [
  ['WordPress', /\/wp-content\/|\/wp-includes\/|name="generator" content="WordPress/i],
  ['Wix', /static\.wixstatic\.com|wix-bolt|_wixCssImports|name="generator" content="Wix/i],
  ['Shopify', /cdn\.shopify\.com|Shopify\.theme/i],
  ['Squarespace', /static1\.squarespace\.com|squarespace-cdn\.com/i],
  ['Webflow', /data-wf-site=|webflow\.js|assets\.website-files\.com/i],
  ['Tilda', /tildacdn\.com|tilda\.ws|data-tilda-/i],
  ['Joomla', /name="generator" content="Joomla|\/media\/jui\//i],
  ['Drupal', /Drupal\.settings|name="generator" content="Drupal|\/sites\/default\/files\//i],
  ['Weebly', /weebly\.com|editmysite\.com/i],
  ['GoDaddy Website Builder', /img1\.wsimg\.com|godaddy-website-builder/i],
  ['Duda', /dudaone|multiscreensite|irp\.cdn-website\.com/i],
  ['Framer', /framerusercontent\.com|name="generator" content="Framer/i],
  ['Bitrix', /\/bitrix\/(?:js|templates|cache)\//i],
  ['Ghost', /name="generator" content="Ghost/i],
  ['Blogger', /blogger\.com\/static|\.blogspot\.com/i],
  ['Google Sites', /sites\.google\.com\/|gstatic\.com\/atari/i],
  ['Magento', /Magento_|mage\/cookies/i],
  ['PrestaShop', /prestashop/i],
  ['OpenCart', /catalog\/view\/theme\//i],
  ['BigCommerce', /cdn\d*\.bigcommerce\.com/i],
  ['Next.js', /__NEXT_DATA__|\/_next\/static\//],
];

export function cmsOf(html) {
  const found = CMS.filter(([, re]) => re.test(html)).map(([name]) => name);
  return { cms: found[0] ?? null, technologies: unique([...found, /woocommerce/i.test(html) ? 'WooCommerce' : null, /elementor/i.test(html) ? 'Elementor' : null]) };
}

const CHAT = [
  ['WhatsApp', /wa\.me\/|api\.whatsapp\.com\/send|web\.whatsapp\.com\/send/i],
  ['LINE', /line\.me\/(?:R\/|ti\/p|en\/)|lin\.ee\/|page\.line\.me/i],
  ['Telegram', /["'/]t\.me\/[A-Za-z0-9_+]/i],
  ['Messenger', /m\.me\/[A-Za-z0-9.]|xfbml\.customerchat/i],
  ['Viber', /viber:\/\/|invite\.viber\.com/i],
  ['WeChat', /weixin:\/\/|wechat/i],
  ['Tawk.to', /embed\.tawk\.to/i],
  ['Intercom', /widget\.intercom\.io|intercomSettings/i],
  ['Crisp', /client\.crisp\.chat/i],
  ['Jivo', /code\.jivosite\.com|jivo\.ru|code\.jivo/i],
  ['Tidio', /code\.tidio\.co/i],
  ['LiveChat', /cdn\.livechatinc\.com/i],
  ['Zendesk', /static\.zdassets\.com/i],
  ['HubSpot', /js\.hs-scripts\.com|js\.hsforms\.net/i],
  ['Facebook chat plugin', /xfbml\.customerchat/i],
];

const BOOKING = [
  ['Calendly', /calendly\.com\//i],
  ['Fresha', /fresha\.com\//i],
  ['Booksy', /booksy\.com\//i],
  ['OpenTable', /opentable\.(?:com|co\.uk)\//i],
  ['SimplyBook', /simplybook\.(?:me|it|asia)/i],
  ['Setmore', /setmore\.com/i],
  ['SiteMinder', /siteminder|thebookingbutton/i],
  ['Cloudbeds', /cloudbeds\.com/i],
  ['Booking.com', /booking\.com\/hotel\//i],
  ['Agoda', /agoda\.com\//i],
  ['Square', /squareup\.com\/appointments|square\.site/i],
  ['Online shop', /add[-_ ]to[-_ ]cart|\/cart["'/?]|woocommerce-cart|shopify-section-cart/i],
];

const SOCIAL = {
  facebook: /https?:\/\/(?:www\.|m\.)?facebook\.com\/(?!sharer|share|plugins|tr\?|dialog|login)[A-Za-z0-9.\-_/%]+/gi,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore|accounts)[A-Za-z0-9._]+/gi,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._]+/gi,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[A-Za-z0-9._\-]+/gi,
  linkedin: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in|school)\/[A-Za-z0-9.\-_%]+/gi,
  x: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)[A-Za-z0-9_]{2,15}(?=["'/?#\s])/gi,
  line: /https?:\/\/(?:line\.me\/(?:R\/ti\/p|ti\/p)\/[^"'\s<]+|lin\.ee\/[A-Za-z0-9]+|page\.line\.me\/[^"'\s<]+)/gi,
};

export function socialOf(html) {
  const out = {};
  for (const [name, re] of Object.entries(SOCIAL)) {
    const links = unique([...html.matchAll(re)].map((m) => m[0].replace(/["'<>].*$/, '').replace(/\/$/, '')));
    out[name] = links[0] ?? null;
  }
  return out;
}

const decode = (text) => String(text ?? '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const textOf = (html) => decode(String(html ?? '').replace(/<[^>]+>/g, ' '));

// Business emails and phone numbers the page publishes (mailto and tel links, and emails in text).
export function contactsOf(html) {
  const emails = unique([
    ...[...html.matchAll(/mailto:([^"'?\s>]+)/gi)].map((m) => decodeURIComponent(m[1])),
    ...[...textOf(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0]),
  ].map((email) => email.toLowerCase().replace(/\.$/, '')).filter((email) => !/\.(png|jpe?g|gif|webp|svg)$|@(?:\dx|sentry|example)\.|wixpress\.com$|domain\.com$/.test(email)));
  const phones = unique([...html.matchAll(/href=["']tel:([^"']+)/gi)].map((m) => decodeURIComponent(m[1]).replace(/[^\d+]/g, '')).filter((p) => p.replace(/\D/g, '').length >= 7));
  return { emails: emails.slice(0, 10), phones: phones.slice(0, 10) };
}

export function seoOf(html) {
  const head = html.slice(0, 200000);
  const meta = (name) => decode(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)`, 'i').exec(head)?.[1] ?? new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i').exec(head)?.[1] ?? '') || null;
  const types = new Set();
  for (const [, json] of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    for (const [, type] of json.matchAll(/"@type"\s*:\s*"([^"]+)"/g)) types.add(type);
    for (const [, list] of json.matchAll(/"@type"\s*:\s*\[([^\]]+)\]/g)) for (const [, type] of list.matchAll(/"([^"]+)"/g)) types.add(type);
  }
  const years = [...textOf(html).matchAll(/(?:©|copyright)\s*(?:[^\d]{0,40})?(?:\d{4}\s*[-–—]\s*)?((?:19|20)\d{2})/gi)].map((m) => Number(m[1]));
  return {
    title: textOf(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? '') || null,
    metaDescription: meta('description'),
    h1: textOf(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? '') || null,
    language: /<html[^>]+lang=["']([^"']+)/i.exec(head)?.[1] ?? null,
    mobileViewport: /<meta[^>]+name=["']viewport["'][^>]*width=device-width/i.test(head) || /<meta[^>]+content=["'][^"']*width=device-width[^"']*["'][^>]*name=["']viewport/i.test(head),
    openGraphImage: Boolean(meta('og:image')),
    noindex: /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(head),
    structuredData: [...types].slice(0, 15),
    copyrightYear: years.length ? Math.max(...years.filter((y) => y <= new Date().getFullYear() + 1)) || null : null,
  };
}

// A link to the contact or about page on the same site, for a second look for contacts.
export function contactPageOf(html, baseUrl) {
  const base = new URL(baseUrl);
  const links = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)];
  const score = (href, label) => (/contact|kontakt|kontak|contacto|contatti|контакт|связ|ติดต่อ|联系/i.test(href + label) ? 2 : /about|о-нас|о нас|เกี่ยวกับ/i.test(href + label) ? 1 : 0);
  let best = null;
  for (const [, href, label] of links) {
    let url;
    try { url = new URL(decode(href), base); } catch { continue; }
    if (!/^https?:$/.test(url.protocol) || url.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '') || url.pathname === base.pathname) continue;
    const s = score(url.pathname, textOf(label));
    if (s && (!best || s > best.s)) best = { s, url: url.href };
  }
  return best?.url ?? null;
}

export const SOCIAL_HOSTS = /(?:^|\.)(?:facebook\.com|fb\.com|instagram\.com|tiktok\.com|line\.me|lin\.ee|linktr\.ee|youtube\.com|twitter\.com|x\.com|linkedin\.com|wa\.me|t\.me|google\.com|business\.site|g\.page|vk\.com|ok\.ru)$/i;

const ANALYTICS = ['googleAnalytics', 'googleTagManager', 'microsoftClarity', 'yandexMetrica', 'hotjar'];
const OTHER_AD_PIXELS = ['tiktokPixel', 'linkedinInsight', 'pinterestTag', 'snapPixel', 'xPixel', 'microsoftAds', 'lineTag', 'vkPixel'];

// Score from 0 to 100 (how complete the marketing setup is) and the gaps, most valuable first.
export function scoreOf(audit, { year = new Date().getFullYear() } = {}) {
  const t = audit.tracking;
  const hasAnalytics = ANALYTICS.some((key) => t[key]) || t.universalAnalyticsIds.length > 0;
  const otherPixels = OTHER_AD_PIXELS.filter((key) => t[key]);
  const checks = [
    [10, audit.https, 'No HTTPS: browsers mark the site "Not secure"'],
    [10, audit.seo.mobileViewport, 'Not mobile-friendly (no mobile viewport)'],
    [15, hasAnalytics, 'No analytics: visits and sources are not measured'],
    [10, t.metaPixel, 'No Meta Pixel: cannot retarget visitors on Facebook and Instagram'],
    [10, t.googleAds, 'No Google Ads conversion tag: Google Ads cannot measure leads'],
    [5, otherPixels.length > 0, null],
    [5, Boolean(audit.seo.title), 'No page title'],
    [5, Boolean(audit.seo.metaDescription), 'No meta description for Google results'],
    [5, Boolean(audit.seo.h1), 'No H1 heading'],
    [5, audit.seo.structuredData.length > 0, 'No structured data (schema.org) for rich results and local SEO'],
    [10, audit.chat.length > 0, 'No chat or messenger button (WhatsApp, LINE, Messenger, live chat)'],
    [5, Object.values(audit.social).some(Boolean), 'No links to social profiles'],
    [5, audit.seo.copyrightYear == null || audit.seo.copyrightYear >= year - 1, `Copyright ${audit.seo.copyrightYear}: the site looks unmaintained`],
  ];
  let score = 0;
  const gaps = [];
  for (const [weight, ok, gap] of checks) {
    if (ok) score += weight;
    else if (gap) gaps.push(gap);
  }
  if (audit.responseTimeMs > 3000) gaps.push(`Slow server: first response took ${(audit.responseTimeMs / 1000).toFixed(1)} s`);
  if (audit.seo.noindex) gaps.push('The home page tells Google not to index it (noindex)');
  if (!audit.contacts.emails.length && !audit.contacts.phones.length) gaps.push('No email or click-to-call phone on the site');
  return { marketingScore: score, gaps, adTracking: t.metaPixel || t.googleAds || otherPixels.length > 0, adPixels: [t.metaPixel && 'Meta', t.googleAds && 'Google Ads', ...otherPixels.map((key) => ({ tiktokPixel: 'TikTok', linkedinInsight: 'LinkedIn', pinterestTag: 'Pinterest', snapPixel: 'Snapchat', xPixel: 'X', microsoftAds: 'Microsoft Ads', lineTag: 'LINE', vkPixel: 'VK' })[key])].filter(Boolean) };
}

// The whole audit of one page.
export function auditPage(html, { finalUrl, responseTimeMs = null, bytes = null, contactHtml = '', containers = [] } = {}) {
  const { tracking, foundInTagManager } = mergeTracking(trackingOf(html), containers.map(containerTrackingOf));
  const both = contactHtml ? `${html}\n${contactHtml}` : html;
  const audit = {
    finalUrl,
    https: finalUrl.startsWith('https://'),
    responseTimeMs,
    pageSizeKb: bytes == null ? null : Math.round(bytes / 1024),
    ...cmsOf(html),
    tracking,
    foundInTagManager,
    chat: CHAT.filter(([, re]) => re.test(both)).map(([name]) => name),
    booking: BOOKING.filter(([, re]) => re.test(both)).map(([name]) => name),
    social: socialOf(both),
    contacts: contactsOf(both),
    seo: seoOf(html),
  };
  return { ...audit, ...scoreOf(audit) };
}
