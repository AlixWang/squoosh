import { ValidationError, ErrorContext } from '../errors/index.js';
import { ImageFormat, EncodeOptions } from '../types/index.js';

/**
 * Input validation utilities for the image compression library
 */
export class InputValidator {
  /**
   * Validate image input data
   */
  static validateImageInput(input: any, context: ErrorContext = {}): void {
    if (!input) {
      throw ValidationError.missingParameter('input', context);
    }

    const validTypes = ['ArrayBuffer', 'Uint8Array', 'Blob', 'File', 'ImageData'];
    const inputType = this.getInputType(input);

    if (!validTypes.includes(inputType)) {
      throw ValidationError.invalidInput(
        input,
        validTypes.join(' | '),
        { ...context, inputType }
      );
    }

    // Validate specific input types
    if (inputType === 'ArrayBuffer' || inputType === 'Uint8Array') {
      this.validateBufferInput(input, context);
    } else if (inputType === 'ImageData') {
      this.validateImageData(input, context);
    }
  }

  /**
   * Validate image format
   */
  static validateImageFormat(format: any, context: ErrorContext = {}): void {
    if (!format) {
      throw ValidationError.missingParameter('format', context);
    }

    if (typeof format !== 'string') {
      throw ValidationError.invalidInput(format, 'string', context);
    }

    const supportedFormats: ImageFormat[] = [
      'webp', 'avif', 'jpeg-xl', 'png', 'jpeg', 'qoi', 'wp2'
    ];

    if (!supportedFormats.includes(format as ImageFormat)) {
      throw ValidationError.parameterOutOfRange(
        'format',
        format,
        undefined,
        undefined,
        { ...context, supportedFormats }
      );
    }
  }

  /**
   * Validate encoding options
   */
  static validateEncodeOptions(
    options: any,
    format: ImageFormat,
    context: ErrorContext = {}
  ): void {
    if (options === null || options === undefined) {
      return; // Options are optional
    }

    if (typeof options !== 'object') {
      throw ValidationError.invalidInput(options, 'object', context);
    }

    // Validate quality parameter if present
    if ('quality' in options) {
      this.validateQuality(options.quality, context);
    }

    // Format-specific validation
    switch (format) {
      case 'webp':
        this.validateWebPOptions(options, context);
        break;
      case 'avif':
        this.validateAVIFOptions(options, context);
        break;
      case 'jpeg':
        this.validateJPEGOptions(options, context);
        break;
      case 'png':
        this.validatePNGOptions(options, context);
        break;
      case 'jpeg-xl':
        this.validateJXLOptions(options, context);
        break;
    }
  }

  /**
   * Validate resize options
   */
  static validateResizeOptions(options: any, context: ErrorContext = {}): void {
    if (!options) {
      throw ValidationError.missingParameter('options', context);
    }

    if (typeof options !== 'object') {
      throw ValidationError.invalidInput(options, 'object', context);
    }

    // Validate required dimensions
    if (!('width' in options)) {
      throw ValidationError.missingParameter('width', context);
    }

    if (!('height' in options)) {
      throw ValidationError.missingParameter('height', context);
    }

    this.validateDimension(options.width, 'width', context);
    this.validateDimension(options.height, 'height', context);

    // Validate optional parameters
    if ('method' in options) {
      const validMethods = ['triangle', 'catrom', 'mitchell', 'lanczos3', 'hqx'];
      if (!validMethods.includes(options.method)) {
        throw ValidationError.parameterOutOfRange(
          'method',
          options.method,
          undefined,
          undefined,
          { ...context, validMethods }
        );
      }
    }

    if ('fitMethod' in options) {
      const validFitMethods = ['stretch', 'contain'];
      if (!validFitMethods.includes(options.fitMethod)) {
        throw ValidationError.parameterOutOfRange(
          'fitMethod',
          options.fitMethod,
          undefined,
          undefined,
          { ...context, validFitMethods }
        );
      }
    }

    if ('premultiply' in options && typeof options.premultiply !== 'boolean') {
      throw ValidationError.invalidInput(options.premultiply, 'boolean', context);
    }

    if ('linearRGB' in options && typeof options.linearRGB !== 'boolean') {
      throw ValidationError.invalidInput(options.linearRGB, 'boolean', context);
    }
  }

  /**
   * Validate rotation angle
   */
  static validateRotationAngle(angle: any, context: ErrorContext = {}): void {
    if (angle === null || angle === undefined) {
      throw ValidationError.missingParameter('angle', context);
    }

    if (typeof angle !== 'number') {
      throw ValidationError.invalidInput(angle, 'number', context);
    }

    if (!Number.isFinite(angle)) {
      throw ValidationError.invalidInput(angle, 'finite number', context);
    }

    // Normalize angle to 0-360 range for validation
    const normalizedAngle = ((angle % 360) + 360) % 360;
    const validAngles = [0, 90, 180, 270];

    if (!validAngles.includes(normalizedAngle)) {
      throw ValidationError.parameterOutOfRange(
        'angle',
        angle,
        undefined,
        undefined,
        { ...context, validAngles, note: 'Only 90-degree increments are supported' }
      );
    }
  }

  /**
   * Validate quantization options
   */
  static validateQuantizeOptions(options: any, context: ErrorContext = {}): void {
    if (!options) {
      throw ValidationError.missingParameter('options', context);
    }

    if (typeof options !== 'object') {
      throw ValidationError.invalidInput(options, 'object', context);
    }

    if (!('maxColors' in options)) {
      throw ValidationError.missingParameter('maxColors', context);
    }

    if (typeof options.maxColors !== 'number') {
      throw ValidationError.invalidInput(options.maxColors, 'number', context);
    }

    if (!Number.isInteger(options.maxColors) || options.maxColors < 2 || options.maxColors > 256) {
      throw ValidationError.parameterOutOfRange(
        'maxColors',
        options.maxColors,
        2,
        256,
        context
      );
    }

    if ('dither' in options) {
      if (typeof options.dither !== 'number') {
        throw ValidationError.invalidInput(options.dither, 'number', context);
      }

      if (options.dither < 0 || options.dither > 1) {
        throw ValidationError.parameterOutOfRange(
          'dither',
          options.dither,
          0,
          1,
          context
        );
      }
    }
  }

  /**
   * Get the type of input data
   */
  private static getInputType(input: any): string {
    if (input instanceof ArrayBuffer) return 'ArrayBuffer';
    if (input instanceof Uint8Array) return 'Uint8Array';
    if (typeof Blob !== 'undefined' && input instanceof Blob) return 'Blob';
    if (typeof File !== 'undefined' && input instanceof File) return 'File';
    if (input instanceof ImageData) return 'ImageData';
    return typeof input;
  }

  /**
   * Validate buffer input
   */
  private static validateBufferInput(input: ArrayBuffer | Uint8Array, context: ErrorContext = {}): void {
    const size = input instanceof ArrayBuffer ? input.byteLength : input.length;
    
    if (size === 0) {
      throw ValidationError.invalidInput(input, 'non-empty buffer', context);
    }

    // Check for reasonable size limits (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (size > maxSize) {
      throw ValidationError.parameterOutOfRange(
        'input size',
        size,
        0,
        maxSize,
        { ...context, note: 'Input size exceeds maximum allowed size' }
      );
    }
  }

  /**
   * Validate ImageData
   */
  private static validateImageData(imageData: ImageData, context: ErrorContext = {}): void {
    if (!imageData.data || !imageData.width || !imageData.height) {
      throw ValidationError.invalidInput(imageData, 'valid ImageData', context);
    }

    this.validateDimension(imageData.width, 'width', context);
    this.validateDimension(imageData.height, 'height', context);

    const expectedDataLength = imageData.width * imageData.height * 4;
    if (imageData.data.length !== expectedDataLength) {
      throw ValidationError.invalidInput(
        imageData,
        `ImageData with ${expectedDataLength} data elements`,
        { ...context, actualLength: imageData.data.length, expectedLength: expectedDataLength }
      );
    }
  }

  /**
   * Validate image dimension
   */
  private static validateDimension(value: any, name: string, context: ErrorContext = {}): void {
    if (typeof value !== 'number') {
      throw ValidationError.invalidInput(value, 'number', { ...context, parameter: name });
    }

    if (!Number.isInteger(value) || value <= 0) {
      throw ValidationError.parameterOutOfRange(
        name,
        value,
        1,
        undefined,
        { ...context, note: 'Dimension must be a positive integer' }
      );
    }

    // Check for reasonable dimension limits (32768x32768 max)
    const maxDimension = 32768;
    if (value > maxDimension) {
      throw ValidationError.parameterOutOfRange(
        name,
        value,
        1,
        maxDimension,
        context
      );
    }
  }

  /**
   * Validate quality parameter
   */
  private static validateQuality(quality: any, context: ErrorContext = {}): void {
    if (typeof quality !== 'number') {
      throw ValidationError.invalidInput(quality, 'number', context);
    }

    if (quality < 0 || quality > 100) {
      throw ValidationError.parameterOutOfRange('quality', quality, 0, 100, context);
    }
  }

  /**
   * Validate WebP-specific options
   */
  private static validateWebPOptions(options: any, context: ErrorContext = {}): void {
    if ('lossless' in options && typeof options.lossless !== 'boolean') {
      throw ValidationError.invalidInput(options.lossless, 'boolean', context);
    }

    if ('method' in options) {
      if (typeof options.method !== 'number' || !Number.isInteger(options.method)) {
        throw ValidationError.invalidInput(options.method, 'integer', context);
      }
      if (options.method < 0 || options.method > 6) {
        throw ValidationError.parameterOutOfRange('method', options.method, 0, 6, context);
      }
    }
  }

  /**
   * Validate AVIF-specific options
   */
  private static validateAVIFOptions(options: any, context: ErrorContext = {}): void {
    if ('cqLevel' in options) {
      if (typeof options.cqLevel !== 'number' || !Number.isInteger(options.cqLevel)) {
        throw ValidationError.invalidInput(options.cqLevel, 'integer', context);
      }
      if (options.cqLevel < 0 || options.cqLevel > 63) {
        throw ValidationError.parameterOutOfRange('cqLevel', options.cqLevel, 0, 63, context);
      }
    }

    if ('speed' in options) {
      if (typeof options.speed !== 'number' || !Number.isInteger(options.speed)) {
        throw ValidationError.invalidInput(options.speed, 'integer', context);
      }
      if (options.speed < 0 || options.speed > 10) {
        throw ValidationError.parameterOutOfRange('speed', options.speed, 0, 10, context);
      }
    }
  }

  /**
   * Validate JPEG-specific options
   */
  private static validateJPEGOptions(options: any, context: ErrorContext = {}): void {
    if ('progressive' in options && typeof options.progressive !== 'boolean') {
      throw ValidationError.invalidInput(options.progressive, 'boolean', context);
    }

    if ('optimize_coding' in options && typeof options.optimize_coding !== 'boolean') {
      throw ValidationError.invalidInput(options.optimize_coding, 'boolean', context);
    }
  }

  /**
   * Validate PNG-specific options
   */
  private static validatePNGOptions(options: any, context: ErrorContext = {}): void {
    // PNG encoder typically doesn't have many options beyond quality
    // This is a placeholder for future PNG-specific validations
  }

  /**
   * Validate JPEG XL-specific options
   */
  private static validateJXLOptions(options: any, context: ErrorContext = {}): void {
    if ('effort' in options) {
      if (typeof options.effort !== 'number' || !Number.isInteger(options.effort)) {
        throw ValidationError.invalidInput(options.effort, 'integer', context);
      }
      if (options.effort < 1 || options.effort > 9) {
        throw ValidationError.parameterOutOfRange('effort', options.effort, 1, 9, context);
      }
    }

    if ('lossless' in options && typeof options.lossless !== 'boolean') {
      throw ValidationError.invalidInput(options.lossless, 'boolean', context);
    }
  }
}