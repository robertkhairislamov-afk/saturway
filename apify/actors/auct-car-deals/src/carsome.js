// Carsome (carsome.co.th): retail prices of the cars it sells, as a market reference for auction
// cars. Used for the owner's internal buying only (the owner accepted the terms risk on 25.11.2026).
// Model pages carry their car list in the page's own data (window.__NUXT__): a minified function call
// whose fields are literals or parameter names. It is read as text and never executed.

export const CARSOME = 'https://www.carsome.co.th';

// Splits a source fragment at top-level commas, skipping strings and brackets.
export function splitTop(s) {
  const out = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = s.slice(start).trim();
  if (last) out.push(last);
  return out;
}

const IDENT = /^[A-Za-z_$][\w$]*$/;
function literal(token) {
  const t = token.trim();
  if (t === 'true' || t === '!0') return true;
  if (t === 'false' || t === '!1') return false;
  if (t === 'null' || t === 'void 0') return null;
  if (t.startsWith('"')) {
    try { return JSON.parse(t); } catch { return t.slice(1, -1); }
  }
  if (/^-?\d+(\.\d+)?(e\d+)?$/i.test(t)) return Number(t);
  return { ref: t };
}

// The bracketed fragment that starts right after `from` in `text`.
function bracketed(text, from) {
  let depth = 1;
  let quote = null;
  for (let k = from; k < text.length; k++) {
    const ch = text[k];
    if (quote) {
      if (ch === '\\') k++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) {
      depth--;
      if (depth === 0) return text.slice(from, k);
    }
  }
  return null;
}

export function parseCarsomePage(html) {
  const m = /window\.__NUXT__=\(function\(([^)]*)\)\{([\s\S]*)\}\(([\s\S]*)\)\);?<\/script>/.exec(html);
  if (!m) return { cars: [], total: null };
  const params = m[1].split(',');
  const args = splitTop(m[3]);
  const env = new Map(params.map((p, i) => [p, args[i] === undefined ? undefined : literal(args[i])]));
  const resolve = (v) => (v && typeof v === 'object' && 'ref' in v ? (env.has(v.ref) ? env.get(v.ref) : null) : v);
  const body = m[2];
  const at = body.indexOf('carList:[');
  if (at < 0) return { cars: [], total: null };
  const list = bracketed(body, at + 'carList:['.length) ?? '';
  const cars = [];
  for (const item of splitTop(list)) {
    const inner = item.trim().replace(/^\{|\}$/g, '');
    const rec = {};
    for (const pair of splitTop(inner)) {
      const colon = pair.indexOf(':');
      if (colon < 0) continue;
      const key = pair.slice(0, colon).trim();
      const val = pair.slice(colon + 1).trim();
      if (val.startsWith('{') || val.startsWith('[')) continue;
      const v = literal(val);
      rec[key] = IDENT.test(val) && !['true', 'false', 'null'].includes(val) ? resolve(v) : (v && typeof v === 'object' ? null : v);
    }
    cars.push(rec);
  }
  const totalMatch = /(?:^|[,{])(?:total|totalCount|carTotal|totalNum)\s*:\s*([\w$.]+)/.exec(body);
  const total = totalMatch ? resolve(literal(totalMatch[1])) : null;
  return { cars, total: typeof total === 'number' ? total : null };
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// A retail listing: brand, model, year, mileage and the price Carsome asks. No seller details.
export function retailOf(rec) {
  return {
    id: `carsome-${rec.carNo ?? rec.carId ?? rec.id}`,
    brand: rec.brandName ?? null,
    model: rec.modelName ?? null,
    variant: rec.carVariant ?? null,
    name: rec.carName ?? null,
    year: num(rec.carYear) ?? num(String(rec.carName ?? '').slice(0, 4)),
    mileageKm: num(rec.carMileage),
    price: num(rec.sellingPrice) ?? num(rec.expSellingPrice) ?? num(rec.price),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Every car on sale: the list pages, 18 cars each, one at a time with a pause.
export async function fetchCarsome({ userAgent, delayMs = 2000, maxPages = 80, fetchImpl = fetch, log = console } = {}) {
  const all = new Map();
  let pages = 1;
  for (let page = 1; page <= Math.min(pages, maxPages); page++) {
    if (page > 1) await sleep(delayMs);
    let html = null;
    for (let attempt = 1; attempt <= 3 && html == null; attempt++) {
      try {
        const res = await fetchImpl(`${CARSOME}/buy-car${page > 1 ? `?pageNo=${page}` : ''}`, { headers: { 'user-agent': userAgent, 'accept-language': 'en-US,en;q=0.9,th;q=0.8' }, signal: AbortSignal.timeout(45000) });
        if (res.ok) html = await res.text();
        else log.warning?.(`Carsome page ${page}: HTTP ${res.status}`);
      } catch (error) {
        log.warning?.(`Carsome page ${page}: ${error.message}`);
      }
      if (html == null) await sleep(5000 * attempt);
    }
    if (html == null) break;
    const { cars, total } = parseCarsomePage(html);
    if (!cars.length) break;
    if (total) pages = Math.ceil(total / cars.length);
    for (const rec of cars) {
      const car = retailOf(rec);
      if (car.price && car.brand && car.model) all.set(car.id, car);
    }
  }
  return [...all.values()];
}
