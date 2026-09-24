// Reads and validates the Actor input. An empty company list (for example the Store's daily
// health check) falls back to the adapter's example input instead of failing.

const toList = (value, separator) => {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap((item) => toList(item, separator));
  if (typeof value === 'object') return toList(value.url ?? value.value ?? '', separator);
  const text = String(value).trim();
  if (!text) return [];
  return separator ? text.split(separator).map((part) => part.trim()).filter(Boolean) : [text];
};

function wholeNumber(value, field) {
  if (value == null || value === '') return 0;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`Input field "${field}" must be a whole number, 0 or more.`);
  return number;
}

export function normalizeInput(raw = {}, example = {}) {
  let companies = toList(raw.companies, /[\n,]+/);
  let maxItems = wholeNumber(raw.maxItems, 'maxItems');
  const usedExample = companies.length === 0;
  if (usedExample) {
    companies = [...(example.companies ?? [])];
    if (!maxItems && example.maxItems) maxItems = example.maxItems;
  }
  return {
    companies,
    usedExample,
    keywords: toList(raw.keywords),
    excludeKeywords: toList(raw.excludeKeywords),
    locations: toList(raw.locations),
    departments: toList(raw.departments),
    remoteOnly: raw.remoteOnly === true,
    postedWithinDays: wholeNumber(raw.postedWithinDays, 'postedWithinDays'),
    onlyWithSalary: raw.onlyWithSalary === true,
    onlyNew: raw.onlyNew === true,
    includeDescription: raw.includeDescription !== false,
    maxItems,
    maxItemsPerCompany: wholeNumber(raw.maxItemsPerCompany, 'maxItemsPerCompany'),
    proxyConfiguration: raw.proxyConfiguration,
  };
}
