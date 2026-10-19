import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer with filter byte per scanline
  const rowBytes = width * 4;
  const buffer = Buffer.alloc(height * (rowBytes + 1));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    buffer[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      buffer[pixelOffset] = r;
      buffer[pixelOffset + 1] = g;
      buffer[pixelOffset + 2] = b;
      buffer[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(buffer);

  // Build PNG chunks
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  // Precompute CRC table
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type);
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);

    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(toCrc), 0);

    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR: width (4), height (4), bit depth (1), color type (6 = RGBA), compression (0), filter (0), interlace (0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', deflated);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Draw a stylized 'R' icon for Rawdons Profit and loss
function drawRawdonsIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.46;

  // Background: dark navy slate (#0f172a = 15, 23, 42)
  let r = 15, g = 23, b = 42, a = 255;

  // Margin/Border
  const distFromCenter = Math.hypot(x - cx, y - cy);
  const cornerRadius = w * 0.22;
  const boxInset = isMaskable ? 0 : w * 0.04;
  
  // Outer rounded rect for non-maskable
  if (!isMaskable) {
    const dx = Math.max(0, Math.abs(x - cx) - (w / 2 - boxInset - cornerRadius));
    const dy = Math.max(0, Math.abs(y - cy) - (h / 2 - boxInset - cornerRadius));
    const cornerDist = Math.hypot(dx, dy);
    if (cornerDist > cornerRadius) {
      return [0, 0, 0, 0]; // Transparent outside icon boundary
    }
    // Gold/indigo accent border
    if (cornerDist > cornerRadius - 4 || (dx === 0 && Math.abs(y - cy) > h/2 - boxInset - 4) || (dy === 0 && Math.abs(x - cx) > w/2 - boxInset - 4)) {
      return [79, 70, 229, 255]; // Indigo border #4f46e5
    }
  }

  // Draw Letter 'R' in the center
  // Scale relative coordinates: -1 to 1
  const nx = (x - cx) / (w * 0.32);
  const ny = (y - cy) / (h * 0.32);

  // Check if pixel is within letter 'R'
  let isR = false;

  // Vertical stem: nx in [-0.55, -0.25], ny in [-0.7, 0.7]
  if (nx >= -0.55 && nx <= -0.25 && ny >= -0.7 && ny <= 0.7) {
    isR = true;
  }
  // Top horizontal bar: nx in [-0.25, 0.15], ny in [-0.7, -0.45]
  if (nx >= -0.25 && nx <= 0.15 && ny >= -0.7 && ny <= -0.45) {
    isR = true;
  }
  // Middle horizontal bar: nx in [-0.25, 0.15], ny in [-0.15, 0.1]
  if (nx >= -0.25 && nx <= 0.15 && ny >= -0.15 && ny <= 0.1) {
    isR = true;
  }
  // Loop curve: outer circle centered at (0.1, -0.3) radius ~0.38, inner radius ~0.15
  const loopDist = Math.hypot(nx - 0.1, ny - (-0.3));
  if (nx >= 0.0 && loopDist <= 0.4 && loopDist >= 0.15 && ny >= -0.7 && ny <= 0.1) {
    isR = true;
  }
  // Diagonal leg: from (nx=-0.1, ny=0.05) down to (nx=0.45, ny=0.7)
  const legX = -0.1 + (ny - 0.05) * 1.0;
  if (ny >= 0.05 && ny <= 0.7 && nx >= legX - 0.18 && nx <= legX + 0.18) {
    isR = true;
  }

  if (isR) {
    // Elegant gold gradient for 'R'
    const grad = (ny + 0.7) / 1.4;
    return [
      Math.round(250 * (1 - grad * 0.2)),
      Math.round(204 * (1 - grad * 0.1)),
      Math.round(21 + grad * 50),
      255
    ];
  }

  // Small subtitled dot/bar
  if (Math.abs(ny - 0.85) < 0.04 && Math.abs(nx) < 0.4) {
    return [16, 185, 129, 255]; // Emerald accent line #10b981
  }

  return [r, g, b, a];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Generating PWA icons in /public...');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPNG(192, 192, (x, y, w, h) => drawRawdonsIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPNG(512, 512, (x, y, w, h) => drawRawdonsIcon(x, y, w, h, false)));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, (x, y, w, h) => drawRawdonsIcon(x, y, w, h, true)));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPNG(180, 180, (x, y, w, h) => drawRawdonsIcon(x, y, w, h, false)));
console.log('Icons generated successfully.');
