/**
 * Error classes for the image compression library
 */

/**
 * Error codes used throughout the library
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_OPERATION = 'INVALID_OPERATION',
  
  // Format errors
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FORMAT_DETECTION_FAILED = 'FORMAT_DETECTION_FAILED',
  INVALID_FORMAT_OPTIONS = 'INVALID_FORMAT_OPTIONS',
  
  // Encoding errors
  ENCODING_FAILED = 'ENCODING_FAILED',
  ENCODER_NOT_AVAILABLE = 'ENCODER_NOT_AVAILABLE',
  ENCODER_INITIALIZATION_FAILED = 'ENCODER_INITIALIZATION_FAILED',
  INVALID_ENCODING_OPTIONS = 'INVALID_ENCODING_OPTIONS',
  
  // Decoding errors
  DECODING_FAILED = 'DECODING_FAILED',
  DECODER_NOT_AVAILABLE = 'DECODER_NOT_AVAILABLE',
  DECODER_INITIALIZATION_FAILED = 'DECODER_INITIALIZATION_FAILED',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
  
  // Processing errors
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  PROCESSOR_NOT_AVAILABLE = 'PROCESSOR_NOT_AVAILABLE',
  INVALID_PROCESSING_OPTIONS = 'INVALID_PROCESSING_OPTIONS',
  INVALID_IMAGE_DIMENSIONS = 'INVALID_IMAGE_DIMENSIONS',
  
  // Worker errors
  WORKER_INITIALIZATION_FAILED = 'WORKER_INITIALIZATION_FAILED',
  WORKER_COMMUNICATION_FAILED = 'WORKER_COMMUNICATION_FAILED',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  WORKER_TERMINATED = 'WORKER_TERMINATED',
  
  // Memory errors
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  MEMORY_ALLOCATION_FAILED = 'MEMORY_ALLOCATION_FAILED',
  
  // Module loading errors
  MODULE_LOAD_FAILED = 'MODULE_LOAD_FAILED',
  WASM_INITIALIZATION_FAILED = 'WASM_INITIALIZATION_FAILED',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  MISSING_REQUIRED_PARAMETER = 'MISSING_REQUIRED_PARAMETER',
  PARAMETER_OUT_OF_RANGE = 'PARAMETER_OUT_OF_RANGE',
  
  // Environment errors
  ENVIRONMENT_NOT_SUPPORTED = 'ENVIRONMENT_NOT_SUPPORTED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE'
}

/**
 * Context information for debugging errors
 */
export interface ErrorContext {
  timestamp?: number;
  operation?: string;
  format?: string;
  stage?: string;
  input?: {
    type?: string;
    size?: number;
    dimensions?: { width: number; height: number };
  };
  options?: any;
  environment?: {
    browser?: string;
    node?: boolean;
    worker?: boolean;
    wasm?: boolean;
  } | string;
  stack?: string;
  cause?: Error;
  [key: string]: any;
}

/**
 * Base error class for all image compression library errors
 */
export class ImageCompressionError extends Error {
  public readonly code: ErrorCode;
  public readonly context: ErrorContext;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'ImageCompressionError';
    this.code = code;
    this.timestamp = Date.now();
    this.context = {
      timestamp: this.timestamp,
      ...context
    };

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get a detailed error message with context
   */
  getDetailedMessage(): string {
    const parts = [this.message];
    
    if (this.context.operation) {
      parts.push(`Operation: ${this.context.operation}`);
    }
    
    if (this.context.format) {
      parts.push(`Format: ${this.context.format}`);
    }
    
    if (this.context.stage) {
      parts.push(`Stage: ${this.context.stage}`);
    }
    
    if (this.context.cause) {
      parts.push(`Caused by: ${this.context.cause.message}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Convert error to JSON for logging/debugging
   */
  toJSON(): object {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Error thrown when an unsupported image format is encountered
 */
export class UnsupportedFormatError extends ImageCompressionError {
  constructor(format: string, context: ErrorContext = {}) {
    super(
      `Unsupported image format: ${format}`,
      ErrorCode.UNSUPPORTED_FORMAT,
      { format, ...context }
    );
    this.name = 'UnsupportedFormatError';
  }
}

/**
 * Error thrown during image encoding operations
 */
export class EncodingError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.ENCODING_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'encode', ...context });
    this.name = 'EncodingError';
  }

  static encoderNotAvailable(format: string, context: ErrorContext = {}): EncodingError {
    return new EncodingError(
      `Encoder not available for format: ${format}`,
      ErrorCode.ENCODER_NOT_AVAILABLE,
      { format, ...context }
    );
  }

  static initializationFailed(format: string, cause?: Error, context: ErrorContext = {}): EncodingError {
    const errorContext: ErrorContext = { format, ...context };
    if (cause) {
      errorContext.cause = cause;
    }
    return new EncodingError(
      `Failed to initialize encoder for format: ${format}`,
      ErrorCode.ENCODER_INITIALIZATION_FAILED,
      errorContext
    );
  }

  static invalidOptions(format: string, options: any, context: ErrorContext = {}): EncodingError {
    return new EncodingError(
      `Invalid encoding options for format: ${format}`,
      ErrorCode.INVALID_ENCODING_OPTIONS,
      { format, options, ...context }
    );
  }
}

/**
 * Error thrown during image decoding operations
 */
export class DecodingError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DECODING_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'decode', ...context });
    this.name = 'DecodingError';
  }

  static decoderNotAvailable(format: string, context: ErrorContext = {}): DecodingError {
    return new DecodingError(
      `Decoder not available for format: ${format}`,
      ErrorCode.DECODER_NOT_AVAILABLE,
      { format, ...context }
    );
  }

  static initializationFailed(format: string, cause?: Error, context: ErrorContext = {}): DecodingError {
    const errorContext: ErrorContext = { format, ...context };
    if (cause) {
      errorContext.cause = cause;
    }
    return new DecodingError(
      `Failed to initialize decoder for format: ${format}`,
      ErrorCode.DECODER_INITIALIZATION_FAILED,
      errorContext
    );
  }

  static corruptedData(format: string, context: ErrorContext = {}): DecodingError {
    return new DecodingError(
      `Corrupted or invalid data for format: ${format}`,
      ErrorCode.CORRUPTED_DATA,
      { format, ...context }
    );
  }
}

/**
 * Error thrown during image processing operations
 */
export class ProcessingError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PROCESSING_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'process', ...context });
    this.name = 'ProcessingError';
  }

  static processorNotAvailable(processor: string, context: ErrorContext = {}): ProcessingError {
    return new ProcessingError(
      `Processor not available: ${processor}`,
      ErrorCode.PROCESSOR_NOT_AVAILABLE,
      { processor, ...context }
    );
  }

  static invalidOptions(processor: string, options: any, context: ErrorContext = {}): ProcessingError {
    return new ProcessingError(
      `Invalid processing options for processor: ${processor}`,
      ErrorCode.INVALID_PROCESSING_OPTIONS,
      { processor, options, ...context }
    );
  }

  static invalidDimensions(width: number, height: number, context: ErrorContext = {}): ProcessingError {
    return new ProcessingError(
      `Invalid image dimensions: ${width}x${height}`,
      ErrorCode.INVALID_IMAGE_DIMENSIONS,
      { input: { dimensions: { width, height } }, ...context }
    );
  }
}

/**
 * Error thrown during worker operations
 */
export class WorkerError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.WORKER_COMMUNICATION_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'worker', ...context });
    this.name = 'WorkerError';
  }

  static initializationFailed(cause?: Error, context: ErrorContext = {}): WorkerError {
    const errorContext: ErrorContext = { ...context };
    if (cause) {
      errorContext.cause = cause;
    }
    return new WorkerError(
      'Failed to initialize worker',
      ErrorCode.WORKER_INITIALIZATION_FAILED,
      errorContext
    );
  }

  static timeout(operation: string, timeout: number, context: ErrorContext = {}): WorkerError {
    return new WorkerError(
      `Worker operation timed out after ${timeout}ms: ${operation}`,
      ErrorCode.WORKER_TIMEOUT,
      { operation, timeout, ...context }
    );
  }

  static terminated(context: ErrorContext = {}): WorkerError {
    return new WorkerError(
      'Worker was terminated unexpectedly',
      ErrorCode.WORKER_TERMINATED,
      context
    );
  }
}

/**
 * Error thrown during input validation
 */
export class ValidationError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.VALIDATION_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'validation', ...context });
    this.name = 'ValidationError';
  }

  static missingParameter(parameter: string, context: ErrorContext = {}): ValidationError {
    return new ValidationError(
      `Missing required parameter: ${parameter}`,
      ErrorCode.MISSING_REQUIRED_PARAMETER,
      { parameter, ...context }
    );
  }

  static parameterOutOfRange(
    parameter: string,
    value: any,
    min?: number,
    max?: number,
    context: ErrorContext = {}
  ): ValidationError {
    let message = `Parameter '${parameter}' value ${value} is out of range`;
    if (min !== undefined && max !== undefined) {
      message += ` (expected: ${min}-${max})`;
    } else if (min !== undefined) {
      message += ` (expected: >= ${min})`;
    } else if (max !== undefined) {
      message += ` (expected: <= ${max})`;
    }

    return new ValidationError(
      message,
      ErrorCode.PARAMETER_OUT_OF_RANGE,
      { parameter, value, min, max, ...context }
    );
  }

  static invalidInput(input: any, expectedType: string, context: ErrorContext = {}): ValidationError {
    return new ValidationError(
      `Invalid input: expected ${expectedType}, got ${typeof input}`,
      ErrorCode.INVALID_INPUT,
      { input: { type: typeof input }, expectedType, ...context }
    );
  }
}

/**
 * Error thrown when memory operations fail
 */
export class MemoryError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.OUT_OF_MEMORY,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'memory', ...context });
    this.name = 'MemoryError';
  }

  static allocationFailed(size: number, context: ErrorContext = {}): MemoryError {
    return new MemoryError(
      `Failed to allocate ${size} bytes of memory`,
      ErrorCode.MEMORY_ALLOCATION_FAILED,
      { size, ...context }
    );
  }

  static outOfMemory(operation: string, context: ErrorContext = {}): MemoryError {
    return new MemoryError(
      `Out of memory during operation: ${operation}`,
      ErrorCode.OUT_OF_MEMORY,
      { operation, ...context }
    );
  }
}

/**
 * Error thrown when modules fail to load
 */
export class ModuleError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.MODULE_LOAD_FAILED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'module', ...context });
    this.name = 'ModuleError';
  }

  static loadFailed(module: string, cause?: Error, context: ErrorContext = {}): ModuleError {
    const errorContext: ErrorContext = { module, ...context };
    if (cause) {
      errorContext.cause = cause;
    }
    return new ModuleError(
      `Failed to load module: ${module}`,
      ErrorCode.MODULE_LOAD_FAILED,
      errorContext
    );
  }

  static wasmInitializationFailed(module: string, cause?: Error, context: ErrorContext = {}): ModuleError {
    const errorContext: ErrorContext = { module, ...context };
    if (cause) {
      errorContext.cause = cause;
    }
    return new ModuleError(
      `Failed to initialize WebAssembly module: ${module}`,
      ErrorCode.WASM_INITIALIZATION_FAILED,
      errorContext
    );
  }
}

/**
 * Error thrown when environment doesn't support required features
 */
export class EnvironmentError extends ImageCompressionError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.ENVIRONMENT_NOT_SUPPORTED,
    context: ErrorContext = {}
  ) {
    super(message, code, { operation: 'environment', ...context });
    this.name = 'EnvironmentError';
  }

  static featureNotAvailable(feature: string, context: ErrorContext = {}): EnvironmentError {
    return new EnvironmentError(
      `Feature not available in current environment: ${feature}`,
      ErrorCode.FEATURE_NOT_AVAILABLE,
      { feature, ...context }
    );
  }

  static environmentNotSupported(environment: string, context: ErrorContext = {}): EnvironmentError {
    return new EnvironmentError(
      `Environment not supported: ${environment}`,
      ErrorCode.ENVIRONMENT_NOT_SUPPORTED,
      { ...context, environment: environment }
    );
  }
}