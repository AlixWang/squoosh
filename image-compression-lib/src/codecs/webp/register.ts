/**
 * WebP codec registration utilities
 */

import { CodecManager } from '../codec-registry.js';
import { WebPEncoder } from './webp-encoder.js';
import { WebPDecoder } from './webp-decoder.js';

/**
 * Register WebP encoder and decoder with a codec manager
 */
export function registerWebPCodecs(manager: CodecManager): void {
  const encoder = new WebPEncoder();
  const decoder = new WebPDecoder();
  
  manager.registerCodec(encoder, decoder);
}

/**
 * Create a new codec manager with WebP codecs pre-registered
 */
export function createWebPCodecManager(): CodecManager {
  const manager = new CodecManager();
  registerWebPCodecs(manager);
  return manager;
}