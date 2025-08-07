/**
 * MozJPEG codec registration
 */

import { getEncoderRegistry, getDecoderRegistry, CodecManager } from '../codec-registry.js';
import { MozJpegEncoder } from './mozjpeg-encoder.js';
import { MozJpegDecoder } from './mozjpeg-decoder.js';

/**
 * Register MozJPEG codecs with a specific codec manager
 */
export function registerMozJpegCodecs(manager?: CodecManager): void {
  if (manager) {
    // Register with the provided codec manager
    const encoder = new MozJpegEncoder();
    const decoder = new MozJpegDecoder();
    manager.registerCodec(encoder, decoder);
  } else {
    // Register with global registries
    const encoderRegistry = getEncoderRegistry();
    const decoderRegistry = getDecoderRegistry();

    // Register encoder
    encoderRegistry.register(new MozJpegEncoder());

    // Register decoder
    decoderRegistry.register(new MozJpegDecoder());
  }
}

/**
 * Create a new codec manager with MozJPEG codecs pre-registered
 */
export function createMozJpegCodecManager(): CodecManager {
  const manager = new CodecManager();
  registerMozJpegCodecs(manager);
  return manager;
}

// Auto-register with global registries when imported
registerMozJpegCodecs();