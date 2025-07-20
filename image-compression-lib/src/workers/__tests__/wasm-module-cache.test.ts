/**
 * Tests for WasmModuleCache
 */

import { WasmModuleCache } from '../wasm-module-cache.js';

// Mock WebAssembly for testing
const mockModule = {} as WebAssembly.Module;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock WebAssembly
const originalWebAssembly = global.WebAssembly;
beforeAll(() => {
  (global as any).WebAssembly = {
    compile: jest.fn().mockResolvedValue(mockModule),
    Module: {
      customSections: jest.fn().mockReturnValue([new ArrayBuffer(1024)]),
    },
  };
});

afterAll(() => {
  global.WebAssembly = originalWebAssembly;
});

describe('WasmModuleCache', () => {
  let cache: WasmModuleCache;

  beforeEach(() => {
    cache = new WasmModuleCache({
      maxSize: 10 * 1024 * 1024, // 10MB
      maxAge: 60 * 1000, // 1 minute
      maxModules: 5,
    });
    
    mockFetch.mockClear();
    (WebAssembly.compile as jest.Mock).mockClear();
  });

  afterEach(() => {
    cache.clear();
  });

  describe('module loading', () => {
    it('should load and cache a WASM module', async () => {
      const url = 'https://example.com/test.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      const module = await cache.getModule(url);
      
      expect(module).toBe(mockModule);
      expect(mockFetch).toHaveBeenCalledWith(url);
      expect(WebAssembly.compile).toHaveBeenCalledWith(mockArrayBuffer);
      expect(cache.hasModule(url)).toBe(true);
    });

    it('should return cached module on subsequent requests', async () => {
      const url = 'https://example.com/test.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      // First request
      const module1 = await cache.getModule(url);
      
      // Second request (should use cache)
      const module2 = await cache.getModule(url);
      
      expect(module1).toBe(module2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(WebAssembly.compile).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const url = 'https://example.com/nonexistent.wasm';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(cache.getModule(url)).rejects.toThrow('Failed to load WASM module');
    });

    it('should handle compilation errors', async () => {
      const url = 'https://example.com/invalid.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });
      
      (WebAssembly.compile as jest.Mock).mockRejectedValueOnce(new Error('Invalid WASM'));

      await expect(cache.getModule(url)).rejects.toThrow('Failed to load WASM module');
    });
  });

  describe('cache management', () => {
    it('should preload modules', async () => {
      const url = 'https://example.com/preload.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      await cache.preloadModule(url);
      
      expect(cache.hasModule(url)).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(url);
    });

    it('should not preload already cached modules', async () => {
      const url = 'https://example.com/cached.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      // First preload
      await cache.preloadModule(url);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second preload (should not fetch again)
      await cache.preloadModule(url);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should remove modules from cache', async () => {
      const url = 'https://example.com/remove.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      await cache.getModule(url);
      expect(cache.hasModule(url)).toBe(true);
      
      const removed = cache.removeModule(url);
      expect(removed).toBe(true);
      expect(cache.hasModule(url)).toBe(false);
    });

    it('should clear all cached modules', async () => {
      const urls = [
        'https://example.com/module1.wasm',
        'https://example.com/module2.wasm',
      ];
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      // Load multiple modules
      for (const url of urls) {
        await cache.getModule(url);
      }

      expect(cache.getStats().moduleCount).toBe(2);
      
      cache.clear();
      expect(cache.getStats().moduleCount).toBe(0);
    });
  });

  describe('cache limits', () => {
    it('should enforce module count limit', async () => {
      const cache = new WasmModuleCache({ maxModules: 2 });
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      // Load 3 modules (exceeds limit of 2)
      await cache.getModule('https://example.com/module1.wasm');
      await cache.getModule('https://example.com/module2.wasm');
      await cache.getModule('https://example.com/module3.wasm');

      const stats = cache.getStats();
      expect(stats.moduleCount).toBeLessThanOrEqual(2);
    });

    it('should provide cache statistics', async () => {
      const url = 'https://example.com/stats.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      await cache.getModule(url);
      
      const stats = cache.getStats();
      expect(stats.moduleCount).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.urls).toContain(url);
      expect(stats.newestModule).toBe(url);
      expect(stats.oldestModule).toBe(url);
    });
  });

  describe('cache expiration', () => {
    it('should expire old modules during cleanup', async () => {
      const cache = new WasmModuleCache({ maxAge: 100 }); // 100ms expiration
      const url = 'https://example.com/expire.wasm';
      const mockArrayBuffer = new ArrayBuffer(1024);
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      });

      await cache.getModule(url);
      expect(cache.hasModule(url)).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      cache.cleanup();
      expect(cache.hasModule(url)).toBe(false);
    });
  });
});