// Text helpers: cleaning extracted text, page ranges, Markdown and chunks for RAG.

// "1-3, 5, 10-" → a test for page numbers (1-based). Empty: every page.
export function parsePageRange(value) {
  const text = String(value ?? '').trim();
  if (!text) return () => true;
  const parts = text.split(/\s*,\s*/).map((part) => {
    const m = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(part);
    if (!m || (!m[1] && !m[3])) throw new Error(`"pages": "${part}" is not a page or a range. Use for example 1-3, 5, 10-.`);
    const from = m[1] ? Number(m[1]) : 1;
    const to = m[2] ? (m[3] ? Number(m[3]) : Infinity) : from;
    if (from < 1 || to < from) throw new Error(`"pages": "${part}" is not a valid range.`);
    return [from, to];
  });
  return (page) => parts.some(([from, to]) => page >= from && page <= to);
}

// Letters and digits in a text: a page whose text layer has almost none is a scan.
export const meaningfulChars = (text) => (String(text ?? '').match(/[\p{L}\p{N}]/gu) ?? []).length;

// Trailing spaces, runs of blank lines and form feeds removed; words split at line ends joined.
export function cleanText(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[ \t ]+$/gm, '')
    .replace(/(\p{Ll})-\n(\p{Ll})/gu, '$1$2')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A short line without closing punctuation is a heading or a line of a form (an invoice's
// "Total due: 4,250.00 THB"): it stays on its own instead of being joined into a paragraph.
// A wrapped line of a sentence continues in lower case, so the next line must not.
const standsAlone = (line, next) => line.length <= 60 && !/[.,;:!?)\]"'»,，、。]$/.test(line) && (!next || /^[\p{Lu}\p{N}\p{Lo}]/u.test(next));

// Lines of one paragraph joined; paragraphs separated by a blank line.
export function paragraphs(text) {
  const result = [];
  for (const block of cleanText(text).split(/\n\s*\n/)) {
    let current = [];
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    for (const [i, line] of lines.entries()) {
      if (standsAlone(line, lines[i + 1])) {
        if (current.length) result.push(current.join(' '));
        result.push(line);
        current = [];
      } else current.push(line);
    }
    if (current.length) result.push(current.join(' '));
  }
  return result;
}

// Markdown: the document title, then one section per page.
export function toMarkdown({ title, pages }) {
  const parts = [];
  if (title) parts.push(`# ${title}`);
  for (const page of pages) {
    if (!page.text) continue;
    if (pages.length > 1) parts.push(`## Page ${page.page}`);
    parts.push(paragraphs(page.text).join('\n\n'));
  }
  return parts.join('\n\n');
}

// Chunks of about `size` characters for RAG, cut at paragraph ends, each with its pages.
export function toChunks(pages, size) {
  const chunks = [];
  let current = { text: '', pages: new Set() };
  const flush = () => {
    if (!current.text) return;
    chunks.push({ index: chunks.length, pages: [...current.pages], text: current.text });
    current = { text: '', pages: new Set() };
  };
  for (const page of pages) {
    for (let para of paragraphs(page.text)) {
      // A paragraph longer than a chunk is cut at sentence ends, or hard at the size.
      while (para.length > size) {
        // The sentence end is kept, so it must be inside the first `size` characters.
        const cut = Math.max(para.lastIndexOf('. ', size - 1), para.lastIndexOf('。', size - 1));
        const at = cut > size / 2 ? cut + 1 : size;
        if (current.text) flush();
        current.pages.add(page.page);
        current.text = para.slice(0, at).trim();
        flush();
        para = para.slice(at).trim();
      }
      if (!para) continue;
      if (current.text && current.text.length + para.length + 2 > size) flush();
      current.text = current.text ? `${current.text}\n\n${para}` : para;
      current.pages.add(page.page);
    }
  }
  flush();
  return chunks;
}
