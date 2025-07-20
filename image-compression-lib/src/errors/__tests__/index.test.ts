import {
  ImageCompressionError,
  UnsupportedFormatError,
  EncodingError,
  DecodingError,
  ProcessingError,
  WorkerError,
  ValidationError,
  MemoryError,
  ModuleError,
  EnvironmentError,
  ErrorCode,
  ErrorContext
} from '../index.js';

describe('Error Classes', () => {
  describe('ImageCompressionError', () => {
    it('should create error with default values', () => {
      const error = new ImageCompressionError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ImageCompressionError');
      expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.context.timestamp).toBe(error.timestamp);
    });

    it('should create error with custom code and context', () => {
      const context: ErrorContext = {
        operation: 'test',
        format: 'webp',
        stage: 'validation'
      };
      
      const error = new ImageCompressionError(
        'Custom error',
        ErrorCode.VALIDATION_FAILED,
        context
      );
      
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.context.operation).toBe('test');
      expect(error.context.format).toBe('webp');
      expect(error.context.stage).toBe('validation');
    });

    it('should generate detailed message', () => {
      const context: ErrorContext = {
        operation: 'encode',
        format: 'webp',
        stage: 'initialization',
        cause: new Error('WASM failed')
      };
      
      const error = new ImageCompressionError('Test error', ErrorCode.ENCODING_FAILED, context);
      const detailed = error.getDetailedMessage();
      
      expect(detailed).toContain('Test error');
      expect(detailed).toContain('Operation: encode');
      expect(detailed).toContain('Format: webp');
      expect(detailed).toContain('Stage: initialization');
      expect(detailed).toContain('Caused by: WASM failed');
    });

    it('should convert to JSON', () => {
      const context: ErrorContext = {
        operation: 'decode',
        format: 'avif'
      };
      
      const error = new ImageCompressionError('JSON test', ErrorCode.DECODING_FAILED, context);
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        name: 'ImageCompressionError',
        message: 'JSON test',
        code: ErrorCode.DECODING_FAILED,
        timestamp: error.timestamp,
        context: expect.objectContaining({
          operation: 'decode',
          format: 'avif'
        })
      });
      expect(json).toHaveProperty('stack');
    });
  });

  describe('UnsupportedFormatError', () => {
    it('should create error with format', () => {
      const error = new UnsupportedFormatError('tiff');
      
      expect(error.message).toBe('Unsupported image format: tiff');
      expect(error.name).toBe('UnsupportedFormatError');
      expect(error.code).toBe(ErrorCode.UNSUPPORTED_FORMAT);
      expect(error.context.format).toBe('tiff');
    });

    it('should create error with additional context', () => {
      const context: ErrorContext = {
        operation: 'encode',
        stage: 'validation'
      };
      
      const error = new UnsupportedFormatError('bmp', context);
      
      expect(error.context.format).toBe('bmp');
      expect(error.context.operation).toBe('encode');
      expect(error.context.stage).toBe('validation');
    });
  });

  describe('EncodingError', () => {
    it('should create basic encoding error', () => {
      const error = new EncodingError('Encoding failed');
      
      expect(error.message).toBe('Encoding failed');
      expect(error.name).toBe('EncodingError');
      expect(error.code).toBe(ErrorCode.ENCODING_FAILED);
      expect(error.context.operation).toBe('encode');
    });

    it('should create encoder not available error', () => {
      const error = EncodingError.encoderNotAvailable('webp');
      
      expect(error.message).toBe('Encoder not available for format: webp');
      expect(error.code).toBe(ErrorCode.ENCODER_NOT_AVAILABLE);
      expect(error.context.format).toBe('webp');
    });

    it('should create initialization failed error', () => {
      const cause = new Error('WASM load failed');
      const error = EncodingError.initializationFailed('avif', cause);
      
      expect(error.message).toBe('Failed to initialize encoder for format: avif');
      expect(error.code).toBe(ErrorCode.ENCODER_INITIALIZATION_FAILED);
      expect(error.context.format).toBe('avif');
      expect(error.context.cause).toBe(cause);
    });

    it('should create invalid options error', () => {
      const options = { quality: -1 };
      const error = EncodingError.invalidOptions('jpeg', options);
      
      expect(error.message).toBe('Invalid encoding options for format: jpeg');
      expect(error.code).toBe(ErrorCode.INVALID_ENCODING_OPTIONS);
      expect(error.context.format).toBe('jpeg');
      expect(error.context.options).toBe(options);
    });
  });

  describe('DecodingError', () => {
    it('should create basic decoding error', () => {
      const error = new DecodingError('Decoding failed');
      
      expect(error.message).toBe('Decoding failed');
      expect(error.name).toBe('DecodingError');
      expect(error.code).toBe(ErrorCode.DECODING_FAILED);
      expect(error.context.operation).toBe('decode');
    });

    it('should create decoder not available error', () => {
      const error = DecodingError.decoderNotAvailable('jxl');
      
      expect(error.message).toBe('Decoder not available for format: jxl');
      expect(error.code).toBe(ErrorCode.DECODER_NOT_AVAILABLE);
      expect(error.context.format).toBe('jxl');
    });

    it('should create initialization failed error', () => {
      const cause = new Error('Module not found');
      const error = DecodingError.initializationFailed('png', cause);
      
      expect(error.message).toBe('Failed to initialize decoder for format: png');
      expect(error.code).toBe(ErrorCode.DECODER_INITIALIZATION_FAILED);
      expect(error.context.format).toBe('png');
      expect(error.context.cause).toBe(cause);
    });

    it('should create corrupted data error', () => {
      const error = DecodingError.corruptedData('webp');
      
      expect(error.message).toBe('Corrupted or invalid data for format: webp');
      expect(error.code).toBe(ErrorCode.CORRUPTED_DATA);
      expect(error.context.format).toBe('webp');
    });
  });

  describe('ProcessingError', () => {
    it('should create basic processing error', () => {
      const error = new ProcessingError('Processing failed');
      
      expect(error.message).toBe('Processing failed');
      expect(error.name).toBe('ProcessingError');
      expect(error.code).toBe(ErrorCode.PROCESSING_FAILED);
      expect(error.context.operation).toBe('process');
    });

    it('should create processor not available error', () => {
      const error = ProcessingError.processorNotAvailable('resize');
      
      expect(error.message).toBe('Processor not available: resize');
      expect(error.code).toBe(ErrorCode.PROCESSOR_NOT_AVAILABLE);
      expect(error.context.processor).toBe('resize');
    });

    it('should create invalid options error', () => {
      const options = { width: -1 };
      const error = ProcessingError.invalidOptions('resize', options);
      
      expect(error.message).toBe('Invalid processing options for processor: resize');
      expect(error.code).toBe(ErrorCode.INVALID_PROCESSING_OPTIONS);
      expect(error.context.processor).toBe('resize');
      expect(error.context.options).toBe(options);
    });

    it('should create invalid dimensions error', () => {
      const error = ProcessingError.invalidDimensions(0, 100);
      
      expect(error.message).toBe('Invalid image dimensions: 0x100');
      expect(error.code).toBe(ErrorCode.INVALID_IMAGE_DIMENSIONS);
      expect(error.context.input?.dimensions).toEqual({ width: 0, height: 100 });
    });
  });

  describe('WorkerError', () => {
    it('should create basic worker error', () => {
      const error = new WorkerError('Worker failed');
      
      expect(error.message).toBe('Worker failed');
      expect(error.name).toBe('WorkerError');
      expect(error.code).toBe(ErrorCode.WORKER_COMMUNICATION_FAILED);
      expect(error.context.operation).toBe('worker');
    });

    it('should create initialization failed error', () => {
      const cause = new Error('Worker script not found');
      const error = WorkerError.initializationFailed(cause);
      
      expect(error.message).toBe('Failed to initialize worker');
      expect(error.code).toBe(ErrorCode.WORKER_INITIALIZATION_FAILED);
      expect(error.context.cause).toBe(cause);
    });

    it('should create timeout error', () => {
      const error = WorkerError.timeout('encode', 5000);
      
      expect(error.message).toBe('Worker operation timed out after 5000ms: encode');
      expect(error.code).toBe(ErrorCode.WORKER_TIMEOUT);
      expect(error.context.operation).toBe('encode');
      expect(error.context.timeout).toBe(5000);
    });

    it('should create terminated error', () => {
      const error = WorkerError.terminated();
      
      expect(error.message).toBe('Worker was terminated unexpectedly');
      expect(error.code).toBe(ErrorCode.WORKER_TERMINATED);
    });
  });

  describe('ValidationError', () => {
    it('should create basic validation error', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
      expect(error.context.operation).toBe('validation');
    });

    it('should create missing parameter error', () => {
      const error = ValidationError.missingParameter('width');
      
      expect(error.message).toBe('Missing required parameter: width');
      expect(error.code).toBe(ErrorCode.MISSING_REQUIRED_PARAMETER);
      expect(error.context.parameter).toBe('width');
    });

    it('should create parameter out of range error', () => {
      const error = ValidationError.parameterOutOfRange('quality', 150, 0, 100);
      
      expect(error.message).toBe('Parameter \'quality\' value 150 is out of range (expected: 0-100)');
      expect(error.code).toBe(ErrorCode.PARAMETER_OUT_OF_RANGE);
      expect(error.context.parameter).toBe('quality');
      expect(error.context.value).toBe(150);
      expect(error.context.min).toBe(0);
      expect(error.context.max).toBe(100);
    });

    it('should create invalid input error', () => {
      const error = ValidationError.invalidInput(123, 'string');
      
      expect(error.message).toBe('Invalid input: expected string, got number');
      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.context.input?.type).toBe('number');
      expect(error.context.expectedType).toBe('string');
    });
  });

  describe('MemoryError', () => {
    it('should create basic memory error', () => {
      const error = new MemoryError('Memory error');
      
      expect(error.message).toBe('Memory error');
      expect(error.name).toBe('MemoryError');
      expect(error.code).toBe(ErrorCode.OUT_OF_MEMORY);
      expect(error.context.operation).toBe('memory');
    });

    it('should create allocation failed error', () => {
      const error = MemoryError.allocationFailed(1024000);
      
      expect(error.message).toBe('Failed to allocate 1024000 bytes of memory');
      expect(error.code).toBe(ErrorCode.MEMORY_ALLOCATION_FAILED);
      expect(error.context.size).toBe(1024000);
    });

    it('should create out of memory error', () => {
      const error = MemoryError.outOfMemory('image processing');
      
      expect(error.message).toBe('Out of memory during operation: image processing');
      expect(error.code).toBe(ErrorCode.OUT_OF_MEMORY);
      expect(error.context.operation).toBe('image processing');
    });
  });

  describe('ModuleError', () => {
    it('should create basic module error', () => {
      const error = new ModuleError('Module error');
      
      expect(error.message).toBe('Module error');
      expect(error.name).toBe('ModuleError');
      expect(error.code).toBe(ErrorCode.MODULE_LOAD_FAILED);
      expect(error.context.operation).toBe('module');
    });

    it('should create load failed error', () => {
      const cause = new Error('Network error');
      const error = ModuleError.loadFailed('webp_enc.wasm', cause);
      
      expect(error.message).toBe('Failed to load module: webp_enc.wasm');
      expect(error.code).toBe(ErrorCode.MODULE_LOAD_FAILED);
      expect(error.context.module).toBe('webp_enc.wasm');
      expect(error.context.cause).toBe(cause);
    });

    it('should create WASM initialization failed error', () => {
      const cause = new Error('Invalid WASM');
      const error = ModuleError.wasmInitializationFailed('avif_enc', cause);
      
      expect(error.message).toBe('Failed to initialize WebAssembly module: avif_enc');
      expect(error.code).toBe(ErrorCode.WASM_INITIALIZATION_FAILED);
      expect(error.context.module).toBe('avif_enc');
      expect(error.context.cause).toBe(cause);
    });
  });

  describe('EnvironmentError', () => {
    it('should create basic environment error', () => {
      const error = new EnvironmentError('Environment error');
      
      expect(error.message).toBe('Environment error');
      expect(error.name).toBe('EnvironmentError');
      expect(error.code).toBe(ErrorCode.ENVIRONMENT_NOT_SUPPORTED);
      expect(error.context.operation).toBe('environment');
    });

    it('should create feature not available error', () => {
      const error = EnvironmentError.featureNotAvailable('WebAssembly');
      
      expect(error.message).toBe('Feature not available in current environment: WebAssembly');
      expect(error.code).toBe(ErrorCode.FEATURE_NOT_AVAILABLE);
      expect(error.context.feature).toBe('WebAssembly');
    });

    it('should create environment not supported error', () => {
      const error = EnvironmentError.environmentNotSupported('Internet Explorer');
      
      expect(error.message).toBe('Environment not supported: Internet Explorer');
      expect(error.code).toBe(ErrorCode.ENVIRONMENT_NOT_SUPPORTED);
      expect(error.context.environment).toBe('Internet Explorer');
    });
  });

  describe('Error inheritance', () => {
    it('should maintain proper inheritance chain', () => {
      const encodingError = new EncodingError('Test');
      const decodingError = new DecodingError('Test');
      const processingError = new ProcessingError('Test');
      
      expect(encodingError).toBeInstanceOf(ImageCompressionError);
      expect(encodingError).toBeInstanceOf(Error);
      expect(decodingError).toBeInstanceOf(ImageCompressionError);
      expect(decodingError).toBeInstanceOf(Error);
      expect(processingError).toBeInstanceOf(ImageCompressionError);
      expect(processingError).toBeInstanceOf(Error);
    });

    it('should be distinguishable by instanceof', () => {
      const encodingError = new EncodingError('Test');
      const decodingError = new DecodingError('Test');
      
      expect(encodingError).toBeInstanceOf(EncodingError);
      expect(encodingError).not.toBeInstanceOf(DecodingError);
      expect(decodingError).toBeInstanceOf(DecodingError);
      expect(decodingError).not.toBeInstanceOf(EncodingError);
    });
  });

  describe('Error context', () => {
    it('should preserve context through error chain', () => {
      const originalError = new Error('Original cause');
      const context: ErrorContext = {
        operation: 'encode',
        format: 'webp',
        stage: 'initialization',
        cause: originalError,
        environment: {
          browser: 'Chrome',
          node: false,
          worker: true,
          wasm: true
        }
      };
      
      const error = new EncodingError('Encoding failed', ErrorCode.ENCODING_FAILED, context);
      
      expect(error.context.operation).toBe('encode');
      expect(error.context.format).toBe('webp');
      expect(error.context.stage).toBe('initialization');
      expect(error.context.cause).toBe(originalError);
      expect(typeof error.context.environment === 'object' && error.context.environment?.browser).toBe('Chrome');
      expect(typeof error.context.environment === 'object' && error.context.environment?.worker).toBe(true);
    });
  });
});