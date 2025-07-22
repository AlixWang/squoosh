/**
 * Format-specific encoding options for type-safe codec configuration.
 * These interfaces extend the base EncodeOptions with format-specific parameters.
 */

import { EncodeOptions } from './index.js';

/**
 * WebP-specific encoding options.
 * WebP supports both lossy and lossless compression.
 *
 * @public
 */
export interface WebPOptions extends EncodeOptions {
  /**
   * Quality setting for lossy compression (0-100).
   * Higher values produce better quality but larger file sizes.
   *
   * @defaultValue 75
   */
  quality?: number;

  /**
   * Target file size in bytes for size-constrained encoding.
   * When specified, the encoder will adjust quality to meet the target size.
   * Takes precedence over quality setting.
   */
  target_size?: number;

  /**
   * Compression method (0-6).
   * Higher values use more CPU but may produce smaller files.
   *
   * @defaultValue 4
   */
  method?: number;

  /**
   * Enable lossless compression.
   * When true, quality setting is ignored.
   *
   * @defaultValue false
   */
  lossless?: boolean;
}

/**
 * AVIF-specific encoding options.
 * AVIF provides excellent compression with support for HDR and wide color gamuts.
 *
 * @public
 */
export interface AVIFOptions extends EncodeOptions {
  /**
   * Quality setting for the main image (0-100).
   *
   * @defaultValue 50
   */
  quality?: number;

  /**
   * Quality setting for the alpha channel (0-100).
   * Only relevant for images with transparency.
   *
   * @defaultValue Same as quality
   */
  qualityAlpha?: number;

  /**
   * Encoding speed vs compression efficiency (0-10).
   * Lower values are faster but produce larger files.
   *
   * @defaultValue 4
   */
  speed?: number;

  /**
   * Enable lossless compression.
   *
   * @defaultValue false
   */
  lossless?: boolean;
}

/**
 * JPEG XL-specific encoding options.
 * JPEG XL is a next-generation format with excellent compression and features.
 *
 * @public
 */
export interface JXLOptions extends EncodeOptions {
  /**
   * Quality setting (0-100).
   *
   * @defaultValue 75
   */
  quality?: number;

  /**
   * Encoding effort (1-9).
   * Higher values use more CPU but may produce smaller files.
   *
   * @defaultValue 7
   */
  effort?: number;

  /**
   * Enable lossless compression.
   *
   * @defaultValue false
   */
  lossless?: boolean;

  /**
   * Enable progressive encoding.
   * Allows partial image display during loading.
   *
   * @defaultValue true
   */
  progressive?: boolean;
}

/**
 * PNG-specific encoding options.
 * PNG is always lossless, so options focus on compression efficiency.
 *
 * @public
 */
export interface PNGOptions extends EncodeOptions {
  /**
   * Compression level (0-9).
   * Higher values produce smaller files but take more time.
   *
   * @defaultValue 6
   */
  compressionLevel?: number;

  /**
   * Enable palette optimization for images with few colors.
   * Can significantly reduce file size for suitable images.
   *
   * @defaultValue true
   */
  optimizePalette?: boolean;
}

/**
 * JPEG-specific encoding options (using MozJPEG encoder).
 *
 * @public
 */
export interface JPEGOptions extends EncodeOptions {
  /**
   * Quality setting (0-100).
   *
   * @defaultValue 75
   */
  quality?: number;

  /**
   * Use baseline JPEG format.
   * Baseline JPEGs are compatible with more software but may be larger.
   *
   * @defaultValue false
   */
  baseline?: boolean;

  /**
   * Enable arithmetic coding.
   * Can reduce file size but may have compatibility issues.
   *
   * @defaultValue false
   */
  arithmetic?: boolean;

  /**
   * Enable progressive JPEG.
   * Allows partial image display during loading.
   *
   * @defaultValue true
   */
  progressive?: boolean;
}

/**
 * QOI-specific encoding options.
 * QOI is a simple, fast lossless format with minimal configuration.
 *
 * @public
 */
export interface QOIOptions extends EncodeOptions {
  /**
   * Color space (0 = sRGB with linear alpha, 1 = all channels linear).
   *
   * @defaultValue 0
   */
  colorspace?: 0 | 1;
}

/**
 * WebP2-specific encoding options.
 * WebP2 is an experimental next-generation format.
 *
 * @public
 */
export interface WP2Options extends EncodeOptions {
  /**
   * Quality setting (0-100).
   *
   * @defaultValue 75
   */
  quality?: number;

  /**
   * Encoding effort (0-9).
   * Higher values use more CPU but may produce smaller files.
   *
   * @defaultValue 5
   */
  effort?: number;

  /**
   * Enable lossless compression.
   *
   * @defaultValue false
   */
  lossless?: boolean;
}

/**
 * Union type of all format-specific options.
 * Useful for type-safe handling of codec options.
 *
 * @public
 */
export type FormatSpecificOptions =
  | WebPOptions
  | AVIFOptions
  | JXLOptions
  | PNGOptions
  | JPEGOptions
  | QOIOptions
  | WP2Options;

/**
 * Type mapping from format names to their specific options.
 * Enables type-safe option handling based on format.
 *
 * @public
 */
export interface FormatOptionsMap {
  webp: WebPOptions;
  avif: AVIFOptions;
  'jpeg-xl': JXLOptions;
  png: PNGOptions;
  jpeg: JPEGOptions;
  qoi: QOIOptions;
  wp2: WP2Options;
}

/**
 * Helper type to get options type for a specific format.
 *
 * @example
 * ```typescript
 * type WebPOpts = OptionsForFormat<'webp'>; // WebPOptions
 * ```
 *
 * @public
 */
export type OptionsForFormat<T extends keyof FormatOptionsMap> =
  FormatOptionsMap[T];
