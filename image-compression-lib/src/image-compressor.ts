/**
 * @fileoverview Main ImageCompressor class - Primary interface for the image compression library
 *
 * This file contains the main ImageCompressor class which provides the public API
 * for image compression, format conversion, and processing operations.
 */

import {
  ImageInput,
  ImageFormat,
  EncodeOptions,
  ProcessingOperation,
  SupportedFormats,
  FormatInfo,
  ResizeOptions,
  RotateOptions,
  QuantizeOptions,
  ProcessorOptions,
} from './types/index.js';
import {
  ImageCompressor as IImageCompressor,
  ImagePipeline,
} from './interfaces/library.js';
import { CodecManager } from './codecs/codec-registry.js';
import { ProcessorRegistry } from './processors/processor-registry.js';
import { FormatDetector, CodecValidator } from './codecs/codec-utils.js';
import {
  ValidationError,
  UnsupportedFormatError,
  DecodingError,
  EncodingError,
  ProcessingError,
  ErrorContext,
} from './errors/index.js';
import { InputValidator } from './validation/input-validator.js';
import { ErrorRecovery } from './validation/error-recovery.js';

/**
 * Main ImageCompressor class providing the public API for image compression and processing.
 *
 * This class serves as the primary entry point for all image operations including:
 * - Format conversion between different image formats
 * - Image decoding and encoding
 * - Image processing operations (resize, rotate, quantize)
 * - Pipeline-based operation chaining
 *
 * @example Basic usage
 * ```typescript
 * import { ImageCompressor } from 'image-compression-lib';
 *
 * const compressor = new ImageCompressor();
 *
 * // Convert PNG to WebP
 * const webpBuffer = await compressor.convert(pngBuffer, 'webp', { quality: 80 });
 *
 * // Resize and encode
 * const resized = await compressor.pipeline()
 *   .input(imageBuffer)
 *   .resize({ width: 800, height: 600 })
 *   .encode('avif', { quality: 90 })
 *   .execute();
 * ```
 *
 * @public
 */
export class ImageCompressor implements IImageCompressor {
  private codecManager: CodecManager;
  private processorRegistry: ProcessorRegistry;

  /**
   * Creates a new ImageCompressor instance.
   *
   * @param codecManager - Optional custom codec manager. If not provided, a default one will be created.
   * @param processorRegistry - Optional custom processor registry. If not provided, a default one will be created.
   *
   * @example
   * ```typescript
   * // Use default configuration
   * const compressor = new ImageCompressor();
   *
   * // Use custom codec manager
   * const customCodecManager = new CodecManager();
   * const compressor = new ImageCompressor(customCodecManager);
   * ```
   */
  constructor(
    codecManager?: CodecManager,
    processorRegistry?: ProcessorRegistry,
  ) {
    this.codecManager = codecManager || new CodecManager();
    this.processorRegistry = processorRegistry || new ProcessorRegistry();
  }

  /**
   * Convert an image from one format to another
   */
  async convert(
    input: ImageInput,
    targetFormat: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer> {
    const context: ErrorContext = {
      operation: 'convert',
      format: targetFormat,
      stage: 'validation',
    };

    try {
      // Validate inputs using InputValidator
      InputValidator.validateImageInput(input, context);
      InputValidator.validateImageFormat(targetFormat, context);
      InputValidator.validateEncodeOptions(options, targetFormat, context);

      // Normalize input
      const buffer = await this.normalizeInput(input);

      // Check if target format is supported
      if (!(await this.codecManager.canEncode(targetFormat))) {
        throw new UnsupportedFormatError(targetFormat, context);
      }

      // Convert using codec manager with retry logic
      context.stage = 'conversion';
      return await ErrorRecovery.withRetry(
        () => this.codecManager.convert(buffer, targetFormat, options),
        { maxAttempts: 2 },
        context,
      );
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnsupportedFormatError
      ) {
        throw error;
      }
      throw new EncodingError(
        `Failed to convert image to ${targetFormat}`,
        undefined,
        {
          ...context,
          originalError: error,
          targetFormat,
          options,
        },
      );
    }
  }

  /**
   * Decode an image to ImageData
   */
  async decode(input: ImageInput): Promise<ImageData> {
    const context: ErrorContext = {
      operation: 'decode',
      stage: 'validation',
    };

    try {
      // Validate input using InputValidator
      InputValidator.validateImageInput(input, context);

      // Normalize input
      const buffer = await this.normalizeInput(input);

      // Decode using codec manager with retry logic
      context.stage = 'decoding';
      const imageData = await ErrorRecovery.withRetry(
        () => this.codecManager.decoders.decode(buffer),
        { maxAttempts: 2 },
        context,
      );

      // Validate the result
      if (!CodecValidator.validateImageData(imageData)) {
        throw new DecodingError(
          'Decoded ImageData is invalid',
          undefined,
          context,
        );
      }

      return imageData;
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnsupportedFormatError ||
        error instanceof DecodingError
      ) {
        throw error;
      }
      throw new DecodingError('Failed to decode image', undefined, {
        ...context,
        originalError: error,
      });
    }
  }

  /**
   * Encode ImageData to a specific format
   */
  async encode(
    imageData: ImageData,
    format: ImageFormat,
    options?: EncodeOptions,
  ): Promise<ArrayBuffer> {
    const context: ErrorContext = {
      operation: 'encode',
      format,
      stage: 'validation',
    };

    try {
      // Validate inputs using InputValidator
      InputValidator.validateImageInput(imageData, context);
      InputValidator.validateImageFormat(format, context);
      InputValidator.validateEncodeOptions(options, format, context);

      // Validate format support
      if (!(await this.codecManager.canEncode(format))) {
        throw new UnsupportedFormatError(format, context);
      }

      // Encode using codec manager with retry logic
      context.stage = 'encoding';
      return await ErrorRecovery.withRetry(
        () => this.codecManager.encoders.encode(imageData, format, options),
        { maxAttempts: 2 },
        context,
      );
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnsupportedFormatError
      ) {
        throw error;
      }
      throw new EncodingError(
        `Failed to encode image as ${format}`,
        undefined,
        {
          ...context,
          originalError: error,
          format,
          options,
        },
      );
    }
  }

  /**
   * Apply processing operations to an image
   */
  async process(
    input: ImageInput,
    operations: ProcessingOperation[],
  ): Promise<ImageData> {
    const context: ErrorContext = {
      operation: 'process',
      stage: 'validation',
    };

    try {
      // Validate inputs
      InputValidator.validateImageInput(input, context);

      if (!operations || operations.length === 0) {
        throw new ValidationError(
          'At least one processing operation must be provided',
          undefined,
          context,
        );
      }

      // Get ImageData from input
      let imageData: ImageData;
      if (input instanceof ImageData) {
        imageData = input;
      } else {
        context.stage = 'decoding';
        imageData = await this.decode(input);
      }

      // Apply each operation in sequence with retry logic
      context.stage = 'processing';
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        if (!operation) continue;

        const operationContext = {
          ...context,
          operationIndex: i,
          operationType: operation.type,
        };

        imageData = await ErrorRecovery.withRetry(
          () => this.applyProcessingOperation(imageData, operation),
          { maxAttempts: 2 },
          operationContext,
        );
      }

      return imageData;
    } catch (error) {
      if (
        error instanceof ValidationError ||
        error instanceof UnsupportedFormatError ||
        error instanceof DecodingError ||
        error instanceof ProcessingError
      ) {
        throw error;
      }
      throw new ProcessingError('Failed to process image', undefined, {
        ...context,
        originalError: error,
        operations,
      });
    }
  }

  /**
   * Create a new pipeline for chaining operations
   */
  pipeline(): ImagePipeline {
    return new ImagePipelineImpl(this);
  }

  /**
   * Get supported formats
   */
  getSupportedFormats(): SupportedFormats {
    // This will be populated asynchronously, but we need a sync method
    // Return cached values or empty arrays
    return {
      encoders: this.codecManager.encoders.getRegisteredFormats(),
      decoders: this.codecManager.decoders.getRegisteredFormats(),
      processors: this.processorRegistry.getNames(),
    };
  }

  /**
   * Get information about a specific format
   */
  getFormatInfo(format: ImageFormat): FormatInfo {
    try {
      return this.codecManager.getFormatInfo(format);
    } catch (error) {
      throw new UnsupportedFormatError(format);
    }
  }

  /**
   * Detect format from buffer
   */
  detectFormat(buffer: ArrayBuffer): ImageFormat | null {
    try {
      InputValidator.validateImageInput(buffer);
      return this.codecManager.detectFormat(buffer);
    } catch {
      return null;
    }
  }

  // Private helper methods

  /**
   * Normalize various input types to ArrayBuffer
   */
  private async normalizeInput(input: ImageInput): Promise<ArrayBuffer> {
    if (input instanceof ArrayBuffer) {
      return input;
    }

    if (input instanceof Uint8Array) {
      return input.buffer.slice(
        input.byteOffset,
        input.byteOffset + input.byteLength,
      );
    }

    if (input instanceof Blob || input instanceof File) {
      return await input.arrayBuffer();
    }

    if (input instanceof ImageData) {
      // Convert ImageData to PNG buffer for processing
      // This is a simplified approach - in practice, you might want to use a canvas
      throw new ValidationError(
        'ImageData input not yet supported - use decode() first',
      );
    }

    throw new ValidationError('Unsupported input type');
  }

  /**
   * Apply a single processing operation
   */
  private async applyProcessingOperation(
    imageData: ImageData,
    operation: ProcessingOperation,
  ): Promise<ImageData> {
    const context: ErrorContext = {
      operation: 'process',
      stage: operation.type,
      processor: operation.type,
    };

    const processor = this.processorRegistry.get(operation.type);
    if (!processor) {
      throw ProcessingError.processorNotAvailable(operation.type, context);
    }

    // Validate options based on operation type using InputValidator
    this.validateProcessingOptions(operation, context);

    return await processor.process(
      imageData,
      operation.options as ProcessorOptions,
    );
  }

  /**
   * Validate processing operation options
   */
  private validateProcessingOptions(
    operation: ProcessingOperation,
    context: ErrorContext,
  ): void {
    switch (operation.type) {
      case 'resize':
        InputValidator.validateResizeOptions(
          operation.options as ResizeOptions,
          context,
        );
        break;
      case 'rotate':
        InputValidator.validateRotationAngle(
          (operation.options as RotateOptions).angle,
          context,
        );
        break;
      case 'quantize':
        InputValidator.validateQuantizeOptions(
          operation.options as QuantizeOptions,
          context,
        );
        break;
      default:
        throw new ValidationError(
          `Unknown processing operation: ${operation.type}`,
          undefined,
          context,
        );
    }
  }
}
/**

 * ImagePipeline implementation for fluent API operations
 */
class ImagePipelineImpl implements ImagePipeline {
  private compressor: ImageCompressor;
  private inputSource: ImageInput | undefined = undefined;
  private operations: ProcessingOperation[] = [];
  private shouldDecode = false;
  private encodeFormat: ImageFormat | undefined = undefined;
  private encodeOptions: EncodeOptions | undefined = undefined;

  constructor(compressor: ImageCompressor) {
    this.compressor = compressor;
  }

  /**
   * Set the input source for the pipeline
   */
  input(source: ImageInput): ImagePipeline {
    this.inputSource = source;
    return this;
  }

  /**
   * Add decode operation to the pipeline
   */
  decode(): ImagePipeline {
    this.shouldDecode = true;
    return this;
  }

  /**
   * Add resize operation to the pipeline
   */
  resize(options: ResizeOptions): ImagePipeline {
    this.operations.push({
      type: 'resize',
      options,
    });
    return this;
  }

  /**
   * Add rotate operation to the pipeline
   */
  rotate(angle: number): ImagePipeline {
    this.operations.push({
      type: 'rotate',
      options: { angle },
    });
    return this;
  }

  /**
   * Add quantize operation to the pipeline
   */
  quantize(options: QuantizeOptions): ImagePipeline {
    this.operations.push({
      type: 'quantize',
      options,
    });
    return this;
  }

  /**
   * Set encode operation for the pipeline
   */
  encode(format: ImageFormat, options?: EncodeOptions): ImagePipeline {
    this.encodeFormat = format;
    this.encodeOptions = options || undefined;
    return this;
  }

  /**
   * Execute the pipeline and return the result
   */
  async execute(): Promise<ArrayBuffer | ImageData> {
    try {
      // Validate that we have an input
      if (!this.inputSource) {
        throw new ValidationError(
          'Pipeline input must be set before execution',
        );
      }

      // If we only need to decode, do that
      if (
        this.shouldDecode &&
        this.operations.length === 0 &&
        !this.encodeFormat
      ) {
        return await this.compressor.decode(this.inputSource);
      }

      // If we have processing operations or need to encode, start with ImageData
      let imageData: ImageData;

      if (this.inputSource instanceof ImageData) {
        imageData = this.inputSource;
      } else {
        imageData = await this.compressor.decode(this.inputSource);
      }

      // Apply processing operations if any
      if (this.operations.length > 0) {
        imageData = await this.compressor.process(
          this.inputSource,
          this.operations,
        );
      }

      // If encoding is requested, encode and return buffer
      if (this.encodeFormat) {
        return await this.compressor.encode(
          imageData,
          this.encodeFormat,
          this.encodeOptions,
        );
      }

      // Otherwise return the ImageData
      return imageData;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ProcessingError('Pipeline execution failed', undefined, {
        originalError: error,
        operations: this.operations,
        encodeFormat: this.encodeFormat,
      });
    }
  }

  /**
   * Reset the pipeline to initial state
   */
  reset(): ImagePipeline {
    this.inputSource = undefined;
    this.operations = [];
    this.shouldDecode = false;
    this.encodeFormat = undefined;
    this.encodeOptions = undefined;
    return this;
  }

  /**
   * Clone the current pipeline state
   */
  clone(): ImagePipeline {
    const cloned = new ImagePipelineImpl(this.compressor);
    cloned.inputSource = this.inputSource || undefined;
    cloned.operations = [...this.operations];
    cloned.shouldDecode = this.shouldDecode;
    cloned.encodeFormat = this.encodeFormat || undefined;
    cloned.encodeOptions = this.encodeOptions
      ? { ...this.encodeOptions }
      : undefined;
    return cloned;
  }
}
