/**
 * Core type definitions for the image compression library
 */

/**
 * Supported image formats for encoding and decoding operations.
 *
 * @public
 */
export type ImageFormat =
  | 'webp' // WebP format - good compression, wide browser support
  | 'avif' // AVIF format - excellent compression, modern browsers
  | 'jpeg-xl' // JPEG XL format - next-gen format with excellent compression
  | 'png' // PNG format - lossless, universal support
  | 'jpeg' // JPEG format - lossy, universal support
  | 'qoi' // QOI format - simple, fast lossless format
  | 'wp2'; // WebP2 format - experimental next-gen WebP

/**
 * Input types that can be processed by the image compression library.
 *
 * @public
 */
export type ImageInput =
  | ArrayBuffer // Raw binary data
  | Uint8Array // Typed array view of binary data
  | Blob // Browser Blob object
  | File // Browser File object (extends Blob)
  | ImageData; // Canvas ImageData object

/**
 * Base encoding options that apply to all image formats.
 * Format-specific options can be added via index signature.
 *
 * @public
 */
export interface EncodeOptions {
  /**
   * Quality setting for lossy compression (0-100).
   * Higher values produce better quality but larger file sizes.
   * Not applicable to lossless formats.
   *
   * @defaultValue 75
   */
  quality?: number;

  /** Format-specific options can be added dynamically */
  [key: string]: any;
}

/**
 * Options for image resizing operations.
 *
 * @public
 */
export interface ResizeOptions {
  /** Target width in pixels */
  width: number;

  /** Target height in pixels */
  height: number;

  /**
   * Resampling method to use for resizing.
   *
   * @defaultValue 'lanczos3'
   */
  method?:
    | 'triangle' // Linear interpolation, fast but lower quality
    | 'catrom' // Catmull-Rom spline, good balance of speed and quality
    | 'mitchell' // Mitchell filter, good for photographic images
    | 'lanczos3' // Lanczos with 3 lobes, high quality but slower
    | 'hqx'; // High Quality eXpansion, best for pixel art

  /**
   * How to fit the image into the target dimensions.
   *
   * @defaultValue 'stretch'
   */
  fitMethod?:
    | 'stretch' // Stretch to exact dimensions, may distort aspect ratio
    | 'contain'; // Maintain aspect ratio, fit within dimensions

  /**
   * Whether to use premultiplied alpha during processing.
   *
   * @defaultValue false
   */
  premultiply?: boolean;

  /**
   * Whether to perform resizing in linear RGB color space.
   * More accurate but slower.
   *
   * @defaultValue false
   */
  linearRGB?: boolean;
}

/**
 * Options for color quantization (palette reduction) operations.
 *
 * @public
 */
export interface QuantizeOptions {
  /**
   * Maximum number of colors in the output palette.
   * Must be between 2 and 256.
   */
  maxColors: number;

  /**
   * Dithering amount (0-1) to reduce color banding.
   * 0 = no dithering, 1 = maximum dithering.
   *
   * @defaultValue 0.5
   */
  dither?: number;
}

/**
 * Options for image rotation operations.
 *
 * @public
 */
export interface RotateOptions {
  /**
   * Rotation angle in degrees.
   * Positive values rotate clockwise, negative values rotate counter-clockwise.
   * Common values: 90, 180, 270, -90, -180, -270
   */
  angle: number;
}

/**
 * Definition of a processing operation that can be applied to an image.
 * Operations are applied in the order they appear in the array.
 *
 * @public
 */
export interface ProcessingOperation {
  /** Type of processing operation to perform */
  type: 'resize' | 'rotate' | 'quantize';

  /** Options specific to the operation type */
  options: ResizeOptions | RotateOptions | QuantizeOptions;
}

/**
 * Information about supported formats and processors in the current environment.
 *
 * @public
 */
export interface SupportedFormats {
  /** Image formats that can be encoded (written) */
  encoders: ImageFormat[];

  /** Image formats that can be decoded (read) */
  decoders: ImageFormat[];

  /** Available image processing operations */
  processors: string[];
}

/**
 * Detailed information about a specific image format.
 *
 * @public
 */
export interface FormatInfo {
  /** The format identifier */
  format: ImageFormat;

  /** MIME type for the format (e.g., 'image/webp') */
  mimeType: string;

  /** File extension for the format (e.g., '.webp') */
  extension: string;

  /** Whether the format supports lossless compression */
  supportsLossless: boolean;

  /** Whether the format supports transparency/alpha channel */
  supportsTransparency: boolean;

  /** Default encoding options for this format */
  defaultOptions: EncodeOptions;
}

/**
 * Message structure for communicating with Web Workers.
 *
 * @internal
 */
export interface WorkerMessage {
  /** Unique identifier for the message */
  id: string;

  /** Type of operation to perform */
  type: 'encode' | 'decode' | 'process';

  /** Operation payload */
  payload: {
    /** Specific operation name */
    operation: string;

    /** Image data to process */
    data: ArrayBuffer | ImageData;

    /** Optional operation-specific options */
    options?: any;
  };
}

/**
 * Response structure from Web Workers.
 *
 * @internal
 */
export interface WorkerResponse {
  /** Message ID this response corresponds to */
  id: string;

  /** Whether the operation succeeded */
  success: boolean;

  /** Result data if successful */
  result?: ArrayBuffer | ImageData;

  /** Error message if failed */
  error?: string;

  /** Processing time in milliseconds */
  timing?: number;
}

/**
 * Union type of all possible processor options.
 *
 * @public
 */
export type ProcessorOptions = ResizeOptions | RotateOptions | QuantizeOptions;

// Re-export format-specific codec options
export * from './codec-options.js';
