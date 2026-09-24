// Groups Apify Store Actors into niches (the site or platform they target) and
// scores how many users a new, decent Actor could expect in each niche.
//
// Usage: node analyze.mjs [store.jsonl] [niches.csv]
//
// Expected users for a new Actor ≈ demand × (1 − leader share) / (active competitors + 1):
// the leader keeps its users and the rest of the demand is split evenly between the
// active competitors and the newcomer. The score then rewards niches where competitors
// fail often (unhappy users switch), where users already pay, and where the last month
// holds a larger share of the quarter's users (growth). Sudden last-week bursts of new
// users are treated as automated traffic, not demand.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const inPath = resolve(process.argv[2] ?? `${here}/data/store.jsonl`);
const outPath = resolve(process.argv[3] ?? `${here}/niches.csv`);

const ACTIVE_USERS_30D = 10; // an Actor with fewer monthly users is not a real competitor
const MIN_DEMAND_30D = 300; // ignore niches with less total monthly demand

const STOPWORDS = new Set(`
  scraper scrapers scraping scrape scrapper crawler crawlers crawl extractor extractors extract extraction
  api apis data actor tool tools bot fast faster fastest cheap cheaper cheapest low cost pro premium
  advanced simple easy lite light super ultimate best all in one the a an and or of for to by with from
  v1 v2 v3 v4 new no cookies cookie login without free unlimited bulk batch full complete details detail
  info information results result ppe pay per event rental official unofficial public real time realtime
  live smart powerful reliable robust lightweight turbo quick instant auto automated automatic mcp server
  ai agent agents llm gpt downloader download monitor monitoring tracker tracking finder checker check
  collector fetcher getter lookup plus max mini basic standard enhanced improved ultra only just your
  my any every multi universal lookup via using on at as is it its get
`.trim().split(/\s+/));

// Platforms with several distinct products: the second word defines the niche.
const MULTI_PRODUCT = new Set(`
  google amazon linkedin facebook instagram tiktok youtube twitter x reddit apple microsoft yahoo bing
  walmart ebay shopify pinterest telegram whatsapp threads zillow tripadvisor booking airbnb yelp indeed
  glassdoor trustpilot etsy aliexpress alibaba temu shein
`.trim().split(/\s+/));

const SYNONYMS = {
  twitter: 'x', tweets: 'tweet', places: 'maps', place: 'maps', map: 'maps', products: 'product',
  jobs: 'job', reviews: 'review', posts: 'post', profiles: 'profile', comments: 'comment',
  listings: 'listing', videos: 'video', ads: 'ad', companies: 'company', businesses: 'business',
  emails: 'email', contacts: 'contact', channels: 'channel', hashtags: 'hashtag', followers: 'follower',
  hotels: 'hotel', flights: 'flight', properties: 'property', prices: 'price', leads: 'lead',
  sellers: 'seller', images: 'image', users: 'user', groups: 'group', pages: 'page', events: 'event',
  transcripts: 'transcript', tweet: 'x', tweets: 'x',
};

// Social networks and niches built on personal data or adult content: excluded from
// recommendations. EXCLUDED matches the first word of a niche, EXCLUDED_NICHES a whole niche.
const EXCLUDED = new Set(`
  instagram facebook tiktok linkedin x threads snapchat whatsapp telegram discord reddit pinterest
  quora vk douyin weibo xiaohongshu rednote wechat bilibili kuaishou meta onlyfans tinder bumble
  whitepages spokeo truepeoplesearch fastpeoplesearch people person profile post lead b2b mass
  email contact phone follower influencer xvideos pornhub xhamster
`.trim().split(/\s+/));
const EXCLUDED_NICHES = new Set(['youtube comment']);

function tokens(text) {
  return text
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t) && !/^\d{4}$/.test(t))
    .map((t) => SYNONYMS[t] ?? t);
}

function nicheKey(actor) {
  let words = tokens(actor.title ?? '');
  const nameWords = tokens((actor.name ?? '').replace(/-/g, ' '));
  // Titles like "Profile Details Scraper" hide the platform that the slug still names.
  if (words.length === 0 || (!MULTI_PRODUCT.has(words[0]) && MULTI_PRODUCT.has(nameWords[0]))) {
    words = nameWords;
  }
  if (words.length === 0) return null;
  const [platform, second] = words;
  return MULTI_PRODUCT.has(platform) && second ? `${platform} ${second}` : platform;
}

const isExcluded = (key) => EXCLUDED_NICHES.has(key) || EXCLUDED.has(key.split(' ')[0]);

// The category that holds most of the niche's monthly users.
function mainCategory(group) {
  const byCategory = new Map();
  for (const a of group) {
    for (const c of a.categories) byCategory.set(c, (byCategory.get(c) ?? 0) + a.users30 + 1);
  }
  return [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

const actors = readFileSync(inPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

const niches = new Map();
for (const actor of actors) {
  const key = nicheKey(actor);
  if (!key) continue;
  if (!niches.has(key)) niches.set(key, []);
  niches.get(key).push(actor);
}

const isPaid = (a) => a.pricingModel !== 'FREE' && a.pricingModel !== 'NONE';

// A burst of new users within the last week (users7 close to users30, users90 barely
// higher) looks like automated traffic rather than people, so only older users count.
const isBurst = (a) => a.users30 >= 30 && a.users7 > 0.8 * a.users30;
const organicUsers30 = (a) => (isBurst(a) ? Math.max(0, a.users90 - a.users7) / 3 : a.users30);
const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const rows = [];
for (const [key, group] of niches) {
  const demand30 = group.reduce((s, a) => s + organicUsers30(a), 0);
  if (demand30 < MIN_DEMAND_30D) continue;
  const rawDemand30 = group.reduce((s, a) => s + a.users30, 0);
  const steady = group.filter((a) => !isBurst(a));
  const steady30 = steady.reduce((s, a) => s + a.users30, 0);
  const steady90 = steady.reduce((s, a) => s + a.users90, 0);
  const sorted = [...group].sort((a, b) => organicUsers30(b) - organicUsers30(a));
  const leader = sorted[0];
  const active = group.filter((a) => organicUsers30(a) >= ACTIVE_USERS_30D).length;
  const runs = group.reduce((s, a) => s + a.runs30, 0);
  const failed = group.reduce((s, a) => s + a.failed30, 0);
  const failRate = runs > 0 ? failed / runs : 0;
  const leaderShare = organicUsers30(leader) / demand30;
  const usersOf = (list) => list.reduce((s, a) => s + organicUsers30(a), 0);
  const officialShare = usersOf(group.filter((a) => a.username === 'apify')) / demand30;
  const paidShare = usersOf(group.filter(isPaid)) / demand30;
  const burstShare = rawDemand30 > 0 ? 1 - steady30 / rawDemand30 : 0;
  const growth = steady90 > 0 ? (steady30 * 3) / steady90 : 1;
  const expectedUsers = (demand30 * (1 - leaderShare)) / (active + 1);
  const score =
    expectedUsers *
    (1 + 2 * Math.min(failRate, 0.5)) *
    paidShare *
    (1 - officialShare) *
    Math.sqrt(Math.min(Math.max(growth, 0.5), 2));
  rows.push({
    niche: key,
    category: mainCategory(group),
    excluded: isExcluded(key),
    demand30: Math.round(demand30),
    burstShare,
    actors: group.length,
    active,
    leaderShare,
    officialShare,
    failRate,
    paidShare,
    growth,
    medianPrice: median(group.filter(isPaid).map((a) => a.price).filter((p) => p != null)),
    leaderRating: leader.rating,
    leader: `${leader.username}/${leader.name}`,
    expectedUsers,
    score,
  });
}

rows.sort((a, b) => b.score - a.score);

const columns = Object.keys(rows[0]);
const csv = [columns.join(',')]
  .concat(rows.map((r) => columns.map((c) => {
    const v = r[c];
    if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(4);
    return v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
  }).join(',')))
  .join('\n');
writeFileSync(outPath, csv + '\n');

const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`${actors.length} Actors, ${niches.size} niches, ${rows.length} with demand ≥ ${MIN_DEMAND_30D} users/30d`);
console.log(`Saved ${outPath}\n`);
console.log('rank | niche | category | demand30 | active | leader | fail | paid | growth | expected users | score | leader');
rows.filter((r) => !r.excluded).slice(0, Number(process.env.TOP ?? 40)).forEach((r, i) => {
  console.log([
    i + 1, r.niche, r.category, r.demand30, r.active, pct(r.leaderShare), pct(r.failRate), pct(r.paidShare),
    r.growth.toFixed(2), Math.round(r.expectedUsers), Math.round(r.score), r.leader,
  ].join(' | '));
});
