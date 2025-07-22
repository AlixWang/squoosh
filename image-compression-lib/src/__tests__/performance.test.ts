/**
 * Performance and memory tests for the image compression library
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import { PerformanceTestData } from './test-data.js';
import { PerformanceTestUtils, MockFactory } from './test-utils.js';
import { ImageFormat } from '../types/index.js';

// Increase timeout for performance tests
jest.setTimeout(30000);

describe('Performance Tests', () => {
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

  describe('Single Image Processing Performance', () => {
    it('should process small images quickly', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      if (!testBuffer) throw new Error('Test buffer not available');

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.convert(testBuffer, 'png');
        });

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should process medium images within reasonable time', async () => {
      const testBuffer = PerformanceTestData.mediumBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      if (!testBuffer) throw new Error('Test buffer not available');

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.convert(testBuffer, 'avif', { quality: 80 });
        });

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should process large images within acceptable time', async () => {
      const testBuffer = PerformanceTestData.largeBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      if (!testBuffer) throw new Error('Test buffer not available');

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.convert(testBuffer, 'webp', { quality: 75 });
        });

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Batch Processing Performance', () => {
    it('should handle small batch processing efficiently', async () => {
      const testBuffers = PerformanceTestData.smallBatch;

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return Promise.all(
            testBuffers.map((buffer) => compressor.convert(buffer, 'png')),
          );
        });

      expect(result).toHaveLength(testBuffers.length);
      result.forEach((buffer) => expect(buffer).toBeInstanceOf(ArrayBuffer));
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle medium batch processing', async () => {
      const testBuffers = PerformanceTestData.mediumBatch;

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return Promise.all(
            testBuffers.map((buffer) =>
              compressor.convert(buffer, 'avif', { quality: 60 }),
            ),
          );
        });

      expect(result).toHaveLength(testBuffers.length);
      result.forEach((buffer) => expect(buffer).toBeInstanceOf(ArrayBuffer));
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should handle concurrent processing of different formats', async () => {
      const testBuffers = PerformanceTestData.concurrent.mixedFormats;
      const targetFormats: ImageFormat[] = ['webp', 'png', 'avif', 'jpeg'];

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return Promise.all(
            testBuffers.map((buffer, index) => {
              const format = targetFormats[index];
              if (!format)
                throw new Error(
                  `Target format not available for index ${index}`,
                );
              return compressor.convert(buffer, format, { quality: 70 });
            }),
          );
        });

      expect(result).toHaveLength(testBuffers.length);
      result.forEach((buffer) => expect(buffer).toBeInstanceOf(ArrayBuffer));
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
    });
  });

  describe('Memory Usage Tests', () => {
    // Skip memory tests in environments where process.memoryUsage is not available
    const skipMemoryTests = !process.memoryUsage;

    (skipMemoryTests ? it.skip : it)(
      'should not leak memory during single conversion',
      async () => {
        const testBuffer = PerformanceTestData.mediumBatch[0];
        if (!testBuffer) throw new Error('Test buffer not available');
        if (!testBuffer) throw new Error('Test buffer not available');

        const { result, memoryDelta } =
          await PerformanceTestUtils.measureMemoryUsage(async () => {
            return compressor.convert(testBuffer, 'png');
          });

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Memory delta should be reasonable (less than 50MB)
        expect(Math.abs(memoryDelta)).toBeLessThan(50 * 1024 * 1024);
      },
    );

    (skipMemoryTests ? it.skip : it)(
      'should handle memory efficiently during batch processing',
      async () => {
        const testBuffers = PerformanceTestData.smallBatch;

        const { result, memoryDelta } =
          await PerformanceTestUtils.measureMemoryUsage(async () => {
            const results = [];
            for (const buffer of testBuffers) {
              results.push(
                await compressor.convert(buffer, 'webp', { quality: 80 }),
              );
            }
            return results;
          });

        expect(result).toHaveLength(testBuffers.length);
        // Memory should not grow excessively during batch processing
        expect(Math.abs(memoryDelta)).toBeLessThan(100 * 1024 * 1024);
      },
    );

    (skipMemoryTests ? it.skip : it)(
      'should handle large images without excessive memory usage',
      async () => {
        const largeBuffer = PerformanceTestData.memoryStress.veryLarge;

        const { result, memoryDelta } =
          await PerformanceTestUtils.measureMemoryUsage(async () => {
            return compressor.convert(largeBuffer, 'webp', { quality: 60 });
          });

        expect(result).toBeInstanceOf(ArrayBuffer);
        // Memory usage should be proportional to image size but not excessive
        expect(Math.abs(memoryDelta)).toBeLessThan(200 * 1024 * 1024);
      },
    );
  });

  describe('Processing Pipeline Performance', () => {
    it('should handle complex pipelines efficiently', async () => {
      const testBuffer = PerformanceTestData.mediumBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      if (!testBuffer) throw new Error('Test buffer not available');

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor
            .pipeline()
            .input(testBuffer)
            .decode()
            .resize({ width: 300, height: 300 })
            .rotate(90)
            .quantize({ maxColors: 128 })
            .encode('avif', { quality: 75 })
            .execute();
        });

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle multiple pipeline operations', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      if (!testBuffer) throw new Error('Test buffer not available');

      const operations = [
        { type: 'resize' as const, options: { width: 200, height: 200 } },
        { type: 'rotate' as const, options: { angle: 180 } },
        { type: 'quantize' as const, options: { maxColors: 64 } },
      ];

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.process(testBuffer, operations);
        });

      expect(result).toBeInstanceOf(ImageData);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Resource Reuse and Caching', () => {
    it('should reuse codecs efficiently', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');

      // First conversion (cold start)
      const { duration: firstDuration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.convert(testBuffer, 'webp', { quality: 80 });
        });

      // Second conversion (should be faster due to caching)
      const { duration: secondDuration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return compressor.convert(testBuffer, 'webp', { quality: 80 });
        });

      // Second conversion should be at least as fast as the first
      expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.5);
    });

    it('should handle repeated operations efficiently', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      const iterations = 5;

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          const results = [];
          for (let i = 0; i < iterations; i++) {
            results.push(await compressor.convert(testBuffer, 'png'));
          }
          return results;
        });

      expect(result).toHaveLength(iterations);
      // Average time per operation should be reasonable
      const averageTime = duration / iterations;
      expect(averageTime).toBeLessThan(1000);
    });
  });

  describe('Stress Tests', () => {
    it('should handle rapid successive operations', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      const rapidOperations = 20;

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          const promises = [];
          for (let i = 0; i < rapidOperations; i++) {
            promises.push(
              compressor.convert(testBuffer, 'webp', { quality: 70 }),
            );
          }
          return Promise.all(promises);
        });

      expect(result).toHaveLength(rapidOperations);
      result.forEach((buffer) => expect(buffer).toBeInstanceOf(ArrayBuffer));
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle mixed operation types concurrently', async () => {
      const testBuffer = PerformanceTestData.mediumBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          return Promise.all([
            compressor.convert(testBuffer, 'webp', { quality: 80 }),
            compressor.convert(testBuffer, 'png'),
            compressor.convert(testBuffer, 'avif', { quality: 60 }),
            compressor.process(testBuffer, [
              { type: 'resize', options: { width: 150, height: 150 } },
            ]),
            compressor.decode(testBuffer),
          ]);
        });

      expect(result).toHaveLength(5);
      expect(duration).toBeLessThan(8000); // Should complete within 8 seconds
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across multiple runs', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      const runs = 3;
      const durations: number[] = [];

      for (let i = 0; i < runs; i++) {
        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          async () => {
            return compressor.convert(testBuffer, 'webp', { quality: 75 });
          },
        );
        durations.push(duration);
      }

      // Calculate coefficient of variation (standard deviation / mean)
      const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const variance =
        durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) /
        durations.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / mean;

      // Performance should be consistent (CV < 0.5)
      expect(coefficientOfVariation).toBeLessThan(0.5);
    });

    it('should not degrade with repeated use', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      const warmupRuns = 5;
      const testRuns = 10;

      // Warmup
      for (let i = 0; i < warmupRuns; i++) {
        await compressor.convert(testBuffer, 'png');
      }

      // Measure performance over multiple runs
      const durations: number[] = [];
      for (let i = 0; i < testRuns; i++) {
        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          async () => {
            return compressor.convert(testBuffer, 'png');
          },
        );
        durations.push(duration);
      }

      // Later runs should not be significantly slower than earlier ones
      const firstHalf = durations.slice(0, Math.floor(testRuns / 2));
      const secondHalf = durations.slice(Math.floor(testRuns / 2));

      const firstHalfAvg =
        firstHalf.reduce((sum, d) => sum + d, 0) / firstHalf.length;
      const secondHalfAvg =
        secondHalf.reduce((sum, d) => sum + d, 0) / secondHalf.length;

      // Second half should not be more than 50% slower than first half
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5);
    });
  });
});

describe('Benchmark Tests', () => {
  let compressor: ImageCompressor;

  beforeEach(() => {
    compressor = new ImageCompressor();

    // Register minimal mock codecs for benchmarking
    const codecManager = new CodecManager();
    codecManager.registerEncoder(MockFactory.createMockEncoder('webp'));
    codecManager.registerDecoder(MockFactory.createMockDecoder('webp'));

    (compressor as any).codecManager = codecManager;
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve reasonable throughput for small images', async () => {
      const testBuffers = PerformanceTestData.smallBatch;
      const startTime = Date.now();

      const results = await Promise.all(
        testBuffers.map((buffer) =>
          compressor.convert(buffer, 'webp', { quality: 80 }),
        ),
      );

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (testBuffers.length / duration) * 1000; // images per second

      expect(results).toHaveLength(testBuffers.length);
      expect(throughput).toBeGreaterThan(1); // At least 1 image per second
    });

    it('should maintain throughput under concurrent load', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');
      const concurrentRequests = 10;

      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        compressor.convert(testBuffer, 'webp', { quality: 70 }),
      );

      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (concurrentRequests / duration) * 1000;

      expect(results).toHaveLength(concurrentRequests);
      expect(throughput).toBeGreaterThan(0.5); // At least 0.5 images per second under load
    });
  });

  describe('Latency Benchmarks', () => {
    it('should have low latency for simple operations', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');

      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          return compressor.decode(testBuffer);
        },
      );

      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });

    it('should have acceptable latency for complex pipelines', async () => {
      const testBuffer = PerformanceTestData.smallBatch[0];
      if (!testBuffer) throw new Error('Test buffer not available');

      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          return compressor
            .pipeline()
            .input(testBuffer)
            .decode()
            .resize({ width: 100, height: 100 })
            .encode('webp', { quality: 80 })
            .execute();
        },
      );

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
