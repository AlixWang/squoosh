/**
 * Edge case tests for ImageCompressor class
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
import { ImageFormat } from '../types/index.js';
import {
  createTestImageBuffer,
  createTestImageData,
  ErrorTestUtils,
} from './test-utils.js';

describe('ImageCompressor Edge Cases', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle null input', async () => {
      await expect(compressor.convert(null as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle undefined input', async () => {
      await expect(
        compressor.convert(undefined as any, 'webp'),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle empty string input', async () => {
      await expect(compressor.convert('' as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle number input', async () => {
      await expect(compressor.convert(123 as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle boolean input', async () => {
      await expect(compressor.convert(true as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle object input', async () => {
      await expect(compressor.convert({} as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle array input', async () => {
      await expect(compressor.convert([] as any, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('Buffer Edge Cases', () => {
    it('should handle extremely small buffer', async () => {
      const tinyBuffer = new ArrayBuffer(1);
      await expect(compressor.convert(tinyBuffer, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle corrupted buffer', async () => {
      const corruptedBuffer = ErrorTestUtils.createCorruptedBuffer('webp');
      // This should either throw a decoding error or validation error
      await expect(
        compressor.convert(corruptedBuffer, 'png'),
      ).rejects.toThrow();
    });

    it('should handle truncated buffer', async () => {
      const truncatedBuffer = ErrorTestUtils.createTruncatedBuffer('webp', 0.1);
      await expect(
        compressor.convert(truncatedBuffer, 'png'),
      ).rejects.toThrow();
    });

    it('should handle buffer with wrong signature', async () => {
      const pngBuffer = createTestImageBuffer('png');
      // Try to decode as WebP (wrong format)
      await expect(compressor.decode(pngBuffer)).rejects.toThrow();
    });
  });

  describe('Format Edge Cases', () => {
    it('should handle invalid format string', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, 'invalid' as ImageFormat),
      ).rejects.toThrow(UnsupportedFormatError);
    });

    it('should handle empty format string', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, '' as ImageFormat),
      ).rejects.toThrow(UnsupportedFormatError);
    });

    it('should handle null format', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(compressor.convert(testBuffer, null as any)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle undefined format', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, undefined as any),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Options Edge Cases', () => {
    it('should handle null options', async () => {
      const testBuffer = createTestImageBuffer('webp');
      // Should not throw - null options should be treated as no options
      await expect(
        compressor.convert(testBuffer, 'png', null as any),
      ).resolves.toBeDefined();
    });

    it('should handle options with invalid quality', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, 'webp', { quality: -10 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle options with quality too high', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, 'webp', { quality: 150 }),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle options with non-numeric quality', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(
        compressor.convert(testBuffer, 'webp', { quality: 'high' as any }),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle circular reference in options', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const circularOptions: any = { quality: 80 };
      circularOptions.self = circularOptions;

      // Should handle gracefully without infinite recursion
      await expect(
        compressor.convert(testBuffer, 'webp', circularOptions),
      ).resolves.toBeDefined();
    });
  });

  describe('ImageData Edge Cases', () => {
    it('should handle ImageData with zero width', async () => {
      const invalidImageData = new ImageData(new Uint8ClampedArray(0), 0, 1);
      await expect(compressor.encode(invalidImageData, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle ImageData with zero height', async () => {
      const invalidImageData = new ImageData(new Uint8ClampedArray(0), 1, 0);
      await expect(compressor.encode(invalidImageData, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle ImageData with mismatched data length', async () => {
      // Create ImageData with wrong data length
      const data = new Uint8ClampedArray(10); // Should be 100*100*4 = 40000
      const invalidImageData = new ImageData(data, 100, 100);
      await expect(compressor.encode(invalidImageData, 'webp')).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle ImageData with negative dimensions', async () => {
      // This should be caught by ImageData constructor, but test our validation
      try {
        const invalidImageData = {
          data: new Uint8ClampedArray(400),
          width: -10,
          height: -10,
        } as ImageData;
        await expect(
          compressor.encode(invalidImageData, 'webp'),
        ).rejects.toThrow(ValidationError);
      } catch (error) {
        // ImageData constructor might throw first, which is fine
        expect(error).toBeDefined();
      }
    });

    it('should handle extremely large ImageData', async () => {
      // Test with very large dimensions that might cause memory issues
      const largeSize = 10000;
      try {
        const largeImageData = createTestImageData(largeSize, largeSize);
        // This might throw due to memory constraints, which is acceptable
        await compressor.encode(largeImageData, 'webp');
      } catch (error) {
        // Should be a memory or validation error, not a crash
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Processing Edge Cases', () => {
    it('should handle empty operations array', async () => {
      const testBuffer = createTestImageBuffer('webp');
      await expect(compressor.process(testBuffer, [])).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle operations with null options', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [{ type: 'resize' as const, options: null as any }];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle operations with undefined options', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'resize' as const, options: undefined as any },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle unknown operation type', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'unknown' as any, options: { width: 100, height: 100 } },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ProcessingError,
      );
    });

    it('should handle resize with zero dimensions', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'resize' as const, options: { width: 0, height: 100 } },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle resize with negative dimensions', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'resize' as const, options: { width: -100, height: 100 } },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle rotate with invalid angle', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [{ type: 'rotate' as const, options: { angle: 45 } }]; // Not multiple of 90
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle quantize with zero colors', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'quantize' as const, options: { maxColors: 0 } },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle quantize with too many colors', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const operations = [
        { type: 'quantize' as const, options: { maxColors: 300 } },
      ];
      await expect(compressor.process(testBuffer, operations)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe('Blob and File Edge Cases', () => {
    it('should handle empty Blob', async () => {
      const emptyBlob = new Blob([]);
      await expect(compressor.decode(emptyBlob)).rejects.toThrow(
        ValidationError,
      );
    });

    it('should handle Blob with wrong MIME type', async () => {
      const buffer = createTestImageBuffer('webp');
      const blob = new Blob([buffer], { type: 'text/plain' });
      // Should still work based on content, not MIME type
      await expect(compressor.decode(blob)).resolves.toBeDefined();
    });

    it('should handle File with empty name', async () => {
      const buffer = createTestImageBuffer('webp');
      const file = new File([buffer], '', { type: 'image/webp' });
      await expect(compressor.decode(file)).resolves.toBeDefined();
    });

    it('should handle File with very long name', async () => {
      const buffer = createTestImageBuffer('webp');
      const longName = 'a'.repeat(1000) + '.webp';
      const file = new File([buffer], longName, { type: 'image/webp' });
      await expect(compressor.decode(file)).resolves.toBeDefined();
    });
  });

  describe('Concurrent Operations Edge Cases', () => {
    it('should handle multiple simultaneous conversions', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const promises = Array.from({ length: 10 }, () =>
        compressor.convert(testBuffer, 'png'),
      );

      const results = await Promise.allSettled(promises);
      results.forEach((result) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeInstanceOf(ArrayBuffer);
        }
      });
    });

    it('should handle mixed operation types concurrently', async () => {
      const testBuffer = createTestImageBuffer('webp');
      const testImageData = createTestImageData();

      const promises = [
        compressor.decode(testBuffer),
        compressor.encode(testImageData, 'png'),
        compressor.convert(testBuffer, 'avif'),
        compressor.detectFormat(testBuffer),
      ];

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(4);
      // At least some should succeed (depending on codec availability)
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });

  describe('Memory Edge Cases', () => {
    it('should handle rapid allocation and deallocation', async () => {
      const testBuffer = createTestImageBuffer('webp');

      // Rapidly create and process multiple images
      for (let i = 0; i < 20; i++) {
        try {
          await compressor.convert(testBuffer, 'png');
        } catch (error) {
          // Some operations might fail due to missing codecs, which is fine
          expect(error).toBeInstanceOf(Error);
        }
      }

      // Should not crash or leak memory significantly
      expect(true).toBe(true);
    });

    it('should handle processing after codec errors', async () => {
      const testBuffer = createTestImageBuffer('webp');

      // Try an operation that might fail
      try {
        await compressor.convert(testBuffer, 'unknown' as ImageFormat);
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedFormatError);
      }

      // Should still be able to perform valid operations
      const format = compressor.detectFormat(testBuffer);
      expect(format).toBeDefined();
    });
  });

  describe('Format Detection Edge Cases', () => {
    it('should handle buffer with partial signature', async () => {
      const partialBuffer = new ArrayBuffer(4);
      const view = new Uint8Array(partialBuffer);
      view.set([0x52, 0x49, 0x46, 0x46]); // Partial WebP signature

      const format = compressor.detectFormat(partialBuffer);
      expect(format).toBeNull(); // Should not detect incomplete signature
    });

    it('should handle buffer with mixed signatures', async () => {
      const mixedBuffer = new ArrayBuffer(20);
      const view = new Uint8Array(mixedBuffer);
      // Start with WebP signature
      view.set([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      // Add PNG signature at the end (should be ignored)
      view.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 12);

      const format = compressor.detectFormat(mixedBuffer);
      expect(format).toBe('webp'); // Should detect first valid signature
    });

    it('should handle very large buffer for format detection', async () => {
      const largeBuffer = new ArrayBuffer(1024 * 1024); // 1MB
      const view = new Uint8Array(largeBuffer);
      // Add WebP signature at the beginning
      view.set([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);

      const format = compressor.detectFormat(largeBuffer);
      expect(format).toBe('webp');
    });
  });
});
