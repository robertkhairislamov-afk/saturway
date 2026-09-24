// Checks specific target sites against the Apify Store: how many Actors already
// cover each site, how many monthly users they have, how strong the leader is, and
// whether the site itself answers a plain request without an anti-bot challenge.
//
// Usage: node gaps.mjs [gaps.csv]
// Behind an HTTPS proxy on Node >= 22.21, run with NODE_USE_ENV_PROXY=1.

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(process.argv[2] ?? `${here}/gaps.csv`);
const ACTIVE_USERS_30D = 10;

// [search keyword, site URL used for the access check, cluster]
const CANDIDATES = [
  // Job boards and applicant tracking systems (public job postings, no personal data)
  ['ziprecruiter', 'https://www.ziprecruiter.com/', 'jobs'],
  ['monster', 'https://www.monster.com/', 'jobs'],
  ['careerbuilder', 'https://www.careerbuilder.com/', 'jobs'],
  ['dice', 'https://www.dice.com/', 'jobs'],
  ['simplyhired', 'https://www.simplyhired.com/', 'jobs'],
  ['usajobs', 'https://www.usajobs.gov/', 'jobs'],
  ['builtin', 'https://builtin.com/jobs', 'jobs'],
  ['welcome to the jungle', 'https://www.welcometothejungle.com/en', 'jobs'],
  ['totaljobs', 'https://www.totaljobs.com/', 'jobs'],
  ['reed', 'https://www.reed.co.uk/', 'jobs'],
  ['cv-library', 'https://www.cv-library.co.uk/', 'jobs'],
  ['adzuna', 'https://www.adzuna.com/', 'jobs'],
  ['arbeitsagentur', 'https://www.arbeitsagentur.de/jobsuche/', 'jobs'],
  ['infojobs', 'https://www.infojobs.net/', 'jobs'],
  ['pracuj', 'https://www.pracuj.pl/', 'jobs'],
  ['jobindex', 'https://www.jobindex.dk/', 'jobs'],
  ['jora', 'https://au.jora.com/', 'jobs'],
  ['jobstreet', 'https://www.jobstreet.com/', 'jobs'],
  ['jobsdb', 'https://th.jobsdb.com/', 'jobs'],
  ['jobthai', 'https://www.jobthai.com/', 'jobs'],
  ['bayt', 'https://www.bayt.com/', 'jobs'],
  ['naukrigulf', 'https://www.naukrigulf.com/', 'jobs'],
  ['foundit', 'https://www.foundit.in/', 'jobs'],
  ['computrabajo', 'https://www.computrabajo.com/', 'jobs'],
  ['catho', 'https://www.catho.com.br/', 'jobs'],
  ['occ', 'https://www.occ.com.mx/', 'jobs'],
  ['bumeran', 'https://www.bumeran.com.ar/', 'jobs'],
  ['saramin', 'https://www.saramin.co.kr/', 'jobs'],
  ['jobkorea', 'https://www.jobkorea.co.kr/', 'jobs'],
  ['remoteok', 'https://remoteok.com/', 'jobs'],
  ['weworkremotely', 'https://weworkremotely.com/', 'jobs'],
  ['himalayas', 'https://himalayas.app/jobs', 'jobs'],
  ['greenhouse', 'https://boards.greenhouse.io/', 'jobs'],
  ['lever', 'https://jobs.lever.co/', 'jobs'],
  ['ashby', 'https://jobs.ashbyhq.com/', 'jobs'],
  ['workday', 'https://www.workday.com/', 'jobs'],
  ['smartrecruiters', 'https://jobs.smartrecruiters.com/', 'jobs'],
  ['workable', 'https://apply.workable.com/', 'jobs'],
  ['teamtailor', 'https://www.teamtailor.com/', 'jobs'],
  // Real estate portals (property data, no personal data)
  ['rightmove', 'https://www.rightmove.co.uk/', 'real estate'],
  ['zoopla', 'https://www.zoopla.co.uk/', 'real estate'],
  ['immobilienscout24', 'https://www.immobilienscout24.de/', 'real estate'],
  ['immowelt', 'https://www.immowelt.de/', 'real estate'],
  ['funda', 'https://www.funda.nl/', 'real estate'],
  ['seloger', 'https://www.seloger.com/', 'real estate'],
  ['immobiliare', 'https://www.immobiliare.it/', 'real estate'],
  ['fotocasa', 'https://www.fotocasa.es/', 'real estate'],
  ['otodom', 'https://www.otodom.pl/', 'real estate'],
  ['realestate.com.au', 'https://www.realestate.com.au/', 'real estate'],
  ['domain.com.au', 'https://www.domain.com.au/', 'real estate'],
  ['propertyfinder', 'https://www.propertyfinder.ae/', 'real estate'],
  ['bayut', 'https://www.bayut.com/', 'real estate'],
  ['ddproperty', 'https://www.ddproperty.com/', 'real estate'],
  ['propertyguru', 'https://www.propertyguru.com.sg/', 'real estate'],
  ['99acres', 'https://www.99acres.com/', 'real estate'],
  ['magicbricks', 'https://www.magicbricks.com/', 'real estate'],
  ['redfin', 'https://www.redfin.com/', 'real estate'],
  ['realtor', 'https://www.realtor.com/', 'real estate'],
  ['apartments.com', 'https://www.apartments.com/', 'real estate'],
  ['zonaprop', 'https://www.zonaprop.com.ar/', 'real estate'],
  ['vivareal', 'https://www.vivareal.com.br/', 'real estate'],
  // E-commerce and grocery (product and price data)
  ['woolworths', 'https://www.woolworths.com.au/', 'ecommerce'],
  ['aldi', 'https://www.aldi.com.au/', 'ecommerce'],
  ['tesco', 'https://www.tesco.com/groceries/', 'ecommerce'],
  ['sainsbury', 'https://www.sainsburys.co.uk/', 'ecommerce'],
  ['asda', 'https://groceries.asda.com/', 'ecommerce'],
  ['kroger', 'https://www.kroger.com/', 'ecommerce'],
  ['target', 'https://www.target.com/', 'ecommerce'],
  ['bestbuy', 'https://www.bestbuy.com/', 'ecommerce'],
  ['costco', 'https://www.costco.com/', 'ecommerce'],
  ['home depot', 'https://www.homedepot.com/', 'ecommerce'],
  ['wayfair', 'https://www.wayfair.com/', 'ecommerce'],
  ['flipkart', 'https://www.flipkart.com/', 'ecommerce'],
  ['lazada', 'https://www.lazada.co.th/', 'ecommerce'],
  ['tokopedia', 'https://www.tokopedia.com/', 'ecommerce'],
  ['allegro', 'https://allegro.pl/', 'ecommerce'],
  ['emag', 'https://www.emag.ro/', 'ecommerce'],
  ['trendyol', 'https://www.trendyol.com/', 'ecommerce'],
  ['noon', 'https://www.noon.com/', 'ecommerce'],
  ['bol.com', 'https://www.bol.com/', 'ecommerce'],
  ['otto', 'https://www.otto.de/', 'ecommerce'],
  ['zalando', 'https://www.zalando.de/', 'ecommerce'],
  ['idealo', 'https://www.idealo.de/', 'ecommerce'],
  ['cdiscount', 'https://www.cdiscount.com/', 'ecommerce'],
  ['rakuten', 'https://www.rakuten.co.jp/', 'ecommerce'],
  ['mercari', 'https://jp.mercari.com/', 'ecommerce'],
  ['coupang', 'https://www.coupang.com/', 'ecommerce'],
  ['falabella', 'https://www.falabella.com/', 'ecommerce'],
];

const CHALLENGE_MARKERS = [
  'cf-chl', 'challenge-platform', 'captcha', 'px-captcha', 'datadome', 'access denied',
  'pardon our interruption', 'are you a robot', 'incapsula', 'request unsuccessful',
];

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Multi-word or dotted keywords match anywhere; single words must be a whole word,
// so that "reed" does not match "freedom" and "funda" does not match "fundamentals".
function mentions(actor, keyword) {
  const text = `${actor.title} ${actor.name}`;
  if (/[\s.-]/.test(keyword)) return normalize(text).includes(normalize(keyword));
  return text.toLowerCase().split(/[^a-z0-9]+/).includes(keyword.toLowerCase());
}

async function searchStore(keyword) {
  const url = `https://api.apify.com/v2/store?search=${encodeURIComponent(keyword)}&limit=100`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).data;
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

// A plain request with a browser user agent: does the site answer without a challenge?
async function checkAccess(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const body = (await res.text()).slice(0, 200000).toLowerCase();
    const marker = CHALLENGE_MARKERS.find((m) => body.includes(m));
    if (res.status >= 400) return `blocked ${res.status}`;
    return marker ? `challenge (${marker})` : 'ok';
  } catch (err) {
    return `error (${err.cause?.code ?? err.name})`;
  }
}

const rows = [];
for (const [keyword, siteUrl, cluster] of CANDIDATES) {
  const data = await searchStore(keyword);
  const matching = data.items.filter((a) => mentions(a, keyword));
  // Same burst filter as analyze.mjs: a last-week spike of new users counts only its older users.
  const users = (a) => {
    const u7 = a.stats?.totalUsers7Days ?? 0;
    const u30 = a.stats?.totalUsers30Days ?? 0;
    const u90 = a.stats?.totalUsers90Days ?? 0;
    return u30 >= 30 && u7 > 0.8 * u30 ? Math.max(0, u90 - u7) / 3 : u30;
  };
  const demand30 = matching.reduce((s, a) => s + users(a), 0);
  const leader = [...matching].sort((a, b) => users(b) - users(a))[0];
  const runs = leader?.stats?.publicActorRunStats30Days;
  const leaderFail = runs?.TOTAL ? ((runs.FAILED ?? 0) + (runs['TIMED-OUT'] ?? 0)) / runs.TOTAL : 0;
  const active = matching.filter((a) => users(a) >= ACTIVE_USERS_30D).length;
  const leaderShare = demand30 > 0 ? users(leader) / demand30 : 0;
  const access = await checkAccess(siteUrl);
  rows.push({
    site: keyword,
    cluster,
    actors: matching.length,
    active,
    demand30,
    leaderUsers30: leader ? users(leader) : 0,
    leaderShare,
    leaderFail,
    leaderRating: leader?.actorReviewRating ?? null,
    leader: leader ? `${leader.username}/${leader.name}` : '',
    expectedUsers: (demand30 * (1 - leaderShare)) / (active + 1),
    access,
  });
  process.stderr.write(`${keyword}: ${matching.length} Actors, ${demand30} users/30d, access ${access}\n`);
}

rows.sort((a, b) => b.expectedUsers - a.expectedUsers || b.demand30 - a.demand30);

const columns = Object.keys(rows[0]);
writeFileSync(
  outPath,
  [columns.join(',')]
    .concat(rows.map((r) => columns.map((c) => {
      const v = r[c];
      if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(4);
      return v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')))
    .join('\n') + '\n',
);
console.log(`Saved ${outPath}`);
