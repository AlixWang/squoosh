/**
 * Basic usage example for @squoosh/image-compression-lib
 * 
 * This example demonstrates how to use the image compression library
 * to convert and compress images in different formats.
 */

import { ImageCompressor } from '@squoosh/image-compression-lib';
import { readFileSync, writeFileSync } from 'fs';

async function basicExample() {
  // Create a new compressor instance
  const compressor = new ImageCompressor();

  try {
    // Read an image file
    const inputBuffer = readFileSync('input.png');
    
    // Convert PNG to WebP with quality 80
    console.log('Converting PNG to WebP...');
    const webpBuffer = await compressor.convert(inputBuffer, 'webp', {
      quality: 80
    });
    writeFileSync('output.webp', webpBuffer);
    console.log('WebP conversion complete!');

    // Convert to AVIF with higher compression
    console.log('Converting to AVIF...');
    const avifBuffer = await compressor.convert(inputBuffer, 'avif', {
      quality: 70,
      speed: 6
    });
    writeFileSync('output.avif', avifBuffer);
    console.log('AVIF conversion complete!');

    // Use pipeline for more complex operations
    console.log('Processing with pipeline...');
    const processedBuffer = await compressor
      .pipeline()
      .input(inputBuffer)
      .decode()
      .resize({ width: 800, height: 600 })
      .rotate(90)
      .encode('jpeg-xl', { quality: 90 })
      .execute();
    
    writeFileSync('output-processed.jxl', processedBuffer);
    console.log('Pipeline processing complete!');

    // Get supported formats
    const formats = compressor.getSupportedFormats();
    console.log('Supported formats:', formats);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
basicExample().catch(console.error);