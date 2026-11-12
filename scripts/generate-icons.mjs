/**
 * Generates the PWA / touch icons with no image dependencies.
 * The mark mirrors components/brand/logo.tsx: a white chevron, a pale-mint
 * vertical stroke and dot on a deep forest-green gradient.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

const INK_TOP = [20, 102, 58];
const INK_BOTTOM = [31, 138, 76];
const SKY = [255, 255, 255];
const MINT = [209, 250, 229];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function over(dst, src, alpha) {
  const a = clamp(alpha);
  return [
    Math.round(src[0] * a + dst[0] * (1 - a)),
    Math.round(src[1] * a + dst[1] * (1 - a)),
    Math.round(src[2] * a + dst[2] * (1 - a)),
  ];
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const vx = bx - ax;
  const vy = by - ay;
  const wx = px - ax;
  const wy = py - ay;
  const lengthSq = vx * vx + vy * vy;
  const t = lengthSq === 0 ? 0 : clamp((wx * vx + wy * vy) / lengthSq);
  const dx = px - (ax + vx * t);
  const dy = py - (ay + vy * t);
  return Math.hypot(dx, dy);
}

/** Rounded-rectangle signed distance, in pixels. Negative inside. */
function roundedRectDistance(px, py, width, height, radius) {
  const halfW = width / 2;
  const halfH = height / 2;
  const qx = Math.abs(px - halfW) - (halfW - radius);
  const qy = Math.abs(py - halfH) - (halfH - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return outside + inside - radius;
}

function render(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = maskable ? 0 : size * 0.22;
  const scale = size / 512;

  // Mark geometry in a 0..1 space, scaled to the canvas.
  const chevron = [
    [0.28, 0.22, 0.53, 0.5],
    [0.53, 0.5, 0.28, 0.78],
  ];
  const stroke = 0.068;
  const verticalX = 0.605;
  const verticalTop = 0.22;
  const verticalBottom = 0.78;
  const dot = { x: 0.742, y: 0.318, r: 0.058 };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const u = px / size;
      const v = py / size;

      let color = mix(INK_TOP, INK_BOTTOM, clamp((u + v) / 2));
      // Subtle radial glow behind the mark.
      const glow = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) / 0.62);
      color = over(color, [134, 239, 172], glow * 0.24);

      // Sky chevron.
      const dChevron = Math.min(
        segmentDistance(u, v, ...chevron[0]),
        segmentDistance(u, v, ...chevron[1]),
      );
      color = over(color, SKY, 1 - smoothstep(stroke * 0.82, stroke, dChevron));

      // Mint vertical stroke.
      const dVertical =
        Math.abs(u - verticalX) <= stroke / 2 &&
        v >= verticalTop &&
        v <= verticalBottom
          ? Math.max(0, Math.abs(u - verticalX) - stroke / 2)
          : Math.hypot(
              Math.max(0, Math.abs(u - verticalX) - stroke / 2),
              Math.max(0, verticalTop - v, v - verticalBottom),
            );
      color = over(color, MINT, 1 - smoothstep(stroke * 0.82, stroke, dVertical));

      // Mint dot.
      const dDot = Math.hypot(u - dot.x, v - dot.y);
      color = over(color, MINT, 1 - smoothstep(dot.r * 0.9, dot.r, dDot));

      // Inner hairline ring.
      const ring =
        Math.abs(roundedRectDistance(px, py, size, size, radius) + size * 0.028) < scale * 0.8
          ? 0.22
          : 0;
      color = over(color, [255, 255, 255], ring);

      const alpha = maskable
        ? 255
        : Math.round(255 * (1 - smoothstep(-0.75, 0.75, roundedRectDistance(px, py, size, size, radius))));

      const offset = (y * size + x) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = alpha;
    }
  }

  return encodePng(size, size, pixels);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-512.png", size: 512, maskable: true },
  { file: "apple-touch-icon.png", size: 180, maskable: true },
];

for (const target of targets) {
  const buffer = render(target.size, { maskable: target.maskable });
  writeFileSync(resolve(outDir, target.file), buffer);
  console.log(`[icons] wrote public/icons/${target.file} (${buffer.length} bytes)`);
}
