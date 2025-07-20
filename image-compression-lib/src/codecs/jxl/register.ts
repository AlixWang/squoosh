/**
 * JPEG XL codec registration
 */

import { CodecManager } from '../codec-registry.js';
import { JXLEncoder } from './jxl-encoder.js';
import { JXLDecoder } from './jxl-decoder.js';

/**
 * Register JPEG XL encoder and decoder with a codec manager
 */
export function registerJXLCodecs(manager: CodecManager): void {
  const encoder = new JXLEncoder();
  const decoder = new JXLDecoder();
  
  manager.registerCodec(encoder, decoder);
}

/**
 * Create a new codec manager with JPEG XL codecs registered
 */
export function createJXLCodecManager(): CodecManager {
  const manager = new CodecManager();
  registerJXLCodecs(manager);
  return manager;
}

/**
 * Create JPEG XL encoder instance
 */
export function createJXLEncoder(): JXLEncoder {
  return new JXLEncoder();
}

/**
 * Create JPEG XL decoder instance
 */
export function createJXLDecoder(): JXLDecoder {
  return new JXLDecoder();
}