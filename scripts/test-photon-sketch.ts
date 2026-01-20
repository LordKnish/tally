/**
 * Test script for Photon WASM library - sketch effects
 * Usage: npx tsx scripts/test-photon-sketch.ts
 */

import * as photon from '@silvia-odwyer/photon-node';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testEffect(
  name: string,
  inputBuffer: Buffer,
  effectFn: (img: photon.PhotonImage) => void
): Promise<void> {
  const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(inputBuffer));
  effectFn(image);
  const outputBytes = image.get_bytes();
  const outputPath = path.join(__dirname, `image-photon-${name}.png`);
  fs.writeFileSync(outputPath, Buffer.from(outputBytes));
  console.log(`  ${name}: ${outputPath} (${(outputBytes.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const inputPath = path.join(__dirname, 'image-no-bg.png');

  console.log('='.repeat(60));
  console.log('Photon Sketch Effects Test');
  console.log('='.repeat(60));

  const inputBuffer = fs.readFileSync(inputPath);
  console.log(`Input: ${inputPath} (${(inputBuffer.length / 1024).toFixed(1)} KB)\n`);

  console.log('Testing different edge detection effects:\n');

  // 1. Edge Detection
  await testEffect('edge-detection', inputBuffer, (img) => {
    photon.edge_detection(img);
  });

  // 2. Laplace
  await testEffect('laplace', inputBuffer, (img) => {
    photon.laplace(img);
  });

  // 3. Edge One
  await testEffect('edge-one', inputBuffer, (img) => {
    photon.edge_one(img);
  });

  // 4. Sobel Global
  await testEffect('sobel-global', inputBuffer, (img) => {
    photon.sobel_global(img);
  });

  // 5. Emboss
  await testEffect('emboss', inputBuffer, (img) => {
    photon.emboss(img);
  });

  // 6. Edge detection + invert (for black lines on white)
  await testEffect('edge-inverted', inputBuffer, (img) => {
    photon.edge_detection(img);
    photon.invert(img);
  });

  // 7. Sobel + invert
  await testEffect('sobel-inverted', inputBuffer, (img) => {
    photon.sobel_global(img);
    photon.invert(img);
  });

  // 8. Laplace + invert
  await testEffect('laplace-inverted', inputBuffer, (img) => {
    photon.laplace(img);
    photon.invert(img);
  });

  // 9. Sharpen then edge detect + invert (more detail)
  await testEffect('sharp-edge-inverted', inputBuffer, (img) => {
    photon.sharpen(img);
    photon.edge_detection(img);
    photon.invert(img);
  });

  // 10. Grayscale + sharpen + sobel + invert
  await testEffect('gray-sharp-sobel-inv', inputBuffer, (img) => {
    photon.grayscale(img);
    photon.sharpen(img);
    photon.sobel_global(img);
    photon.invert(img);
  });

  console.log('\n' + '='.repeat(60));
  console.log('Test complete! Check the output files.');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
