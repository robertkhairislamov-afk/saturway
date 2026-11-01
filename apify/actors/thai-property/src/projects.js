// One building, several project records. Dot Property lists some buildings under two names
// ("Ananya Beachfront Naklua" and "Ananya Beachfront Wongamat", one of them placed 3 km away) and
// many listings under none ("2-BR Condo at Ananya Beachfront Condominium"). Records of one
// building are joined, and a listing without a project gets the building its title names when it
// stands next to it.

import { projectKey } from './stats.js';

// Place words that agencies add to a building's name.
const PLACE_WORDS = /\b(?:naklua|na kluea|wong ?amat|wongamat|jomtien|na jomtien|pattaya|pratumnak|pratamnak|bang saray|central|north|south|beach|condominium|condo)\b/g;
export const baseName = (key) => String(key ?? '').replace(PLACE_WORDS, ' ').replace(/\s+/g, ' ').trim();
// Names specific enough to find in a title: two words or more, eight letters or more.
const specific = (name) => name.split(' ').length >= 2 && name.replace(/\bthe\b|\s/g, '').length >= 8;

// Two records closer than this are one building; a listing without a project this close to the
// building its title names belongs to it.
const SAME_PLACE_M = 150;
// A joined record whose location is farther than this from the main one has the wrong location.
const WRONG_PLACE_M = 300;

export function distanceM(a, b) {
  if (![a?.lat, a?.lng, b?.lat, b?.lng].every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

const median = (values) => {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

// Records seen in the listings: name, number of listings and location.
function recordsOf(listings) {
  const by = new Map();
  for (const l of listings) {
    if (!l.projectKey) continue;
    if (!by.has(l.projectKey)) by.set(l.projectKey, { key: l.projectKey, name: l.project, listings: [] });
    by.get(l.projectKey).listings.push(l);
  }
  for (const r of by.values()) r.place = { lat: median(r.listings.map((l) => l.latitude)), lng: median(r.listings.map((l) => l.longitude)) };
  return by;
}

// Records of one building: the same name without place words, and the same number of units and
// floors, or the same place.
export function sameBuilding(a, b, details = {}) {
  const base = baseName(a.key);
  if (!specific(base) || base !== baseName(b.key)) return false;
  const da = details[a.key] ?? {};
  const db = details[b.key] ?? {};
  const sameSize = da.units != null && da.units === db.units && da.floors != null && da.floors === db.floors;
  return sameSize || distanceM(a.place, b.place) <= SAME_PLACE_M;
}

// Joins the records of one building (into the record with most listings) and gives listings
// without a project their building. `relocate(listing)` is called for a listing whose record had
// the wrong location, after its coordinates are set to the building's. Returns the aliases
// (record → building) and counts.
export function joinProjects(listings, { details = {}, relocate } = {}) {
  const records = recordsOf(listings);
  const aliases = {};
  const list = [...records.values()].sort((a, b) => b.listings.length - a.listings.length);
  for (const [i, main] of list.entries()) {
    if (aliases[main.key]) continue;
    for (const other of list.slice(i + 1)) {
      if (!aliases[other.key] && sameBuilding(main, other, details)) aliases[other.key] = main.key;
    }
  }
  let moved = 0;
  for (const l of listings) {
    const to = aliases[l.projectKey];
    if (!to) continue;
    const main = records.get(to);
    l.projectRecord = l.project;
    l.project = main.name;
    l.projectKey = to;
    if (distanceM({ lat: l.latitude, lng: l.longitude }, main.place) > WRONG_PLACE_M) {
      l.latitude = main.place.lat;
      l.longitude = main.place.lng;
      relocate?.(l);
      moved++;
    }
  }

  // Names to look for in titles: the full names, and the names without place words when only
  // one building has them ("ananya beachfront").
  const buildings = list.filter((r) => !aliases[r.key]);
  const names = [];
  const bases = new Map();
  for (const r of buildings) {
    const full = projectKey(r.name);
    if (specific(full)) names.push({ text: full, building: r });
    const base = baseName(full);
    if (specific(base) && base !== full) bases.set(base, bases.has(base) ? null : r);
  }
  for (const [text, building] of bases) if (building) names.push({ text, building });

  let assigned = 0;
  for (const l of listings) {
    if (l.projectKey) continue;
    const title = ` ${projectKey(l.title)} `;
    const hits = names.filter(({ text }) => {
      const at = title.indexOf(` ${text} `);
      if (at < 0) return false;
      // "View Talay 1A", "Laguna Beach Resort 3": another building of the same name.
      const next = title.slice(at + text.length + 2).split(' ')[0];
      return !/^(?:\d+[a-z]?|[a-z]|phase|tower|building)$/.test(next);
    });
    if (!hits.length) continue;
    const longest = Math.max(...hits.map((h) => h.text.length));
    const top = [...new Set(hits.filter((h) => h.text.length === longest).map((h) => h.building))];
    if (top.length !== 1) continue;
    if (distanceM({ lat: l.latitude, lng: l.longitude }, top[0].place) > SAME_PLACE_M) continue;
    l.project = top[0].name;
    l.projectKey = top[0].key;
    l.projectFromTitle = true;
    assigned++;
  }
  return { aliases, moved, assigned };
}
