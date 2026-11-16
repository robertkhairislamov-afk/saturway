// PDF & Image to Text: text from PDFs (their own text layer, OCR for scanned pages) and from
// images (OCR), by link, upload or from another Actor's dataset. Markdown, pages, chunks for RAG
// and document metadata. Files are downloaded only where the site's robots.txt allows it.

import { Actor, log } from 'apify';
import { EnvHttpProxyAgent, fetch } from 'undici';

import { processDocument } from './document.js';
import { fileKind, fileNameOf } from './filetype.js';
import { isAllowed, parseRobots } from './robots.js';
import { parsePageRange } from './text.js';
import { installedLanguages } from './tools.js';

const ITEM_EVENT = 'apify-default-dataset-item';
const OCR_EVENT = 'ocr-page';
const USER_AGENT = 'Mozilla/5.0 (compatible; PdfOcrTextExtractor/0.1; +https://apify.com/robertosan16/pdf-ocr-text-extractor)';
// Our own example: a report page with a text layer and a scanned invoice page (read with OCR).
const EXAMPLE_INPUT = { urls: ['https://api.apify.com/v2/key-value-stores/McK7YieXsXVetN4uP/records/sample-invoice-report.pdf?signature=ur72I9CODSvHy1tTWcOr'] };
const DOWNLOAD_TIMEOUT_MS = 120000;
// Dataset records are limited to 9 MB; longer documents keep their full text in the key-value store.
const MAX_RECORD_BYTES = 8 * 1024 * 1024;
const envAgent = process.env.HTTPS_PROXY || process.env.https_proxy ? new EnvHttpProxyAgent() : undefined;
// Tesseract's own threads would fight the parallel pages for the CPU.
process.env.OMP_THREAD_LIMIT ??= '1';

const toList = (value) => (Array.isArray(value) ? value : value ? String(value).split(/[\s,]+/) : [])
  .map((item) => (typeof item === 'object' && item ? item.url : item))
  .map((item) => String(item ?? '').trim()).filter(Boolean);

await Actor.init();

try {
  const raw = (await Actor.getInput()) ?? {};
  const hasInput = toList(raw.urls).length || raw.file || String(raw.datasetId ?? '').trim();
  const input = hasInput ? raw : { ...raw, ...EXAMPLE_INPUT };
  if (!hasInput) log.warning('No files in the input; reading an example PDF (a text page and a scanned page).');

  const languages = [...new Set(toList(input.languages ?? ['eng']))];
  const installed = await installedLanguages();
  const missing = languages.filter((lang) => !installed.includes(lang));
  if (missing.length) throw new Error(`OCR language not available: ${missing.join(', ')}. Available: ${installed.join(', ')}.`);
  const ocrMode = ['auto', 'always', 'never'].includes(input.ocr) ? input.ocr : 'auto';
  const whole = (name, value, min, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`"${name}" must be a whole number from ${min} to ${max}.`);
    return n;
  };
  const memoryMb = Actor.getEnv().memoryMbytes ?? 4096;
  const options = {
    ocrMode,
    languages: languages.length ? languages : ['eng'],
    pagesText: String(input.pages ?? '').trim(),
    pageFilter: parsePageRange(input.pages),
    maxPages: whole('maxPagesPerDocument', input.maxPagesPerDocument ?? 500, 1, 5000),
    minTextChars: whole('minTextChars', input.minTextChars ?? 25, 0, 10000),
    dpi: whole('ocrDpi', input.ocrDpi ?? 300, 72, 600),
    password: String(input.pdfPassword ?? '') || undefined,
    // Apify gives one CPU core per 4 GB of memory; OCR uses one core per page.
    ocrConcurrency: Math.max(1, Math.min(8, Math.floor(memoryMb / 4096))),
    includeMarkdown: input.includeMarkdown !== false,
    includePages: input.includePages !== false,
    chunkSize: input.includeChunks ? whole('chunkSize', input.chunkSize ?? 1500, 200, 20000) : 0,
  };
  const maxFileBytes = whole('maxFileSizeMb', input.maxFileSizeMb ?? 100, 1, 500) * 1024 * 1024;

  // Files: links, the uploaded file, links from a dataset.
  const sources = toList(input.urls).map((url) => ({ url }));
  if (input.file) sources.push({ url: String(input.file).trim(), uploaded: true });
  const datasetId = String(input.datasetId ?? '').trim();
  if (datasetId) {
    const field = String(input.datasetField ?? 'url').trim() || 'url';
    const { items } = await (await Actor.openDataset(datasetId, { forceCloud: true })).getData({ limit: 10000, clean: true });
    const before = sources.length;
    for (const item of items) for (const url of toList(item[field])) sources.push({ url });
    log.info(`Dataset ${datasetId}: ${sources.length - before} links in the field "${field}".`);
  }
  const seen = new Set();
  const files = sources.filter((s) => (seen.has(s.url) ? false : seen.add(s.url)));

  const charging = Actor.getChargingManager();
  // OCR pages reserved within the user's maximum cost per run.
  let ocrReserved = 0;
  const budget = {
    take(n) {
      const room = Math.max(0, charging.calculateMaxEventChargeCountWithinLimit(OCR_EVENT) - ocrReserved);
      const granted = Math.min(n, Number.isFinite(room) ? room : n);
      ocrReserved += granted;
      return granted;
    },
  };

  const robotsCache = new Map();
  async function allowedByRobots(url) {
    const { origin, pathname, search, hostname } = new URL(url);
    // Files uploaded in the input live in the user's own Apify storage.
    if (hostname === 'api.apify.com') return true;
    if (!robotsCache.has(origin)) {
      robotsCache.set(origin, fetch(`${origin}/robots.txt`, { dispatcher: envAgent, signal: AbortSignal.timeout(15000), headers: { 'user-agent': USER_AGENT } })
        .then(async (res) => (res.ok && !/text\/html/i.test(res.headers.get('content-type') ?? '') ? parseRobots(await res.text()) : []))
        .catch(() => []));
    }
    return isAllowed(await robotsCache.get(origin), pathname + search);
  }

  async function download(url) {
    if (!/^https?:\/\//i.test(url)) throw new Error('not a link: use an address starting with http:// or https://.');
    if (!(await allowedByRobots(url))) {
      throw new Error(`the site's robots.txt does not allow automated downloads from ${new URL(url).hostname}. Download the file yourself and upload it in the input instead.`);
    }
    // Uploaded files are in the user's Apify storage: the run's own token opens them (sent to the
    // Apify API only, with no redirects, so it never reaches another host).
    const apify = new URL(url).hostname === 'api.apify.com' && process.env.APIFY_TOKEN;
    const res = await fetch(url, {
      dispatcher: envAgent,
      redirect: apify ? 'error' : 'follow',
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, accept: 'application/pdf,image/*,*/*;q=0.8', ...(apify ? { authorization: `Bearer ${process.env.APIFY_TOKEN}` } : {}) },
    });
    if (!res.ok) throw new Error(`the link answered HTTP ${res.status}.`);
    const declared = Number(res.headers.get('content-length'));
    if (declared > maxFileBytes) throw new Error(`the file is ${(declared / 1048576).toFixed(1)} MB, more than the limit of ${maxFileBytes / 1048576} MB.`);
    const chunks = [];
    let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > maxFileBytes) throw new Error(`the file is larger than the limit of ${maxFileBytes / 1048576} MB.`);
      chunks.push(chunk);
    }
    return { buffer: Buffer.concat(chunks), finalUrl: res.url || url, disposition: res.headers.get('content-disposition') };
  }

  const store = await Actor.openKeyValueStore();
  const summary = [];
  let saved = 0;
  let ocrCharged = 0;
  let stoppedAtLimit = false;
  // Downloads overlap; OCR inside a document uses the CPU cores.
  const queue = [...files.entries()];
  async function worker() {
    while (queue.length) {
      const [index, source] = queue.shift();
      if (charging.calculateMaxEventChargeCountWithinLimit(ITEM_EVENT) <= saved) {
        stoppedAtLimit = true;
        summary.push({ url: source.url, status: 'skipped', error: 'maximum cost per run reached' });
        continue;
      }
      const started = Date.now();
      try {
        const { buffer, finalUrl, disposition } = await download(source.url);
        const kind = fileKind(buffer);
        if (kind === 'html') throw new Error('the link opens a web page, not a file. Use the direct link to the PDF or image.');
        const { record, ocrCharged: ocrPages } = await processDocument({ buffer, kind }, options, budget);
        let output = {
          url: source.uploaded ? null : source.url,
          fileName: fileNameOf(finalUrl, disposition) ?? (source.uploaded ? 'uploaded file' : null),
          fileType: kind,
          fileSizeBytes: buffer.length,
          ...record,
          processedAt: new Date().toISOString(),
        };
        if (Buffer.byteLength(JSON.stringify(output)) > MAX_RECORD_BYTES) {
          const key = `document-${index + 1}`;
          await store.setValue(key, output);
          const { text, markdown, pages, chunks, ...rest } = output;
          output = { ...rest, text: text.slice(0, 200000), fullContentUrl: store.getPublicUrl(key), warnings: [...rest.warnings, `The document is long: the record has the first 200,000 characters; the full text, Markdown, pages and chunks are at fullContentUrl.`] };
        }
        await Actor.pushData(output);
        saved++;
        if (ocrPages > 0) {
          await Actor.charge({ eventName: OCR_EVENT, count: ocrPages });
          ocrCharged += ocrPages;
        }
        summary.push({ url: source.url, status: 'ok', pages: record.pagesRead, ocrPages, characters: record.characters, seconds: Math.round((Date.now() - started) / 1000) });
        log.info(`${output.fileName ?? source.url}: ${record.pagesRead} pages (${record.pagesWithOcr} with OCR), ${record.characters} characters.`);
      } catch (error) {
        summary.push({ url: source.url, status: 'failed', error: error.message });
        log.warning(`${source.url}: ${error.message}`);
      }
      await Actor.setStatusMessage(`Read ${saved} of ${files.length} files${ocrCharged ? `, ${ocrCharged} pages with OCR` : ''}.`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, files.length) }, worker));

  await Actor.setValue('SUMMARY', { files: files.length, saved, ocrPages: ocrCharged, items: summary });
  const failed = summary.filter((s) => s.status === 'failed');
  if (files.length && failed.length === files.length) {
    throw new Error(failed.length === 1 ? `The file could not be read: ${failed[0].error}` : `None of the ${failed.length} files could be read. First error: ${failed[0].error}`);
  }
  const notes = [];
  if (failed.length) notes.push(`${failed.length} failed, see SUMMARY`);
  if (stoppedAtLimit) notes.push('stopped at the maximum cost per run');
  const message = `Read ${saved} of ${files.length} files${ocrCharged ? `, ${ocrCharged} pages with OCR` : ''}${notes.length ? ` (${notes.join('; ')})` : ''}.`;
  log.info(message);
  await Actor.exit(message);
} catch (error) {
  log.error(error.stack ?? String(error));
  await Actor.fail(`${error.message} If this looks wrong, please report it in the Issues tab of this Actor and we will fix it quickly.`);
}
