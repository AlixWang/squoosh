/**
 * @fileoverview Image Compression Library
 *
 * A comprehensive TypeScript library for image compression, format conversion,
 * and processing operations. Built on proven Squoosh technology with a clean,
 * modern API designed for both browser and Node.js environments.
 *
 * @example Basic usage
 * ```typescript
 * import { ImageCompressor } from 'image-compression-lib';
 *
 * const compressor = new ImageCompressor();
 *
 * // Convert image formats
 * const webpBuffer = await compressor.convert(pngBuffer, 'webp', { quality: 80 });
 *
 * // Process images with pipeline
 * const result = await compressor.pipeline()
 *   .input(imageBuffer)
 *   .resize({ width: 800, height: 600 })
 *   .rotate(90)
 *   .encode('avif', { quality: 90 })
 *   .execute();
 * ```
 *
 * @packageDocumentation
 */

// Export all types
export * from './types/index.js';

// Export all interfaces
export * from './interfaces/codec.js';
export * from './interfaces/processor.js';
export * from './interfaces/library.js';
export * from './interfaces/environment.js';

// Export codec implementations
export { AbstractEncoder, AbstractDecoder } from './codecs/base-codec.js';
export { CodecManager } from './codecs/codec-registry.js';
export * from './codecs/codec-utils.js';

// Export codec classes (avoid option conflicts with types)
export { WebPDecoder, WebPEncoder } from './codecs/webp/index.js';
export { AVIFDecoder, AVIFEncoder } from './codecs/avif/index.js';
export { JXLDecoder, JXLEncoder } from './codecs/jxl/index.js';
export { PngDecoder, PngEncoder } from './codecs/png/index.js';
export { MozJpegDecoder, MozJpegEncoder } from './codecs/mozjpeg/index.js';

// Export worker management system
export * from './workers/index.js';

// Export error classes
export * from './errors/index.js';

// Export processor classes (avoid registry conflict)
export { BaseProcessor } from './processors/base-processor.js';
export { ProcessorRegistry } from './processors/processor-registry.js';
export { ResizeProcessor } from './processors/resize-processor.js';
export { RotateProcessor } from './processors/rotate-processor.js';
export { QuantizeProcessor } from './processors/quantize-processor.js';

// Export memory management utilities
export * from './memory/index.js';

// Export performance optimization utilities
export * from './performance/index.js';

// Export main ImageCompressor class
export { ImageCompressor } from './image-compressor.js';
