#!/usr/bin/env bash
# Builds the test files: a text PDF, a scanned page (PNG and image-only PDF) and a mixed PDF.
# Run from the Actor folder: bash test/make-fixtures.sh (needs LibreOffice, ImageMagick, pdfunite).
set -euo pipefail
out="$(cd "$(dirname "$0")" && pwd)/fixtures"
mkdir -p "$out"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cat > "$tmp/text.html" <<'HTML'
<html><head><title>Quarterly Report</title></head><body>
<h1>Quarterly Report</h1>
<p>Revenue grew by 12 percent in the third quarter, driven by new customers in Thailand and Vietnam.</p>
<p>The team shipped three new products and reduced support response time to four hours.</p>
</body></html>
HTML
libreoffice --headless --convert-to pdf --outdir "$tmp" "$tmp/text.html" > /dev/null
cp "$tmp/text.pdf" "$out/text.pdf"
# A scanned page: black text on white at 300 dpi (A4 width 2480 px).
convert -size 2480x1200 xc:white -fill black -font /usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf -pointsize 64 \
  -annotate +180+220 'INVOICE 2026-117' -annotate +180+360 'Mozart Standard Co., Pattaya' \
  -annotate +180+500 'Total due: 4,250.00 THB' -annotate +180+640 'Payment within 14 days.' \
  -units PixelsPerInch -density 300 -colorspace Gray "$out/scan.png"
convert "$out/scan.png" -units PixelsPerInch -density 300 "$out/scan.pdf"
pdfunite "$out/text.pdf" "$out/scan.pdf" "$out/mixed.pdf"
ls "$out"
