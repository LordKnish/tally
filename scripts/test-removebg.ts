/**
 * Test script for remove.bg API - uses same approach as Vercel function
 * Usage: npx tsx scripts/test-removebg.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;

async function removeBackgroundWithAPI(imageBuffer: Buffer): Promise<Buffer> {
  if (!REMOVEBG_API_KEY) {
    console.error('ERROR: No REMOVEBG_API_KEY environment variable set');
    console.error('Set it with: export REMOVEBG_API_KEY=your_key_here');
    process.exit(1);
  }

  console.log('Removing background via remove.bg API...');

  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  formData.append('image_file', new Blob([uint8Array]), 'image.png');
  formData.append('size', 'regular');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': REMOVEBG_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`remove.bg API failed: ${response.status}`);
    console.error('Response:', errorText);
    throw new Error(`remove.bg API failed: ${response.status} - ${errorText}`);
  }

  console.log('Background removed successfully!');
  return Buffer.from(await response.arrayBuffer());
}

async function generateLineArt(noBgBuffer: Buffer): Promise<Buffer> {
  console.log('Generating line art with edge detection...');

  // Get metadata
  const metadata = await sharp(noBgBuffer).metadata();
  const hasAlpha = metadata.channels === 4;

  // Pencil sketch effect using color dodge blending

  // Step 1: Convert to grayscale
  const { data: grayData, info } = await sharp(noBgBuffer)
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Step 2: Invert the grayscale
  const inverted = Buffer.alloc(grayData.length);
  for (let i = 0; i < grayData.length; i++) {
    inverted[i] = 255 - grayData[i]!;
  }

  // Step 3: Blur the inverted image
  const blurredInverted = await sharp(inverted, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(10)
    .raw()
    .toBuffer();

  // Step 4: Color dodge blend: result = original / (1 - blurred_inverted)
  // This creates a pencil sketch effect
  const sketch = Buffer.alloc(grayData.length);
  for (let i = 0; i < grayData.length; i++) {
    const original = grayData[i]!;
    const dodge = blurredInverted[i]!;

    if (dodge >= 255) {
      sketch[i] = 255;
    } else {
      // Color dodge formula
      const result = Math.min(255, (original * 256) / (256 - dodge));
      sketch[i] = Math.round(result);
    }
  }

  const thresholded = await sharp(sketch, {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .normalize()
    .png()
    .toBuffer();

  // Step 5: If we have alpha from background removal, mask out the background
  let lineArt: Buffer;

  if (hasAlpha) {
    const { data: alphaData, info } = await sharp(noBgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: edgeData } = await sharp(thresholded)
      .ensureAlpha()
      .resize(info.width, info.height)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Apply alpha mask: where original was transparent, make white
    const outputData = Buffer.alloc(edgeData.length);
    for (let i = 0; i < edgeData.length; i += 4) {
      const originalAlpha = alphaData[i + 3];
      if (originalAlpha === undefined || originalAlpha < 128) {
        // Transparent in original -> white in output
        outputData[i] = 255;
        outputData[i + 1] = 255;
        outputData[i + 2] = 255;
        outputData[i + 3] = 255;
      } else {
        // Keep the edge detection result
        outputData[i] = edgeData[i]!;
        outputData[i + 1] = edgeData[i + 1]!;
        outputData[i + 2] = edgeData[i + 2]!;
        outputData[i + 3] = 255;
      }
    }

    lineArt = await sharp(outputData, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  } else {
    lineArt = await sharp(thresholded)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  }

  return lineArt;
}

async function main() {
  const inputPath = path.join(__dirname, 'image.png');
  const outputNoBgPath = path.join(__dirname, 'image-no-bg.png');
  const outputLineArtPath = path.join(__dirname, 'image-lineart.png');

  console.log('='.repeat(60));
  console.log('Remove.bg API Test Script');
  console.log('='.repeat(60));

  // Read input image
  console.log(`\nReading input: ${inputPath}`);
  const inputBuffer = fs.readFileSync(inputPath);
  console.log(`Input size: ${(inputBuffer.length / 1024).toFixed(1)} KB`);

  // Preprocess (resize like Vercel function does)
  console.log('\nPreprocessing image...');
  const preprocessed = await sharp(inputBuffer)
    .resize(800, null, { withoutEnlargement: true })
    .png()
    .toBuffer();
  console.log(`Preprocessed size: ${(preprocessed.length / 1024).toFixed(1)} KB`);

  // Remove background
  console.log('\nCalling remove.bg API...');
  const startTime = Date.now();
  const noBgBuffer = await removeBackgroundWithAPI(preprocessed);
  const apiTime = Date.now() - startTime;
  console.log(`API call took: ${apiTime}ms`);
  console.log(`No-bg size: ${(noBgBuffer.length / 1024).toFixed(1)} KB`);

  // Save no-bg result
  fs.writeFileSync(outputNoBgPath, noBgBuffer);
  console.log(`Saved no-bg image: ${outputNoBgPath}`);

  // Generate line art
  console.log('\nGenerating line art...');
  const lineArtBuffer = await generateLineArt(noBgBuffer);
  console.log(`Line art size: ${(lineArtBuffer.length / 1024).toFixed(1)} KB`);

  // Save line art
  fs.writeFileSync(outputLineArtPath, lineArtBuffer);
  console.log(`Saved line art: ${outputLineArtPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
