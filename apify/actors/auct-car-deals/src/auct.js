// AUCT (Sahakarn Auction, auct.co.th): the JSON service its public pages read. One request at a
// time with a pause, an honest user agent, and only the lists the website itself shows visitors.

import { readFileSync } from 'node:fs';
import tls from 'node:tls';

import { Agent } from 'undici';

export const SERVICE = 'https://service.auct.co.th:2368';
export const SITE = 'https://www.auct.co.th';
export const USER_AGENT = 'auct-car-deals (internal tool of a Pattaya car rental company)';
export const CAR = 'รถยนต์';

export const BRANCHES = {
  '029': 'Pattaya', '010': 'Chonburi', '021': 'Rayong', '001': 'Bangkok', '018': 'Rangsit', '009': 'Nakhon Ratchasima',
  '008': 'Khon Kaen', '005': 'Phitsanulok', '025': 'Ratchaburi', '006': 'Songkhla', '007': 'Surat Thani', '015': 'Udon Thani',
  '014': 'Ubon Ratchathani', '004': 'Chiang Mai',
};

const BRANCH_TH = {
  '029': 'พัทยา', '010': 'ชลบุรี', '021': 'ระยอง', '001': 'กรุงเทพ', '018': 'รังสิต', '009': 'นครราชสีมา', '008': 'ขอนแก่น',
  '005': 'พิษณุโลก', '025': 'ราชบุรี', '006': 'สงขลา', '007': 'สุราษฎร์ธานี', '015': 'อุดรธานี', '014': 'อุบลราชธานี', '004': 'เชียงใหม่',
};

// The yard of a lane or car: its branch code, or a known name in Thai or English.
export function branchCodeOf(obj = {}) {
  const code = obj.Branch_Code == null ? null : String(obj.Branch_Code).padStart(3, '0');
  if (code && BRANCHES[code]) return code;
  const name = String(obj.Branch_Name ?? '').toLowerCase();
  if (!name) return null;
  return Object.keys(BRANCHES).find((c) => name.includes(BRANCH_TH[c]) || name.includes(BRANCHES[c].toLowerCase())) ?? null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The service on port 2368 sends its Sectigo certificate without the intermediate certificate, so
// Node cannot build the chain. The public intermediate (Sectigo Public Server Authentication CA DV
// R36, from crt.sectigo.com, signed by the Sectigo R46 root in Node's own store) is added to the
// trusted roots: certificates are still fully verified.
const INTERMEDIATE = readFileSync(new URL('./certs/sectigo-dv-r36.pem', import.meta.url), 'utf8');
export const serviceAgent = new Agent({ connect: { ca: [...tls.rootCertificates, INTERMEDIATE] } });

export function createClient({ delayMs = 1200, fetchImpl = fetch, log = console } = {}) {
  let last = 0;
  return async function post(path, form) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const wait = last + delayMs - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      try {
        const res = await fetchImpl(`${SERVICE}${path}`, {
          method: 'POST',
          headers: { 'user-agent': USER_AGENT, accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', origin: SITE, referer: `${SITE}/` },
          body: new URLSearchParams(form).toString(),
          signal: AbortSignal.timeout(45000),
          dispatcher: serviceAgent,
        });
        if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { retry: true });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
        return await res.json();
      } catch (error) {
        const cause = error.cause ? ` (${error.cause.code ?? ''} ${error.cause.message ?? ''})`.replace(/\s+\)/, ')') : '';
        if (attempt === 3 || (!error.retry && error.name !== 'TimeoutError' && !/fetch failed/.test(error.message))) throw new Error(`${error.message}${cause} for ${path}`);
        log.warning?.(`${path}: ${error.message}${cause}, trying again`);
        await sleep(5000 * attempt);
      }
    }
    return null;
  };
}

// Every object in a response that carries a Document_No (an auction lane), wherever it sits.
export function lanesOf(response) {
  const out = [];
  const walk = (node) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      if (node.Document_No) out.push(node);
      else Object.values(node).forEach(walk);
    }
  };
  walk(response?.data ?? response);
  const seen = new Set();
  return out.filter((lane) => !seen.has(lane.Document_No) && seen.add(lane.Document_No));
}

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};
// Thai registration years are often Buddhist era (2563 = 2020).
const year = (v) => {
  const n = num(v);
  if (!n) return null;
  const y = n > 2400 ? n - 543 : n;
  return y >= 1970 && y <= 2040 ? Math.round(y) : null;
};
const text = (v) => (v == null ? null : String(v).trim() || null);

const GEAR = { 'ออโตเมติค': 'automatic', 'อัตโนมัติ': 'automatic', 'ธรรมดา': 'manual', 'เกียร์ธรรมดา': 'manual' };
const FUEL = { 'เบนซิน': 'petrol', 'ดีเซล': 'diesel', 'ไฟฟ้า': 'electric', 'ไฮบริด': 'hybrid', 'แก๊ส': 'gas', 'LPG': 'LPG', 'NGV': 'NGV' };
const mapped = (table, value) => {
  const t = text(value);
  if (!t) return null;
  const key = Object.keys(table).find((k) => t.includes(k));
  return key ? table[key] : t;
};
// The inspectors' notes ("front bumper scratched"), which the service sends as a Python-style list.
function notesOf(value) {
  const notes = [...String(value ?? '').matchAll(/'Comment':\s*'([^']*)'/g)].map((m) => m[1].replace(/\s+/g, ' ').trim()).filter(Boolean);
  return notes.length ? notes.join(' | ').slice(0, 500) : null;
}

export function carOf(raw, lane = {}) {
  const documentNo = raw.Document_No ?? lane.Document_No ?? null;
  const branchCode = branchCodeOf(raw) ?? branchCodeOf(lane);
  return {
    id: String(raw._id ?? `${documentNo}-${raw.Car_Order ?? raw.Auction_No ?? ''}`),
    auctionDate: text(raw.Auction_Date ?? lane.Auction_Date)?.slice(0, 10) ?? null,
    branch: BRANCHES[branchCode] ?? text(raw.Branch_Name ?? lane.Branch_Name),
    branchCode,
    lane: text(lane.auction_name_en ?? lane.auction_name ?? raw.auction_name),
    laneFloor: text(lane.Auction_Floor ?? raw.Auction_Floor),
    order: num(raw.Car_Order) ?? num(raw.Auction_No),
    brand: text(raw.Brand_Name),
    model: text(raw.Model_Name),
    subModel: text(raw.Sub_Model_Name),
    year: year(raw.Year_of_Manufacture) ?? year(raw.Manufacturing_Year) ?? year(raw.Register_Year),
    registerYear: year(raw.Register_Year),
    mileageKm: num(raw.Mile),
    gear: mapped(GEAR, raw.Asset_Gear),
    engineCc: num(raw.Engine_Size),
    fuel: mapped(FUEL, raw.Fuel_Type),
    color: text(raw.Car_Paint),
    bodyType: text(raw.Asset_Group_Name) ?? text(raw.Car_Type),
    grade: text(raw.Asset_Grade) ?? text(raw.Condition_Grade),
    gradePoints: [raw.Point_Grade_1, raw.Point_Grade_2, raw.Point_Grade_3].map(text).filter(Boolean).join(' / ') || null,
    inspectorNotes: notesOf(raw.Comment),
    plateProvince: text(raw.License_Plate_City),
    sellerGroup: text(raw.Seller_Group),
    startPrice: num(raw.Sales_Price),
    soldPrice: num(raw.Sold_Price),
    auctionTime: text(lane.Auction_Time),
    lotUrl: documentNo ? `${SITE}/auction-list/${encodeURIComponent(documentNo)}` : null,
    documentNo,
  };
}

const isoDay = (d) => d.toISOString().slice(0, 10);
export function daysFrom(start, count) {
  return Array.from({ length: count + 1 }, (_, i) => isoDay(new Date(start.getTime() + i * 86400000)));
}
