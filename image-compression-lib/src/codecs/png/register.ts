/**
 * PNG codec registration
 */

import { getEncoderRegistry, getDecoderRegistry, CodecManager } from '../codec-registry.js';
import { PngEncoder } from './png-encoder.js';
import { PngDecoder } from './png-decoder.js';

/**
 * Register PNG codecs with a specific codec manager
 */
export function registerPngCodecs(manager?: CodecManager): void {
  if (manager) {
    // Register with the provided codec manager
    const encoder = new PngEncoder();
    const decoder = new PngDecoder();
    manager.registerCodec(encoder, decoder);
  } else {
    // Register with global registries
    const encoderRegistry = getEncoderRegistry();
    const decoderRegistry = getDecoderRegistry();

    // Register encoder
    encoderRegistry.register(new PngEncoder());

    // Register decoder
    decoderRegistry.register(new PngDecoder());
  }
}

/**
 * Create a new codec manager with PNG codecs pre-registered
 */
export function createPngCodecManager(): CodecManager {
  const manager = new CodecManager();
  registerPngCodecs(manager);
  return manager;
}

// Auto-register with global registries when imported
registerPngCodecs();