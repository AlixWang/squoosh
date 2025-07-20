/**
 * Tests for fallback management utilities
 */

import { FallbackManager, DEFAULT_FALLBACK_CONFIG } from '../fallback-manager';
import { featureDetector } from '../feature-detector';
import { environmentDetector } from '../environment-detector';

// Mock dependencies
jest.mock('../feature-detector');
jest.mock('../environment-detector');

describe('FallbackManager', () => {
  let manager: FallbackManager;
  let mockFeatureDetector: jest.Mocked<typeof featureDetector>;
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;

  beforeEach(() => {
    manager = new FallbackManager();
    mockFeatureDetector = featureDetector as jest.Mocked<typeof featureDetector>;
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
  });

  describe('constructor', () => {
    it('should use default config when none provided', () => {
      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_FALLBACK_CONFIG);
    });

    it('should use provided config', () => {
      const customConfig = {
        ...DEFAULT_FALLBACK_CONFIG,
        maxRetries: 5,
        timeoutMs: 60000,
      };
      const customManager = new FallbackManager(customConfig);
      expect(customManager.getConfig()).toEqual(customConfig);
    });
  });

  describe('initialize', () => {
    it('should initialize with feature detection', async () => {
      const mockFeatures = {
        webAssembly: true,
        workers: true,
        wasmThreads: true,
        offscreenCanvas: true,
        sharedArrayBuffer: true,
        atomics: true,
        imageData: true,
        canvas: true,
        blob: true,
        arrayBuffer: true,
      };

      mockFeatureDetector.getFeatureSupport.mockResolvedValue(mockFeatures);

      await manager.initialize();

      expect(mockFeatureDetector.getFeatureSupport).toHaveBeenCalled();
    });
  });

  describe('getWorkerFallback', () => {
    beforeEach(async () => {
      mockFeatureDetector.getFeatureSupport.mockResolvedValue({
        webAssembly: true,
        workers: true,
        wasmThreads: true,
        offscreenCanvas: true,
        sharedArrayBuffer: true,
        atomics: true,
        imageData: true,
        canvas: true,
        blob: true,
        arrayBuffer: true,
      });
      await manager.initialize();
    });

    it('should return hybrid strategy when workers are supported', () => {
      const fallback = manager.getWorkerFallback();

      expect(fallback.useWorkers).toBe(true);
      expect(fallback.fallbackToMainThread).toBe(true);
      expect(fallback.strategy).toBe('hybrid');
    });

    it('should return main-thread strategy when workers are not supported', async () => {
      mockFeatureDetector.getFeatureSupport.mockResolvedValue({
        webAssembly: true,
        workers: false,
        wasmThreads: false,
        offscreenCanvas: true,
        sharedArrayBuffer: true,
        atomics: true,
        imageData: true,
        canvas: true,
        blob: true,
        arrayBuffer: true,
      });
      await manager.initialize();

      const fallback = manager.getWorkerFallback();

      expect(fallback.useWorkers).toBe(false);
      expect(fallback.fallbackToMainThread).toBe(true);
      expect(fallback.strategy).toBe('main-thread');
    });

    it('should throw error when not initialized', () => {
      const uninitializedManager = new FallbackManager();
      expect(() => uninitializedManager.getWorkerFallback()).toThrow('FallbackManager not initialized');
    });
  });

  describe('getWasmFallback', () => {
    beforeEach(async () => {
      mockFeatureDetector.getFeatureSupport.mockResolvedValue({
        webAssembly: true,
        workers: true,
        wasmThreads: true,
        offscreenCanvas: true,
        sharedArrayBuffer: true,
        atomics: true,
        imageData: true,
        canvas: true,
        blob: true,
        arrayBuffer: true,
      });
      await manager.initialize();
    });

    it('should return hybrid strategy when WASM is supported', () => {
      const fallback = manager.getWasmFallback();

      expect(fallback.useWasm).toBe(true);
      expect(fallback.fallbackToJS).toBe(true);
      expect(fallback.strategy).toBe('hybrid');
    });

    it('should return JS strategy when WASM is not supported', async () => {
      mockFeatureDetector.getFeatureSupport.mockResolvedValue({
        webAssembly: false,
        workers: true,
        wasmThreads: false,
        offscreenCanvas: true,
        sharedArrayBuffer: true,
        atomics: true,
        imageData: true,
        canvas: true,
        blob: true,
        arrayBuffer: true,
      });
      await manager.initialize();

      const fallback = manager.getWasmFallback();

      expect(fallback.useWasm).toBe(false);
      expect(fallback.fallbackToJS).toBe(true);
      expect(fallback.strategy).toBe('js');
    });
  });

  describe('getFormatFallback', () => {
    it('should return fallback formats for AVIF', () => {
      const fallback = manager.getFormatFallback('avif');

      expect(fallback.primaryFormat).toBe('avif');
      expect(fallback.fallbackFormats).toEqual(['webp', 'jpeg']);
      expect(fallback.strategy).toBe('fallback');
    });

    it('should return fallback formats for JPEG XL', () => {
      const fallback = manager.getFormatFallback('jxl');

      expect(fallback.primaryFormat).toBe('jxl');
      expect(fallback.fallbackFormats).toEqual(['webp', 'png']);
      expect(fallback.strategy).toBe('fallback');
    });

    it('should return exact strategy for unknown formats', () => {
      const fallback = manager.getFormatFallback('unknown');

      expect(fallback.primaryFormat).toBe('unknown');
      expect(fallback.fallbackFormats).toEqual([]);
      expect(fallback.strategy).toBe('exact');
    });

    it('should return exact strategy when fallback is disabled', () => {
      manager.updateConfig({ enableFormatFallback: false });
      const fallback = manager.getFormatFallback('avif');

      expect(fallback.primaryFormat).toBe('avif');
      expect(fallback.fallbackFormats).toEqual([]);
      expect(fallback.strategy).toBe('exact');
    });
  });

  describe('createImageDataFallback', () => {
    it('should create ImageData in browser environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      (global as any).ImageData = class {
        constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
      };

      const data = new Uint8ClampedArray(400); // 10x10 RGBA
      const imageData = manager.createImageDataFallback(10, 10, data);

      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
      expect(imageData.data).toBe(data);

      delete (global as any).ImageData;
    });

    it('should create fallback ImageData in Node.js environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);

      const imageData = manager.createImageDataFallback(10, 10);

      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
      expect(imageData.data).toBeInstanceOf(Uint8ClampedArray);
      expect(imageData.data.length).toBe(400); // 10x10x4
    });
  });

  describe('createCanvasFallback', () => {
    it('should create canvas in browser environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      
      // In JSDOM, document.createElement is already available
      // We just need to verify the canvas properties are set correctly
      const canvas = manager.createCanvasFallback(100, 100);

      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(canvas.tagName).toBe('CANVAS'); // JSDOM creates actual canvas elements
    });

    it('should try node-canvas in Node.js environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(true);

      // The actual implementation will try to require('canvas') and fall back to minimal object
      const canvas = manager.createCanvasFallback(100, 100);

      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(canvas.getContext).toBeDefined();
    });

    it('should return minimal canvas object when node-canvas is not available', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(true);

      const originalRequire = require;
      (global as any).require = jest.fn().mockImplementation(() => {
        throw new Error('Module not found');
      });

      const canvas = manager.createCanvasFallback(100, 100);

      expect(canvas.width).toBe(100);
      expect(canvas.height).toBe(100);
      expect(canvas.getContext()).toBeNull();

      (global as any).require = originalRequire;
    });
  });

  describe('createBlobFallback', () => {
    it('should create Blob in browser environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(true);
      const mockBlob = {};
      (global as any).Blob = jest.fn().mockReturnValue(mockBlob);

      const data = new Uint8Array([1, 2, 3, 4]);
      const blob = manager.createBlobFallback(data, 'image/png');

      expect(blob).toBe(mockBlob);
      expect((global as any).Blob).toHaveBeenCalledWith([data], { type: 'image/png' });

      delete (global as any).Blob;
    });

    it('should return Buffer in Node.js environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(true);

      const data = new Uint8Array([1, 2, 3, 4]);
      const buffer = manager.createBlobFallback(data);

      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(Array.from(buffer as Buffer)).toEqual([1, 2, 3, 4]);
    });

    it('should throw error in unsupported environment', () => {
      mockEnvironmentDetector.isBrowser.mockReturnValue(false);
      mockEnvironmentDetector.isNode.mockReturnValue(false);

      const data = new Uint8Array([1, 2, 3, 4]);

      expect(() => manager.createBlobFallback(data)).toThrow('Blob not supported in this environment');
    });
  });

  describe('executeWithFallback', () => {
    it('should execute operation successfully on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const fallback = jest.fn();

      const result = await manager.executeWithFallback(operation, fallback, 'test');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');
      const fallback = jest.fn();

      const result = await manager.executeWithFallback(operation, fallback, 'test');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback when all retries fail', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('operation failed'));
      const fallback = jest.fn().mockResolvedValue('fallback success');

      const result = await manager.executeWithFallback(operation, fallback, 'test');

      expect(result).toBe('fallback success');
      expect(operation).toHaveBeenCalledTimes(3); // Default maxRetries
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should throw original error when fallback also fails', async () => {
      const originalError = new Error('operation failed');
      const operation = jest.fn().mockRejectedValue(originalError);
      const fallback = jest.fn().mockRejectedValue(new Error('fallback failed'));

      await expect(manager.executeWithFallback(operation, fallback, 'test')).rejects.toThrow('operation failed');

      expect(operation).toHaveBeenCalledTimes(3);
      expect(fallback).toHaveBeenCalledTimes(1);
    });

    it('should handle timeout', async () => {
      manager.updateConfig({ timeoutMs: 100 });
      const operation = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await manager.executeWithFallback(operation, fallback, 'test');

      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { maxRetries: 5, timeoutMs: 60000 };
      manager.updateConfig(newConfig);

      const config = manager.getConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.timeoutMs).toBe(60000);
      expect(config.enableWorkerFallback).toBe(DEFAULT_FALLBACK_CONFIG.enableWorkerFallback); // Unchanged
    });
  });
});