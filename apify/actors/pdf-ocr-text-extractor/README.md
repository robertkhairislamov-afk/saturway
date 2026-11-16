# PDF & Image to Text: OCR for Scans, Markdown & RAG Chunks

**Turn PDFs and images into clean text.** Paste file links, upload a file or point to another Actor's dataset. Each PDF page's own text is read exactly; **only scanned pages go through OCR**, in 20 languages including Thai, Chinese, Japanese, Korean, Arabic and Hindi. You get the full text, Markdown, the text of every page, chunks for RAG with page numbers, and the document's metadata. **$2 per 1,000 documents, plus $3 per 1,000 pages read with OCR.**

## What can it do?

- 📄 **PDFs with text**: the text layer of every page, exact and fast, with no OCR cost.
- 🖨️ **Scanned PDFs and mixed PDFs**: pages without text (scans, photos of pages) are turned into images and read with OCR (Tesseract 5). Text pages of the same file stay exact.
- 🖼️ **Images**: PNG, JPEG, TIFF, WebP, GIF and BMP: screenshots, receipts, invoices, menus, labels, photos of documents.
- 🌏 **20 OCR languages**: English, German, French, Spanish, Italian, Portuguese, Dutch, Polish, Turkish, Russian, Ukrainian, Arabic, Hindi, Thai, Vietnamese, Indonesian, Chinese (simplified and traditional), Japanese, Korean. Several at once for mixed documents.
- 🧩 **Ready for LLMs and RAG**: Markdown with a section per page, and chunks of a size you choose, cut at paragraph ends, each with its page numbers for citations.
- 🔎 **Quality you can check**: for every page, whether it came from the text layer or OCR, and the OCR confidence (0-100). Low-confidence pages are flagged.
- 🗂️ **Bulk**: many links in one run, or the file links found in another Actor's dataset (for example the PDFs a crawler found). Page ranges, password-protected PDFs, size and page limits.

## Who uses it

- **AI and RAG builders**: load reports, manuals, contracts and papers into a vector database, with page numbers for citations.
- **Back offices and accountants**: read scanned invoices, receipts and forms in bulk, then search or parse the text.
- **Researchers and analysts**: text from annual reports, tenders, filings and academic papers.
- **Automation (n8n, Make, Zapier)**: a file arrives, the Actor returns its text, the next step uses it.

## How to extract text from PDFs and images

1. Paste **File links** (direct links to the PDF or image), or **upload a file**, or give a **dataset ID** whose items hold links.
2. Choose **OCR**: *Auto* (only pages without text, the default), *Always* or *Never*, and the **OCR languages** of your documents.
3. Run, then download the results as JSON, CSV or Excel, or use them through the API.

### Example input

```json
{
  "urls": ["https://api.apify.com/v2/key-value-stores/McK7YieXsXVetN4uP/records/sample-invoice-report.pdf?signature=ur72I9CODSvHy1tTWcOr"],
  "ocr": "auto",
  "languages": ["eng", "tha"],
  "includeChunks": true,
  "chunkSize": 1500
}
```

### Example output

The example file has a report page with a text layer and a scanned invoice page:

```json
{
  "url": "https://…/sample-invoice-report.pdf",
  "fileName": "sample-invoice-report.pdf",
  "fileType": "pdf",
  "pageCount": 2,
  "pagesRead": 2,
  "pagesWithOcr": 1,
  "ocrLanguages": ["eng"],
  "ocrConfidence": 96,
  "title": null,
  "characters": 295,
  "words": 50,
  "text": "Quarterly Report\nRevenue grew by 12 percent in the third quarter…\n\nINVOICE 2026-117\nMozart Standard Co., Pattaya\nTotal due: 4,250.00 THB\n\nPayment within 14 days.",
  "markdown": "## Page 1\n\nQuarterly Report\n\nRevenue grew by 12 percent…\n\n## Page 2\n\nINVOICE 2026-117\n\nMozart Standard Co., Pattaya\n\nTotal due: 4,250.00 THB\n\nPayment within 14 days.",
  "pages": [
    { "page": 1, "method": "text", "characters": 199, "ocrConfidence": null, "text": "Quarterly Report…" },
    { "page": 2, "method": "ocr", "characters": 94, "ocrConfidence": 96, "text": "INVOICE 2026-117…" }
  ],
  "chunks": [{ "index": 0, "pages": [1, 2], "text": "Quarterly Report…" }],
  "warnings": [],
  "processedAt": "2026-11-16T10:00:00.000Z"
}
```

## How much does it cost?

You pay for results only: **$2 per 1,000 documents** read and **$3 per 1,000 pages read with OCR**. That is the price on the Apify Free plan; paid Apify plans pay less. No start fee.

- A 40-page PDF with a text layer: one document, **$0.002**.
- A 10-page scanned PDF: one document and 10 OCR pages, **$0.032**.
- 1,000 receipt photos: 1,000 documents and 1,000 OCR pages, **$5**.

Files that fail (broken links, web pages instead of files, wrong passwords) are not charged. With OCR on *Auto*, pages that already have text never pay for OCR.

## Tips

- **Pick the right languages**: OCR reads only the languages you choose. For a Thai document with English words, choose both Thai and English. Fewer languages are faster and more accurate.
- **Low confidence?** Check the language, and for very small print raise **OCR resolution** to 400.
- **Only a few pages needed?** Use **Pages**, for example `1-3` for the summary of long reports.
- **Large batches**: the run's memory sets the OCR speed: each 4 GB of memory adds a CPU core, and pages are read in parallel.
- **Run summary**: every file with its pages, OCR pages or the reason it failed is in the key-value store as `SUMMARY`.

## FAQ

**Can it read files from Google Drive or Dropbox links?** Not from the links: both sites' robots.txt doesn't allow automated downloads, and this Actor respects robots.txt. Download the file and upload it in the input, or use a direct link from a site that allows downloads.

**Is the text exact?** Text from a PDF's text layer is exactly what the file contains. OCR text is a reading of an image: on clean scans it is usually very accurate (confidence 90+), on photos, handwriting or low resolution less so. Every OCR page has its confidence.

**Does it keep tables and layout?** It returns the text in reading order with paragraphs. Table cells come out as text lines; the layout itself is not kept.

**Are my files stored?** Files are downloaded into the run, read, and deleted when the run ends. Only the results are saved in your own Apify storage.

**What about very long documents?** Dataset records are limited in size, so for very long documents the record holds the first 200,000 characters and `fullContentUrl` links to the full text, Markdown, pages and chunks.

Missing a feature or a language? Open an issue in the Issues tab or email [support@mozartstandard.com](mailto:support@mozartstandard.com), and we will reply quickly.

If this Actor saved you time, a short review in the **Reviews** tab helps other users find it and helps us keep improving it.
