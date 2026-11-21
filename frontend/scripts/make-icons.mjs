import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [7, 10, 20];
const DARK = [11, 16, 32];
const CYAN = [34, 211, 238];
const VIOLET = [139, 92, 246];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function inRoundRect(x, y, c, half, r) {
  const dx = Math.abs(x - c) - (half - r);
  const dy = Math.abs(y - c) - (half - r);
  if (dx <= 0 || dy <= 0) return Math.abs(x - c) <= half && Math.abs(y - c) <= half;
  return dx * dx + dy * dy <= r * r;
}
function mix(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}
// markScale: how much of the icon the chip fills (maskable keeps it inside the safe zone)
function drawIcon(size, markScale) {
  const c = size / 2;
  const half = (size * markScale) / 2;
  const inner = half * 0.62;
  const dot = half * 0.24;
  return png(size, (x, y) => {
    if (!inRoundRect(x, y, c, half, half * 0.28)) return BG;
    const g = mix(CYAN, VIOLET, (x + y) / (2 * size));
    if (!inRoundRect(x, y, c, inner, inner * 0.2)) return g;
    if (Math.abs(x - c) <= dot && Math.abs(y - c) <= dot) return g;
    return DARK;
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', drawIcon(192, 0.66));
writeFileSync('public/icons/icon-512.png', drawIcon(512, 0.66));
writeFileSync('public/icons/maskable-512.png', drawIcon(512, 0.5));
writeFileSync('public/icons/apple-touch-icon.png', drawIcon(180, 0.66));
console.log('icons written to public/icons');