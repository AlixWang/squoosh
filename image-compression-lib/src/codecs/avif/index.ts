/**
 * AVIF codec exports
 */

export { AVIFDecoder } from './avif-decoder.js';
export { AVIFEncoder, type AVIFOptions } from './avif-encoder.js';
export { registerAVIFCodecs, createAVIFCodecManager } from './register.js';

// Re-export types from the WASM modules
export type { AVIFModule } from './dec/avif_dec.js';
export type { AVIFModule as AVIFEncoderModule, EncodeOptions as AVIFEncodeOptions, AVIFTune } from './enc/avif_enc.js';