/**
 * Image Compression Library
 *
 * A TypeScript library for image compression and format conversion
 * based on Squoosh functionality.
 */

// Export all types
export * from './types/index.js';

// Export all interfaces
export * from './interfaces/codec.js';
export * from './interfaces/processor.js';
export * from './interfaces/library.js';
export * from './interfaces/environment.js';

// Export codec implementations
export * from './codecs/base-codec.js';
export * from './codecs/codec-registry.js';
export * from './codecs/codec-utils.js';

// Export WebP codec
export * from './codecs/webp/index.js';

// Export AVIF codec
export * from './codecs/avif/index.js';

// Export JPEG XL codec
export * from './codecs/jxl/index.js';

// Export PNG codec
export * from './codecs/png/index.js';

// Export MozJPEG codec
export * from './codecs/mozjpeg/index.js';

// Export worker management system
export * from './workers/index.js';

// Export error classes
export * from './errors/index.js';

// Export processors
export * from './processors/index.js';

// Export memory management utilities
export * from './memory/index.js';

// Export performance optimization utilities
export * from './performance/index.js';

// Export main ImageCompressor class
export { ImageCompressor } from './image-compressor.js';
