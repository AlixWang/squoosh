/**
 * Tests for feature detection utilities
 */

import { FeatureDetector } from '../feature-detector';
import { environmentDetector } from '../environment-detector';

// Mock the environment detector
jest.mock('../environment-detector');

describe('FeatureDetector', () => {
  let detector: FeatureDetector;
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;

  beforeEach(() => {
    detector = new FeatureDetector();
    detector.clearCache();
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
  });

  describe('getFeatureSupport', () => {
    it('should detect all features correctly', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(true);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);

      // Mock browser globals
      (global as any).SharedArrayBuffer = class {};
      (global as any).Atomics = {};
      (global as any).ImageData = class {};
      (global as any).HTMLCanvasElement = class {};
      (global as any).Blob = class {};
      (global as any).ArrayBuffer = ArrayBuffer;

      const features = await detector.getFeatureSupport();

      expect(features.webAssembly).toBe(true);
      expect(features.workers).toBe(true);
      expect(features.wasmThreads).toBe(true);
      expect(features.offscreenCanvas).toBe(true);
      expect(features.sharedArrayBuffer).toBe(true);
      expect(features.atomics).toBe(true);
      expect(features.imageData).toBe(true);
      expect(features.canvas).toBe(true);
      expect(features.blob).toBe(true);
      expect(features.arrayBuffer).toBe(true);

      // Cleanup
      delete (global as any).SharedArrayBuffer;
      delete (global as any).Atomics;
      delete (global as any).ImageData;
      delete (global as any).HTMLCanvasElement;
      delete (global as any).Blob;
    });

    it('should cache feature detection results', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(false);
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(true);

      // Clear any previous calls
      mockEnvironmentDetector.supportsWasmThreads.mockClear();

      const features1 = await detector.getFeatureSupport();
      const features2 = await detector.getFeatureSupport();

      expect(features1).toBe(features2); // Same reference
      expect(mockEnvironmentDetector.supportsWasmThreads).toHaveBeenCalledTimes(1);
    });

    it('should handle Node.js environment correctly', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(false);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(false);
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(true);

      // Mock Node.js globals
      (global as any).Buffer = Buffer;

      // Mock require.resolve for canvas - but it won't be available in test environment
      const features = await detector.getFeatureSupport();

      expect(features.webAssembly).toBe(true);
      expect(features.workers).toBe(true);
      expect(features.wasmThreads).toBe(false);
      expect(features.offscreenCanvas).toBe(false);
      expect(features.canvas).toBe(false); // Canvas not available in test environment
      expect(features.blob).toBe(true); // Buffer is available
    });
  });

  describe('isCodecSupported', () => {
    beforeEach(() => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(true);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);
    });

    it('should return true for basic formats', async () => {
      expect(await detector.isCodecSupported('png')).toBe(true);
      expect(await detector.isCodecSupported('jpeg')).toBe(true);
    });

    it('should return true for WebP when WASM is supported', async () => {
      expect(await detector.isCodecSupported('webp')).toBe(true);
    });

    it('should return true for AVIF when WASM is supported', async () => {
      expect(await detector.isCodecSupported('avif')).toBe(true);
    });

    it('should return true for JPEG XL when WASM is supported', async () => {
      expect(await detector.isCodecSupported('jxl')).toBe(true);
      expect(await detector.isCodecSupported('jpeg-xl')).toBe(true);
    });

    it('should return false when WASM is not supported for WASM-dependent formats', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(false);
      detector.clearCache(); // Clear cache to pick up new mock values

      expect(await detector.isCodecSupported('avif')).toBe(false);
      expect(await detector.isCodecSupported('jxl')).toBe(false);
    });

    it('should return true for unknown formats when WASM is supported', async () => {
      expect(await detector.isCodecSupported('unknown')).toBe(true);
    });
  });

  describe('getOptimalProcessingStrategy', () => {
    it('should return optimal strategy with all features available', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(true);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      mockEnvironmentDetector.getEnvironmentInfo.mockReturnValue({
        environment: 'browser',
        wasmSupport: true,
        workerSupport: true,
        wasmThreadsSupport: true,
        offscreenCanvasSupport: true,
        concurrency: 8,
      });

      const strategy = await detector.getOptimalProcessingStrategy();

      expect(strategy.useWorkers).toBe(true);
      expect(strategy.useWasmThreads).toBe(true);
      expect(strategy.maxConcurrency).toBe(8);
      expect(strategy.preferredFormats).toContain('webp');
      expect(strategy.preferredFormats).toContain('avif');
      expect(strategy.preferredFormats).toContain('jxl');
    });

    it('should return conservative strategy with limited features', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(false);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(false);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(false);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(false);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      mockEnvironmentDetector.getEnvironmentInfo.mockReturnValue({
        environment: 'browser',
        wasmSupport: false,
        workerSupport: false,
        wasmThreadsSupport: false,
        offscreenCanvasSupport: false,
        concurrency: 1,
      });

      detector.clearCache(); // Clear cache to pick up new mock values

      const strategy = await detector.getOptimalProcessingStrategy();

      expect(strategy.useWorkers).toBe(false);
      expect(strategy.useWasmThreads).toBe(false);
      expect(strategy.maxConcurrency).toBe(1);
      expect(strategy.preferredFormats).toEqual(['png', 'jpeg']);
    });

    it('should cap concurrency at 8', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(true);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      mockEnvironmentDetector.getEnvironmentInfo.mockReturnValue({
        environment: 'browser',
        wasmSupport: true,
        workerSupport: true,
        wasmThreadsSupport: true,
        offscreenCanvasSupport: true,
        concurrency: 16, // More than 8
      });

      const strategy = await detector.getOptimalProcessingStrategy();

      expect(strategy.maxConcurrency).toBe(8);
    });
  });

  describe('clearCache', () => {
    it('should clear cached feature detection results', async () => {
      mockEnvironmentDetector.supportsWasm.mockReturnValue(true);
      mockEnvironmentDetector.supportsWorkers.mockReturnValue(true);
      mockEnvironmentDetector.supportsWasmThreads.mockResolvedValue(true);
      mockEnvironmentDetector.supportsOffscreenCanvas.mockReturnValue(true);
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      mockEnvironmentDetector.isNode.mockReturnValue(false);

      const features1 = await detector.getFeatureSupport();
      detector.clearCache();
      const features2 = await detector.getFeatureSupport();

      expect(features1).not.toBe(features2); // Different references
    });
  });
});