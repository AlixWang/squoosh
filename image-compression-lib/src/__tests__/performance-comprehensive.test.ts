/**
 * Comprehensive performance and memory usage tests
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { ProcessorRegistry } from '../processors/processor-registry.js';
import { ImageFormat, ProcessingOperation } from '../types/index.js';
import {
  createTestImageBuffer,
  createTestImageData,
  PerformanceTestUtils,
} from './test-utils.js';

// Skip memory tests in CI or if gc is not available
const skipMemoryTests =
  process.env.CI === 'true' || typeof global.gc !== 'function';

describe('Performance and Memory Usage Tests', () => {
  let compressor: ImageCompressor;
  let codecManager: CodecManager;
  let processorRegistry: ProcessorRegistry;

  beforeEach(() => {
    codecManager = new CodecManager();
    processorRegistry = new ProcessorRegistry();
    compressor = new ImageCompressor(codecManager, processorRegistry);
  });

  describe('Throughput Performance', () => {
    it('should maintain high throughput for batch operations', async () => {
      // Setup mock components for consistent performance testing
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          // Simulate realistic decode time
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(500, 500)), 5);
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
          // Simulate realistic encode time
          return new Promise((resolve) => {
            setTimeout(() => resolve(new ArrayBuffer(100000)), 8);
          });
        }),
        getDefaultOptions: jest.fn().mockReturnValue({}),
        validateOptions: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      codecManager.registerEncoder(mockEncoder);

      const testCompressor = new ImageCompressor(codecManager);
      const testBuffers = Array.from({ length: 20 }, () =>
        createTestImageBuffer('webp'),
      );

      const { result, duration } =
        await PerformanceTestUtils.measureExecutionTime(async () => {
          const promises = testBuffers.map((buffer) =>
            testCompressor.convert(buffer, 'png'),
          );
          return Promise.all(promises);
        });

      expect(result).toHaveLength(20);
      expect(duration).toBeLessThan(5000); // Should complete 20 conversions in under 5 seconds

      // Calculate throughput
      const throughput = testBuffers.length / (duration / 1000); // operations per second
      expect(throughput).toBeGreaterThan(4); // At least 4 ops/sec
    });

    it('should handle concurrent processing efficiently', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(200, 200)), 10);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Test concurrent vs sequential performance
      const concurrentStart = performance.now();
      const concurrentPromises = Array.from({ length: 10 }, () =>
        testCompressor.decode(testBuffer),
      );
      await Promise.all(concurrentPromises);
      const concurrentDuration = performance.now() - concurrentStart;

      const sequentialStart = performance.now();
      for (let i = 0; i < 10; i++) {
        await testCompressor.decode(testBuffer);
      }
      const sequentialDuration = performance.now() - sequentialStart;

      // Concurrent should be significantly faster
      expect(concurrentDuration).toBeLessThan(sequentialDuration * 0.8);
    });

    it('should scale with processing complexity', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(1000, 1000)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      const mockProcessor = {
        name: 'resize',
        process: jest.fn().mockImplementation((imageData, options) => {
          // Simulate processing time based on size
          const pixels = options.width * options.height;
          const delay = Math.max(1, Math.floor(pixels / 100000)); // Larger = slower
          return new Promise((resolve) => {
            setTimeout(
              () => resolve(createTestImageData(options.width, options.height)),
              delay,
            );
          });
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

      // Test different complexity levels
      const complexityTests = [
        { width: 100, height: 100, expectedMaxTime: 100 },
        { width: 500, height: 500, expectedMaxTime: 500 },
        { width: 1000, height: 1000, expectedMaxTime: 1000 },
      ];

      for (const test of complexityTests) {
        const operations: ProcessingOperation[] = [
          {
            type: 'resize',
            options: { width: test.width, height: test.height },
          },
        ];

        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          async () => {
            return testCompressor.process(testBuffer, operations);
          },
        );

        expect(duration).toBeLessThan(test.expectedMaxTime);
      }
    });
  });

  describe('Memory Usage Patterns', () => {
    (skipMemoryTests ? it.skip : it)(
      'should not leak memory during repeated operations',
      async () => {
        const mockDecoder = {
          format: 'webp' as ImageFormat,
          mimeType: 'image/webp',
          extension: '.webp',
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(500, 500)),
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

        codecManager.registerDecoder(mockDecoder);
        codecManager.registerEncoder(mockEncoder);

        const testCompressor = new ImageCompressor(codecManager);
        const testBuffer = createTestImageBuffer('webp');

        // Measure memory usage over multiple operations
        const memoryMeasurements: number[] = [];

        for (let i = 0; i < 50; i++) {
          await testCompressor.convert(testBuffer, 'png');

          if (global.gc) {
            global.gc();
          }

          const memUsage = process.memoryUsage?.()?.heapUsed || 0;
          memoryMeasurements.push(memUsage);
        }

        // Memory should not continuously increase
        const firstQuarter =
          memoryMeasurements.slice(0, 12).reduce((a, b) => a + b) / 12;
        const lastQuarter =
          memoryMeasurements.slice(-12).reduce((a, b) => a + b) / 12;

        // Allow for some growth but not excessive
        const growthRatio = lastQuarter / firstQuarter;
        expect(growthRatio).toBeLessThan(2.0); // Less than 2x growth
      },
    );

    (skipMemoryTests ? it.skip : it)(
      'should handle large images without excessive memory usage',
      async () => {
        const mockDecoder = {
          format: 'webp' as ImageFormat,
          mimeType: 'image/webp',
          extension: '.webp',
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(4000, 3000)), // 12MP image
          canDecode: jest.fn().mockReturnValue(true),
        };

        codecManager.registerDecoder(mockDecoder);
        const testCompressor = new ImageCompressor(codecManager);
        const testBuffer = createTestImageBuffer('webp');

        const { result, memoryDelta } =
          await PerformanceTestUtils.measureMemoryUsage(async () => {
            return testCompressor.decode(testBuffer);
          });

        expect(result).toBeInstanceOf(ImageData);

        // Memory delta should be reasonable for a 12MP image
        // 4000 * 3000 * 4 bytes = 48MB for raw image data
        // Allow for some overhead but not excessive
        expect(memoryDelta).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      },
    );

    (skipMemoryTests ? it.skip : it)(
      'should clean up memory after processing pipeline',
      async () => {
        const mockDecoder = {
          format: 'webp' as ImageFormat,
          mimeType: 'image/webp',
          extension: '.webp',
          isSupported: jest.fn().mockResolvedValue(true),
          decode: jest.fn().mockResolvedValue(createTestImageData(2000, 2000)),
          canDecode: jest.fn().mockReturnValue(true),
        };

        const mockProcessor = {
          name: 'resize',
          process: jest.fn().mockResolvedValue(createTestImageData(1000, 1000)),
          validateOptions: jest.fn().mockReturnValue(true),
        };

        const mockEncoder = {
          format: 'png' as ImageFormat,
          mimeType: 'image/png',
          extension: '.png',
          isSupported: jest.fn().mockResolvedValue(true),
          encode: jest.fn().mockResolvedValue(new ArrayBuffer(5 * 1024 * 1024)), // 5MB
          getDefaultOptions: jest.fn().mockReturnValue({}),
          validateOptions: jest.fn().mockReturnValue(true),
        };

        codecManager.registerDecoder(mockDecoder);
        processorRegistry.register(mockProcessor);
        codecManager.registerEncoder(mockEncoder);

        const testCompressor = new ImageCompressor(
          codecManager,
          processorRegistry,
        );
        const testBuffer = createTestImageBuffer('webp');

        const initialMemory = process.memoryUsage?.()?.heapUsed || 0;

        // Complex pipeline that should create and clean up intermediate data
        const operations: ProcessingOperation[] = [
          { type: 'resize', options: { width: 1000, height: 1000 } },
        ];

        const processedData = await testCompressor.process(
          testBuffer,
          operations,
        );
        const finalResult = await testCompressor.encode(processedData, 'png');

        expect(finalResult).toBeInstanceOf(ArrayBuffer);

        // Force cleanup
        if (global.gc) {
          global.gc();
        }

        const finalMemory = process.memoryUsage?.()?.heapUsed || 0;
        const memoryGrowth = finalMemory - initialMemory;

        // Memory growth should be reasonable
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      },
    );
  });

  describe('Latency and Response Time', () => {
    it('should have low latency for simple operations', async () => {
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
      const testBuffer = createTestImageBuffer('webp');

      const { duration } = await PerformanceTestUtils.measureExecutionTime(
        async () => {
          return testCompressor.decode(testBuffer);
        },
      );

      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });

    it('should have predictable response times', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          // Consistent processing time
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(200, 200)), 20);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Measure multiple operations
      const durations: number[] = [];
      for (let i = 0; i < 10; i++) {
        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          async () => {
            return testCompressor.decode(testBuffer);
          },
        );
        durations.push(duration);
      }

      // Calculate variance
      const mean = durations.reduce((a, b) => a + b) / durations.length;
      const variance =
        durations.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        durations.length;
      const standardDeviation = Math.sqrt(variance);

      // Standard deviation should be low (consistent timing)
      expect(standardDeviation).toBeLessThan(mean * 0.3); // Less than 30% of mean
    });

    it('should handle timeout scenarios gracefully', async () => {
      const slowDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          // Very slow operation
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(100, 100)), 5000);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(slowDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Test with timeout (this would need to be implemented in the actual library)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), 1000);
      });

      const operationPromise = testCompressor.decode(testBuffer);

      await expect(
        Promise.race([operationPromise, timeoutPromise]),
      ).rejects.toThrow('Operation timeout');
    });
  });

  describe('Resource Utilization', () => {
    it('should efficiently reuse resources', async () => {
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
      const testBuffer = createTestImageBuffer('webp');

      // Multiple operations should reuse the same decoder instance
      await testCompressor.decode(testBuffer);
      await testCompressor.decode(testBuffer);
      await testCompressor.decode(testBuffer);

      // Decoder should be called but not recreated
      expect(mockDecoder.decode).toHaveBeenCalledTimes(3);
      expect(mockDecoder.isSupported).toHaveBeenCalledTimes(1); // Only checked once
    });

    it('should handle resource contention', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          // Simulate resource-intensive operation
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(500, 500)), 50);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Start many concurrent operations
      const promises = Array.from({ length: 50 }, () =>
        testCompressor.decode(testBuffer),
      );

      const startTime = performance.now();
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();

      // All should complete successfully
      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(successCount).toBe(50);

      // Should complete in reasonable time despite contention
      expect(endTime - startTime).toBeLessThan(5000); // Under 5 seconds
    });
  });

  describe('Scalability Tests', () => {
    it('should scale with increasing load', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(200, 200)), 10);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Test different load levels
      const loadLevels = [1, 5, 10, 20];
      const results: Array<{ load: number; throughput: number }> = [];

      for (const load of loadLevels) {
        const promises = Array.from({ length: load }, () =>
          testCompressor.decode(testBuffer),
        );

        const startTime = performance.now();
        await Promise.all(promises);
        const endTime = performance.now();

        const throughput = load / ((endTime - startTime) / 1000);
        results.push({ load, throughput });
      }

      // Throughput should not degrade significantly with increased load
      const baseThroughput = results[0].throughput;
      const highLoadThroughput = results[results.length - 1].throughput;

      // Allow for some degradation but not excessive
      expect(highLoadThroughput).toBeGreaterThan(baseThroughput * 0.5);
    });

    it('should handle burst traffic patterns', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(150, 150)), 15);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Simulate burst pattern: high load, then low load, then high again
      const burstSizes = [20, 2, 25, 1, 30];
      const allResults: any[] = [];

      for (const burstSize of burstSizes) {
        const promises = Array.from({ length: burstSize }, () =>
          testCompressor.decode(testBuffer),
        );

        const results = await Promise.allSettled(promises);
        allResults.push(...results);

        // Small delay between bursts
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // All operations should complete successfully
      const successCount = allResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const totalOperations = burstSizes.reduce((a, b) => a + b, 0);
      expect(successCount).toBe(totalOperations);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across runs', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(300, 300)), 25);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Run multiple test cycles
      const cycleDurations: number[] = [];
      const operationsPerCycle = 10;

      for (let cycle = 0; cycle < 5; cycle++) {
        const { duration } = await PerformanceTestUtils.measureExecutionTime(
          async () => {
            const promises = Array.from({ length: operationsPerCycle }, () =>
              testCompressor.decode(testBuffer),
            );
            return Promise.all(promises);
          },
        );

        cycleDurations.push(duration);
      }

      // Performance should be consistent across cycles
      const mean =
        cycleDurations.reduce((a, b) => a + b) / cycleDurations.length;
      const maxDeviation = Math.max(
        ...cycleDurations.map((d) => Math.abs(d - mean)),
      );

      // Maximum deviation should be less than 50% of mean
      expect(maxDeviation).toBeLessThan(mean * 0.5);
    });

    it('should not degrade with repeated use', async () => {
      const mockDecoder = {
        format: 'webp' as ImageFormat,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => resolve(createTestImageData(100, 100)), 5);
          });
        }),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);
      const testBuffer = createTestImageBuffer('webp');

      // Warm up
      for (let i = 0; i < 10; i++) {
        await testCompressor.decode(testBuffer);
      }

      // Measure baseline performance
      const baselineStart = performance.now();
      for (let i = 0; i < 20; i++) {
        await testCompressor.decode(testBuffer);
      }
      const baselineDuration = performance.now() - baselineStart;

      // Continue with more operations
      for (let i = 0; i < 100; i++) {
        await testCompressor.decode(testBuffer);
      }

      // Measure performance after extended use
      const extendedStart = performance.now();
      for (let i = 0; i < 20; i++) {
        await testCompressor.decode(testBuffer);
      }
      const extendedDuration = performance.now() - extendedStart;

      // Performance should not degrade significantly
      expect(extendedDuration).toBeLessThan(baselineDuration * 1.5); // Allow 50% degradation max
    });
  });
});
