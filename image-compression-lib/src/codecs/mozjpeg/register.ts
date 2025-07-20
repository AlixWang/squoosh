/**
 * MozJPEG codec registration
 */

import { getEncoderRegistry, getDecoderRegistry } from '../codec-registry.js';
import { MozJpegEncoder } from './mozjpeg-encoder.js';
import { MozJpegDecoder } from './mozjpeg-decoder.js';

/**
 * Register MozJPEG codecs
 */
export function registerMozJpegCodecs(): void {
  const encoderRegistry = getEncoderRegistry();
  const decoderRegistry = getDecoderRegistry();

  // Register encoder
  encoderRegistry.register(new MozJpegEncoder());

  // Register decoder
  decoderRegistry.register(new MozJpegDecoder());
}

// Auto-register when imported
registerMozJpegCodecs();