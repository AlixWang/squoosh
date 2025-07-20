/**
 * Codec registry system for managing encoders and decoders
 */

import { BaseCodec, Encoder, Decoder, CodecRegistry as ICodecRegistry } from '../interfaces/codec.js';
import { ImageFormat } from '../types/index.js';
import { UnsupportedFormatError, ValidationError } from '../errors/index.js';
import { FormatDetector } from './codec-utils.js';

/**
 * Generic codec registry implementation
 */
export class GenericCodecRegistry<T extends BaseCodec> implements ICodecRegistry<T> {
  private codecs = new Map<ImageFormat, T>();

  /**
   * Register a codec for a specific format
   */
  register(codec: T): void {
    if (!codec) {
      throw new ValidationError('Codec cannot be null or undefined');
    }
    
    if (!codec.format) {
      throw new ValidationError('Codec must have a format property');
    }

    this.codecs.set(codec.format, codec);
  }

  /**
   * Unregister a codec for a specific format
   */
  unregister(format: ImageFormat): void {
    this.codecs.delete(format);
  }

  /**
   * Get a codec for a specific format
   */
  get(format: ImageFormat): T | undefined {
    return this.codecs.get(format);
  }

  /**
   * Get all registered codecs
   */
  getAll(): T[] {
    return Array.from(this.codecs.values());
  }

  /**
   * Check if a format is supported
   */
  async isSupported(format: ImageFormat): Promise<boolean> {
    const codec = this.get(format);
    if (!codec) {
      return false;
    }
    
    try {
      return await codec.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Get all supported formats
   */
  async getSupportedFormats(): Promise<ImageFormat[]> {
    const formats: ImageFormat[] = [];
    
    for (const [format, codec] of this.codecs) {
      try {
        if (await codec.isSupported()) {
          formats.push(format);
        }
      } catch {
        // Ignore codecs that fail support check
      }
    }
    
    return formats;
  }

  /**
   * Clear all registered codecs
   */
  clear(): void {
    this.codecs.clear();
  }

  /**
   * Get the number of registered codecs
   */
  size(): number {
    return this.codecs.size;
  }

  /**
   * Check if any codecs are registered
   */
  isEmpty(): boolean {
    return this.codecs.size === 0;
  }

  /**
   * Get all registered format names
   */
  getRegisteredFormats(): ImageFormat[] {
    return Array.from(this.codecs.keys());
  }
}

/**
 * Encoder registry with encoder-specific functionality
 */
export class EncoderRegistry extends GenericCodecRegistry<Encoder> {
  /**
   * Encode ImageData to a specific format
   */
  async encode(
    imageData: ImageData,
    format: ImageFormat,
    options?: any
  ): Promise<ArrayBuffer> {
    const encoder = this.get(format);
    if (!encoder) {
      throw new UnsupportedFormatError(format);
    }

    if (!(await encoder.isSupported())) {
      throw new UnsupportedFormatError(format);
    }

    return encoder.encode(imageData, options);
  }

  /**
   * Get default options for a format
   */
  getDefaultOptions(format: ImageFormat): any {
    const encoder = this.get(format);
    if (!encoder) {
      throw new UnsupportedFormatError(format);
    }

    return encoder.getDefaultOptions();
  }

  /**
   * Validate options for a format
   */
  validateOptions(format: ImageFormat, options: any): boolean {
    const encoder = this.get(format);
    if (!encoder) {
      return false;
    }

    return encoder.validateOptions(options);
  }
}

/**
 * Decoder registry with decoder-specific functionality
 */
export class DecoderRegistry extends GenericCodecRegistry<Decoder> {
  /**
   * Decode a buffer to ImageData
   */
  async decode(buffer: ArrayBuffer, format?: ImageFormat): Promise<ImageData> {
    let decoder: Decoder | undefined;

    if (format) {
      // Use specified format
      decoder = this.get(format);
      if (!decoder) {
        throw new UnsupportedFormatError(format);
      }
    } else {
      // Auto-detect format
      const detectedFormat = FormatDetector.detectFormat(buffer);
      if (!detectedFormat) {
        throw new ValidationError('Unable to detect image format from buffer');
      }

      decoder = this.get(detectedFormat);
      if (!decoder) {
        throw new UnsupportedFormatError(detectedFormat);
      }
    }

    if (!(await decoder.isSupported())) {
      throw new UnsupportedFormatError(decoder.format);
    }

    if (!decoder.canDecode(buffer)) {
      throw new ValidationError(`Buffer cannot be decoded as ${decoder.format}`);
    }

    return decoder.decode(buffer);
  }

  /**
   * Check if a buffer can be decoded
   */
  canDecode(buffer: ArrayBuffer, format?: ImageFormat): boolean {
    if (format) {
      const decoder = this.get(format);
      return decoder ? decoder.canDecode(buffer) : false;
    }

    // Check all decoders
    for (const decoder of this.getAll()) {
      if (decoder.canDecode(buffer)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detect format from buffer using registered decoders
   */
  detectFormat(buffer: ArrayBuffer): ImageFormat | null {
    // First try the utility detector
    const detectedFormat = FormatDetector.detectFormat(buffer);
    if (detectedFormat && this.get(detectedFormat)) {
      return detectedFormat;
    }

    // Fall back to checking all registered decoders
    for (const decoder of this.getAll()) {
      if (decoder.canDecode(buffer)) {
        return decoder.format;
      }
    }

    return null;
  }
}

/**
 * Combined codec manager that manages both encoders and decoders
 */
export class CodecManager {
  public readonly encoders = new EncoderRegistry();
  public readonly decoders = new DecoderRegistry();

  /**
   * Register an encoder
   */
  registerEncoder(encoder: Encoder): void {
    this.encoders.register(encoder);
  }

  /**
   * Register a decoder
   */
  registerDecoder(decoder: Decoder): void {
    this.decoders.register(decoder);
  }

  /**
   * Register both encoder and decoder for a format
   */
  registerCodec(encoder: Encoder, decoder: Decoder): void {
    if (encoder.format !== decoder.format) {
      throw new ValidationError('Encoder and decoder must be for the same format');
    }
    
    this.registerEncoder(encoder);
    this.registerDecoder(decoder);
  }

  /**
   * Unregister codecs for a format
   */
  unregisterFormat(format: ImageFormat): void {
    this.encoders.unregister(format);
    this.decoders.unregister(format);
  }

  /**
   * Get supported formats
   */
  async getSupportedFormats() {
    const [encoderFormats, decoderFormats] = await Promise.all([
      this.encoders.getSupportedFormats(),
      this.decoders.getSupportedFormats(),
    ]);

    return {
      encoders: encoderFormats,
      decoders: decoderFormats,
      processors: [], // Will be populated by processor registry
    };
  }

  /**
   * Check if encoding is supported for a format
   */
  async canEncode(format: ImageFormat): Promise<boolean> {
    return this.encoders.isSupported(format);
  }

  /**
   * Check if decoding is supported for a format
   */
  async canDecode(format: ImageFormat): Promise<boolean> {
    return this.decoders.isSupported(format);
  }

  /**
   * Convert between formats
   */
  async convert(
    input: ArrayBuffer,
    targetFormat: ImageFormat,
    options?: any,
    sourceFormat?: ImageFormat
  ): Promise<ArrayBuffer> {
    // Decode input
    const imageData = await this.decoders.decode(input, sourceFormat);
    
    // Encode to target format
    return this.encoders.encode(imageData, targetFormat, options);
  }

  /**
   * Detect format from buffer
   */
  detectFormat(buffer: ArrayBuffer): ImageFormat | null {
    return this.decoders.detectFormat(buffer);
  }

  /**
   * Get format information
   */
  getFormatInfo(format: ImageFormat) {
    const encoder = this.encoders.get(format);
    const decoder = this.decoders.get(format);
    
    if (!encoder && !decoder) {
      throw new UnsupportedFormatError(format);
    }

    const codec = encoder || decoder!;
    
    return {
      format: codec.format,
      mimeType: codec.mimeType,
      extension: codec.extension,
      supportsLossless: FormatDetector.supportsLossless(format),
      supportsTransparency: FormatDetector.supportsTransparency(format),
      defaultOptions: encoder ? encoder.getDefaultOptions() : {},
    };
  }

  /**
   * Clear all registered codecs
   */
  clear(): void {
    this.encoders.clear();
    this.decoders.clear();
  }
}

// Global registry instances
const globalEncoderRegistry = new EncoderRegistry();
const globalDecoderRegistry = new DecoderRegistry();
export const codecManager = new CodecManager();

/**
 * Utility class to access global registries
 */
export class CodecRegistry {
  static getEncoderRegistry(): EncoderRegistry {
    return globalEncoderRegistry;
  }

  static getDecoderRegistry(): DecoderRegistry {
    return globalDecoderRegistry;
  }

  static getCodecManager(): CodecManager {
    return codecManager;
  }
}
/**

 * Get the global encoder registry
 */
export function getEncoderRegistry(): EncoderRegistry {
  return CodecRegistry.getEncoderRegistry();
}

/**
 * Get the global decoder registry
 */
export function getDecoderRegistry(): DecoderRegistry {
  return CodecRegistry.getDecoderRegistry();
}

/**
 * Get the global codec manager
 */
export function getCodecManager(): CodecManager {
  return CodecRegistry.getCodecManager();
}