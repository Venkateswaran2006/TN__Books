/**
 * Dev tooling: generates PWA PNG icons (192 & 512) with no dependencies.
 * Run: node tools/generate-icons.cjs   (from the project root)
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');

/* ---------- minimal PNG writer ---------- */
const CRC_TABLE = (function () {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- drawing ---------- */

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inPoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const hit = (yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function draw(size) {
  const s = size;
  const rgba = Buffer.alloc(s * s * 4);
  const radius = s * 0.19;
  const topR = [0x2f, 0x6b, 0xe9];
  const botR = [0x6d, 0x28, 0xd9];
  const margin = s * 0.005;

  // open book geometry (normalised to [0,1])
  const leftPage = [[0.18, 0.42], [0.47, 0.30], [0.47, 0.74], [0.18, 0.66]];
  const rightPage = [[0.82, 0.42], [0.53, 0.30], [0.53, 0.74], [0.82, 0.66]];

  for (let y = 0; y < s; y++) {
    const t = y / (s - 1);
    const br = [lerp(topR[0], botR[0], t), lerp(topR[1], botR[1], t), lerp(topR[2], botR[2], t)];
    for (let x = 0; x < s; x++) {
      const o = (y * s + x) * 4;
      const nx = x / s;
      const ny = y / s;
      // rounded-square background
      if (!inRoundedRect(x, y, margin, margin, s - margin, s - margin, radius)) {
        rgba[o + 3] = 0;
        continue;
      }
      let r = br[0], g = br[1], b = br[2];
      const inLeft = inPoly(nx, ny, leftPage);
      const inRight = inPoly(nx, ny, rightPage);
      if (inLeft || inRight) {
        r = 255; g = 255; b = 255;
      } else if (nx > 0.45 && nx < 0.55 && ny > 0.32 && ny < 0.7) {
        // spine shade
        r = Math.round(br[0] * 0.72); g = Math.round(br[1] * 0.72); b = Math.round(br[2] * 0.72);
      }
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = 255;
    }
  }
  return encodePng(s, s, rgba);
}

function ensureSized(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const outDir = path.join(ROOT, 'assets', 'images');
ensureSized(outDir);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), draw(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), draw(512));
console.log('Icons written to assets/images/icon-192.png and icon-512.png');