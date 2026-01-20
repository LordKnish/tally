/**
 * Local test script for the silhouette generation
 * Run with: npx tsx scripts/test-silhouette.ts
 */

import sharp from 'sharp';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY;

async function getImage(urlOrPath: string): Promise<Buffer> {
  // Check if it's a local file path
  if (existsSync(urlOrPath)) {
    console.log(`Loading local file: ${urlOrPath}`);
    return readFileSync(urlOrPath);
  }

  console.log(`Downloading image from ${urlOrPath.substring(0, 60)}...`);

  const response = await fetch(urlOrPath, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/*,*/*',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function removeBackgroundWithAPI(imageBuffer: Buffer): Promise<Buffer> {
  if (!REMOVEBG_API_KEY) {
    console.warn('No REMOVEBG_API_KEY set, using edge detection only');
    return imageBuffer;
  }

  console.log('Removing background via remove.bg API...');

  const formData = new FormData();
  formData.append('image_file', new Blob([imageBuffer]), 'image.png');
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
    console.warn(`remove.bg API failed: ${response.status} - ${errorText}`);
    console.warn('Falling back to edge detection only');
    return imageBuffer;
  }

  return Buffer.from(await response.arrayBuffer());
}

async function generateLineArt(imageUrl: string): Promise<Buffer> {
  const start = Date.now();

  // 1. Get image (download or load local)
  const inputBuffer = await getImage(imageUrl);

  // 2. Resize and preprocess
  console.log('Preprocessing image...');
  const preprocessed = await sharp(inputBuffer)
    .resize(800, null, { withoutEnlargement: true })
    .png()
    .toBuffer();

  // 3. Remove background (if API key available)
  const noBgBuffer = await removeBackgroundWithAPI(preprocessed);

  // 4. Generate silhouette using Sharp
  console.log('Generating silhouette with Sharp...');

  // Convert to grayscale and apply edge-enhancing pipeline
  const grayscale = await sharp(noBgBuffer)
    .grayscale()
    .normalize()
    .toBuffer();

  // Apply median filter for noise reduction
  const filtered = await sharp(grayscale)
    .median(3)
    .toBuffer();

  // Apply threshold to create binary image (dark ship on white background)
  const binary = await sharp(filtered)
    .linear(1.5, -30)
    .threshold(128)
    .toBuffer();

  // Get metadata to check if we have alpha channel
  const metadata = await sharp(noBgBuffer).metadata();
  const hasAlpha = metadata.channels === 4;

  let lineArt: Buffer;

  if (hasAlpha && REMOVEBG_API_KEY) {
    const { data: alphaData, info } = await sharp(noBgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: binaryData } = await sharp(binary)
      .ensureAlpha()
      .resize(info.width, info.height)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const outputData = Buffer.alloc(binaryData.length);
    for (let i = 0; i < binaryData.length; i += 4) {
      const originalAlpha = alphaData[i + 3];
      if (originalAlpha === undefined || originalAlpha < 128) {
        outputData[i] = 255;
        outputData[i + 1] = 255;
        outputData[i + 2] = 255;
        outputData[i + 3] = 255;
      } else {
        outputData[i] = binaryData[i]!;
        outputData[i + 1] = binaryData[i + 1]!;
        outputData[i + 2] = binaryData[i + 2]!;
        outputData[i + 3] = 255;
      }
    }

    lineArt = await sharp(outputData, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();
  } else {
    lineArt = await sharp(binary)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
  }

  const timeMs = Date.now() - start;
  const { width, height } = await sharp(lineArt).metadata();
  console.log(`Line art generated in ${timeMs}ms (${width}x${height})`);

  return lineArt;
}

// Test with a sample ship image
async function main() {
  // Test with local image from public folder
  const testImages = [
    {
      name: 'local_image',
      url: join(process.cwd(), 'public', 'image.png'),
    },
  ];

  console.log('='.repeat(60));
  console.log('Silhouette Generation Test');
  console.log('='.repeat(60));

  if (!REMOVEBG_API_KEY) {
    console.log('\nNote: REMOVEBG_API_KEY not set. Results will be edge-detection only.');
    console.log('For best results, get a free API key from https://www.remove.bg/api\n');
  }

  for (const testImg of testImages) {
    console.log(`\nProcessing: ${testImg.name}`);
    console.log('-'.repeat(40));

    try {
      const lineArt = await generateLineArt(testImg.url);

      const outputPath = join(process.cwd(), `test-output-${testImg.name}.png`);
      writeFileSync(outputPath, lineArt);
      console.log(`Saved to: ${outputPath}`);
    } catch (error) {
      console.error(`Failed to process ${testImg.name}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done! Check the output files.');
  console.log('='.repeat(60));
}

main().catch(console.error);
