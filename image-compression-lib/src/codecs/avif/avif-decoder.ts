/**
 * AVIF decoder implementation
 */

import { AbstractDecoder } from '../base-codec.js';
import { ImageFormat } from '../../types/index.js';
import { DecodingError, ErrorCode } from '../../errors/index.js';
import type { AVIFModule } from './dec/avif_dec.js';

/**
 * AVIF decoder class
 */
export class AVIFDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'avif';
  readonly mimeType = 'image/avif';
  readonly extension = '.avif';

  private modulePromise: Promise<AVIFModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<AVIFModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<AVIFModule> {
    try {
      const moduleFactory = await import('./dec/avif_dec.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new DecodingError('Failed to load AVIF decoder module', ErrorCode.DECODER_INITIALIZATION_FAILED, { error });
    }
  }

  /**
   * Check if this decoder can decode the given buffer
   */
  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  /**
   * Check AVIF signature
   */
  protected checkSignature(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 12) {
      return false;
    }

    const view = new Uint8Array(buffer, 0, 12);
    
    // Check for AVIF signature in ftyp box
    // Look for 'ftyp' at offset 4-7 and 'avif' at offset 8-11
    if (view[4] === 0x66 && view[5] === 0x74 && view[6] === 0x79 && view[7] === 0x70) {
      // Check for 'avif' brand
      if (view[8] === 0x61 && view[9] === 0x76 && view[10] === 0x69 && view[11] === 0x66) {
        return true;
      }
    }

    // Alternative check: look for 'avif' anywhere in the first 32 bytes
    if (buffer.byteLength >= 32) {
      const extendedView = new Uint8Array(buffer, 0, 32);
      for (let i = 0; i <= 28; i++) {
        if (extendedView[i] === 0x61 && extendedView[i + 1] === 0x76 && 
            extendedView[i + 2] === 0x69 && extendedView[i + 3] === 0x66) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Decode AVIF buffer to ImageData
   */
  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);

    try {
      const module = await this.initModule();
      const result = module.decode(buffer);
      
      if (!result) {
        throw new DecodingError('AVIF decoding failed - invalid or corrupted data');
      }

      return result;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }
      throw new DecodingError('AVIF decoding failed', ErrorCode.DECODING_FAILED, { error });
    }
  }

  /**
   * Check if AVIF is supported in the current environment
   */
  async isSupported(): Promise<boolean> {
    try {
      const baseSupported = await super.isSupported();
      if (!baseSupported) {
        return false;
      }

      // Try to initialize the module to verify it works
      await this.initModule();
      return true;
    } catch {
      return false;
    }
  }
}