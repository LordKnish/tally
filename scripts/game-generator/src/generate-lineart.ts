/**
 * Line art generation for game silhouettes.
 * Adapted from silhouette-poc/lineart.ts for URL-based input.
 */

import cv from '@techstark/opencv-js';
import sharp from 'sharp';
import { removeBackground } from '@imgly/background-removal-node';

const USER_AGENT =
  'Mozilla/5.0 (compatible; KeelGame/1.0; +https://github.com/keel-game)';

// Initialize OpenCV once
let cvReady = false;
async function initCV(): Promise<void> {
  if (cvReady) return;
  await new Promise<void>((resolve) => {
    if (cv.Mat) {
      resolve();
    } else {
      cv.onRuntimeInitialized = () => resolve();
    }
  });
  cvReady = true;
}

interface LineArtOptions {
  outputWidth?: number;
  bilateralD?: number;
  bilateralSigmaColor?: number;
  bilateralSigmaSpace?: number;
  adaptiveBlockSize?: number;
  adaptiveC?: number;
}

/**
 * Convert Sharp buffer to OpenCV Mat.
 */
function bufferToMat(buffer: Buffer, width: number, height: number): cv.Mat {
  const mat = new cv.Mat(height, width, cv.CV_8UC4);
  mat.data.set(buffer);
  return mat;
}

/**
 * Convert OpenCV Mat to Sharp-compatible buffer.
 */
function matToBuffer(mat: cv.Mat): Buffer {
  return Buffer.from(mat.data);
}

/**
 * Download image from URL.
 */
async function downloadImage(url: string): Promise<Buffer> {
  console.log(`  Downloading image from ${url.substring(0, 60)}...`);

  const response = await fetch(url, {
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

/**
 * Generate line art from an image URL.
 * Returns base64-encoded PNG.
 *
 * Pipeline:
 * 1. Download image
 * 2. Resize and preprocess
 * 3. Remove background (@imgly)
 * 4. Convert to grayscale
 * 5. Bilateral filter (edge-preserving smoothing)
 * 6. Adaptive threshold (region-based binarization)
 * 7. Apply alpha mask
 * 8. Composite onto white background
 * 9. Return as base64
 */
export async function generateLineArtFromUrl(
  imageUrl: string,
  options: LineArtOptions = {}
): Promise<string> {
  const start = Date.now();

  await initCV();

  // 1. Download image
  const inputBuffer = await downloadImage(imageUrl);

  // 2. Preprocess for background removal
  console.log('  Preprocessing image...');
  const preprocessed = await sharp(inputBuffer)
    .resize(options.outputWidth ?? 800, null, { withoutEnlargement: true })
    .toColorspace('srgb')
    .ensureAlpha()
    .png()
    .toBuffer();

  // 3. Remove background
  console.log('  Removing background (this may take a moment)...');
  const uint8Array = new Uint8Array(preprocessed);
  const blob = new Blob([uint8Array], { type: 'image/png' });
  const resultBlob = await removeBackground(blob);
  const noBgBuffer = Buffer.from(await resultBlob.arrayBuffer());

  // Get dimensions
  const { data, info } = await sharp(noBgBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // 4. Load into OpenCV
  console.log('  Generating line art...');
  const src = bufferToMat(data, width, height);
  const gray = new cv.Mat();
  const bilateral = new cv.Mat();
  const binary = new cv.Mat();
  const output = new cv.Mat();

  // 5. Convert to grayscale
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

  // 6. Bilateral filter
  cv.bilateralFilter(
    gray,
    bilateral,
    options.bilateralD ?? 9,
    options.bilateralSigmaColor ?? 75,
    options.bilateralSigmaSpace ?? 75
  );

  // 7. Adaptive threshold
  cv.adaptiveThreshold(
    bilateral,
    binary,
    255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY,
    options.adaptiveBlockSize ?? 11,
    options.adaptiveC ?? 2
  );

  // 8. Apply alpha mask
  cv.cvtColor(binary, output, cv.COLOR_GRAY2RGBA);

  const outputData = matToBuffer(output);
  for (let i = 0; i < outputData.length; i += 4) {
    const originalAlpha = data[i + 3];
    if (originalAlpha === undefined || originalAlpha < 128) {
      // Outside ship - make white
      outputData[i] = 255;
      outputData[i + 1] = 255;
      outputData[i + 2] = 255;
      outputData[i + 3] = 255;
    } else {
      // Inside ship - full opacity
      outputData[i + 3] = 255;
    }
  }

  // 9. Export as PNG buffer
  const lineArt = await sharp(outputData, {
    raw: { width, height, channels: 4 },
  })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  // Cleanup OpenCV mats
  src.delete();
  gray.delete();
  bilateral.delete();
  binary.delete();
  output.delete();

  const timeMs = Date.now() - start;
  console.log(`  Line art generated in ${timeMs}ms (${width}x${height})`);

  // Return as base64
  return lineArt.toString('base64');
}
