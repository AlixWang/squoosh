/**
 * Base codec abstract class with common functionality
 */

import { BaseCodec, Encoder, Decoder } from '../interfaces/codec.js';
import { ImageFormat, EncodeOptions } from '../types/index.js';
import { ValidationError } from '../errors/index.js';

/**
 * Abstract base class for all codecs
 */
export abstract class AbstractBaseCodec implements BaseCodec {
  abstract readonly format: ImageFormat;
  abstract readonly mimeType: string;
  abstract readonly extension: string;

  /**
   * Check if this codec is supported in the current environment
   */
  async isSupported(): Promise<boolean> {
    try {
      // Default implementation checks for WebAssembly support
      return typeof WebAssembly !== 'undefined' && 
             typeof WebAssembly.instantiate === 'function';
    } catch {
      return false;
    }
  }

  /**
   * Validate that a buffer contains data for this format
   */
  protected validateBuffer(buffer: ArrayBuffer): void {
    if (!buffer || buffer.byteLength === 0) {
      throw new ValidationError('Buffer is empty or invalid');
    }
  }

  /**
   * Get format information
   */
  getFormatInfo() {
    return {
      format: this.format,
      mimeType: this.mimeType,
      extension: this.extension,
    };
  }
}

/**
 * Abstract base class for encoders
 */
export abstract class AbstractEncoder extends AbstractBaseCodec implements Encoder {
  /**
   * Encode ImageData to the target format
   */
  abstract encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer>;

  /**
   * Get default encoding options for this format
   */
  abstract getDefaultOptions(): EncodeOptions;

  /**
   * Validate encoding options
   */
  validateOptions(options: EncodeOptions): boolean {
    // Allow undefined (will use defaults) but not null
    if (options === null) return false;
    
    // Allow undefined
    if (options === undefined) return true;
    
    // Must be an object
    if (typeof options !== 'object') return false;

    // Basic validation - quality should be between 0 and 100 if present
    if (options.quality !== undefined) {
      if (typeof options.quality !== 'number' || 
          options.quality < 0 || 
          options.quality > 100) {
        return false;
      }
    }

    return this.validateFormatSpecificOptions(options);
  }

  /**
   * Validate format-specific options (to be overridden by subclasses)
   */
  protected validateFormatSpecificOptions(options: EncodeOptions): boolean {
    return true;
  }

  /**
   * Validate ImageData before encoding
   */
  protected validateImageData(imageData: ImageData): void {
    if (!imageData) {
      throw new ValidationError('ImageData is required');
    }
    if (!imageData.data || imageData.data.length === 0) {
      throw new ValidationError('ImageData contains no pixel data');
    }
    if (imageData.width <= 0 || imageData.height <= 0) {
      throw new ValidationError('ImageData has invalid dimensions');
    }
    if (imageData.data.length !== imageData.width * imageData.height * 4) {
      throw new ValidationError('ImageData pixel data length does not match dimensions');
    }
  }

  /**
   * Merge user options with defaults
   */
  protected mergeOptions(userOptions?: EncodeOptions): EncodeOptions {
    const defaults = this.getDefaultOptions();
    return { ...defaults, ...userOptions };
  }
}

/**
 * Abstract base class for decoders
 */
export abstract class AbstractDecoder extends AbstractBaseCodec implements Decoder {
  /**
   * Decode buffer to ImageData
   */
  abstract decode(buffer: ArrayBuffer): Promise<ImageData>;

  /**
   * Check if this decoder can decode the given buffer
   */
  abstract canDecode(buffer: ArrayBuffer): boolean;

  /**
   * Validate buffer before decoding
   */
  protected validateDecodeBuffer(buffer: ArrayBuffer): void {
    this.validateBuffer(buffer);
    
    if (!this.canDecode(buffer)) {
      throw new ValidationError(`Buffer does not contain valid ${this.format} data`);
    }
  }

  /**
   * Check format signature/magic bytes (to be implemented by subclasses)
   */
  protected abstract checkSignature(buffer: ArrayBuffer): boolean;
}