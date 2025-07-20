/**
 * Main codec exports
 */

// Base codec classes
export { AbstractEncoder, AbstractDecoder } from './base-codec.js';
export { CodecRegistry } from './codec-registry.js';

// WebP codec
export { WebPDecoder, WebPEncoder } from './webp/index.js';
export type { WebPOptions } from './webp/index.js';

// AVIF codec
export { AVIFDecoder, AVIFEncoder } from './avif/index.js';
export type { AVIFOptions } from './avif/index.js';

// JPEG XL codec
export { JXLDecoder, JXLEncoder } from './jxl/index.js';
export type { JXLOptions } from './jxl/index.js';

// PNG codec
export { PngDecoder, PngEncoder } from './png/index.js';
export type { PngEncodeOptions } from './png/index.js';

// MozJPEG codec
export { MozJpegDecoder, MozJpegEncoder } from './mozjpeg/index.js';
export type { MozJpegEncoderOptions } from './mozjpeg/index.js';

// Registration functions
export { registerWebPCodecs } from './webp/register.js';
export { registerAVIFCodecs } from './avif/register.js';
export { registerJXLCodecs } from './jxl/register.js';
export { registerPngCodecs } from './png/register.js';
export { registerMozJpegCodecs } from './mozjpeg/register.js';

/**
 * Register all available codecs
 */
export function registerAllCodecs(): void {
  registerWebPCodecs();
  registerAVIFCodecs();
  registerJXLCodecs();
  registerPngCodecs();
  registerMozJpegCodecs();
}