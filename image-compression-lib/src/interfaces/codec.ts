/**
 * Core codec interfaces for encoders and decoders
 */

import { ImageFormat, EncodeOptions } from '../types/index.js';

/**
 * Base interface for all image codecs (encoders and decoders).
 * Provides common properties and capabilities.
 *
 * @public
 */
export interface BaseCodec {
  /** The image format this codec handles */
  readonly format: ImageFormat;

  /** MIME type for this format (e.g., 'image/webp') */
  readonly mimeType: string;

  /** File extension for this format (e.g., '.webp') */
  readonly extension: string;

  /**
   * Check if this codec is supported in the current environment.
   * May involve checking for WebAssembly support, browser capabilities, etc.
   *
   * @returns Promise that resolves to true if supported
   */
  isSupported(): Promise<boolean>;
}

/**
 * Interface for image encoders that convert ImageData to specific formats.
 *
 * @public
 */
export interface Encoder extends BaseCodec {
  /**
   * Encode ImageData to the codec's format.
   *
   * @param imageData - The ImageData to encode
   * @param options - Optional encoding options
   * @returns Promise that resolves to the encoded image as ArrayBuffer
   *
   * @throws {@link EncodingError} When encoding fails
   */
  encode(imageData: ImageData, options?: EncodeOptions): Promise<ArrayBuffer>;

  /**
   * Get the default encoding options for this format.
   *
   * @returns Default options object
   */
  getDefaultOptions(): EncodeOptions;

  /**
   * Validate encoding options for this format.
   *
   * @param options - Options to validate
   * @returns True if options are valid
   */
  validateOptions(options: EncodeOptions): boolean;
}

/**
 * Interface for image decoders that convert format-specific data to ImageData.
 *
 * @public
 */
export interface Decoder extends BaseCodec {
  /**
   * Decode image data from the codec's format to ImageData.
   *
   * @param buffer - The image data to decode
   * @returns Promise that resolves to ImageData
   *
   * @throws {@link DecodingError} When decoding fails
   */
  decode(buffer: ArrayBuffer): Promise<ImageData>;

  /**
   * Check if this decoder can handle the given buffer.
   * Typically checks magic bytes or header information.
   *
   * @param buffer - The image data to check
   * @returns True if this decoder can handle the buffer
   */
  canDecode(buffer: ArrayBuffer): boolean;
}

/**
 * Registry interface for managing collections of codecs.
 *
 * @typeParam T - The type of codec (Encoder or Decoder)
 * @public
 */
export interface CodecRegistry<T extends BaseCodec> {
  /**
   * Register a codec in the registry.
   *
   * @param codec - The codec to register
   */
  register(codec: T): void;

  /**
   * Unregister a codec from the registry.
   *
   * @param format - The format to unregister
   */
  unregister(format: ImageFormat): void;

  /**
   * Get a codec for a specific format.
   *
   * @param format - The format to get a codec for
   * @returns The codec, or undefined if not found
   */
  get(format: ImageFormat): T | undefined;

  /**
   * Get all registered codecs.
   *
   * @returns Array of all registered codecs
   */
  getAll(): T[];

  /**
   * Check if a format is supported (codec is registered and available).
   *
   * @param format - The format to check
   * @returns Promise that resolves to true if supported
   */
  isSupported(format: ImageFormat): Promise<boolean>;
}
