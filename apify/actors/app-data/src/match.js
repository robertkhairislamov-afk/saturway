// The same app in both stores: matched by its name (without the subtitle after " - " or ":") and,
// where the names differ a little, by the name start plus the developer.

const plain = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

export function titleKey(title) {
  const main = plain(title).split(/\s[-–—|:]\s|:\s|\s\|\s/)[0];
  return main.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\b(app|apps|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

const COMPANY = /\b(inc|llc|ltd|limited|co|corp|corporation|company|gmbh|ag|sa|sas|srl|bv|plc|pte|pty|oy|ab|as|kk|apps?|games?|studio|studios|technologies|technology|labs?|software|mobile|holdings?|group)\b/g;
export function developerKey(name) {
  return plain(name).replace(/[^\p{L}\p{N}]+/gu, ' ').replace(COMPANY, ' ').replace(/\s+/g, ' ').trim();
}

// exact: the same name (without subtitles). Otherwise one name starts the other, the developer is
// the same and the names are close in length ("Habitify" / "Habitify Habit Tracker" passes,
// "TikTok" / "TikTok Shop" does not: a developer's different apps often share the first word).
export function sameApp(a, b, { exact = false } = {}) {
  const ta = titleKey(a.title);
  const tb = titleKey(b.title);
  if (!ta || !tb) return false;
  const da = developerKey(a.developer);
  const db = developerKey(b.developer);
  const sameDeveloper = da && db && (da === db || da.startsWith(db) || db.startsWith(da));
  // Same name: the same app unless both developers are known and differ (generic names repeat).
  if (ta === tb) return Boolean(sameDeveloper || !da || !db);
  if (exact) return false;
  const short = ta.length < tb.length ? ta : tb;
  const long = ta.length < tb.length ? tb : ta;
  return Boolean(sameDeveloper && short.length >= 4 && long.startsWith(`${short} `) && short.length / long.length >= 0.7);
}

// Links every Google Play record to the matching App Store record of the same country (and back).
// Exact names are linked first, close names then among the apps still unlinked.
export function linkStores(records) {
  const apple = records.filter((r) => r.store === 'App Store');
  const play = records.filter((r) => r.store === 'Google Play');
  const key = (r) => `${r.country}|${r.appId}`;
  const linked = new Map();
  for (const exact of [true, false]) {
    for (const p of play) {
      if (linked.has(key(p))) continue;
      const a = apple.find((x) => x.country === p.country && (!linked.has(key(x)) || linked.get(key(x)) === p.appId) && sameApp(p, x, { exact }));
      if (!a) continue;
      linked.set(key(p), a.appId);
      linked.set(key(a), p.appId);
    }
  }
  const byKey = new Map(records.map((r) => [`${r.store}|${key(r)}`, r]));
  for (const r of records) {
    const otherId = linked.get(key(r));
    const other = otherId && byKey.get(`${r.store === 'Google Play' ? 'App Store' : 'Google Play'}|${r.country}|${otherId}`);
    if (!other) continue;
    r.inBothStores = true;
    r.otherStoreAppId = other.appId;
    r.otherStoreUrl = other.url;
    r.otherStoreTitle = other.title;
    r.otherStoreScore = other.score;
  }
  for (const r of records) r.inBothStores = Boolean(r.inBothStores);
  return records;
}
