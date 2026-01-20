// npm install @silvia-odwyer/photon
import { Image, threshold, filter, grayscale } from '@silvia-odwyer/photon';

export async function processImage(imageUrl: string) {
  // 1. Fetch the image
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  
  // 2. Load into Photon
  // Note: Photon requires a Uint8Array
  const image = Image.new_from_bytes(new Uint8Array(buffer));

  // 3. Apply Sketch Logic
  // Step A: Convert to B&W
  grayscale(image); 
  
  // Step B: Apply a filter to isolate details (optional)
  // 'filter' usually contains generic filters; you might use thresholding
  // to get a stark black/white "ink" look.
  threshold(image, 150); // Adjust 150 to tune the "darkness" of the sketch

  // 4. Output
  const outputBytes = image.get_bytes_jpeg();
  return outputBytes;
}