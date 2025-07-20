/**
 * Tests for ImagePipeline functionality
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import { ValidationError, ProcessingError } from '../errors/index.js';
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
  canDecode: jest.fn().mockReturnValue(true),
};

const mockResizeProcessor = {
  name: 'resize',
  process: jest.fn().mockResolvedValue(new ImageData(50, 50)),
  validateOptions: jest.fn().mockReturnValue(true),
};

const mockRotateProcessor = {
  name: 'rotate',
  process: jest.fn().mockResolvedValue(new ImageData(100, 100)),
  validateOptions: jest.fn().mockReturnValue(true),
};

const mockQuantizeProcessor = {
  name: 'quantize',
  process: jest.fn().mockResolvedValue(new ImageData(100, 100)),
  validateOptions: jest.fn().mockReturnValue(true),
};

describe('ImagePipeline', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);

    // Register mock codecs and processors
    codecManager.registerEncoder(mockEncoder);
    codecManager.registerDecoder(mockDecoder);
    processorRegistry.register(mockResizeProcessor);
    processorRegistry.register(mockRotateProcessor);
    processorRegistry.register(mockQuantizeProcessor);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('basic pipeline operations', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should create a pipeline and set input', () => {
      const pipeline = compressor.pipeline().input(testBuffer);
      expect(pipeline).toBeDefined();
    });

    it('should decode only when requested', async () => {
      const result = await compressor.pipeline()
        .input(testBuffer)
        .decode()
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalledWith(testBuffer);
    });

    it('should throw error when no input is set', async () => {
      await expect(
        compressor.pipeline().decode().execute()
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('processing operations', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should apply resize operation', async () => {
      const resizeOptions: ResizeOptions = { width: 50, height: 50 };
      
      const result = await compressor.pipeline()
        .input(testBuffer)
        .resize(resizeOptions)
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockResizeProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        resizeOptions
      );
    });

    it('should apply rotate operation', async () => {
      const result = await compressor.pipeline()
        .input(testBuffer)
        .rotate(90)
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockRotateProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        90
      );
    });

    it('should apply quantize operation', async () => {
      const quantizeOptions: QuantizeOptions = { maxColors: 128 };
      
      const result = await compressor.pipeline()
        .input(testBuffer)
        .quantize(quantizeOptions)
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockQuantizeProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        quantizeOptions
      );
    });

    it('should chain multiple operations', async () => {
      const resizeOptions: ResizeOptions = { width: 50, height: 50 };
      const quantizeOptions: QuantizeOptions = { maxColors: 64 };
      
      const result = await compressor.pipeline()
        .input(testBuffer)
        .resize(resizeOptions)
        .rotate(180)
        .quantize(quantizeOptions)
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      // All processors should have been called
      expect(mockResizeProcessor.process).toHaveBeenCalled();
      expect(mockRotateProcessor.process).toHaveBeenCalled();
      expect(mockQuantizeProcessor.process).toHaveBeenCalled();
    });
  });

  describe('encoding operations', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should encode to specified format', async () => {
      const result = await compressor.pipeline()
        .input(testBuffer)
        .encode('webp', { quality: 90 })
        .execute();

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockEncoder.encode).toHaveBeenCalledWith(
        expect.any(ImageData),
        { quality: 90 }
      );
    });

    it('should encode without options', async () => {
      const result = await compressor.pipeline()
        .input(testBuffer)
        .encode('webp')
        .execute();

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockEncoder.encode).toHaveBeenCalledWith(
        expect.any(ImageData),
        {}
      );
    });

    it('should process and encode in sequence', async () => {
      const resizeOptions: ResizeOptions = { width: 50, height: 50 };
      
      const result = await compressor.pipeline()
        .input(testBuffer)
        .resize(resizeOptions)
        .encode('webp', { quality: 85 })
        .execute();

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockResizeProcessor.process).toHaveBeenCalled();
      expect(mockEncoder.encode).toHaveBeenCalledWith(
        expect.any(ImageData),
        { quality: 85 }
      );
    });
  });

  describe('complex pipeline scenarios', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should handle full pipeline: decode -> process -> encode', async () => {
      const resizeOptions: ResizeOptions = { width: 200, height: 200 };
      
      const result = await compressor.pipeline()
        .input(testBuffer)
        .decode()
        .resize(resizeOptions)
        .rotate(270)
        .encode('webp', { quality: 95 })
        .execute();

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockDecoder.decode).toHaveBeenCalled();
      expect(mockResizeProcessor.process).toHaveBeenCalled();
      expect(mockRotateProcessor.process).toHaveBeenCalled();
      expect(mockEncoder.encode).toHaveBeenCalled();
    });

    it('should work with ImageData input', async () => {
      const imageData = new ImageData(100, 100);
      
      const result = await compressor.pipeline()
        .input(imageData)
        .resize({ width: 50, height: 50 })
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockResizeProcessor.process).toHaveBeenCalledWith(imageData, { width: 50, height: 50 });
    });

    it('should handle processing without encoding', async () => {
      const result = await compressor.pipeline()
        .input(testBuffer)
        .resize({ width: 75, height: 75 })
        .rotate(90)
        .execute();

      expect(result).toBeInstanceOf(ImageData);
      expect(mockResizeProcessor.process).toHaveBeenCalled();
      expect(mockRotateProcessor.process).toHaveBeenCalled();
      expect(mockEncoder.encode).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should handle processing errors', async () => {
      mockResizeProcessor.process.mockRejectedValueOnce(new Error('Processing failed'));
      
      await expect(
        compressor.pipeline()
          .input(testBuffer)
          .resize({ width: 50, height: 50 })
          .execute()
      ).rejects.toThrow(ProcessingError);
    });

    it('should handle encoding errors', async () => {
      mockEncoder.encode.mockRejectedValueOnce(new Error('Encoding failed'));
      
      await expect(
        compressor.pipeline()
          .input(testBuffer)
          .encode('webp')
          .execute()
      ).rejects.toThrow(ProcessingError);
    });

    it('should handle decoding errors', async () => {
      mockDecoder.decode.mockRejectedValueOnce(new Error('Decoding failed'));
      
      await expect(
        compressor.pipeline()
          .input(testBuffer)
          .decode()
          .execute()
      ).rejects.toThrow(ProcessingError);
    });
  });

  describe('pipeline state management', () => {
    // Create a proper WebP buffer with signature
    const testBuffer = new ArrayBuffer(12);
    const view = new Uint8Array(testBuffer);
    view.set([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

    it('should maintain separate state for different pipelines', async () => {
      const pipeline1 = compressor.pipeline().input(testBuffer).resize({ width: 50, height: 50 });
      const pipeline2 = compressor.pipeline().input(testBuffer).rotate(90);

      const [result1, result2] = await Promise.all([
        pipeline1.execute(),
        pipeline2.execute()
      ]);

      expect(result1).toBeInstanceOf(ImageData);
      expect(result2).toBeInstanceOf(ImageData);
      expect(mockResizeProcessor.process).toHaveBeenCalled();
      expect(mockRotateProcessor.process).toHaveBeenCalled();
    });

    it('should allow pipeline reuse after execution', async () => {
      const pipeline = compressor.pipeline().input(testBuffer);
      
      // First execution
      const result1 = await pipeline.resize({ width: 50, height: 50 }).execute();
      expect(result1).toBeInstanceOf(ImageData);

      // Reset and reuse
      const result2 = await pipeline.reset().input(testBuffer).rotate(180).execute();
      expect(result2).toBeInstanceOf(ImageData);
    });

    it('should clone pipeline state correctly', async () => {
      const originalPipeline = compressor.pipeline()
        .input(testBuffer)
        .resize({ width: 50, height: 50 });

      const clonedPipeline = originalPipeline.clone().rotate(90);

      const [originalResult, clonedResult] = await Promise.all([
        originalPipeline.execute(),
        clonedPipeline.execute()
      ]);

      expect(originalResult).toBeInstanceOf(ImageData);
      expect(clonedResult).toBeInstanceOf(ImageData);
      
      // Both should have called resize, but only cloned should have called rotate
      expect(mockResizeProcessor.process).toHaveBeenCalledTimes(2);
      expect(mockRotateProcessor.process).toHaveBeenCalledTimes(1);
    });
  });
});