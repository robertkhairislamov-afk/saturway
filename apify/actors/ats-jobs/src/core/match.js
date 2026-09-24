// Case-insensitive whole-word matching for the keyword, location and department filters.
// Common word endings are allowed: "engineer" matches "Engineers" and "Engineering", "intern"
// matches "Internship", but "AI" does not match "Aircraft". "data*" matches any word starting with "data".
// Words of a phrase may be separated by spaces, hyphens, slashes or underscores: "front end" matches "Front-End".

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SEPARATOR = '[\\s\\-_/]+';
const NOT_WORD_BEFORE = '(?<![\\p{L}\\p{N}])';
const NOT_WORD_AFTER = '(?![\\p{L}\\p{N}])';

export function compileTerms(terms) {
  const list = Array.isArray(terms) ? terms : terms ? [terms] : [];
  return list
    .map((term) => String(term).trim())
    .filter(Boolean)
    .map((term) => {
      const prefix = term.endsWith('*');
      const words = term.replace(/\*+$/, '').split(/[\s\-_/]+/).filter(Boolean).map(escapeRegExp);
      if (words.length === 0) return null;
      const ending = prefix ? '' : `(?:s|es|er|ers|ing|ings|ship|ships)?${NOT_WORD_AFTER}`;
      return new RegExp(`${NOT_WORD_BEFORE}${words.join(SEPARATOR)}${ending}`, 'iu');
    })
    .filter(Boolean);
}

export const matchesAny = (patterns, values) => values.some((value) => value && patterns.some((pattern) => pattern.test(value)));

// Workday searches on the server; the search text is the term without the wildcard.
export const searchTextOf = (term) => String(term).trim().replace(/\*+$/, '').trim();
