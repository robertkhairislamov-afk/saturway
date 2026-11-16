// The kind of a downloaded file from its first bytes (the server's content type is often wrong).

export function fileKind(buffer) {
  const b = buffer.subarray(0, 16);
  const ascii = b.toString('latin1');
  if (ascii.includes('%PDF-') || buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')) return 'pdf';
  if (b[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (ascii.startsWith('GIF8')) return 'gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  if (ascii.startsWith('II*\u0000') || ascii.startsWith('MM\u0000*')) return 'tiff';
  if (ascii.startsWith('BM')) return 'bmp';
  if (/^\s*<(!doctype html|html)/i.test(buffer.subarray(0, 512).toString('utf8'))) return 'html';
  return null;
}

export const IMAGE_KINDS = new Set(['png', 'jpeg', 'gif', 'webp', 'tiff', 'bmp']);

// The file name from a Content-Disposition header or the last part of the link.
export function fileNameOf(url, disposition) {
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(disposition ?? '');
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(disposition ?? '');
  const fromHeader = star ? decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')) : plain?.[1]?.trim();
  if (fromHeader) return fromHeader;
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop();
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}
