import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { processDocument } from '../src/document.js';
import { fileKind, fileNameOf } from '../src/filetype.js';
import { cleanText, meaningfulChars, paragraphs, parsePageRange, toChunks, toMarkdown } from '../src/text.js';

const fixture = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));
const hasTools = (() => {
  try {
    execFileSync('tesseract', ['--version']);
    execFileSync('pdfinfo', ['-v']);
    return true;
  } catch {
    return false;
  }
})();
const options = (extra = {}) => ({
  ocrMode: 'auto', languages: ['eng'], pagesText: '', pageFilter: parsePageRange(''), maxPages: 500, minTextChars: 25,
  dpi: 300, ocrConcurrency: 1, includeMarkdown: true, includePages: true, chunkSize: 0, ...extra,
});
const unlimited = { take: (n) => n };

test('page ranges', () => {
  const f = parsePageRange('1-3, 5, 10-');
  assert.deepEqual([1, 2, 3, 4, 5, 9, 10, 99].map(f), [true, true, true, false, true, false, true, true]);
  assert.equal(parsePageRange('')(7), true);
  assert.throws(() => parsePageRange('3-1'), /not a valid range/);
  assert.throws(() => parsePageRange('a'), /not a page or a range/);
});

test('text cleaning, Markdown and chunks keep page numbers', () => {
  assert.equal(cleanText('Hello  \r\nwor-\nld\f\n\n\n\nEnd'), 'Hello\nworld\n\nEnd');
  assert.equal(meaningfulChars(' . , 12 ab '), 4);
  const pages = [{ page: 1, text: 'First line\nsame paragraph.\n\nSecond paragraph.' }, { page: 2, text: 'Third paragraph on page two.' }];
  assert.equal(toMarkdown({ title: 'Doc', pages }), '# Doc\n\n## Page 1\n\nFirst line same paragraph.\n\nSecond paragraph.\n\n## Page 2\n\nThird paragraph on page two.');
  const chunks = toChunks(pages, 45);
  assert.deepEqual(chunks.map((c) => c.pages), [[1], [2]]);
  assert.deepEqual(toChunks(pages, 80).map((c) => c.pages), [[1, 2]]);
  assert.ok(chunks.every((c) => c.text.length <= 45));
  const long = toChunks([{ page: 3, text: 'A sentence here. '.repeat(20) }], 100);
  assert.ok(long.length > 2 && long.every((c) => c.text.length <= 100 && c.pages[0] === 3));
});

test('file kinds by their first bytes and names from headers', () => {
  assert.equal(fileKind(fixture('text.pdf')), 'pdf');
  assert.equal(fileKind(fixture('scan.png')), 'png');
  assert.equal(fileKind(Buffer.from('<!DOCTYPE html><html>')), 'html');
  assert.equal(fileKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  assert.equal(fileKind(Buffer.from('hello')), null);
  assert.equal(fileNameOf('https://x.com/a/report%202026.pdf?x=1', null), 'report 2026.pdf');
  assert.equal(fileNameOf('https://x.com/dl', 'attachment; filename="q3.pdf"'), 'q3.pdf');
  assert.equal(fileNameOf('https://x.com/dl', "attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf"), 'résumé.pdf');
});

test('a text PDF is read from its text layer, without OCR', { skip: !hasTools }, async () => {
  const { record, ocrCharged } = await processDocument({ buffer: fixture('text.pdf'), kind: 'pdf' }, options(), unlimited);
  assert.equal(ocrCharged, 0);
  assert.equal(record.pageCount, 1);
  assert.equal(record.pagesWithOcr, 0);
  assert.match(record.text, /Revenue grew by 12 percent/);
  assert.equal(record.pages[0].method, 'text');
});

test('a mixed PDF: text page from the layer, scanned page with OCR', { skip: !hasTools }, async () => {
  const { record, ocrCharged } = await processDocument({ buffer: fixture('mixed.pdf'), kind: 'pdf' }, options({ chunkSize: 300 }), unlimited);
  assert.equal(ocrCharged, 1);
  assert.deepEqual(record.pages.map((p) => p.method), ['text', 'ocr']);
  assert.match(record.pages[1].text, /INVOICE 2026-117/);
  assert.match(record.pages[1].text, /4,250\.00 THB/);
  assert.ok(record.ocrConfidence > 80);
  assert.match(record.markdown, /## Page 2/);
  assert.ok(record.chunks.length >= 1 && record.chunks.at(-1).pages.includes(2));
});

test('OCR off: scanned pages stay empty with a hint; page range; image OCR; cost limit', { skip: !hasTools }, async () => {
  const never = await processDocument({ buffer: fixture('scan.pdf'), kind: 'pdf' }, options({ ocrMode: 'never' }), unlimited);
  assert.equal(never.ocrCharged, 0);
  assert.match(never.record.warnings.join(' '), /no text layer/);
  const ranged = await processDocument({ buffer: fixture('mixed.pdf'), kind: 'pdf' }, options({ pageFilter: parsePageRange('2') }), unlimited);
  assert.deepEqual(ranged.record.pages.map((p) => p.page), [2]);
  const image = await processDocument({ buffer: fixture('scan.png'), kind: 'png' }, options(), unlimited);
  assert.match(image.record.text, /Payment within 14 days/);
  assert.equal(image.ocrCharged, 1);
  const broke = await processDocument({ buffer: fixture('mixed.pdf'), kind: 'pdf' }, options(), { take: () => 0 });
  assert.equal(broke.ocrCharged, 0);
  assert.match(broke.record.warnings.join(' '), /maximum cost/);
  await assert.rejects(processDocument({ buffer: Buffer.from('x'), kind: null }, options(), unlimited), /unsupported file type/);
});

test('paragraphs: headings and form lines stay apart, wrapped sentences are joined', () => {
  assert.deepEqual(paragraphs('Quarterly Report\nRevenue grew by 12 percent,\ndriven by new customers.'), ['Quarterly Report', 'Revenue grew by 12 percent, driven by new customers.']);
  assert.deepEqual(paragraphs('This is a long sentence that wraps\nonto the next line.'), ['This is a long sentence that wraps onto the next line.']);
  assert.deepEqual(paragraphs('INVOICE 2026-117\nTotal due: 4,250.00 THB'), ['INVOICE 2026-117', 'Total due: 4,250.00 THB']);
});
