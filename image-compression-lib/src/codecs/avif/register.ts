/**
 * AVIF codec registration
 */

import { CodecManager } from '../codec-registry.js';
import { AVIFEncoder } from './avif-encoder.js';
import { AVIFDecoder } from './avif-decoder.js';

/**
 * Register AVIF encoder and decoder with a codec manager
 */
export function registerAVIFCodecs(manager: CodecManager): void {
  const encoder = new AVIFEncoder();
  const decoder = new AVIFDecoder();
  
  manager.registerCodec(encoder, decoder);
}

/**
 * Create a new codec manager with AVIF codecs registered
 */
export function createAVIFCodecManager(): CodecManager {
  const manager = new CodecManager();
  registerAVIFCodecs(manager);
  return manager;
}

/**
 * Create AVIF encoder instance
 */
export function createAVIFEncoder(): AVIFEncoder {
  return new AVIFEncoder();
}

/**
 * Create AVIF decoder instance
 */
export function createAVIFDecoder(): AVIFDecoder {
  return new AVIFDecoder();
}