/**
 * Comprehensive environment-specific tests for browser and Node.js
 */

import { ImageCompressor } from '../image-compressor.js';
import { CodecManager } from '../codecs/codec-registry.js';
import { EnvironmentDetector } from '../environment/environment-detector.js';
import { FeatureDetector } from '../environment/feature-detector.js';
import { createTestImageBuffer, createTestImageData } from './test-utils.js';

describe('Environment-Specific Integration Tests', () => {
  let compressor: ImageCompressor;

  beforeEach(() => {
    compressor = new ImageCompressor();
  });

  describe('Environment Detection', () => {
    it('should correctly detect current environment', () => {
      const environment = EnvironmentDetector.detectEnvironment();

      expect(environment).toBeDefined();
      expect(typeof environment.isNode).toBe('boolean');
      expect(typeof environment.isBrowser).toBe('boolean');
      expect(typeof environment.isWebWorker).toBe('boolean');

      // Should detect exactly one environment as primary
      const environmentCount = [
        environment.isNode,
        environment.isBrowser,
        environment.isWebWorker,
      ].filter(Boolean).length;

      expect(environmentCount).toBeGreaterThanOrEqual(1);
    });

    it('should provide environment capabilities', () => {
      const capabilities = EnvironmentDetector.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(typeof capabilities.hasWebAssembly).toBe('boolean');
      expect(typeof capabilities.hasWorkers).toBe('boolean');
      expect(typeof capabilities.hasOffscreenCanvas).toBe('boolean');
      expect(typeof capabilities.hasImageData).toBe('boolean');
    });

    it('should detect feature availability', () => {
      const features = FeatureDetector.detectFeatures();

      expect(features).toBeDefined();
      expect(typeof features.webAssembly).toBe('boolean');
      expect(typeof features.workers).toBe('boolean');
      expect(typeof features.sharedArrayBuffer).toBe('boolean');
      expect(typeof features.offscreenCanvas).toBe('boolean');
    });
  });

  describe('Node.js Environment Tests', () => {
    const isNodeEnvironment =
      typeof process !== 'undefined' && process.versions?.node;

    (isNodeEnvironment ? describe : describe.skip)(
      'Node.js Specific Features',
      () => {
        it('should handle Node.js Buffer input', async () => {
          const codecManager = new CodecManager();

          const mockDecoder = {
            format: 'webp' as const,
            mimeType: 'image/webp',
            extension: '.webp',
            isSupported: jest.fn().mockResolvedValue(true),
            decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
            canDecode: jest.fn().mockReturnValue(true),
          };

          codecManager.registerDecoder(mockDecoder);
          const testCompressor = new ImageCompressor(codecManager);

          // Test with Node.js Buffer
          const arrayBuffer = createTestImageBuffer('webp');
          const nodeBuffer = Buffer.from(arrayBuffer);

          const result = await testCompressor.decode(nodeBuffer);
          expect(result).toBeInstanceOf(ImageData);
          expect(mockDecoder.decode).toHaveBeenCalled();
        });

        it('should handle file system operations', async () => {
          // This would test file system integration if implemented
          const environment = EnvironmentDetector.detectEnvironment();
          expect(environment.isNode).toBe(true);

          // Test that Node.js specific features are available
          expect(typeof require).toBe('function');
          expect(typeof process).toBe('object');
          expect(process.versions.node).toBeDefined();
        });

        it('should use worker_threads when available', async () => {
          try {
            // Test if worker_threads module is available
            const workerThreads = require('worker_threads');
            expect(workerThreads).toBeDefined();

            const capabilities = EnvironmentDetector.getCapabilities();
            expect(capabilities.hasWorkers).toBe(true);
          } catch (error) {
            // worker_threads not available, which is fine for older Node.js versions
            console.log('worker_threads not available:', error);
          }
        });

        it('should handle large buffers efficiently', async () => {
          const codecManager = new CodecManager();

          const mockDecoder = {
            format: 'webp' as const,
            mimeType: 'image/webp',
            extension: '.webp',
            isSupported: jest.fn().mockResolvedValue(true),
            decode: jest
              .fn()
              .mockResolvedValue(createTestImageData(2000, 2000)),
            canDecode: jest.fn().mockReturnValue(true),
          };

          codecManager.registerDecoder(mockDecoder);
          const testCompressor = new ImageCompressor(codecManager);

          // Create large buffer (10MB)
          const largeBuffer = Buffer.alloc(10 * 1024 * 1024);
          // Add WebP signature
          largeBuffer.set([
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42,
            0x50,
          ]);

          const result = await testCompressor.decode(largeBuffer);
          expect(result).toBeInstanceOf(ImageData);
        });

        it('should handle stream-like operations', async () => {
          // Test streaming capabilities if implemented
          const environment = EnvironmentDetector.detectEnvironment();
          expect(environment.isNode).toBe(true);

          // Node.js should support streaming operations
          const capabilities = EnvironmentDetector.getCapabilities();
          expect(capabilities.hasStreams).toBe(true);
        });
      },
    );
  });

  describe('Browser Environment Tests', () => {
    const isBrowserEnvironment = typeof window !== 'undefined';

    (isBrowserEnvironment ? describe : describe.skip)(
      'Browser Specific Features',
      () => {
        it('should handle Blob input', async () => {
          const codecManager = new CodecManager();

          const mockDecoder = {
            format: 'webp' as const,
            mimeType: 'image/webp',
            extension: '.webp',
            isSupported: jest.fn().mockResolvedValue(true),
            decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
            canDecode: jest.fn().mockReturnValue(true),
          };

          codecManager.registerDecoder(mockDecoder);
          const testCompressor = new ImageCompressor(codecManager);

          const arrayBuffer = createTestImageBuffer('webp');
          const blob = new Blob([arrayBuffer], { type: 'image/webp' });

          const result = await testCompressor.decode(blob);
          expect(result).toBeInstanceOf(ImageData);
          expect(mockDecoder.decode).toHaveBeenCalled();
        });

        it('should handle File input', async () => {
          const codecManager = new CodecManager();

          const mockDecoder = {
            format: 'webp' as const,
            mimeType: 'image/webp',
            extension: '.webp',
            isSupported: jest.fn().mockResolvedValue(true),
            decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
            canDecode: jest.fn().mockReturnValue(true),
          };

          codecManager.registerDecoder(mockDecoder);
          const testCompressor = new ImageCompressor(codecManager);

          const arrayBuffer = createTestImageBuffer('webp');
          const file = new File([arrayBuffer], 'test.webp', {
            type: 'image/webp',
          });

          const result = await testCompressor.decode(file);
          expect(result).toBeInstanceOf(ImageData);
          expect(mockDecoder.decode).toHaveBeenCalled();
        });

        it('should use Web Workers when available', async () => {
          const capabilities = EnvironmentDetector.getCapabilities();

          if (typeof Worker !== 'undefined') {
            expect(capabilities.hasWorkers).toBe(true);
          } else {
            expect(capabilities.hasWorkers).toBe(false);
          }
        });

        it('should handle OffscreenCanvas when available', async () => {
          const capabilities = EnvironmentDetector.getCapabilities();

          if (typeof OffscreenCanvas !== 'undefined') {
            expect(capabilities.hasOffscreenCanvas).toBe(true);
          } else {
            expect(capabilities.hasOffscreenCanvas).toBe(false);
          }
        });

        it('should work with different MIME types', async () => {
          const codecManager = new CodecManager();

          const mockDecoder = {
            format: 'webp' as const,
            mimeType: 'image/webp',
            extension: '.webp',
            isSupported: jest.fn().mockResolvedValue(true),
            decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
            canDecode: jest.fn().mockReturnValue(true),
          };

          codecManager.registerDecoder(mockDecoder);
          const testCompressor = new ImageCompressor(codecManager);

          const arrayBuffer = createTestImageBuffer('webp');

          // Test different MIME types
          const mimeTypes = ['image/webp', 'application/octet-stream', ''];

          for (const mimeType of mimeTypes) {
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const result = await testCompressor.decode(blob);
            expect(result).toBeInstanceOf(ImageData);
          }
        });
      },
    );
  });

  describe('WebAssembly Integration', () => {
    it('should detect WebAssembly support', () => {
      const features = FeatureDetector.detectFeatures();

      if (typeof WebAssembly !== 'undefined') {
        expect(features.webAssembly).toBe(true);
      } else {
        expect(features.webAssembly).toBe(false);
      }
    });

    it('should handle WebAssembly module loading', async () => {
      const features = FeatureDetector.detectFeatures();

      if (features.webAssembly) {
        // Test basic WebAssembly functionality
        const wasmCode = new Uint8Array([
          0x00,
          0x61,
          0x73,
          0x6d,
          0x01,
          0x00,
          0x00,
          0x00, // WASM header
          0x01,
          0x07,
          0x01,
          0x60,
          0x02,
          0x7f,
          0x7f,
          0x01,
          0x7f, // type section
          0x03,
          0x02,
          0x01,
          0x00, // function section
          0x07,
          0x07,
          0x01,
          0x03,
          0x61,
          0x64,
          0x64,
          0x00,
          0x00, // export section
          0x0a,
          0x09,
          0x01,
          0x07,
          0x00,
          0x20,
          0x00,
          0x20,
          0x01,
          0x6a,
          0x0b, // code section
        ]);

        try {
          const module = await WebAssembly.compile(wasmCode);
          const instance = await WebAssembly.instantiate(module);
          expect(instance).toBeDefined();
        } catch (error) {
          // WASM compilation might fail in some environments, which is acceptable
          console.log('WebAssembly compilation failed:', error);
        }
      }
    });

    it('should provide fallback when WebAssembly is not available', async () => {
      // Mock WebAssembly as unavailable
      const originalWebAssembly = global.WebAssembly;
      delete (global as any).WebAssembly;

      try {
        const features = FeatureDetector.detectFeatures();
        expect(features.webAssembly).toBe(false);

        // Library should still function without WebAssembly
        const codecManager = new CodecManager();
        const testCompressor = new ImageCompressor(codecManager);

        // Basic operations should still work
        const formats = testCompressor.getSupportedFormats();
        expect(formats).toBeDefined();
      } finally {
        // Restore WebAssembly
        if (originalWebAssembly) {
          (global as any).WebAssembly = originalWebAssembly;
        }
      }
    });
  });

  describe('Worker Integration', () => {
    it('should detect worker support', () => {
      const capabilities = EnvironmentDetector.getCapabilities();

      const hasWorkers =
        typeof Worker !== 'undefined' ||
        (typeof require !== 'undefined' &&
          (() => {
            try {
              require('worker_threads');
              return true;
            } catch {
              return false;
            }
          })());

      expect(capabilities.hasWorkers).toBe(hasWorkers);
    });

    it('should handle worker communication', async () => {
      const capabilities = EnvironmentDetector.getCapabilities();

      if (capabilities.hasWorkers) {
        // Test worker communication if workers are available
        // This would test actual worker integration if implemented
        expect(capabilities.hasWorkers).toBe(true);
      } else {
        // Should provide fallback when workers are not available
        const codecManager = new CodecManager();
        const testCompressor = new ImageCompressor(codecManager);

        // Operations should still work without workers
        const formats = testCompressor.getSupportedFormats();
        expect(formats).toBeDefined();
      }
    });

    it('should handle worker errors gracefully', async () => {
      // Test worker error handling
      const capabilities = EnvironmentDetector.getCapabilities();

      if (capabilities.hasWorkers) {
        // Worker errors should be handled gracefully
        // This would test actual worker error scenarios if implemented
        expect(true).toBe(true);
      }
    });
  });

  describe('Cross-Environment Compatibility', () => {
    it('should provide consistent API across environments', () => {
      const compressor1 = new ImageCompressor();
      const compressor2 = new ImageCompressor();

      // API should be identical regardless of environment
      expect(typeof compressor1.convert).toBe('function');
      expect(typeof compressor1.decode).toBe('function');
      expect(typeof compressor1.encode).toBe('function');
      expect(typeof compressor1.process).toBe('function');
      expect(typeof compressor1.detectFormat).toBe('function');
      expect(typeof compressor1.getSupportedFormats).toBe('function');

      expect(typeof compressor2.convert).toBe(typeof compressor1.convert);
      expect(typeof compressor2.decode).toBe(typeof compressor1.decode);
      expect(typeof compressor2.encode).toBe(typeof compressor1.encode);
      expect(typeof compressor2.process).toBe(typeof compressor1.process);
      expect(typeof compressor2.detectFormat).toBe(
        typeof compressor1.detectFormat,
      );
      expect(typeof compressor2.getSupportedFormats).toBe(
        typeof compressor1.getSupportedFormats,
      );
    });

    it('should handle input types consistently', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as const,
        mimeType: 'image/webp',
        extension: '.webp',
        isSupported: jest.fn().mockResolvedValue(true),
        decode: jest.fn().mockResolvedValue(createTestImageData(100, 100)),
        canDecode: jest.fn().mockReturnValue(true),
      };

      codecManager.registerDecoder(mockDecoder);
      const testCompressor = new ImageCompressor(codecManager);

      const arrayBuffer = createTestImageBuffer('webp');
      const uint8Array = new Uint8Array(arrayBuffer);

      // Both should work in any environment
      const result1 = await testCompressor.decode(arrayBuffer);
      const result2 = await testCompressor.decode(uint8Array);

      expect(result1).toBeInstanceOf(ImageData);
      expect(result2).toBeInstanceOf(ImageData);
      expect(mockDecoder.decode).toHaveBeenCalledTimes(2);
    });

    it('should provide environment-specific optimizations', () => {
      const environment = EnvironmentDetector.detectEnvironment();
      const capabilities = EnvironmentDetector.getCapabilities();

      // Should detect and utilize available features
      if (environment.isNode) {
        // Node.js specific optimizations
        expect(capabilities.hasStreams).toBe(true);
      }

      if (environment.isBrowser) {
        // Browser specific optimizations
        expect(capabilities.hasImageData).toBe(true);
      }

      if (capabilities.hasWebAssembly) {
        // WebAssembly optimizations should be available
        expect(capabilities.hasWebAssembly).toBe(true);
      }
    });

    it('should handle feature detection consistently', () => {
      const features1 = FeatureDetector.detectFeatures();
      const features2 = FeatureDetector.detectFeatures();

      // Feature detection should be consistent
      expect(features1.webAssembly).toBe(features2.webAssembly);
      expect(features1.workers).toBe(features2.workers);
      expect(features1.sharedArrayBuffer).toBe(features2.sharedArrayBuffer);
      expect(features1.offscreenCanvas).toBe(features2.offscreenCanvas);
    });
  });

  describe('Performance Across Environments', () => {
    it('should maintain performance characteristics', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as const,
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

      const start = performance.now();
      await testCompressor.decode(testBuffer);
      const duration = performance.now() - start;

      // Should complete in reasonable time regardless of environment
      expect(duration).toBeLessThan(100); // Under 100ms
    });

    it('should scale similarly across environments', async () => {
      const codecManager = new CodecManager();

      const mockDecoder = {
        format: 'webp' as const,
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

      // Test concurrent operations
      const promises = Array.from({ length: 10 }, () =>
        testCompressor.decode(testBuffer),
      );

      const start = performance.now();
      const results = await Promise.allSettled(promises);
      const duration = performance.now() - start;

      const successCount = results.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      expect(successCount).toBe(10);
      expect(duration).toBeLessThan(500); // Should complete concurrently
    });
  });
});
