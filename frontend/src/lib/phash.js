// A real perceptual hash computed in the browser, used to show what the hash "sees" while the server works.
// Same recipe as imagehash.phash: 32x32 grayscale -> 2D DCT -> top-left 8x8 block -> bit = value above the median.
// (The server value is authoritative; canvas downscaling differs from Pillow's, so a few bits can differ.)
const N = 32;
const COS = Array.from({ length: 8 }, (_, k) => Array.from({ length: N }, (_, n) => Math.cos((Math.PI * (n + 0.5) * k) / N)));

function grayFromCanvas(size, bitmap) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const g = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return g;
}

/** @returns {{bits: number[], mosaic: number[], mosaicSize: number}} 64 hash bits and a 24x24 grayscale mosaic (0-255). */
export async function perceptualHash(file) {
  const bitmap = await createImageBitmap(file);
  const g = grayFromCanvas(N, bitmap);
  const vals = [];
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0;
      for (let x = 0; x < N; x++) {
        const cx = COS[u][x];
        for (let y = 0; y < N; y++) sum += g[x * N + y] * cx * COS[v][y];
      }
      vals.push(sum);
    }
  }
  const sorted = [...vals].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;
  const mosaicSize = 24;
  const mosaic = Array.from(grayFromCanvas(mosaicSize, bitmap), Math.round);
  bitmap.close?.();
  return { bits: vals.map((v) => (v > median ? 1 : 0)), mosaic, mosaicSize };
}

export const hexToBits = (hex) =>
  hex.split('').flatMap((h) => parseInt(h, 16).toString(2).padStart(4, '0').split('').map(Number));
