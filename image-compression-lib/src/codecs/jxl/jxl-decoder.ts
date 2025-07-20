/**
 * JPEG XL decoder implementation
 */

import { AbstractDecoder } from '../base-codec.js';
import { ImageFormat } from '../../types/index.js';
import { DecodingError } from '../../errors/index.js';
import type { JXLModule } from './dec/jxl_dec.js';

/**
 * JPEG XL decoder class
 */
export class JXLDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'jpeg-xl';
  readonly mimeType = 'image/jxl';
  readonly extension = '.jxl';

  private modulePromise: Promise<JXLModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<JXLModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<JXLModule> {
    try {
      const moduleFactory = await import('./dec/jxl_dec.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new DecodingError('Failed to load JPEG XL decoder module', { error });
    }
  }

  /**
   * Check if this decoder can decode the given buffer
   */
  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  /**
   * Check JPEG XL signature
   */
  protected checkSignature(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 12) {
      return false;
    }

    const view = new Uint8Array(buffer, 0, 12);
    
    // Check for JPEG XL signature
    // Naked codestream: starts with 0xFF 0x0A
    if (view[0] === 0xFF && view[1] === 0x0A) {
      return true;
    }

    // Container format: starts with 0x00 0x00 0x00 0x0C 0x4A 0x58 0x4C 0x20 0x0D 0x0A 0x87 0x0A
    if (buffer.byteLength >= 12 &&
        view[0] === 0x00 && view[1] === 0x00 && view[2] === 0x00 && view[3] === 0x0C &&
        view[4] === 0x4A && view[5] === 0x58 && view[6] === 0x4C && view[7] === 0x20 &&
        view[8] === 0x0D && view[9] === 0x0A && view[10] === 0x87 && view[11] === 0x0A) {
      return true;
    }

    return false;
  }

  /**
   * Decode JPEG XL buffer to ImageData
   */
  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);

    try {
      const module = await this.initModule();
      const result = module.decode(buffer);
      
      if (!result) {
        throw new DecodingError('JPEG XL decoding failed - invalid or corrupted data');
      }

      return result;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }
      throw new DecodingError('JPEG XL decoding failed', { error });
    }
  }

  /**
   * Check if JPEG XL is supported in the current environment
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