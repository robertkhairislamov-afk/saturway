// Salary helpers: one shape for every ATS, plus pay ranges found in description text.
// A salary is { min, max, currency, interval, text, source }, where interval is
// hour, day, week, month or year, and source is "ats" or "description".

// Rough US dollar values, only to judge whether an amount is hourly, monthly or yearly.
const USD_PER_UNIT = {
  USD: 1, EUR: 1.1, GBP: 1.3, CHF: 1.15, CAD: 0.73, AUD: 0.66, NZD: 0.6, SGD: 0.75, HKD: 0.13,
  JPY: 0.0068, KRW: 0.00073, INR: 0.012, CNY: 0.14, TWD: 0.031, THB: 0.028, PHP: 0.017, IDR: 0.000062,
  MYR: 0.22, ILS: 0.27, AED: 0.27, PLN: 0.25, CZK: 0.044, HUF: 0.0028, RON: 0.22, SEK: 0.095,
  NOK: 0.093, DKK: 0.15, BRL: 0.18, MXN: 0.052, ZAR: 0.055, TRY: 0.029,
};
const inUsd = (amount, currency) => (USD_PER_UNIT[currency] ? amount * USD_PER_UNIT[currency] : null);

export function normalizeInterval(value) {
  const text = String(value ?? '').toLowerCase();
  if (/hour/.test(text)) return 'hour';
  if (/\bday|daily/.test(text)) return 'day';
  if (/week/.test(text)) return 'week';
  if (/month/.test(text)) return 'month';
  if (/year|annual|annum/.test(text)) return 'year';
  return null;
}

// Without an explicit period, very small amounts are hourly and large ones yearly.
function guessInterval(amount, currency) {
  const usd = amount == null ? null : inUsd(amount, currency);
  if (usd == null) return null;
  if (usd <= 250) return 'hour';
  if (usd >= 15000) return 'year';
  return null;
}

const formatAmount = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 2 });

function formatSalary(min, max, currency, interval) {
  const range = min != null && max != null && min !== max
    ? `${formatAmount(min)}–${formatAmount(max)}`
    : formatAmount(min ?? max);
  return `${currency ? `${currency} ` : ''}${range}${interval ? ` per ${interval}` : ''}`;
}

// Pay a period usually covers, in US dollars. Outside this range the stated period is suspect.
const TYPICAL = { hour: [5, 1100], day: [40, 5500], week: [200, 16500], month: [300, 16500], year: [5500, 2000000] };

// Job boards where companies type the salary in by hand get "45" for 45K a year, monthly pay
// marked as yearly and yearly pay marked as monthly or daily. Fixes the period (or the missing
// thousands) when the amount clearly does not fit it. Returns null when the amount is no salary.
export function fixStatedUnits({ min = null, max = null, currency = null, interval = null }) {
  const code = currency ? String(currency).trim().toUpperCase() : null;
  const usd = inUsd(Math.max(min ?? 0, max ?? 0), code);
  if (!interval || !TYPICAL[interval] || !(usd > 0)) return { min, max, interval };
  const [low, high] = TYPICAL[interval];
  if (usd >= low && usd < high) return { min, max, interval };
  if (interval === 'year' && usd < 5.5) return null;
  if (interval === 'year' && usd < 330) {
    return { min: min == null ? null : min * 1000, max: max == null ? null : max * 1000, interval };
  }
  if (usd >= 16500) return { min, max, interval: 'year' };
  if (usd >= 300) return { min, max, interval: 'month' };
  return { min, max, interval };
}

const PER_YEAR = { hour: 1820, day: 218, week: 52, month: 12, year: 1 };

// The highest pay of a salary as a yearly amount, for minimum salary filters.
export function yearlyMax(salary) {
  const top = Math.max(salary?.min ?? 0, salary?.max ?? 0);
  return top > 0 ? top * (PER_YEAR[salary.interval] ?? 1) : 0;
}

export function makeSalary({ min = null, max = null, currency = null, interval = null, text = null, source }) {
  const low = Number.isFinite(min) && min > 0 ? min : null;
  const high = Number.isFinite(max) && max > 0 ? max : null;
  if (low == null && high == null) return null;
  const code = currency ? String(currency).trim().toUpperCase() : null;
  const period = interval ?? guessInterval(high ?? low, code);
  return {
    min: low,
    max: high,
    currency: code || null,
    interval: period,
    text: text?.trim() || formatSalary(low, high, code, period),
    source,
  };
}

// --- Pay ranges in free text -------------------------------------------------------------

const SYMBOL_CURRENCY = {
  $: 'USD', US$: 'USD', CA$: 'CAD', C$: 'CAD', AU$: 'AUD', A$: 'AUD', NZ$: 'NZD', S$: 'SGD',
  HK$: 'HKD', R$: 'BRL', MX$: 'MXN', '£': 'GBP', '€': 'EUR', '₹': 'INR', '₪': 'ILS', '¥': 'JPY', '₩': 'KRW',
  '₱': 'PHP', Php: 'PHP', '฿': 'THB', RM: 'MYR', Rp: 'IDR',
};
const CODES = 'USD|EUR|GBP|CAD|AUD|NZD|SGD|HKD|CHF|JPY|INR|KRW|ILS|PLN|SEK|NOK|DKK|BRL|MXN|ZAR|AED|CNY|TWD|THB|PHP|IDR|MYR|CZK|HUF|RON|TRY';
const SYMBOLS = Object.keys(SYMBOL_CURRENCY)
  .sort((a, b) => b.length - a.length)
  .map((symbol) => symbol.replace(/\$/g, '\\$'))
  .join('|');
// 120,000 · 120.000 · 120 000 · 274,456.00 · 45.50 · 120
const NUMBER = '\\d{1,3}(?:[,. \\u00a0\\u202f\\u2009]\\d{3})+(?!\\d)(?:[.,]\\d{1,2}(?!\\d))?|\\d+(?:[.,]\\d{1,2}(?!\\d))?';

const amountPattern = (n) => [
  `(?:(?<sym${n}>${SYMBOLS})\\s?|(?<pre${n}>${CODES})\\s?(?:${SYMBOLS})?\\s?)?`,
  `(?<num${n}>${NUMBER})`,
  `(?:\\s?(?<k${n}>[kK])(?![a-zA-Z]))?`,
  `(?:\\s?(?<post${n}>${CODES})(?![a-zA-Z]))?`,
].join('');

const RANGE = new RegExp(`(?<![\\w.,$])${amountPattern(1)}\\s*(?:-|–|—|to|and)\\s*${amountPattern(2)}`, 'g');
// A single amount, read only where the text is known to be a pay field ("$68.25/hr").
const SINGLE = new RegExp(`(?<![\\w.,$])${amountPattern(1)}`, 'g');

const PERIOD_WORDS = { hour: 'hour|hr', day: 'day', week: 'week|wk', fortnight: 'fortnight', month: 'month|mo', year: 'year|yr|annum' };
const PERIOD_ADJECTIVES = { hour: 'hourly|p\\.h\\.|ph', day: 'daily|p\\.d\\.', week: 'weekly', fortnight: 'fortnightly', month: 'monthly|p\\.m\\.', year: 'annual(?:ly|ized)?|yearly|p\\.a\\.' };
const PAY_WORDS = 'salary|pay|rate|wage|compensation|range';

// Right after a range: "/yr", "per hour", "an hour", ", annually", "annual base salary".
const HINTS_AFTER = Object.keys(PERIOD_WORDS).map((interval) => [interval, new RegExp(
  `^\\s*(?:\\/\\s*|per\\s+|an?\\s+|each\\s+)(?:${PERIOD_WORDS[interval]})(?![a-z])|^[\\s,(]*(?:${PERIOD_ADJECTIVES[interval]})(?![a-z])`, 'i',
)]);
// Before a range only salary phrases count ("hourly rate", "salary range per year"), not "40 hours per week".
const HINTS_BEFORE = Object.keys(PERIOD_WORDS).map((interval) => [interval, new RegExp(
  `(?<![a-z])(?:${PERIOD_ADJECTIVES[interval]})(?:\\s+[a-z]+){0,2}?\\s+(?:${PAY_WORDS})|(?<![a-z])(?:${PAY_WORDS})(?![a-z])[^.$£€]{0,40}?(?:per\\s+|\\/\\s*)(?:${PERIOD_WORDS[interval]})(?![a-z])`, 'gi',
)]);
const PAY_CONTEXT = /salary|\bpay\b|compensation|\bwages?\b|\brate\b|\bOTE\b|\bearn|\bbase\b|\brange\b|stipend/i;
const LARGE_UNIT_AFTER = /^\s*(?:million|billion|mm|m|bn|b)\b/i;
// A number without a currency followed by these is a quantity ("38 hours", "12 month contract", "15%").
const QUANTITY_AFTER = /^\s*(?:%|hours?\b|hrs?\b|months?\b|mths?\b|weeks?\b|wks?\b|days?\b|years?\b|yrs?\b)/i;
// Plausible amounts per period, in US dollars.
// Low enough for pay in Southeast Asia, such as 70 baht an hour or 3 million rupiah a month.
const PLAUSIBLE = { hour: [1, 2000], day: [8, 10000], week: [40, 50000], fortnight: [80, 100000], month: [100, 200000], year: [1000, 5000000] };

function parseNumber(raw, thousands = false) {
  const compact = raw.replace(/[\s\u00a0\u202f\u2009]/g, '');
  const decimal = /[.,](\d{1,2})$/.exec(compact);
  const whole = (decimal ? compact.slice(0, decimal.index) : compact).replace(/[.,]/g, '');
  const value = Number(decimal ? `${whole}.${decimal[1]}` : whole);
  return thousands ? value * 1000 : value;
}

function hintAfter(after) {
  return HINTS_AFTER.find(([, pattern]) => pattern.test(after))?.[0] ?? null;
}

// The closest salary phrase before the range wins.
function hintBefore(before) {
  let best = null;
  for (const [interval, pattern] of HINTS_BEFORE) {
    for (const match of before.matchAll(pattern)) {
      if (!best || match.index > best.index) best = { interval, index: match.index };
    }
  }
  return best?.interval ?? null;
}

function plausible(min, max, interval, currency) {
  if (!interval || !USD_PER_UNIT[currency]) return true;
  const [low, high] = PLAUSIBLE[interval];
  return inUsd(min, currency) >= low && inUsd(max, currency) <= high;
}

function candidatesFrom(text, pattern, known, defaultCurrency, dollar) {
  const candidates = [];
  for (const match of text.matchAll(pattern)) {
    const g = match.groups;
    const explicit = Boolean(g.pre1 || g.post1 || g.pre2 || g.post2 || g.sym1 || g.sym2);
    const symbol = g.sym1 || g.sym2;
    // A currency code wins, then the symbol ("$" is the site's own dollar), then the field's currency.
    const code = g.pre1 || g.post1 || g.pre2 || g.post2 || (symbol === '$' ? dollar : SYMBOL_CURRENCY[symbol]) || (known ? defaultCurrency : undefined);
    if (!code) continue;
    const end = match.index + match[0].length;
    const after = text.slice(end, end + 50);
    if (LARGE_UNIT_AFTER.test(after)) continue;
    if (/^\s*%/.test(after) || (!explicit && QUANTITY_AFTER.test(after))) continue;

    // "$120 - 150K" and "$120K - 150": a k on one side applies to a small number on the other.
    const single = g.num2 === undefined;
    // Not when the other number is already bigger: "$800 - $1k p.d." is 800 to 1,000.
    const k1 = Boolean(g.k1) || (Boolean(g.k2) && parseNumber(g.num1) < 1000 && parseNumber(g.num1) <= parseNumber(g.num2));
    const k2 = Boolean(g.k2) || (Boolean(g.k1) && !single && parseNumber(g.num2) < 1000 && parseNumber(g.num2) >= parseNumber(g.num1));
    let min = parseNumber(g.num1, k1);
    let max = single ? min : parseNumber(g.num2, k2);
    if (!(min > 0) || !(max >= min) || max > min * 6) continue;

    const currency = code.toUpperCase();
    const before = text.slice(Math.max(0, match.index - 250), match.index);
    const stated = hintAfter(after);
    if (stated && !plausible(min, max, stated, currency)) {
      // A pay field saying "$20 – $23 per month" left out the thousands.
      if (!known || k1 || k2 || !plausible(min * 1000, max * 1000, stated, currency)) continue;
      min *= 1000;
      max *= 1000;
    }
    let interval = stated;
    if (!interval) {
      const hinted = hintBefore(before);
      interval = hinted && plausible(min, max, hinted, currency) ? hinted : guessInterval(max, currency);
    }
    if (!known && !stated && !PAY_CONTEXT.test(before) && !PAY_CONTEXT.test(after)) continue;
    if (!plausible(min, max, interval, currency) || (!interval && max < 100)) continue;
    // "Up to $90K" gives only a maximum.
    const upTo = single && /\bup\s+to\s*$/i.test(before);
    // Pay per fortnight, common in Australia, becomes pay per year.
    const factor = interval === 'fortnight' ? 26 : 1;
    candidates.push({ min: upTo ? null : min * factor, max: max * factor, currency, interval: factor > 1 ? 'year' : interval, explicit, text: match[0].trim() });
  }
  return candidates;
}

// Finds pay ranges such as "$120,000 - $150,000", "168,000 USD - 264,500 USD" or "£45k–£55k per annum".
// Several ranges in the same currency and period (for example one per level) are merged.
// With `known`, the text is a pay field, so no pay words are needed and a single amount counts.
// `defaultCurrency` applies to a known pay field without a currency, such as "100000 - 120000".
// `dollar` is the currency of "$" on the site: AUD on SEEK Australia, USD by default.
export function salaryFromText(text, { known = false, source = 'description', defaultCurrency, dollar = 'USD' } = {}) {
  if (!text) return null;
  // "$$68" is "$68", and "180, 000" is "180,000".
  const clean = String(text).replace(/\$\$+/g, '$').replace(/(\d),\s+(\d{3})(?!\d)/g, '$1,$2');
  let candidates = candidatesFrom(clean, RANGE, known, defaultCurrency, dollar);
  if (candidates.length === 0 && known) candidates = candidatesFrom(clean, SINGLE, known, defaultCurrency, dollar);
  // Amounts with a currency win over bare numbers such as "EA7 (38 hours) - $99,550 + super".
  if (candidates.some((candidate) => candidate.explicit)) candidates = candidates.filter((candidate) => candidate.explicit);
  if (candidates.length === 0) return null;
  const [first] = candidates;
  const same = candidates.filter((c) => c.currency === first.currency && c.interval === first.interval);
  const mins = same.map((c) => c.min).filter((value) => value != null);
  return makeSalary({
    min: mins.length > 0 ? Math.min(...mins) : null,
    max: Math.max(...same.map((c) => c.max)),
    currency: first.currency,
    interval: first.interval,
    text: known ? clean.trim() : same.slice(0, 3).map((c) => c.text).join('; '),
    source,
  });
}
