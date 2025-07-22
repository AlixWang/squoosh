/**
 * Edge cases and error condition tests
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import { EdgeCaseImages, InvalidImages, TestOptions } from './test-data.js';
import { ErrorTestUtils, MockFactory } from './test-utils.js';
import { ImageFormat } from '../types/index.js';
import {
  ValidationError,
  UnsupportedFormatError,
  DecodingError,
  EncodingError,
  ProcessingError,
  WorkerError,
  ModuleError,
} from '../errors/index.js';

describe('Edge Cases and Error Conditions', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);

    // Register mock codecs
    const formats: ImageFormat[] = ['webp', 'avif', 'jpeg-xl', 'png', 'jpeg'];
    formats.forEach((format) => {
      codecManager.registerEncoder(MockFactory.createMockEncoder(format));
      codecManager.registerDecoder(MockFactory.createMockDecoder(format));
    });

    // Register mock processors
    processorRegistry.register(MockFactory.createMockProcessor('resize'));
    processorRegistry.register(MockFactory.createMockProcessor('rotate'));
    processorRegistry.register(MockFactory.createMockProcessor('quantize'));

    jest.clearAllMocks();
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle null input', async () => {
      await expect(compressor.decode(null as any)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle undefined input', async () => {
      await expect(compressor.decode(undefined as any)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle empty ArrayBuffer', async () => {
      await expect(compressor.decode(InvalidImages.empty)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle very small buffers', async () => {
      await expect(compressor.decode(InvalidImages.tooSmall)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle invalid ImageData', async () => {
      await expect(
        compressor.encode(InvalidImages.invalidImageData, 'webp'),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle ImageData with zero dimensions', async () => {
      const zeroImageData = new ImageData(new Uint8ClampedArray(0), 0, 0);
      await expect(compressor.encode(zeroImageData, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle ImageData with mismatched data length', async () => {
      const mismatchedImageData = new ImageData(
        new Uint8ClampedArray(100),
        10,
        10,
      );
      await expect(
        compressor.encode(mismatchedImageData, 'webp'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Format Detection Edge Cases', () => {
    it('should handle buffers with invalid signatures', () => {
      const result = compressor.detectFormat(InvalidImages.invalidSignature);
      expect(result).toBeNull();
    });

    it('should handle truncated format signatures', () => {
      const truncatedBuffer = new ArrayBuffer(4); // Too small for most signatures
      const result = compressor.detectFormat(truncatedBuffer);
      expect(result).toBeNull();
    });

    it('should handle buffers that look like one format but are another', () => {
      // Create a buffer that starts like WebP but isn't complete
      const fakeWebP = new ArrayBuffer(12);
      const view = new Uint8Array(fakeWebP);
      view.set([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);

      const result = compressor.detectFormat(fakeWebP);
      expect(result).toBe('webp'); // Should detect based on signature
    });
  });

  describe('Extreme Image Dimensions', () => {
    it('should handle very small images (1x1)', async () => {
      const result = await compressor.convert(EdgeCaseImages.tiny.webp, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle very wide images', async () => {
      const result = await compressor.convert(EdgeCaseImages.wide.webp, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle very tall images', async () => {
      const result = await compressor.convert(EdgeCaseImages.tall.webp, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle power-of-2 dimensions', async () => {
      const result256 = await compressor.convert(
        EdgeCaseImages.square256.webp,
        'png',
      );
      const result512 = await compressor.convert(
        EdgeCaseImages.square512.webp,
        'png',
      );

      expect(result256).toBeInstanceOf(ArrayBuffer);
      expect(result512).toBeInstanceOf(ArrayBuffer);
    });

    it('should reject extremely large dimensions in resize', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      await expect(
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: 100000, height: 100000 } },
        ]),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Invalid Options Edge Cases', () => {
    it('should handle invalid encoding options', async () => {
      const testImageData = EdgeCaseImages.tiny.imageData;

      // Test various invalid options
      await expect(
        compressor.encode(
          testImageData,
          'webp',
          TestOptions.invalid.encoding.negativeQuality,
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        compressor.encode(
          testImageData,
          'webp',
          TestOptions.invalid.encoding.tooHighQuality,
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        compressor.encode(
          testImageData,
          'webp',
          TestOptions.invalid.encoding.invalidType,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle invalid resize options', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      // Test various invalid resize options
      for (const invalidOption of Object.values(TestOptions.invalid.resize)) {
        await expect(
          compressor.process(testBuffer, [
            { type: 'resize', options: invalidOption },
          ]),
        ).rejects.toThrow(ValidationError);
      }
    });

    it('should handle invalid rotate options', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      await expect(
        compressor.process(testBuffer, [
          {
            type: 'rotate',
            options: { angle: TestOptions.invalid.rotate.invalidAngle },
          },
        ]),
      ).rejects.toThrow(ValidationError);

      await expect(
        compressor.process(testBuffer, [
          { type: 'rotate', options: TestOptions.invalid.rotate.stringAngle },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle invalid quantize options', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      for (const invalidOption of Object.values(TestOptions.invalid.quantize)) {
        await expect(
          compressor.process(testBuffer, [
            { type: 'quantize', options: invalidOption },
          ]),
        ).rejects.toThrow(ValidationError);
      }
    });
  });

  describe('Corrupted Data Handling', () => {
    it('should handle corrupted image data gracefully', async () => {
      const corruptedWebP = ErrorTestUtils.createCorruptedBuffer('webp');

      await expect(compressor.decode(corruptedWebP)).rejects.toThrow();
    });

    it('should handle truncated image data', async () => {
      const truncatedWebP = ErrorTestUtils.createTruncatedBuffer('webp', 0.3);

      await expect(compressor.decode(truncatedWebP)).rejects.toThrow();
    });

    it('should handle partially corrupted data', async () => {
      const formats: ImageFormat[] = ['webp', 'png', 'avif'];

      for (const format of formats) {
        const corruptedBuffer = ErrorTestUtils.createCorruptedBuffer(format);
        await expect(compressor.decode(corruptedBuffer)).rejects.toThrow();
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle codec loading failures', async () => {
      // Register a failing encoder
      const failingEncoder = MockFactory.createMockEncoder('webp', true);
      codecManager.registerEncoder(failingEncoder);

      const testImageData = EdgeCaseImages.tiny.imageData;

      await expect(compressor.encode(testImageData, 'webp')).rejects.toThrow(
        UnsupportedFormatError,
      );
    });

    it('should handle processor failures', async () => {
      // Register a failing processor
      const failingProcessor = MockFactory.createMockProcessor('resize', true);
      processorRegistry.register(failingProcessor);

      const testBuffer = EdgeCaseImages.tiny.webp;

      await expect(
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: 100, height: 100 } },
        ]),
      ).rejects.toThrow(ProcessingError);
    });

    it('should handle missing codecs gracefully', async () => {
      // Clear all codecs
      codecManager.clear();

      const testBuffer = EdgeCaseImages.tiny.webp;

      await expect(compressor.convert(testBuffer, 'png')).rejects.toThrow(
        UnsupportedFormatError,
      );
    });

    it('should handle missing processors gracefully', async () => {
      // Clear all processors
      processorRegistry.clear();

      const testBuffer = EdgeCaseImages.tiny.webp;

      await expect(
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: 100, height: 100 } },
        ]),
      ).rejects.toThrow(ProcessingError);
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle rapid concurrent requests', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;
      const concurrentRequests = 50;

      const promises = Array.from({ length: concurrentRequests }, () =>
        compressor.convert(testBuffer, 'png'),
      );

      const results = await Promise.allSettled(promises);

      // All requests should either succeed or fail gracefully
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeInstanceOf(ArrayBuffer);
        } else {
          expect(result.reason).toBeInstanceOf(Error);
        }
      });
    });

    it('should handle mixed operation types concurrently', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;
      const testImageData = EdgeCaseImages.tiny.imageData;

      const promises = [
        compressor.decode(testBuffer),
        compressor.encode(testImageData, 'webp'),
        compressor.convert(testBuffer, 'png'),
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: 50, height: 50 } },
        ]),
        compressor.detectFormat(testBuffer),
      ];

      const results = await Promise.allSettled(promises);

      // Check that operations complete without interfering with each other
      expect(results[0]?.status).toBe('fulfilled'); // decode
      expect(results[1]?.status).toBe('fulfilled'); // encode
      expect(results[2]?.status).toBe('fulfilled'); // convert
      expect(results[3]?.status).toBe('fulfilled'); // process
      expect(results[4]?.status).toBe('fulfilled'); // detectFormat
    });
  });

  describe('Memory Pressure Scenarios', () => {
    it('should handle operations when memory is constrained', async () => {
      // Simulate memory pressure by creating large objects
      const memoryHogs: ArrayBuffer[] = [];

      try {
        // Create some large buffers to simulate memory pressure
        for (let i = 0; i < 10; i++) {
          memoryHogs.push(new ArrayBuffer(1024 * 1024)); // 1MB each
        }

        const testBuffer = EdgeCaseImages.tiny.webp;
        const result = await compressor.convert(testBuffer, 'png');

        expect(result).toBeInstanceOf(ArrayBuffer);
      } finally {
        // Clean up
        memoryHogs.length = 0;
      }
    });

    it('should handle garbage collection during operations', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const result = await compressor.convert(testBuffer, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Error Message Quality', () => {
    it('should provide descriptive error messages for validation errors', async () => {
      try {
        await compressor.decode(InvalidImages.empty);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as Error).message).toMatch(/empty|invalid|buffer/i);
      }
    });

    it('should provide helpful error messages for unsupported formats', async () => {
      codecManager.clear(); // Remove all codecs

      try {
        await compressor.convert(EdgeCaseImages.tiny.webp, 'png');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedFormatError);
        expect((error as Error).message).toMatch(/unsupported|format/i);
      }
    });

    it('should provide context in error messages', async () => {
      const failingProcessor = MockFactory.createMockProcessor('resize', true);
      processorRegistry.register(failingProcessor);

      try {
        await compressor.process(EdgeCaseImages.tiny.webp, [
          { type: 'resize', options: { width: 100, height: 100 } },
        ]);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ProcessingError);
        expect((error as Error).message).toMatch(/resize|processing/i);
      }
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle minimum valid quality values', async () => {
      const testImageData = EdgeCaseImages.tiny.imageData;

      const result = await compressor.encode(testImageData, 'webp', {
        quality: 0,
      });
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle maximum valid quality values', async () => {
      const testImageData = EdgeCaseImages.tiny.imageData;

      const result = await compressor.encode(testImageData, 'webp', {
        quality: 100,
      });
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle minimum valid resize dimensions', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      const result = await compressor.process(testBuffer, [
        { type: 'resize', options: { width: 1, height: 1 } },
      ]);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle maximum valid quantization colors', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      const result = await compressor.process(testBuffer, [
        { type: 'quantize', options: { maxColors: 256 } },
      ]);

      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle minimum valid quantization colors', async () => {
      const testBuffer = EdgeCaseImages.tiny.webp;

      const result = await compressor.process(testBuffer, [
        { type: 'quantize', options: { maxColors: 2 } },
      ]);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state after errors', async () => {
      // Cause an error
      try {
        await compressor.decode(InvalidImages.empty);
      } catch {
        // Expected error
      }

      // Should still work normally after error
      const testBuffer = EdgeCaseImages.tiny.webp;
      const result = await compressor.convert(testBuffer, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle partial pipeline failures gracefully', async () => {
      // Register a failing processor
      const failingProcessor = MockFactory.createMockProcessor('rotate', true);
      processorRegistry.register(failingProcessor);

      const testBuffer = EdgeCaseImages.tiny.webp;

      // This should fail at the rotate step
      await expect(
        compressor
          .pipeline()
          .input(testBuffer)
          .decode()
          .resize({ width: 50, height: 50 })
          .rotate(90)
          .encode('png')
          .execute(),
      ).rejects.toThrow();

      // But the compressor should still work for other operations
      const result = await compressor.convert(testBuffer, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });
});
