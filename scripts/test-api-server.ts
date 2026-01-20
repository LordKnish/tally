/**
 * Local test server for the game generation API
 * Run with: npx tsx scripts/test-api-server.ts
 * Then test with: curl http://localhost:3001/api/cron/generate-game
 */

import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

const PORT = 3001;
const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REMOVEBG_API_KEY = 'hbSBBayzvavxXozuTFR4GnGt';

// Simplified version of the API for local testing
async function getImage(url: string): Promise<Buffer> {
  console.log(`  Downloading: ${url.substring(0, 60)}...`);
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'image/*,*/*' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function removeBackgroundWithAPI(imageBuffer: Buffer): Promise<Buffer> {
  if (!REMOVEBG_API_KEY) {
    console.log('  No REMOVEBG_API_KEY, using edge detection only');
    return imageBuffer;
  }
  console.log('  Calling remove.bg API...');
  const formData = new FormData();
  const uint8Array = new Uint8Array(imageBuffer);
  formData.append('image_file', new Blob([uint8Array]), 'image.png');
  formData.append('size', 'regular');
  formData.append('format', 'png');

  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': REMOVEBG_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    console.warn(`  remove.bg failed: ${response.status}`);
    return imageBuffer;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function getLocalOrRemoteImage(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith('http')) {
    return getImage(urlOrPath);
  }
  console.log(`  Loading local file: ${urlOrPath}`);
  return readFileSync(urlOrPath);
}

async function generateSilhouette(imageUrl: string): Promise<string> {
  const inputBuffer = await getLocalOrRemoteImage(imageUrl);

  console.log('  Preprocessing...');
  const preprocessed = await sharp(inputBuffer)
    .resize(800, null, { withoutEnlargement: true })
    .png()
    .toBuffer();

  const noBgBuffer = await removeBackgroundWithAPI(preprocessed);

  console.log('  Generating silhouette...');
  const grayscale = await sharp(noBgBuffer).grayscale().normalize().toBuffer();
  const filtered = await sharp(grayscale).median(3).toBuffer();
  const binary = await sharp(filtered).linear(1.5, -30).threshold(128).toBuffer();

  const metadata = await sharp(noBgBuffer).metadata();
  const hasAlpha = metadata.channels === 4;

  let lineArt: Buffer;
  if (hasAlpha && REMOVEBG_API_KEY) {
    const { data: alphaData, info } = await sharp(noBgBuffer)
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data: binaryData } = await sharp(binary)
      .ensureAlpha().resize(info.width, info.height).raw()
      .toBuffer({ resolveWithObject: true });

    const outputData = Buffer.alloc(binaryData.length);
    for (let i = 0; i < binaryData.length; i += 4) {
      const originalAlpha = alphaData[i + 3];
      if (originalAlpha === undefined || originalAlpha < 128) {
        outputData[i] = outputData[i + 1] = outputData[i + 2] = outputData[i + 3] = 255;
      } else {
        outputData[i] = binaryData[i]!;
        outputData[i + 1] = binaryData[i + 1]!;
        outputData[i + 2] = binaryData[i + 2]!;
        outputData[i + 3] = 255;
      }
    }
    lineArt = await sharp(outputData, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png().toBuffer();
  } else {
    lineArt = await sharp(binary).flatten({ background: { r: 255, g: 255, b: 255 } }).png().toBuffer();
  }

  return lineArt.toString('base64');
}

// Test with a real ship photo
const TEST_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/JS_Izumo_%28DDH-183%29_just_after_her_launch.jpg/800px-JS_Izumo_%28DDH-183%29_just_after_her_launch.jpg';

const server = createServer(async (req, res) => {
  console.log(`\n${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/api/cron/generate-game' || req.url === '/') {
    try {
      console.log('Starting silhouette generation...');
      const start = Date.now();

      const silhouette = await generateSilhouette(TEST_IMAGE_URL);

      const elapsed = Date.now() - start;
      console.log(`Completed in ${elapsed}ms`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Silhouette generated successfully',
        elapsed_ms: elapsed,
        silhouette_size_kb: Math.round(silhouette.length / 1024),
        silhouette_preview: `data:image/png;base64,${silhouette.substring(0, 100)}...`,
        test_image: TEST_IMAGE_URL,
      }, null, 2));
    } catch (error) {
      console.error('Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  } else if (req.url === '/api/cron/generate-game/image') {
    // Return the actual silhouette image
    try {
      const silhouette = await generateSilhouette(TEST_IMAGE_URL);
      const imageBuffer = Buffer.from(silhouette, 'base64');
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(error));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', endpoints: ['/', '/api/cron/generate-game', '/api/cron/generate-game/image'] }));
  }
});

server.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('Keel API Test Server');
  console.log('='.repeat(60));
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('');
  console.log('Test endpoints:');
  console.log(`  curl http://localhost:${PORT}/api/cron/generate-game`);
  console.log(`  curl http://localhost:${PORT}/api/cron/generate-game/image -o test.png`);
  console.log('');
  if (!REMOVEBG_API_KEY) {
    console.log('Note: REMOVEBG_API_KEY not set - using edge detection only');
  }
  console.log('='.repeat(60));
});
