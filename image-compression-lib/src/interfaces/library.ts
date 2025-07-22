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

/**
 * Main interface for the image compression library.
 * Provides methods for encoding, decoding, format conversion, and image processing.
 *
 * @public
 */
export interface ImageCompressor {
  /**
   * Convert an image from one format to another.
   * This is a convenience method that combines decode and encode operations.
   *
   * @param input - The input image data in any supported format
   * @param targetFormat - The desired output format
   * @param options - Optional encoding options for the target format
   * @returns Promise that resolves to the converted image as ArrayBuffer
   *
   * @throws {@link ValidationError} When input parameters are invalid
   * @throws {@link UnsupportedFormatError} When the target format is not supported
   * @throws {@link EncodingError} When the conversion process fails
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const webpBuffer = await compressor.convert(pngBuffer, 'webp', { quality: 80 });
   * ```
   */
  convert(
    input: ImageInput,
    targetFormat: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer>;

  /**
   * Decode an image from any supported format to ImageData.
   * ImageData can then be processed or encoded to other formats.
   *
   * @param input - The input image data in any supported format
   * @returns Promise that resolves to ImageData object
   *
   * @throws {@link ValidationError} When input is invalid
   * @throws {@link UnsupportedFormatError} When the input format is not supported
   * @throws {@link DecodingError} When the decoding process fails
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const imageData = await compressor.decode(webpBuffer);
   * console.log(`Image dimensions: ${imageData.width}x${imageData.height}`);
   * ```
   */
  decode(input: ImageInput): Promise<ImageData>;

  /**
   * Encode ImageData to a specific format.
   *
   * @param imageData - The ImageData object to encode
   * @param format - The target format for encoding
   * @param options - Optional encoding options specific to the format
   * @returns Promise that resolves to the encoded image as ArrayBuffer
   *
   * @throws {@link ValidationError} When parameters are invalid
   * @throws {@link UnsupportedFormatError} When the format is not supported
   * @throws {@link EncodingError} When the encoding process fails
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const avifBuffer = await compressor.encode(imageData, 'avif', { quality: 90 });
   * ```
   */
  encode(
    imageData: ImageData,
    format: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer>;

  /**
   * Apply one or more processing operations to an image.
   * Operations are applied in the order they appear in the array.
   *
   * @param input - The input image data in any supported format
   * @param operations - Array of processing operations to apply
   * @returns Promise that resolves to the processed ImageData
   *
   * @throws {@link ValidationError} When parameters are invalid
   * @throws {@link ProcessingError} When any processing operation fails
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const processed = await compressor.process(inputBuffer, [
   *   { type: 'resize', options: { width: 800, height: 600 } },
   *   { type: 'rotate', options: { angle: 90 } }
   * ]);
   * ```
   */
  process(
    input: ImageInput,
    operations: ProcessingOperation[],
  ): Promise<ImageData>;

  /**
   * Create a new pipeline for chaining operations fluently.
   * Pipelines provide a more readable way to chain multiple operations.
   *
   * @returns A new ImagePipeline instance
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const result = await compressor.pipeline()
   *   .input(inputBuffer)
   *   .resize({ width: 800, height: 600 })
   *   .rotate(90)
   *   .encode('webp', { quality: 85 })
   *   .execute();
   * ```
   */
  pipeline(): ImagePipeline;

  /**
   * Get information about supported formats and processors in the current environment.
   *
   * @returns Object containing arrays of supported encoders, decoders, and processors
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const supported = compressor.getSupportedFormats();
   * console.log('Supported encoders:', supported.encoders);
   * ```
   */
  getSupportedFormats(): SupportedFormats;

  /**
   * Get detailed information about a specific image format.
   *
   * @param format - The format to get information about
   * @returns Detailed format information
   *
   * @throws {@link UnsupportedFormatError} When the format is not supported
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const info = compressor.getFormatInfo('webp');
   * console.log(`WebP MIME type: ${info.mimeType}`);
   * ```
   */
  getFormatInfo(format: ImageFormat): FormatInfo;

  /**
   * Detect the format of an image from its binary data.
   * Uses magic bytes and header analysis to identify the format.
   *
   * @param buffer - The image data to analyze
   * @returns The detected format, or null if format cannot be determined
   *
   * @example
   * ```typescript
   * const compressor = new ImageCompressor();
   * const format = compressor.detectFormat(unknownBuffer);
   * if (format) {
   *   console.log(`Detected format: ${format}`);
   * }
   * ```
   */
  detectFormat(buffer: ArrayBuffer): ImageFormat | null;
}

/**
 * Pipeline interface for chaining image operations fluently.
 * Provides a more readable and composable way to perform multiple operations.
 *
 * @public
 */
export interface ImagePipeline {
  /**
   * Set the input source for the pipeline.
   *
   * @param source - The input image data
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.input(imageBuffer)
   * ```
   */
  input(source: ImageInput): ImagePipeline;

  /**
   * Add a decode operation to the pipeline.
   * Useful when you want to explicitly decode without further processing.
   *
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.input(buffer).decode().execute() // Returns ImageData
   * ```
   */
  decode(): ImagePipeline;

  /**
   * Add a resize operation to the pipeline.
   *
   * @param options - Resize options including dimensions and method
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.resize({ width: 800, height: 600, method: 'lanczos3' })
   * ```
   */
  resize(options: import('../types/index.js').ResizeOptions): ImagePipeline;

  /**
   * Add a rotation operation to the pipeline.
   *
   * @param angle - Rotation angle in degrees (positive = clockwise)
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.rotate(90) // Rotate 90 degrees clockwise
   * ```
   */
  rotate(angle: number): ImagePipeline;

  /**
   * Add a quantization (color reduction) operation to the pipeline.
   *
   * @param options - Quantization options including max colors and dithering
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.quantize({ maxColors: 256, dither: 0.5 })
   * ```
   */
  quantize(options: import('../types/index.js').QuantizeOptions): ImagePipeline;

  /**
   * Add an encoding operation to the pipeline.
   * This should typically be the last operation in the chain.
   *
   * @param format - The target format for encoding
   * @param options - Optional encoding options
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.encode('webp', { quality: 85 })
   * ```
   */
  encode(format: ImageFormat, options?: EncodeOptions): ImagePipeline;

  /**
   * Execute the pipeline and return the result.
   * Returns ImageData if no encoding is specified, otherwise returns ArrayBuffer.
   *
   * @returns Promise that resolves to the processed result
   *
   * @throws {@link ValidationError} When pipeline configuration is invalid
   * @throws {@link ProcessingError} When pipeline execution fails
   *
   * @example
   * ```typescript
   * const result = await pipeline
   *   .input(buffer)
   *   .resize({ width: 400, height: 300 })
   *   .encode('webp')
   *   .execute(); // Returns ArrayBuffer
   * ```
   */
  execute(): Promise<ArrayBuffer | ImageData>;

  /**
   * Reset the pipeline to its initial state.
   * Clears all operations and input, allowing the pipeline to be reused.
   *
   * @returns The pipeline instance for chaining
   *
   * @example
   * ```typescript
   * pipeline.reset().input(newBuffer) // Start fresh
   * ```
   */
  reset(): ImagePipeline;

  /**
   * Create a copy of the current pipeline state.
   * Useful for creating variations of a pipeline without affecting the original.
   *
   * @returns A new pipeline instance with the same configuration
   *
   * @example
   * ```typescript
   * const basePipeline = compressor.pipeline().input(buffer).resize({ width: 800, height: 600 });
   * const webpPipeline = basePipeline.clone().encode('webp');
   * const avifPipeline = basePipeline.clone().encode('avif');
   * ```
   */
  clone(): ImagePipeline;
}
