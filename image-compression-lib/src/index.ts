/**
 * Image Compression Library
 *
 * A TypeScript library for image compression and format conversion
 * based on Squoosh functionality.
 */

// Export all types
export * from './types/index.js';

// Export all interfaces
export * from './interfaces/codec.js';
export * from './interfaces/processor.js';
export * from './interfaces/library.js';
export * from './interfaces/environment.js';

// Error classes
export class ImageCompressionError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ImageCompressionError';
  }
}

export class UnsupportedFormatError extends ImageCompressionError {
  constructor(format: string) {
    super(`Unsupported format: ${format}`, 'UNSUPPORTED_FORMAT', { format });
    this.name = 'UnsupportedFormatError';
  }
}

export class EncodingError extends ImageCompressionError {
  constructor(message: string, details?: any) {
    super(message, 'ENCODING_ERROR', details);
    this.name = 'EncodingError';
  }
}

export class DecodingError extends ImageCompressionError {
  constructor(message: string, details?: any) {
    super(message, 'DECODING_ERROR', details);
    this.name = 'DecodingError';
  }
}

export class ProcessingError extends ImageCompressionError {
  constructor(message: string, details?: any) {
    super(message, 'PROCESSING_ERROR', details);
    this.name = 'ProcessingError';
  }
}

export class WorkerError extends ImageCompressionError {
  constructor(message: string, details?: any) {
    super(message, 'WORKER_ERROR', details);
    this.name = 'WorkerError';
  }
}

export class ValidationError extends ImageCompressionError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
