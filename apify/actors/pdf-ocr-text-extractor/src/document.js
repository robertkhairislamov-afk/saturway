// One document to text: a PDF's own text layer page by page, OCR for pages without one (scans),
// and OCR for images. The result has the text, Markdown, pages, chunks for RAG and metadata.

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { IMAGE_KINDS } from './filetype.js';
import { cleanText, meaningfulChars, toChunks, toMarkdown } from './text.js';
import { ocr, pdfInfo, pdfText, renderPage } from './tools.js';

// Runs `work` for every item with at most `limit` at a time, keeping the order of results.
async function mapLimit(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await work(items[i], i);
    }
  }));
  return results;
}

// options: ocrMode (auto | always | never), languages, pageFilter, maxPages, minTextChars, dpi,
// password, ocrConcurrency, includeMarkdown, includePages, chunkSize (0 = none).
// budget.take(n): how many of n OCR pages may still be charged (the run's spending limit).
export async function processDocument({ buffer, kind }, options, budget) {
  const dir = await mkdtemp(join(tmpdir(), 'doc-'));
  try {
    const file = join(dir, `input.${kind}`);
    await writeFile(file, buffer);
    const warnings = [];
    let meta = {};
    let pages;
    let pageCount;

    if (kind === 'pdf') {
      meta = await pdfInfo(file, options.password);
      pageCount = meta.pages;
      if (!pageCount) throw new Error('the PDF has no pages.');
      let selected = Array.from({ length: pageCount }, (_, i) => i + 1).filter(options.pageFilter);
      if (selected.length === 0) throw new Error(`no pages in the range "${options.pagesText}" (the PDF has ${pageCount}).`);
      if (selected.length > options.maxPages) {
        warnings.push(`Only the first ${options.maxPages} of ${selected.length} selected pages were read (Max pages per document).`);
        selected = selected.slice(0, options.maxPages);
      }
      const layer = await pdfText(file, { first: selected[0], last: selected.at(-1), password: options.password });
      pages = selected.map((page) => ({ page, text: cleanText(layer[page - selected[0]]) }));
      const scans = pages.filter((p) => options.ocrMode === 'always' || (options.ocrMode === 'auto' && meaningfulChars(p.text) < options.minTextChars));
      const allowed = options.ocrMode === 'never' ? 0 : budget.take(scans.length);
      if (allowed < scans.length) warnings.push(`${scans.length - allowed} pages without text were not read with OCR: the run reached its maximum cost.`);
      await mapLimit(scans.slice(0, allowed), options.ocrConcurrency, async (p) => {
        let result;
        try {
          const image = await renderPage(file, p.page, { dpi: options.dpi, password: options.password, outBase: join(dir, `page-${p.page}`) });
          result = await ocr(image, { languages: options.languages, outBase: join(dir, `ocr-${p.page}`) });
        } catch (error) {
          // One unreadable page does not lose the document; it is not charged.
          warnings.push(`Page ${p.page} could not be read with OCR (${error.message}).`);
          return;
        }
        // OCR replaces the text layer only when it reads more (a scan with a few stray letters).
        if (options.ocrMode === 'always' || meaningfulChars(result.text) >= meaningfulChars(p.text)) {
          Object.assign(p, { text: cleanText(result.text), method: 'ocr', ocrConfidence: result.confidence });
        } else p.method = 'text';
        p.ocrCharged = true;
      });
      for (const p of pages) p.method ??= 'text';
      if (options.ocrMode === 'never' && scans.length === 0) {
        const empty = pages.filter((p) => meaningfulChars(p.text) < options.minTextChars).length;
        if (empty > 0) warnings.push(`${empty} pages have no text layer (probably scans); turn on OCR to read them.`);
      }
    } else if (IMAGE_KINDS.has(kind)) {
      pageCount = 1;
      if (options.ocrMode === 'never') throw new Error('this is an image; it can only be read with OCR, which is turned off.');
      if (budget.take(1) < 1) throw new Error('the run reached its maximum cost before this image.');
      const result = await ocr(file, { languages: options.languages, outBase: join(dir, 'ocr') });
      pages = [{ page: 1, text: cleanText(result.text), method: 'ocr', ocrConfidence: result.confidence, ocrCharged: true }];
    } else {
      throw new Error(`unsupported file type (${kind ?? 'unknown'}). Use PDF, PNG, JPEG, TIFF, WebP, GIF or BMP.`);
    }

    const text = pages.map((p) => p.text).filter(Boolean).join('\n\n');
    const ocrPages = pages.filter((p) => p.method === 'ocr');
    const confidences = ocrPages.map((p) => p.ocrConfidence).filter((c) => c != null);
    if (!text) warnings.push('No text was found.');
    else if (confidences.length && Math.min(...confidences) < 60) warnings.push('Some OCR pages have low confidence (below 60): check the language setting or the scan quality.');
    return {
      record: {
        pageCount,
        pagesRead: pages.length,
        pagesWithOcr: ocrPages.length,
        ocrLanguages: ocrPages.length ? options.languages : [],
        ocrConfidence: confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null,
        title: meta.title ?? null,
        author: meta.author ?? null,
        subject: meta.subject ?? null,
        keywords: meta.keywords ?? null,
        creator: meta.creator ?? null,
        producer: meta.producer ?? null,
        createdAt: meta.createdAt ?? null,
        modifiedAt: meta.modifiedAt ?? null,
        characters: text.length,
        words: (text.match(/[\p{L}\p{N}]+/gu) ?? []).length,
        text,
        ...(options.includeMarkdown ? { markdown: toMarkdown({ title: meta.title, pages }) } : {}),
        ...(options.includePages ? { pages: pages.map(({ page, method, text: pageText, ocrConfidence }) => ({ page, method, characters: pageText.length, ocrConfidence: ocrConfidence ?? null, text: pageText })) } : {}),
        ...(options.chunkSize > 0 ? { chunks: toChunks(pages, options.chunkSize) } : {}),
        warnings,
      },
      ocrCharged: pages.filter((p) => p.ocrCharged).length,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
