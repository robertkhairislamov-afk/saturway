// Visual fingerprints of listing photos, to find the same unit when agencies re-save the owner's
// photos (a re-saved file has a new name, the picture stays the same). Each photo is read as a
// 64×48 thumbnail from the image service (about 8 KB) and reduced to a 64-bit difference hash:
// near-identical pictures differ in a few bits, different pictures in about half of them.

import jpeg from 'jpeg-js';

const BUCKET = 'prd-lifullconnect-backend-b2b-images';

export function thumbnailForKey(key, width = 64, height = 48) {
  // toFormat: some originals are WebP or PNG, and the thumbnail keeps the original format otherwise.
  const cfg = { bucket: BUCKET, key, edits: { resize: { width, height, fit: 'cover' }, toFormat: 'jpeg' } };
  return `https://img.fazwaz.com/${Buffer.from(JSON.stringify(cfg)).toString('base64')}`;
}

// The short ID a photo hash is stored under: the start of the file's sha256.
export const shortPhotoId = (key) => String(key ?? '').split('/').pop().replace(/\.\w+$/, '').slice(0, 16);

// Difference hash of RGBA pixels: grey levels averaged into a 9×8 grid, then each cell compared with
// its right neighbour. Returned as 16 hex characters.
export function differenceHash({ width, height, data }) {
  const grid = new Float64Array(9 * 8);
  const counts = new Float64Array(9 * 8);
  for (let y = 0; y < height; y++) {
    const gy = Math.min(7, Math.floor((y * 8) / height));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(8, Math.floor((x * 9) / width));
      const i = (y * width + x) * 4;
      grid[gy * 9 + gx] += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      counts[gy * 9 + gx]++;
    }
  }
  for (let i = 0; i < grid.length; i++) grid[i] /= counts[i] || 1;
  let bits = 0n;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      bits <<= 1n;
      if (grid[row * 9 + col] > grid[row * 9 + col + 1]) bits |= 1n;
    }
  }
  return bits.toString(16).padStart(16, '0');
}

export const hashOfJpeg = (buffer) => differenceHash(jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 64 }));

export function hammingDistance(a, b) {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  while (x) {
    x &= x - 1n;
    n++;
  }
  return n;
}

// Photo hashes kept between runs, in 16 records by the first character of the photo ID.
const SHARDS = '0123456789abcdef'.split('');
export async function loadPhotoHashes(store) {
  const hashes = new Map();
  for (const shard of SHARDS) for (const [id, h] of Object.entries((await store.getValue(`photo-hashes-${shard}`)) ?? {})) hashes.set(id, h);
  return hashes;
}
export async function savePhotoHashes(store, hashes) {
  const parts = Object.fromEntries(SHARDS.map((s) => [s, {}]));
  for (const [id, h] of hashes) if (SHARDS.includes(id[0])) parts[id[0]][id] = h;
  for (const shard of SHARDS) await store.setValue(`photo-hashes-${shard}`, parts[shard]);
}
