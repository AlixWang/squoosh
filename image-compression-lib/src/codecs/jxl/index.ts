/**
 * JPEG XL codec exports
 */

export { JXLDecoder } from './jxl-decoder.js';
export { JXLEncoder, type JXLOptions } from './jxl-encoder.js';
export { registerJXLCodecs, createJXLCodecManager } from './register.js';

// Re-export types from the WASM modules
export type { JXLModule } from './dec/jxl_dec.js';
export type { JXLModule as JXLEncoderModule, EncodeOptions as JXLEncodeOptions } from './enc/jxl_enc.js';