/**
 * PNG encoder implementation
 */

import { AbstractEncoder } from '../base-codec.js';
import { ImageFormat, EncodeOptions } from '../../types/index.js';
import { EncodingError } from '../../errors/index.js';
import init, { encode } from './pkg/squoosh_png.js';

/**
 * PNG encoder options (PNG is lossless, so minimal options)
 */
export interface PngEncodeOptions {
  // PNG is lossless, so no quality option
  // Could add compression level in the future if needed
}

/**
 * PNG encoder class
 */
export class PngEncoder extends AbstractEncoder {
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
        throw new EncodingError('Failed to initialize PNG encoder module', { error });
      }
    }
  }

  /**
   * Get default encoding options
   */
  getDefaultOptions(): PngEncodeOptions {
    return {};
  }

  /**
   * Validate format-specific options
   */
  protected validateFormatSpecificOptions(_options: EncodeOptions): boolean {
    // PNG has no configurable options currently
    return true;
  }

  /**
   * Encode ImageData to PNG buffer
   */
  async encode(imageData: ImageData, options: PngEncodeOptions = {}): Promise<ArrayBuffer> {
    this.validateImageData(imageData);
    
    if (!this.validateOptions(options)) {
      throw new EncodingError('Invalid PNG encoding options');
    }

    try {
      await this.initModule();

      const { data, width, height } = imageData;
      const uint8Data = new Uint8Array(data);
      
      const result = encode(uint8Data, width, height);
      
      if (!result) {
        throw new EncodingError('PNG encoding failed');
      }

      return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength);
    } catch (error) {
      if (error instanceof EncodingError) {
        throw error;
      }
      throw new EncodingError('PNG encoding failed', { error });
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