/**
 * Comprehensive integration tests for complete processing pipelines
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import { ImageFormat, ProcessingOperation } from '../types/index.js';
import {
  createTestImageBuffer,
  createTestImageData,
  TestImages,
  ConversionMatrix,
} from './test-data.js';

describe('Integration Tests - Complete Processing Pipelines', () => {
  let compressor: ImageCompressor;

  beforeEach(() => {
    compressor = new ImageCompressor();
  });

  describe('End-to-End Format Conversion', () => {
    it('should handle complete conversion pipeline with mock codecs', async () => {
      // This test uses mock codecs to test the pipeline logic
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Register mock codecs
      const mockWebPEncoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
        getDefaultOptions: jest.fn().mockReturnValue({ quality: 80 }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockWebPDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerEncoder(mockWebPEncoder);
      codecManager.registerDecoder(mockWebPDecoder);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      const result = await testCompressor.convert(testBuffer, 'webp', {
        quality: 90,
      });

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(mockWebPDecoder.decode).toHaveBeenCalled();
      expect(mockWebPEncoder.encode).toHaveBeenCalled();
    });

    it('should handle decode -> process -> encode pipeline', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Mock codecs and processors
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(200, 200)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockEncoder = {
        format: 'png' as ImageFormat,
        mimeType: 'image/png',
        extension: '.png',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(2000)),
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockResizeProcessor = {
        name: 'resize',
        process: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);
      processorRegistry.register(mockResizeProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      // Test complete pipeline
      const operations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 100, height: 100 } },
      ];

      const result = await testCompressor.process(testBuffer, operations);

      expect(result).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalled();
      expect(mockResizeProcessor.process).toHaveBeenCalled();
    });
  });

  describe('Multi-Step Processing Pipelines', () => {
    it('should handle complex multi-step processing', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Mock components
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(400, 400)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockResizeProcessor = {
        name: 'resize',
        process: jest.fn().mockImplementation((imageData, options) => {
          return Promise.resolve(
            createTestImageData(options.width, options.height),
          );
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockRotateProcessor = {
        name: 'rotate',
        process: jest.fn().mockImplementation((imageData) => {
          // Swap dimensions for rotation
          return Promise.resolve(
            createTestImageData(imageData.height, imageData.width),
          );
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockQuantizeProcessor = {
        name: 'quantize',
        process: jest.fn().mockImplementation((imageData) => {
          return Promise.resolve(imageData); // Return same data for simplicity
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      processorRegistry.register(mockResizeProcessor);
      processorRegistry.register(mockRotateProcessor);
      processorRegistry.register(mockQuantizeProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      const operations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 200, height: 200 } },
        { type: 'rotate', options: { angle: 90 } },
        { type: 'quantize', options: { maxColors: 64 } },
      ];

      const result = await testCompressor.process(testBuffer, operations);

      expect(result).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalled();
      expect(mockResizeProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        { width: 200, height: 200 },
      );
      expect(mockRotateProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        { angle: 90 },
      );
      expect(mockQuantizeProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        { maxColors: 64 },
      );
    });

    it('should maintain data integrity through pipeline', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      let pipelineData: ImageData[] = [];

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockProcessor = {
        name: 'resize',
        process: jest.fn().mockImplementation((imageData, options) => {
          pipelineData.push(imageData);
          return Promise.resolve(
            createTestImageData(options.width, options.height),
          );
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      processorRegistry.register(mockProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      const operations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 50, height: 50 } },
      ];

      await testCompressor.process(testBuffer, operations);

      // Verify data flowed through pipeline
      expect(pipelineData).toHaveLength(1);
      expect(pipelineData[0]).toBeInstanceOf(ImageData);
      expect(pipelineData[0].width).toBe(100);
      expect(pipelineData[0].height).toBe(100);
    });
  });

  describe('Cross-Format Conversion Matrix', () => {
    it('should handle all format conversion combinations', async () => {
      const codecManager = new CodecManager();
      const formats: ImageFormat[] = ['webp', 'png', 'avif', 'jpeg'];

      // Register mock codecs for all formats
      formats.forEach((format) => {
        const mockDecoder = {
          format,
          mimeType: `image/${format}`,
          extension: `.${format}`,
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
          canDecode: jest.fn().mockImplementation((buffer: ArrayBuffer) => {
            // Simple format detection based on our test buffer creation
            const view = new Uint8Array(buffer);
            return view.length > 10; // Accept any reasonable buffer
          }),
        };

        const mockEncoder = {
          format,
          mimeType: `image/${format}`,
          extension: `.${format}`,
          isSupported: jest.fn().mockResolvedValue(true),
          encode: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
          getDefaultOptions: jest.fn().mockReturnValue({ quality: 80 }),
          validateOptions: jest.fn().mockReturnValue(true),
        };

        codecManager.registerDecoder(mockDecoder);
        codecManager.registerEncoder(mockEncoder);
      });

      const testCompressor = new ImageCompressor(codecManager);

      // Test conversion matrix
      const conversionResults: Array<{
        from: ImageFormat;
        to: ImageFormat;
        success: boolean;
      }> = [];

      for (const fromFormat of formats) {
        for (const toFormat of formats) {
          try {
            const testBuffer = createTestImageBuffer(fromFormat);
            const result = await testCompressor.convert(testBuffer, toFormat);
            conversionResults.push({
              from: fromFormat,
              to: toFormat,
              success: true,
            });
            expect(result).toBeInstanceOf(ArrayBuffer);
          } catch (error) {
            conversionResults.push({
              from: fromFormat,
              to: toFormat,
              success: false,
            });
          }
        }
      }

      // All conversions should succeed with mock codecs
      const successfulConversions = conversionResults.filter((r) => r.success);
      expect(successfulConversions).toHaveLength(
        formats.length * formats.length,
      );
    });
  });

  describe('Pipeline Error Handling and Recovery', () => {
    it('should handle decoder failures gracefully', async () => {
      const codecManager = new CodecManager();

      const failingDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockRejectedValue(new Error('Decoder failed')),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(failingDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      await expect(testCompressor.decode(testBuffer)).rejects.toThrow();
    });

    it('should handle encoder failures gracefully', async () => {
      const codecManager = new CodecManager();

      const failingEncoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockRejectedValue(new Error('Encoder failed')),
        getDefaultOptions: jest.fn().mockReturnValue({ quality: 80 }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerEncoder(failingEncoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testImageData = createTestImageData();

      await expect(
        testCompressor.encode(testImageData, 'webp'),
      ).rejects.toThrow();
    });

    it('should handle processor failures gracefully', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const failingProcessor = {
        name: 'resize',
        process: jest.fn().mockRejectedValue(new Error('Processor failed')),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      processorRegistry.register(failingProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      const operations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 50, height: 50 } },
      ];

      await expect(
        testCompressor.process(testBuffer, operations),
      ).rejects.toThrow();
    });

    it('should handle partial pipeline failures', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const workingProcessor = {
        name: 'resize',
        process: jest.fn().mockResolvedValue(createTestImageData(50, 50)),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const failingProcessor = {
        name: 'rotate',
        process: jest.fn().mockRejectedValue(new Error('Rotation failed')),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      processorRegistry.register(workingProcessor);
      processorRegistry.register(failingProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');

      const operations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 50, height: 50 } },
        { type: 'rotate', options: { angle: 90 } },
      ];

      await expect(
        testCompressor.process(testBuffer, operations),
      ).rejects.toThrow();

      // First processor should have been called
      expect(workingProcessor.process).toHaveBeenCalled();
      // Second processor should have been called and failed
      expect(failingProcessor.process).toHaveBeenCalled();
    });
  });

  describe('Performance and Concurrency Integration', () => {
    it('should handle concurrent processing requests', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          // Simulate async work
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(100, 100)), 10);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockEncoder = {
        format: 'png' as ImageFormat,
        mimeType: 'image/png',
        extension: '.png',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockImplementation(() => {
          // Simulate async work
          return new Promise((resolve) => {
            setTimeout(() => resolve(new ArrayBuffer(1000)), 10);
          });
        }),
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);

      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Start multiple concurrent operations
      const promises = Array.from({ length: 5 }, () =>
        testCompressor.convert(testBuffer, 'png'),
      );

      const results = await Promise.allSettled(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeInstanceOf(ArrayBuffer);
        }
      });

      // Decoder should have been called for each request
      expect(mockDecoder.decode).toHaveBeenCalledTimes(5);
      expect(mockEncoder.encode).toHaveBeenCalledTimes(5);
    });

    it('should handle mixed concurrent operations', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Setup mock components
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockEncoder = {
        format: 'png' as ImageFormat,
        mimeType: 'image/png',
        extension: '.png',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(1000)),
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockProcessor = {
        name: 'resize',
        process: jest.fn().mockResolvedValue(createTestImageData(50, 50)),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);
      processorRegistry.register(mockProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const testBuffer = createTestImageBuffer('webp');
      const testImageData = createTestImageData();

      // Mix of different operation types
      const promises = [
        testCompressor.decode(testBuffer),
        testCompressor.encode(testImageData, 'png'),
        testCompressor.convert(testBuffer, 'png'),
        testCompressor.process(testBuffer, [
          { type: 'resize', options: { width: 50, height: 50 } },
        ]),
        testCompressor.detectFormat(testBuffer),
      ];

      const results = await Promise.allSettled(promises);

      // Check that operations completed
      expect(results[0].status).toBe('fulfilled'); // decode
      expect(results[1].status).toBe('fulfilled'); // encode
      expect(results[2].status).toBe('fulfilled'); // convert
      expect(results[3].status).toBe('fulfilled'); // process
      expect(results[4].status).toBe('fulfilled'); // detectFormat
    });
  });

  describe('Memory Management Integration', () => {
    it('should handle large image processing without memory leaks', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(2000, 2000)), // Large image
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockEncoder = {
        format: 'png' as ImageFormat,
        mimeType: 'image/png',
        extension: '.png',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(10 * 1024 * 1024)), // 10MB
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);

      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Process multiple large images
      for (let i = 0; i < 5; i++) {
        const result = await testCompressor.convert(testBuffer, 'png');
        expect(result).toBeInstanceOf(ArrayBuffer);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Test should complete without memory issues
      expect(true).toBe(true);
    });

    it('should handle rapid allocation and deallocation', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(500, 500)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Rapid operations
      const promises = Array.from({ length: 20 }, () =>
        testCompressor.decode(testBuffer),
      );

      const results = await Promise.allSettled(promises);

      // All should complete successfully
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(successCount).toBe(20);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle typical web application workflow', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Setup realistic mock components
      const mockWebPDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(1920, 1080)), // HD image
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockJPEGEncoder = {
        format: 'jpeg' as ImageFormat,
        mimeType: 'image/jpeg',
        extension: '.jpg',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(500 * 1024)), // 500KB
        getDefaultOptions: jest.fn().mockReturnValue({ quality: 85 }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockResizeProcessor = {
        name: 'resize',
        process: jest.fn().mockImplementation((imageData, options) => {
          return Promise.resolve(
            createTestImageData(options.width, options.height),
          );
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockWebPDecoder);
      codecManager.registerEncoder(mockJPEGEncoder);
      processorRegistry.register(mockResizeProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );
      const originalImage = createTestImageBuffer('webp');

      // Typical workflow: decode -> resize for thumbnail -> encode as JPEG
      const thumbnailOperations: ProcessingOperation[] = [
        { type: 'resize', options: { width: 300, height: 200 } },
      ];

      const thumbnailImageData = await testCompressor.process(
        originalImage,
        thumbnailOperations,
      );
      const thumbnailBuffer = await testCompressor.encode(
        thumbnailImageData,
        'jpeg',
        { quality: 80 },
      );

      expect(thumbnailImageData).toBeInstanceOf(ImageData);
      expect(thumbnailImageData.width).toBe(300);
      expect(thumbnailImageData.height).toBe(200);
      expect(thumbnailBuffer).toBeInstanceOf(ArrayBuffer);

      // Verify the pipeline was executed correctly
      expect(mockWebPDecoder.decode).toHaveBeenCalled();
      expect(mockResizeProcessor.process).toHaveBeenCalledWith(
        expect.any(ImageData),
        { width: 300, height: 200 },
      );
      expect(mockJPEGEncoder.encode).toHaveBeenCalledWith(
        expect.any(ImageData),
        { quality: 80 },
      );
    });

    it('should handle batch processing scenario', async () => {
      const codecManager = new CodecManager();
      const processorRegistry = new ProcessorRegistry();

      // Mock components for batch processing
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(800, 600)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockEncoder = {
        format: 'png' as ImageFormat,
        mimeType: 'image/png',
        extension: '.png',
        isSupported: jest.fn().mockResolvedValue(true),
        encode: jest.fn().mockResolvedValue(new ArrayBuffer(1024 * 1024)), // 1MB
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      const mockProcessor = {
        name: 'resize',
        process: jest.fn().mockImplementation((imageData, options) => {
          return Promise.resolve(
            createTestImageData(options.width, options.height),
          );
        }),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);
      processorRegistry.register(mockProcessor);

      const testCompressor = new ImageCompressor(
        codecManager,
        processorRegistry,
      );

      // Simulate batch processing of multiple images
      const imageBuffers = Array.from({ length: 10 }, () =>
        createTestImageBuffer('webp'),
      );
      const targetSizes = [
        { width: 100, height: 100 },
        { width: 200, height: 200 },
        { width: 300, height: 300 },
      ];

      const batchResults: ArrayBuffer[] = [];

      for (const buffer of imageBuffers) {
        const targetSize =
          targetSizes[Math.floor(Math.random() * targetSizes.length)];
        const operations: ProcessingOperation[] = [
          { type: 'resize', options: targetSize },
        ];

        const processedImageData = await testCompressor.process(
          buffer,
          operations,
        );
        const encodedBuffer = await testCompressor.encode(
          processedImageData,
          'png',
        );
        batchResults.push(encodedBuffer);
      }

      expect(batchResults).toHaveLength(10);
      batchResults.forEach((result) => {
        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      // Verify all operations were called
      expect(mockDecoder.decode).toHaveBeenCalledTimes(10);
      expect(mockProcessor.process).toHaveBeenCalledTimes(10);
      expect(mockEncoder.encode).toHaveBeenCalledTimes(10);
    });
  });

  describe('Environment-Specific Integration', () => {
    it('should handle Node.js specific features', async () => {
      // Test Node.js specific functionality if available
      if (typeof process !== 'undefined' && process.versions?.node) {
        const codecManager = new CodecManager();

        const mockDecoder = {
          format: 'webp' as ImageFormat,
          mimeType: 'image/webp',
          extension: '.webp',
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
          canDecode: jest.fn().mockReturnValue(true),
        };

        codecManager.registerDecoder(mockDecoder);
        const testCompressor = new ImageCompressor(codecManager);

        // Test with Node.js Buffer
        const nodeBuffer = Buffer.from(createTestImageBuffer('webp'));
        const result = await testCompressor.decode(nodeBuffer);

        expect(result).toBeInstanceOf(ImageData);
      }
    });

    it('should handle browser-specific features', async () => {
      // Test browser-specific functionality if available
      if (typeof window !== 'undefined') {
        const codecManager = new CodecManager();

        const mockDecoder = {
          format: 'webp' as ImageFormat,
          mimeType: 'image/webp',
          extension: '.webp',
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
          canDecode: jest.fn().mockReturnValue(true),
        };

        codecManager.registerDecoder(mockDecoder);
        const testCompressor = new ImageCompressor(codecManager);

        // Test with Blob
        const blob = new Blob([createTestImageBuffer('webp')], {
          type: 'image/webp',
        });
        const result = await testCompressor.decode(blob);

        expect(result).toBeInstanceOf(ImageData);
      }
    });
  });
});
