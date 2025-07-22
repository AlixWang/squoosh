/**
 * Basic usage examples for the Image Compression Library
 */

import { ImageCompressor, ImageFormat } from 'image-compression-lib';

// Create a compressor instance
const compressor = new ImageCompressor();

/**
 * Example 1: Simple format conversion
 */
export async function convertPngToWebP(
  pngBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  return await compressor.convert(pngBuffer, 'webp', { quality: 85 });
}

/**
 * Example 2: Decode image to work with ImageData
 */
export async function getImageDimensions(
  imageBuffer: ArrayBuffer,
): Promise<{ width: number; height: number }> {
  const imageData = await compressor.decode(imageBuffer);
  return {
    width: imageData.width,
    height: imageData.height,
  };
}

/**
 * Example 3: Encode ImageData to specific format
 */
export async function encodeImageData(
  imageData: ImageData,
  format: ImageFormat,
): Promise<ArrayBuffer> {
  return await compressor.encode(imageData, format, { quality: 80 });
}

/**
 * Example 4: Detect image format
 */
export function detectImageFormat(buffer: ArrayBuffer): ImageFormat | null {
  return compressor.detectFormat(buffer);
}

/**
 * Example 5: Get supported formats
 */
export function getSupportedFormats() {
  return compressor.getSupportedFormats();
}

/**
 * Example 6: Get format information
 */
export function getFormatDetails(format: ImageFormat) {
  return compressor.getFormatInfo(format);
}

/**
 * Example 7: Process image with multiple operations
 */
export async function resizeAndRotate(
  imageBuffer: ArrayBuffer,
): Promise<ImageData> {
  return await compressor.process(imageBuffer, [
    {
      type: 'resize',
      options: {
        width: 800,
        height: 600,
        method: 'lanczos3',
      },
    },
    {
      type: 'rotate',
      options: {
        angle: 90,
      },
    },
  ]);
}

/**
 * Example 8: Complete pipeline example
 */
export async function completeProcessingPipeline(
  inputBuffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  return (await compressor
    .pipeline()
    .input(inputBuffer)
    .resize({ width: 1200, height: 800, method: 'lanczos3' })
    .rotate(90)
    .quantize({ maxColors: 256, dither: 0.5 })
    .encode('webp', { quality: 85, lossless: false })
    .execute()) as ArrayBuffer;
}
