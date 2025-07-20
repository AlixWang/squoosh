/**
 * WebP codec exports
 */

export { WebPDecoder } from './webp-decoder.js';
export { WebPEncoder, type WebPOptions } from './webp-encoder.js';
export { registerWebPCodecs, createWebPCodecManager } from './register.js';

// Re-export types from the WASM modules
export type { WebPModule as WebPDecoderModule } from './dec/webp_dec.js';
export type { WebPModule as WebPEncoderModule, EncodeOptions as WebPEncodeOptions } from './enc/webp_enc.js';