// The command-line tools inside the Actor's image: Poppler (pdfinfo, pdftotext, pdftoppm) for PDFs
// and Tesseract for OCR. Each call has a time limit; errors carry the tool's own message.

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const run = (cmd, args, { timeoutMs = 120000, binary = false } = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 256 * 1024 * 1024, encoding: binary ? 'buffer' : 'utf8' }, (error, stdout, stderr) => {
    if (error) {
      const message = String(stderr || error.message).trim().split('\n').slice(-3).join(' ');
      const failure = new Error(error.killed ? `${cmd} took too long` : message);
      failure.stderr = String(stderr ?? '');
      reject(failure);
    } else resolve(stdout);
  });
});

const passwordArgs = (password) => (password ? ['-upw', password] : []);

// Page count, metadata and whether the file is encrypted.
export async function pdfInfo(file, password) {
  let out;
  try {
    out = await run('pdfinfo', [...passwordArgs(password), '-isodates', file], { timeoutMs: 60000 });
  } catch (error) {
    if (/incorrect password|command line error.*password/i.test(error.stderr ?? error.message)) {
      throw new Error(password ? 'the PDF password is wrong.' : 'the PDF is protected with a password. Add it under "PDF password".');
    }
    throw new Error(`the file is not a readable PDF (${error.message}).`);
  }
  const field = (name) => new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(out)?.[1]?.trim() || null;
  return {
    pages: Number(field('Pages')) || 0,
    title: field('Title'),
    author: field('Author'),
    subject: field('Subject'),
    keywords: field('Keywords'),
    creator: field('Creator'),
    producer: field('Producer'),
    createdAt: field('CreationDate'),
    modifiedAt: field('ModDate'),
    encrypted: /^Encrypted:\s*yes/m.test(out),
    pageSize: field('Page size'),
  };
}

// The text layer of pages first..last, one string per page.
export async function pdfText(file, { first, last, password }) {
  const out = await run('pdftotext', [...passwordArgs(password), '-enc', 'UTF-8', '-f', String(first), '-l', String(last), file, '-'], { timeoutMs: 180000 });
  const pages = out.split('\f');
  return Array.from({ length: last - first + 1 }, (_, i) => pages[i] ?? '');
}

// One page as a grayscale PNG for OCR.
export async function renderPage(file, page, { dpi, password, outBase }) {
  await run('pdftoppm', [...passwordArgs(password), '-f', String(page), '-l', String(page), '-r', String(dpi), '-gray', '-png', '-singlefile', file, outBase], { timeoutMs: 120000 });
  return `${outBase}.png`;
}

// OCR of one image: the text and the mean word confidence (0-100).
export async function ocr(image, { languages, outBase }) {
  await run('tesseract', [image, outBase, '-l', languages.join('+'), '--psm', '3', 'txt', 'tsv'], { timeoutMs: 180000 });
  const text = await readFile(`${outBase}.txt`, 'utf8');
  const tsv = await readFile(`${outBase}.tsv`, 'utf8');
  const confidences = tsv.split('\n').slice(1).map((line) => line.split('\t'))
    .filter((cols) => cols.length >= 12 && cols[11].trim() && Number(cols[10]) >= 0)
    .map((cols) => Number(cols[10]));
  const confidence = confidences.length ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null;
  return { text, confidence, words: confidences.length };
}

// Languages installed for Tesseract.
export async function installedLanguages() {
  const out = await run('tesseract', ['--list-langs'], { timeoutMs: 30000 });
  return out.split('\n').slice(1).map((line) => line.trim()).filter((line) => line && line !== 'osd');
}
