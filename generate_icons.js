const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure icons folder exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function createPng(size) {
  const width = size;
  const height = size;

  // Raw RGBA buffer with filter byte at start of each scanline (filter type 0: None)
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const nx = (x / (width - 1)) * 2 - 1; // -1 to 1
      const ny = (y / (height - 1)) * 2 - 1; // -1 to 1
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Rounded squircle container
      const cornerR = 0.85;
      const inBox = Math.abs(nx) < cornerR && Math.abs(ny) < cornerR;
      const cornerDist = Math.hypot(Math.max(0, Math.abs(nx) - (cornerR - 0.25)), Math.max(0, Math.abs(ny) - (cornerR - 0.25)));

      if (dist < 0.95 && cornerDist < 0.28) {
        // Background gradient: Deep navy to vivid violet-purple
        const t = (nx + ny + 2) / 4; // 0 to 1
        let r = Math.round(15 * (1 - t) + 124 * t);
        let g = Math.round(23 * (1 - t) + 58 * t);
        let b = Math.round(42 * (1 - t) + 237 * t);
        let a = 255;

        // Inner icon: Neural chat node symbol (speech bubble with radiating pulse dot)
        const chatDist = Math.hypot(nx, ny + 0.05);
        if (chatDist < 0.42 && chatDist > 0.30) {
          // Outer glowing ring
          r = 168; g = 85; b = 247;
        } else if (chatDist < 0.22) {
          // Center glowing core
          r = 56; g = 189; b = 248; // Bright cyan accent
        } else if (nx > 0.15 && ny > 0.25 && nx < 0.45 && ny < 0.55 && (nx + ny) < 0.8) {
          // Speech bubble tail
          r = 168; g = 85; b = 247;
        }

        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      } else {
        // Transparent outside
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // color type 6: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // IDAT Chunk
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

[16, 32, 48, 128].forEach(size => {
  const pngBuf = createPng(size);
  const dest = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(dest, pngBuf);
  console.log(`Generated icon${size}.png (${size}x${size})`);
});
