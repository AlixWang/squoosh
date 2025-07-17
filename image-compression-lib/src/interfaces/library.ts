/**
 * Main library interfaces
 */

import {
  ImageInput,
  ImageFormat,
  EncodeOptions,
  ProcessingOperation,
  SupportedFormats,
  FormatInfo,
} from '../types/index.js';

// Main library interface
export interface ImageCompressor {
  // Format conversion
  convert(
    input: ImageInput,
    targetFormat: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer>;

  // Decoding
  decode(input: ImageInput): Promise<ImageData>;

  // Encoding
  encode(
    imageData: ImageData,
    format: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer>;

  // Processing
  process(
    input: ImageInput,
    operations: ProcessingOperation[],
  ): Promise<ImageData>;

  // Pipeline operations
  pipeline(): ImagePipeline;

  // Utility methods
  getSupportedFormats(): SupportedFormats;
  getFormatInfo(format: ImageFormat): FormatInfo;
  detectFormat(buffer: ArrayBuffer): ImageFormat | null;
}

// Pipeline interface for chaining operations
export interface ImagePipeline {
  input(source: ImageInput): ImagePipeline;
  decode(): ImagePipeline;
  resize(options: import('../types/index.js').ResizeOptions): ImagePipeline;
  rotate(angle: number): ImagePipeline;
  quantize(options: import('../types/index.js').QuantizeOptions): ImagePipeline;
  encode(format: ImageFormat, options?: EncodeOptions): ImagePipeline;
  execute(): Promise<ArrayBuffer | ImageData>;
}
