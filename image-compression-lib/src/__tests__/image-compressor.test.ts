/**
 * Tests for ImageCompressor main class
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import {
  ValidationError,
  UnsupportedFormatError,
  DecodingError,
  EncodingError,
  ProcessingError,
} from '../errors/index.js';
import { ImageFormat, ResizeOptions, QuantizeOptions } from '../types/index.js';

// Mock implementations
const mockEncoder = {
  format: 'webp' as ImageFormat,
  mimeType: 'image/webp',
  extension: '.webp',
  isSupported: jest.fn().mockResolvedValue(true),
  encode: jest.fn().mockResolvedValue(new ArrayBuffer(100)),
  getDefaultOptions: jest.fn().mockReturnValue({ quality: 80 }),
  validateOptions: jest.fn().mockReturnValue(true),
};

const mockDecoder = {
  format: 'webp' as ImageFormat,
  mimeType: 'image/webp',
  extension: '.webp',
  isSupported: jest.fn().mockResolvedValue(true),
  decode: jest.fn().mockResolvedValue(new ImageData(100, 100)),
  canDecode: jest.fn().mockImplementation((buffer: ArrayBuffer) => {
    // Only return true for WebP signature
    const bytes = new Uint8Array(buffer);
    return bytes.length >= 12 &&
           bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
           bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }),
};

const mockProcessor = {
  name: 'resize',
  process: jest.fn().mockResolvedValue(new ImageData(50, 50)),
  validateOptions: jest.fn().mockReturnValue(true),
};

describe('ImageCompressor', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);

    // Register mock codec and processor
    codecManager.registerEncoder(mockEncoder);
    codecManager.registerDecoder(mockDecoder);
    processorRegistry.register(mockProcessor);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default managers when none provided', () => {
      const defaultCompressor = new ImageCompressor();
      expect(defaultCompressor).toBeInstanceOf(ImageCompressor);
    });

    it('should use provided managers', () => {
      expect(compressor).toBeInstanceOf(ImageCompressor);
    });
  });

  describe('convert', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should convert image successfully', async () => {
      const result = await compressor.convert(testBuffer, 'webp', { quality: 90 });
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(100);
    });

    it('should throw error for unsupported target format', async () => {
      mockEncoder.isSupported.mockResolvedValueOnce(false);
      
      await expect(compressor.convert(testBuffer, 'webp'))
        .rejects.toThrow(UnsupportedFormatError);
    });

    it('should throw error for empty buffer', async () => {
      await expect(compressor.convert(new ArrayBuffer(0), 'webp'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw validation error for invalid options', async () => {
      const invalidOptions = { quality: 150 }; // Invalid quality > 100
      
      await expect(compressor.convert(testBuffer, 'webp', invalidOptions))
        .rejects.toThrow('Parameter \'quality\' value 150 is out of range (expected: 0-100)');
    });
  });

  describe('decode', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should decode ArrayBuffer successfully', async () => {
      const result = await compressor.decode(testBuffer);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(100);
      expect(result.height).toBe(100);
      expect(mockDecoder.decode).toHaveBeenCalledWith(testBuffer);
    });

    it('should decode Uint8Array successfully', async () => {
      const uint8Array = new Uint8Array(testBuffer);
      const result = await compressor.decode(uint8Array);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalled();
    });

    it('should decode Blob successfully', async () => {
      const blob = new Blob([testBuffer], { type: 'image/webp' });
      // Mock the arrayBuffer method
      blob.arrayBuffer = jest.fn().mockResolvedValue(testBuffer);
      
      const result = await compressor.decode(blob);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalled();
    });

    it('should throw error for empty buffer', async () => {
      await expect(compressor.decode(new ArrayBuffer(0)))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error for unsupported input type', async () => {
      await expect(compressor.decode('invalid' as any))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error for ImageData input', async () => {
      const imageData = new ImageData(100, 100);
      await expect(compressor.decode(imageData))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('encode', () => {
    const testImageData = new ImageData(100, 100);

    it('should encode ImageData successfully', async () => {
      const result = await compressor.encode(testImageData, 'webp', { quality: 90 });
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(100);
      expect(mockEncoder.encode).toHaveBeenCalledWith(testImageData, { quality: 90 });
    });

    it('should throw error for invalid ImageData', async () => {
      const invalidImageData = { width: 0, height: 0, data: new Uint8ClampedArray(0) } as ImageData;
      
      await expect(compressor.encode(invalidImageData, 'webp'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error for unsupported format', async () => {
      mockEncoder.isSupported.mockResolvedValueOnce(false);
      
      await expect(compressor.encode(testImageData, 'webp'))
        .rejects.toThrow(UnsupportedFormatError);
    });

    it('should use default options when none provided', async () => {
      await compressor.encode(testImageData, 'webp');
      
      expect(mockEncoder.encode).toHaveBeenCalledWith(testImageData, undefined);
    });
  });

  describe('process', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    const resizeOptions: ResizeOptions = { width: 50, height: 50 };

    it('should process image with single operation', async () => {
      const operations = [{ type: 'resize' as const, options: resizeOptions }];
      const result = await compressor.process(testBuffer, operations);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(mockProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        resizeOptions
      );
    });

    it('should process image with multiple operations', async () => {
      const operations = [
        { type: 'resize' as const, options: resizeOptions },
        { type: 'rotate' as const, options: { angle: 90 } },
      ];

      // Register rotate processor
      const rotateProcessor = {
        name: 'rotate',
        process: jest.fn().mockResolvedValue(new ImageData(50, 50)),
        validateOptions: jest.fn().mockReturnValue(true),
      };
      processorRegistry.register(rotateProcessor);

      const result = await compressor.process(testBuffer, operations);
      
      expect(result).toBeInstanceOf(ImageData);
      expect(mockProcessor.process).toHaveBeenCalled();
      expect(rotateProcessor.process).toHaveBeenCalled();
    });

    it('should throw error for empty operations array', async () => {
      await expect(compressor.process(testBuffer, []))
        .rejects.toThrow(ValidationError);
    });

    it('should throw error for unknown processor', async () => {
      const operations = [{ type: 'unknown' as any, options: { width: 50, height: 50 } }];
      
      await expect(compressor.process(testBuffer, operations))
        .rejects.toThrow(ProcessingError);
    });

    it('should validate resize options', async () => {
      const invalidOptions = { width: -1, height: 50 };
      const operations = [{ type: 'resize' as const, options: invalidOptions }];
      
      await expect(compressor.process(testBuffer, operations))
        .rejects.toThrow(ValidationError);
    });

    it('should validate rotate options', async () => {
      // Register rotate processor for this test
      const rotateProcessor = {
        name: 'rotate',
        process: jest.fn().mockResolvedValue(new ImageData(100, 100)),
        validateOptions: jest.fn().mockReturnValue(true),
      };
      processorRegistry.register(rotateProcessor);
      
      const operations = [{ type: 'rotate' as const, options: { angle: 45 } }]; // Invalid angle
      
      await expect(compressor.process(testBuffer, operations))
        .rejects.toThrow(ValidationError);
    });

    it('should validate quantize options', async () => {
      // Register quantize processor for this test
      const quantizeProcessor = {
        name: 'quantize',
        process: jest.fn().mockResolvedValue(new ImageData(100, 100)),
        validateOptions: jest.fn().mockReturnValue(true),
      };
      processorRegistry.register(quantizeProcessor);
      
      const invalidOptions: QuantizeOptions = { maxColors: 300 }; // Invalid > 256
      const operations = [{ type: 'quantize' as const, options: invalidOptions }];
      
      await expect(compressor.process(testBuffer, operations))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('pipeline', () => {
    it('should create a new pipeline instance', () => {
      const pipeline = compressor.pipeline();
      expect(pipeline).toBeDefined();
      expect(typeof pipeline.input).toBe('function');
      expect(typeof pipeline.execute).toBe('function');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats', () => {
      const formats = compressor.getSupportedFormats();
      
      expect(formats).toEqual({
        encoders: ['webp'],
        decoders: ['webp'],
        processors: ['resize'],
      });
    });
  });

  describe('getFormatInfo', () => {
    it('should return format information', () => {
      const info = compressor.getFormatInfo('webp');
      
      expect(info).toEqual({
        format: 'webp',
        mimeType: 'image/webp',
        extension: '.webp',
        supportsLossless: true,
        supportsTransparency: true,
        defaultOptions: { quality: 80 },
      });
    });

    it('should throw error for unsupported format', () => {
      expect(() => compressor.getFormatInfo('unknown' as any))
        .toThrow(UnsupportedFormatError);
    });
  });

  describe('detectFormat', () => {
    it('should detect format from buffer', () => {
      // Mock WebP signature
      const webpBuffer = new ArrayBuffer(12);
      const view = new Uint8Array(webpBuffer);
      view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
      
      const format = compressor.detectFormat(webpBuffer);
      expect(format).toBe('webp');
    });

    it('should return null for unrecognized format', () => {
      const unknownBuffer = new ArrayBuffer(12);
      // Fill with random data that doesn't match any format signature
      const view = new Uint8Array(unknownBuffer);
      view.set([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B]);
      const format = compressor.detectFormat(unknownBuffer);
      expect(format).toBeNull();
    });

    it('should return null for empty buffer', () => {
      const format = compressor.detectFormat(new ArrayBuffer(0));
      expect(format).toBeNull();
    });
  });
});