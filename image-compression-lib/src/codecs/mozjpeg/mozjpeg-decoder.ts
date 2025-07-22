/**
 * MozJPEG decoder implementation
 */

import { AbstractDecoder } from '../base-codec.js';
import { ImageFormat } from '../../types/index.js';
import { DecodingError, ErrorCode } from '../../errors/index.js';
import type { MozJPEGDecodeModule } from './dec/mozjpeg_dec.js';

/**
 * MozJPEG decoder class
 */
export class MozJpegDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'jpeg';
  readonly mimeType = 'image/jpeg';
  readonly extension = '.jpg';

  private modulePromise: Promise<MozJPEGDecodeModule> | null = null;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<MozJPEGDecodeModule> {
    if (!this.modulePromise) {
      this.modulePromise = this.loadModule();
    }
    return this.modulePromise;
  }

  /**
   * Load the WebAssembly module
   */
  private async loadModule(): Promise<MozJPEGDecodeModule> {
    try {
      // Use the Node.js version for now - could be enhanced to detect environment
      const moduleFactory = await import('./dec/mozjpeg_node_dec.js');
      return moduleFactory.default({
        noInitialRun: true,
      });
    } catch (error) {
      throw new DecodingError('Failed to load MozJPEG decoder module', ErrorCode.DECODER_INITIALIZATION_FAILED, { error });
    }
  }

  /**
   * Check if this decoder can decode the given buffer
   */
  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  /**
   * Check JPEG signature
   */
  protected checkSignature(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 3) {
      return false;
    }

    const view = new Uint8Array(buffer, 0, 3);
    
    // Check JPEG signature: FF D8 FF
    return view[0] === 0xFF && view[1] === 0xD8 && view[2] === 0xFF;
  }

  /**
   * Decode JPEG buffer to ImageData
   */
  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);

    try {
      const module = await this.initModule();
      const result = module.decode(buffer);
      
      if (!result) {
        throw new DecodingError('JPEG decoding failed - invalid or corrupted data');
      }

      return result;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }
      throw new DecodingError('JPEG decoding failed', ErrorCode.DECODING_FAILED, { error });
    }
  }

  /**
   * Check if MozJPEG is supported in the current environment
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