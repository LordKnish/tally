/**
 * Test different sketch effects locally
 * Usage: npx tsx scripts/test-sketch-effects.ts
 */

import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as photon from '@silvia-odwyer/photon-node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function saveResult(name: string, buffer: Buffer): Promise<void> {
  const outputPath = path.join(__dirname, `sketch-${name}.png`);
  fs.writeFileSync(outputPath, buffer);
  console.log(`  Saved: sketch-${name}.png (${(buffer.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  const inputPath = path.join(__dirname, 'image-no-bg.png');

  console.log('='.repeat(60));
  console.log('Sketch Effects Test');
  console.log('='.repeat(60));

  const inputBuffer = fs.readFileSync(inputPath);
  console.log(`Input: ${inputPath}\n`);

  // ============================================================
  // 1. Photon Laplace + Invert (original)
  // ============================================================
  console.log('1. Photon Laplace + Invert...');
  {
    const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(inputBuffer));
    photon.laplace(image);
    photon.invert(image);
    await saveResult('01-laplace-invert', Buffer.from(image.get_bytes()));
  }

  // ============================================================
  // 2. Pencil Sketch (Color Dodge) - blur 21
  // ============================================================
  console.log('2. Pencil Sketch (blur 21)...');
  {
    const { data: grayData, info } = await sharp(inputBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const inverted = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      inverted[i] = 255 - grayData[i]!;
    }

    const blurred = await sharp(inverted, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).blur(21).raw().toBuffer();

    const sketch = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      const base = grayData[i]!;
      const blend = blurred[i]!;
      sketch[i] = blend === 255 ? 255 : Math.min(255, Math.floor((base * 256) / (256 - blend)));
    }

    const result = await sharp(sketch, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).png().toBuffer();

    await saveResult('02-pencil-blur21', result);
  }

  // ============================================================
  // 3. Pencil Sketch - smaller blur (more detail)
  // ============================================================
  console.log('3. Pencil Sketch (blur 10)...');
  {
    const { data: grayData, info } = await sharp(inputBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const inverted = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      inverted[i] = 255 - grayData[i]!;
    }

    const blurred = await sharp(inverted, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).blur(10).raw().toBuffer();

    const sketch = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      const base = grayData[i]!;
      const blend = blurred[i]!;
      sketch[i] = blend === 255 ? 255 : Math.min(255, Math.floor((base * 256) / (256 - blend)));
    }

    const result = await sharp(sketch, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).png().toBuffer();

    await saveResult('03-pencil-blur10', result);
  }

  // ============================================================
  // 4. Pencil Sketch with contrast boost
  // ============================================================
  console.log('4. Pencil Sketch + Contrast...');
  {
    const { data: grayData, info } = await sharp(inputBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const inverted = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      inverted[i] = 255 - grayData[i]!;
    }

    const blurred = await sharp(inverted, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).blur(15).raw().toBuffer();

    const sketch = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      const base = grayData[i]!;
      const blend = blurred[i]!;
      sketch[i] = blend === 255 ? 255 : Math.min(255, Math.floor((base * 256) / (256 - blend)));
    }

    const result = await sharp(sketch, {
      raw: { width: info.width, height: info.height, channels: 1 },
    })
      .linear(2, -128) // Strong contrast
      .png()
      .toBuffer();

    await saveResult('04-pencil-contrast', result);
  }

  // ============================================================
  // 5. Sobel edge detection (Sharp convolution)
  // ============================================================
  console.log('5. Sobel Edge Detection...');
  {
    const grayscale = await sharp(inputBuffer).grayscale().toBuffer();

    const sobelX = await sharp(grayscale)
      .convolve({ width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1] })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sobelY = await sharp(grayscale)
      .convolve({ width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const combined = Buffer.alloc(sobelX.data.length);
    for (let i = 0; i < sobelX.data.length; i++) {
      const x = Math.abs(sobelX.data[i]! - 128);
      const y = Math.abs(sobelY.data[i]! - 128);
      const mag = Math.min(255, Math.sqrt(x * x + y * y) * 2);
      combined[i] = 255 - mag; // Invert for black lines on white
    }

    const result = await sharp(combined, {
      raw: { width: sobelX.info.width, height: sobelX.info.height, channels: 1 },
    }).png().toBuffer();

    await saveResult('05-sobel', result);
  }

  // ============================================================
  // 6. Photon Sobel Global + Invert
  // ============================================================
  console.log('6. Photon Sobel Global + Invert...');
  {
    const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(inputBuffer));
    photon.grayscale(image);
    photon.sobel_global(image);
    photon.invert(image);
    await saveResult('06-photon-sobel', Buffer.from(image.get_bytes()));
  }

  // ============================================================
  // 7. Sharpen + Photon Laplace + Invert
  // ============================================================
  console.log('7. Sharpen + Laplace + Invert...');
  {
    const sharpened = await sharp(inputBuffer)
      .sharpen({ sigma: 2 })
      .toBuffer();

    const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(sharpened));
    photon.laplace(image);
    photon.invert(image);
    await saveResult('07-sharp-laplace', Buffer.from(image.get_bytes()));
  }

  // ============================================================
  // 8. High contrast grayscale + threshold (silhouette)
  // ============================================================
  console.log('8. High Contrast Threshold...');
  {
    const result = await sharp(inputBuffer)
      .grayscale()
      .linear(2, -100)
      .threshold(128)
      .negate()
      .png()
      .toBuffer();

    await saveResult('08-threshold', result);
  }

  // ============================================================
  // 9. Canny-like: Blur + Sobel + Threshold
  // ============================================================
  console.log('9. Canny-like Edge Detection...');
  {
    const blurred = await sharp(inputBuffer)
      .grayscale()
      .blur(1.5)
      .toBuffer();

    const sobelX = await sharp(blurred)
      .convolve({ width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1] })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const sobelY = await sharp(blurred)
      .convolve({ width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1] })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const combined = Buffer.alloc(sobelX.data.length);
    for (let i = 0; i < sobelX.data.length; i++) {
      const x = Math.abs(sobelX.data[i]! - 128);
      const y = Math.abs(sobelY.data[i]! - 128);
      combined[i] = Math.min(255, Math.sqrt(x * x + y * y) * 2);
    }

    const result = await sharp(combined, {
      raw: { width: sobelX.info.width, height: sobelX.info.height, channels: 1 },
    })
      .threshold(30)
      .negate()
      .png()
      .toBuffer();

    await saveResult('09-canny-like', result);
  }

  // ============================================================
  // 10. Pencil with edge enhancement
  // ============================================================
  console.log('10. Pencil + Edge Enhancement...');
  {
    // First do pencil sketch
    const { data: grayData, info } = await sharp(inputBuffer)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const inverted = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      inverted[i] = 255 - grayData[i]!;
    }

    const blurred = await sharp(inverted, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).blur(15).raw().toBuffer();

    const sketch = Buffer.alloc(grayData.length);
    for (let i = 0; i < grayData.length; i++) {
      const base = grayData[i]!;
      const blend = blurred[i]!;
      sketch[i] = blend === 255 ? 255 : Math.min(255, Math.floor((base * 256) / (256 - blend)));
    }

    // Now add edge detection overlay
    const image = photon.PhotonImage.new_from_byteslice(new Uint8Array(inputBuffer));
    photon.laplace(image);
    const edges = Buffer.from(image.get_bytes());

    const { data: edgeData } = await sharp(edges)
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Combine: darken sketch where edges are dark
    for (let i = 0; i < sketch.length; i++) {
      const edgeVal = edgeData[i]!;
      if (edgeVal < 100) {
        sketch[i] = Math.min(sketch[i]!, edgeVal);
      }
    }

    const result = await sharp(sketch, {
      raw: { width: info.width, height: info.height, channels: 1 },
    }).png().toBuffer();

    await saveResult('10-pencil-edges', result);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done! Check scripts/sketch-*.png files');
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
