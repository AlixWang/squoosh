/**
 * WebP decoder implementation
 */

import { AbstractDecoder } from '../base-codec.js';
import { ImageFormat } from '../../types/index.js';
import { DecodingError, ErrorCode } from '../../errors/index.js';
import type { WebPModule } from './dec/webp_dec.js';

/**
 * WebP decoder class
 */
export class WebPDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'webp';
  readonly mimeType = 'image/webp';
  readonly extension = '.webp';

  private modulePromise: Promise<WebPModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<WebPModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<WebPModule> {
    try {
      const moduleFactory = await import('./dec/webp_dec.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new DecodingError('Failed to load WebP decoder module', ErrorCode.DECODER_INITIALIZATION_FAILED, { cause: error as Error });
    }
  }

  /**
   * Check if this decoder can decode the given buffer
   */
  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  /**
   * Check WebP signature
   */
  protected checkSignature(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 12) {
      return false;
    }

    const view = new Uint8Array(buffer, 0, 12);
    
    // Check RIFF header
    if (view[0] !== 0x52 || view[1] !== 0x49 || view[2] !== 0x46 || view[3] !== 0x46) {
      return false;
    }

    // Check WEBP signature
    if (view[8] !== 0x57 || view[9] !== 0x45 || view[10] !== 0x42 || view[11] !== 0x50) {
      return false;
    }

    return true;
  }

  /**
   * Decode WebP buffer to ImageData
   */
  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);

    try {
      const module = await this.initModule();
      const result = module.decode(buffer);
      
      if (!result) {
        throw new DecodingError('WebP decoding failed - invalid or corrupted data');
      }

      return result;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }
      throw new DecodingError('WebP decoding failed', ErrorCode.DECODING_FAILED, { cause: error as Error });
    }
  }

  /**
   * Check if WebP is supported in the current environment
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