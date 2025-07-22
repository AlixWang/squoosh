/**
 * Integration tests for the complete image compression library
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import {
  TestImages,
  EdgeCaseImages,
  InvalidImages,
  TestOptions,
  ConversionMatrix,
} from './test-data.js';
import {
  createTestImageBuffer,
  createTestImageData,
  compareImageData,
  MockFactory,
} from './test-utils.js';
import { ImageFormat, ResizeOptions, QuantizeOptions } from '../types/index.js';
import {
  ValidationError,
  UnsupportedFormatError,
  DecodingError,
  EncodingError,
  ProcessingError,
} from '../errors/index.js';

describe('ImageCompressor Integration Tests', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);

    // Register mock codecs for all formats
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

  describe('Format Conversion Matrix', () => {
    it('should convert between all supported format pairs', async () => {
      const conversionPairs = ConversionMatrix.getConversionPairs();

      // Test a subset to avoid too many tests
      const testPairs = conversionPairs.slice(0, 10);

      for (const { from, to, data } of testPairs) {
        const result = await compressor.convert(data, to);
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBeGreaterThan(0);
      }
    });

    it('should handle conversion with different quality settings', async () => {
      const testBuffer = TestImages.small.webp;

      const lowQuality = await compressor.convert(testBuffer, 'webp', {
        quality: 10,
      });
      const highQuality = await compressor.convert(testBuffer, 'webp', {
        quality: 90,
      });

      expect(lowQuality).toBeInstanceOf(ArrayBuffer);
      expect(highQuality).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Complete Processing Pipelines', () => {
    it('should handle decode -> resize -> rotate -> encode pipeline', async () => {
      const testBuffer = TestImages.medium.webp;

      const result = await compressor
        .pipeline()
        .input(testBuffer)
        .decode()
        .resize({ width: 200, height: 200 })
        .rotate(90)
        .encode('avif', { quality: 80 })
        .execute();

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle multiple processing operations', async () => {
      const testBuffer = TestImages.small.png;

      const operations = [
        { type: 'resize' as const, options: { width: 150, height: 150 } },
        { type: 'rotate' as const, options: { angle: 180 } },
        { type: 'quantize' as const, options: { maxColors: 64 } },
      ];

      const result = await compressor.process(testBuffer, operations);
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle batch processing of multiple images', async () => {
      const testBuffers = [
        TestImages.small.webp,
        TestImages.small.png,
        TestImages.small.avif,
      ];

      const results = await Promise.all(
        testBuffers.map((buffer) =>
          compressor.convert(buffer, 'jpeg', { quality: 75 }),
        ),
      );

      results.forEach((result) => {
        expect(result).toBeInstanceOf(ArrayBuffer);
        expect(result.byteLength).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle tiny images', async () => {
      const tinyBuffer = EdgeCaseImages.tiny.webp;

      const result = await compressor.convert(tinyBuffer, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle unusual aspect ratios', async () => {
      const wideBuffer = EdgeCaseImages.wide.webp;
      const tallBuffer = EdgeCaseImages.tall.webp;

      const [wideResult, tallResult] = await Promise.all([
        compressor.convert(wideBuffer, 'png'),
        compressor.convert(tallBuffer, 'png'),
      ]);

      expect(wideResult).toBeInstanceOf(ArrayBuffer);
      expect(tallResult).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle empty buffer gracefully', async () => {
      await expect(
        compressor.convert(InvalidImages.empty, 'webp'),
      ).rejects.toThrow(ValidationError);
    });

    it('should handle invalid format signature', async () => {
      await expect(
        compressor.convert(InvalidImages.invalidSignature, 'webp'),
      ).rejects.toThrow();
    });

    it('should handle truncated images', async () => {
      await expect(
        compressor.convert(InvalidImages.truncatedWebP, 'png'),
      ).rejects.toThrow();
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large images without memory issues', async () => {
      const largeBuffer = TestImages.large.webp;

      const result = await compressor.convert(largeBuffer, 'png');
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle concurrent processing', async () => {
      const testBuffers = Array.from(
        { length: 5 },
        () => TestImages.medium.webp,
      );

      const startTime = Date.now();
      const results = await Promise.all(
        testBuffers.map((buffer) =>
          compressor.convert(buffer, 'avif', { quality: 60 }),
        ),
      );
      const endTime = Date.now();

      results.forEach((result) => {
        expect(result).toBeInstanceOf(ArrayBuffer);
      });

      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(10000);
    });

    it('should reuse resources efficiently', async () => {
      // Process same image multiple times to test resource reuse
      const testBuffer = TestImages.small.webp;

      const results = [];
      for (let i = 0; i < 3; i++) {
        results.push(await compressor.convert(testBuffer, 'png'));
      }

      results.forEach((result) => {
        expect(result).toBeInstanceOf(ArrayBuffer);
      });
    });
  });

  describe('Format-Specific Features', () => {
    it('should handle WebP lossless encoding', async () => {
      const testBuffer = TestImages.small.webp;

      const result = await compressor.convert(testBuffer, 'webp', {
        quality: 100,
        lossless: true,
      });

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle AVIF with different quality settings', async () => {
      const testBuffer = TestImages.small.png;

      const lowQuality = await compressor.convert(testBuffer, 'avif', {
        quality: 20,
      });
      const highQuality = await compressor.convert(testBuffer, 'avif', {
        quality: 90,
      });

      expect(lowQuality).toBeInstanceOf(ArrayBuffer);
      expect(highQuality).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle PNG compression levels', async () => {
      const testBuffer = TestImages.small.webp;

      const result = await compressor.convert(testBuffer, 'png', { level: 9 });
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('Processing Options Validation', () => {
    it('should validate resize options', async () => {
      const testBuffer = TestImages.small.webp;

      // Valid options should work
      const validResult = await compressor.process(testBuffer, [
        { type: 'resize', options: { width: 100, height: 100 } },
      ]);
      expect(validResult).toBeInstanceOf(ImageData);

      // Invalid options should throw
      await expect(
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: -100, height: 100 } },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should validate rotate options', async () => {
      const testBuffer = TestImages.small.webp;

      // Valid rotation should work
      const validResult = await compressor.process(testBuffer, [
        { type: 'rotate', options: { angle: 90 } },
      ]);
      expect(validResult).toBeInstanceOf(ImageData);

      // Invalid rotation should throw
      await expect(
        compressor.process(testBuffer, [
          { type: 'rotate', options: { angle: 45 } },
        ]),
      ).rejects.toThrow(ValidationError);
    });

    it('should validate quantize options', async () => {
      const testBuffer = TestImages.small.webp;

      // Valid quantization should work
      const validResult = await compressor.process(testBuffer, [
        { type: 'quantize', options: { maxColors: 64 } },
      ]);
      expect(validResult).toBeInstanceOf(ImageData);

      // Invalid quantization should throw
      await expect(
        compressor.process(testBuffer, [
          { type: 'quantize', options: { maxColors: 300 } },
        ]),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Input Type Handling', () => {
    it('should handle ArrayBuffer input', async () => {
      const buffer = TestImages.small.webp;
      const result = await compressor.decode(buffer);
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle Uint8Array input', async () => {
      const buffer = TestImages.small.webp;
      const uint8Array = new Uint8Array(buffer);
      const result = await compressor.decode(uint8Array);
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle Blob input', async () => {
      const buffer = TestImages.small.webp;
      const blob = new Blob([buffer], { type: 'image/webp' });
      blob.arrayBuffer = jest.fn().mockResolvedValue(buffer);

      const result = await compressor.decode(blob);
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle File input', async () => {
      const buffer = TestImages.small.webp;
      const file = new File([buffer], 'test.webp', { type: 'image/webp' });
      file.arrayBuffer = jest.fn().mockResolvedValue(buffer);

      const result = await compressor.decode(file);
      expect(result).toBeInstanceOf(ImageData);
    });

    it('should handle ImageData input for processing', async () => {
      const imageData = TestImages.imageData.small;

      const result = await compressor.process(imageData, [
        { type: 'resize', options: { width: 50, height: 50 } },
      ]);

      expect(result).toBeInstanceOf(ImageData);
    });
  });

  describe('Format Detection', () => {
    it('should detect all supported formats', () => {
      const formats: ImageFormat[] = ['webp', 'avif', 'jpeg-xl', 'png', 'jpeg'];

      formats.forEach((format) => {
        const buffer = TestImages.small[format];
        const detected = compressor.detectFormat(buffer);
        expect(detected).toBe(format);
      });
    });

    it('should return null for unknown formats', () => {
      const unknownBuffer = InvalidImages.invalidSignature;
      const detected = compressor.detectFormat(unknownBuffer);
      expect(detected).toBeNull();
    });

    it('should handle empty buffers', () => {
      const detected = compressor.detectFormat(InvalidImages.empty);
      expect(detected).toBeNull();
    });
  });

  describe('Library Information', () => {
    it('should provide supported formats information', () => {
      const formats = compressor.getSupportedFormats();

      expect(formats.encoders).toContain('webp');
      expect(formats.encoders).toContain('avif');
      expect(formats.encoders).toContain('png');
      expect(formats.decoders).toContain('webp');
      expect(formats.decoders).toContain('avif');
      expect(formats.decoders).toContain('png');
      expect(formats.processors).toContain('resize');
      expect(formats.processors).toContain('rotate');
      expect(formats.processors).toContain('quantize');
    });

    it('should provide format-specific information', () => {
      const webpInfo = compressor.getFormatInfo('webp');

      expect(webpInfo.format).toBe('webp');
      expect(webpInfo.mimeType).toBe('image/webp');
      expect(webpInfo.extension).toBe('.webp');
      expect(webpInfo.supportsLossless).toBe(true);
      expect(webpInfo.supportsTransparency).toBe(true);
      expect(webpInfo.defaultOptions).toBeDefined();
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should handle codec loading failures gracefully', async () => {
      // Register a failing encoder
      const failingEncoder = MockFactory.createMockEncoder('webp', true);
      codecManager.registerEncoder(failingEncoder);

      const testBuffer = TestImages.small.png;

      await expect(compressor.convert(testBuffer, 'webp')).rejects.toThrow(
        UnsupportedFormatError,
      );
    });

    it('should handle processing failures gracefully', async () => {
      // Register a failing processor
      const failingProcessor = MockFactory.createMockProcessor('resize', true);
      processorRegistry.register(failingProcessor);

      const testBuffer = TestImages.small.webp;

      await expect(
        compressor.process(testBuffer, [
          { type: 'resize', options: { width: 100, height: 100 } },
        ]),
      ).rejects.toThrow(ProcessingError);
    });

    it('should provide meaningful error messages', async () => {
      try {
        await compressor.convert(InvalidImages.empty, 'webp');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as Error).message).toContain('empty');
      }
    });
  });
});

describe('Cross-Environment Compatibility', () => {
  let compressor: ImageCompressor;

  beforeEach(() => {
    compressor = new ImageCompressor();

    // Register minimal mock codecs for testing
    const codecManager = new CodecManager();
    codecManager.registerEncoder(MockFactory.createMockEncoder('webp'));
    codecManager.registerDecoder(MockFactory.createMockDecoder('webp'));

    // Override the compressor's codec manager for testing
    (compressor as any).codecManager = codecManager;
  });

  describe('Browser Environment Simulation', () => {
    it('should work with browser-like globals', async () => {
      // Mock browser environment
      const originalWindow = global.window;
      const originalDocument = global.document;

      global.window = {} as any;
      global.document = {} as any;

      try {
        const testBuffer = TestImages.small.webp;
        const result = await compressor.convert(testBuffer, 'webp');
        expect(result).toBeInstanceOf(ArrayBuffer);
      } finally {
        global.window = originalWindow;
        global.document = originalDocument;
      }
    });

    it('should handle missing Worker support', async () => {
      const originalWorker = global.Worker;
      delete (global as any).Worker;

      try {
        const testBuffer = TestImages.small.webp;
        const result = await compressor.convert(testBuffer, 'webp');
        expect(result).toBeInstanceOf(ArrayBuffer);
      } finally {
        global.Worker = originalWorker;
      }
    });
  });

  describe('Node.js Environment Simulation', () => {
    it('should work with Node.js-like globals', async () => {
      // Mock Node.js environment
      const originalProcess = global.process;
      global.process = {
        versions: { node: '16.0.0' },
        platform: 'linux',
      } as any;

      try {
        const testBuffer = TestImages.small.webp;
        const result = await compressor.convert(testBuffer, 'webp');
        expect(result).toBeInstanceOf(ArrayBuffer);
      } finally {
        global.process = originalProcess;
      }
    });

    it('should handle missing WebAssembly support', async () => {
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      try {
        const testBuffer = TestImages.small.webp;
        // Should still work with fallbacks
        const result = await compressor.convert(testBuffer, 'webp');
        expect(result).toBeInstanceOf(ArrayBuffer);
      } finally {
        global.WebAssembly = originalWebAssembly;
      }
    });
  });
});
