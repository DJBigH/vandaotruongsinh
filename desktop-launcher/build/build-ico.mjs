// ============================================================
// Multi-Resolution Windows ICO Builder
// Builds a true Microsoft ICO file embedding PNG streams for:
// 16x16, 24x24, 32x32, 48x48, 64x64, 128x128, 256x256
// ============================================================

import fs from 'node:fs';
import path from 'node:path';

const buildDir = 'e:/tutienAI/desktop-launcher/build';
const clientPublicDir = 'e:/tutienAI/client/public';

const SIZES = [16, 24, 32, 48, 64, 128, 256];

function buildMultiResIco(sizes, outputIcoPath) {
  const images = [];

  for (const size of sizes) {
    const pngPath = path.join(buildDir, `icon_${size}.png`);
    if (!fs.existsSync(pngPath)) {
      throw new Error(`Missing PNG for size ${size}: ${pngPath}`);
    }
    const data = fs.readFileSync(pngPath);
    images.push({
      width: size === 256 ? 0 : size,   // 0 means 256 in ICO format
      height: size === 256 ? 0 : size,  // 0 means 256 in ICO format
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      bytesInRes: data.length,
      data: data,
    });
  }

  // Calculate header and directory sizes
  // ICONDIR header: 6 bytes
  // ICONDIRENTRY: 16 bytes per image
  const headerSize = 6;
  const dirEntrySize = 16;
  const totalDirSize = headerSize + images.length * dirEntrySize;

  let currentOffset = totalDirSize;
  for (const img of images) {
    img.offset = currentOffset;
    currentOffset += img.bytesInRes;
  }

  const icoBuffer = Buffer.alloc(currentOffset);

  // 1. Write ICONDIR Header
  icoBuffer.writeUInt16LE(0, 0);                 // idReserved: 0
  icoBuffer.writeUInt16LE(1, 2);                 // idType: 1 (ICO)
  icoBuffer.writeUInt16LE(images.length, 4);     // idCount: number of images

  // 2. Write ICONDIRENTRY for each image
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const entryOffset = headerSize + i * dirEntrySize;

    icoBuffer.writeUInt8(img.width, entryOffset + 0);
    icoBuffer.writeUInt8(img.height, entryOffset + 1);
    icoBuffer.writeUInt8(img.colorCount, entryOffset + 2);
    icoBuffer.writeUInt8(img.reserved, entryOffset + 3);
    icoBuffer.writeUInt16LE(img.planes, entryOffset + 4);
    icoBuffer.writeUInt16LE(img.bitCount, entryOffset + 6);
    icoBuffer.writeUInt32LE(img.bytesInRes, entryOffset + 8);
    icoBuffer.writeUInt32LE(img.offset, entryOffset + 12);
  }

  // 3. Write image data
  for (const img of images) {
    img.data.copy(icoBuffer, img.offset);
  }

  fs.writeFileSync(outputIcoPath, icoBuffer);
  console.log(`Successfully built multi-resolution ICO (${images.length} sizes: ${sizes.join(', ')} px): ${outputIcoPath} (${icoBuffer.length} bytes)`);
  return icoBuffer;
}

const launcherIco = path.join(buildDir, 'icon.ico');
const clientIco = path.join(clientPublicDir, 'favicon.ico');

buildMultiResIco(SIZES, launcherIco);
fs.copyFileSync(launcherIco, clientIco);
console.log(`Copied multi-resolution favicon.ico to ${clientIco}`);

// Verify ICO header and directory
const verifyBuf = fs.readFileSync(launcherIco);
console.log(`\n--- Verification of ${launcherIco} ---`);
console.log(`Total File Size: ${verifyBuf.length} bytes`);
console.log(`Type: ${verifyBuf.readUInt16LE(2)} (1 = ICO)`);
console.log(`Image Count: ${verifyBuf.readUInt16LE(4)}`);
for (let i = 0; i < verifyBuf.readUInt16LE(4); i++) {
  const o = 6 + i * 16;
  const w = verifyBuf.readUInt8(o) || 256;
  const h = verifyBuf.readUInt8(o + 1) || 256;
  const bpp = verifyBuf.readUInt16LE(o + 6);
  const size = verifyBuf.readUInt32LE(o + 8);
  const offset = verifyBuf.readUInt32LE(o + 12);
  console.log(`  [Size ${i + 1}] ${w}x${h} @ ${bpp}-bit | Length: ${size} bytes | Offset: ${offset}`);
}
