/**
 * PNG decoder implementation
 */

import { AbstractDecoder } from '../base-codec.js';
import { ImageFormat } from '../../types/index.js';
import { DecodingError, ErrorCode } from '../../errors/index.js';
import init, { decode } from './pkg/squoosh_png.js';

/**
 * PNG decoder class
 */
export class PngDecoder extends AbstractDecoder {
  readonly format: ImageFormat = 'png';
  readonly mimeType = 'image/png';
  readonly extension = '.png';

  private initialized = false;

  /**
   * Initialize the WebAssembly module
   */
  private async initModule(): Promise<void> {
    if (!this.initialized) {
      try {
        await init();
        this.initialized = true;
      } catch (error) {
        throw new DecodingError('Failed to initialize PNG decoder module', ErrorCode.DECODER_INITIALIZATION_FAILED, { error });
      }
    }
  }

  /**
   * Check if this decoder can decode the given buffer
   */
  canDecode(buffer: ArrayBuffer): boolean {
    return this.checkSignature(buffer);
  }

  /**
   * Check PNG signature
   */
  protected checkSignature(buffer: ArrayBuffer): boolean {
    if (buffer.byteLength < 8) {
      return false;
    }

    const view = new Uint8Array(buffer, 0, 8);
    
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    return (
      view[0] === 0x89 &&
      view[1] === 0x50 &&
      view[2] === 0x4E &&
      view[3] === 0x47 &&
      view[4] === 0x0D &&
      view[5] === 0x0A &&
      view[6] === 0x1A &&
      view[7] === 0x0A
    );
  }

  /**
   * Decode PNG buffer to ImageData
   */
  async decode(buffer: ArrayBuffer): Promise<ImageData> {
    this.validateDecodeBuffer(buffer);

    try {
      await this.initModule();
      
      const uint8Array = new Uint8Array(buffer);
      const result = decode(uint8Array);
      
      if (!result) {
        throw new DecodingError('PNG decoding failed - invalid or corrupted data');
      }

      return result;
    } catch (error) {
      if (error instanceof DecodingError) {
        throw error;
      }
      throw new DecodingError('PNG decoding failed', ErrorCode.DECODING_FAILED, { error });
    }
  }

  /**
   * Check if PNG is supported in the current environment
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