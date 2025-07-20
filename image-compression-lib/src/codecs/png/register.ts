/**
 * PNG codec registration
 */

import { getEncoderRegistry, getDecoderRegistry } from '../codec-registry.js';
import { PngEncoder } from './png-encoder.js';
import { PngDecoder } from './png-decoder.js';

/**
 * Register PNG codecs
 */
export function registerPngCodecs(): void {
  const encoderRegistry = getEncoderRegistry();
  const decoderRegistry = getDecoderRegistry();

  // Register encoder
  encoderRegistry.register(new PngEncoder());

  // Register decoder
  decoderRegistry.register(new PngDecoder());
}

// Auto-register when imported
registerPngCodecs();