import { LazyLoader, WasmLazyLoader, getGlobalLazyLoader, getGlobalWasmLazyLoader, configureGlobalLazyLoader } from '../lazy-loader';

// Mock fetch for WASM loading tests
global.fetch = jest.fn();

describe('LazyLoader', () => {
  let loader: LazyLoader;

  beforeEach(() => {
    loader = new LazyLoader({
      enableCaching: true,
      enablePreloading: true,
      loadTimeout: 1000,
    });
  });

  afterEach(() => {
    loader.clearCache();
    loader.resetStats();
  });

  describe('load', () => {
    it('should load module successfully', async () => {
      const mockModule = { value: 'test' };
      const mockLoader = jest.fn().mockResolvedValue(mockModule);

      const result = await loader.load('test-module', mockLoader);

      expect(result).toBe(mockModule);
      expect(mockLoader).toHaveBeenCalledTimes(1);
    });

    it('should cache loaded modules', async () => {
      const mockModule = { value: 'test' };
      const mockLoader = jest.fn().mockResolvedValue(mockModule);

      // First load
      const result1 = await loader.load('test-module', mockLoader);
      // Second load (should use cache)
      const result2 = await loader.load('test-module', mockLoader);

      expect(result1).toBe(mockModule);
      expect(result2).toBe(mockModule);
      expect(mockLoader).toHaveBeenCalledTimes(1); // Only called once

      const stats = loader.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    it('should handle concurrent loads of same module', async () => {
      const mockModule = { value: 'test' };
      const mockLoader = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockModule;
      });

      // Start multiple loads concurrently
      const promises = [
        loader.load('test-module', mockLoader),
        loader.load('test-module', mockLoader),
        loader.load('test-module', mockLoader),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([mockModule, mockModule, mockModule]);
      expect(mockLoader).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle load failures', async () => {
      const mockError = new Error('Load failed');
      const mockLoader = jest.fn().mockRejectedValue(mockError);

      await expect(loader.load('test-module', mockLoader)).rejects.toThrow('Load failed');
    });

    it('should handle load timeout', async () => {
      const mockLoader = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Longer than timeout
        return { value: 'test' };
      });

      await expect(loader.load('test-module', mockLoader)).rejects.toThrow('timed out');
    });
  });

  describe('preload', () => {
    it('should preload multiple modules', async () => {
      const loaders = {
        'module-1': jest.fn().mockResolvedValue({ value: 1 }),
        'module-2': jest.fn().mockResolvedValue({ value: 2 }),
        'module-3': jest.fn().mockResolvedValue({ value: 3 }),
      };

      await loader.preload(loaders);

      // All loaders should have been called
      Object.values(loaders).forEach(mockLoader => {
        expect(mockLoader).toHaveBeenCalledTimes(1);
      });

      // Modules should be cached
      expect(loader.isCached('module-1')).toBe(true);
      expect(loader.isCached('module-2')).toBe(true);
      expect(loader.isCached('module-3')).toBe(true);
    });

    it('should handle preload failures gracefully', async () => {
      const loaders = {
        'good-module': jest.fn().mockResolvedValue({ value: 'good' }),
        'bad-module': jest.fn().mockRejectedValue(new Error('Failed')),
      };

      // Should not throw
      await expect(loader.preload(loaders)).resolves.toBeUndefined();

      // Good module should be cached
      expect(loader.isCached('good-module')).toBe(true);
      expect(loader.isCached('bad-module')).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should check if module is cached', async () => {
      expect(loader.isCached('test-module')).toBe(false);

      await loader.load('test-module', async () => ({ value: 'test' }));

      expect(loader.isCached('test-module')).toBe(true);
    });

    it('should get cached module', async () => {
      const mockModule = { value: 'test' };
      await loader.load('test-module', async () => mockModule);

      const cached = loader.getCached('test-module');
      expect(cached).toBe(mockModule);
    });

    it('should return null for non-cached module', () => {
      const cached = loader.getCached('non-existent');
      expect(cached).toBeNull();
    });

    it('should clear specific cache entry', async () => {
      await loader.load('module-1', async () => ({ value: 1 }));
      await loader.load('module-2', async () => ({ value: 2 }));

      expect(loader.isCached('module-1')).toBe(true);
      expect(loader.isCached('module-2')).toBe(true);

      loader.clearCache('module-1');

      expect(loader.isCached('module-1')).toBe(false);
      expect(loader.isCached('module-2')).toBe(true);
    });

    it('should clear all cache entries', async () => {
      await loader.load('module-1', async () => ({ value: 1 }));
      await loader.load('module-2', async () => ({ value: 2 }));

      loader.clearCache();

      expect(loader.isCached('module-1')).toBe(false);
      expect(loader.isCached('module-2')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track loading statistics', async () => {
      const mockLoader = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return { value: 'test' };
      });

      // First load (cache miss)
      await loader.load('test-module', mockLoader);
      // Second load (cache hit)
      await loader.load('test-module', mockLoader);

      const stats = loader.getStats();
      expect(stats.totalLoads).toBe(1);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.averageLoadTime).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      await loader.load('test-module', async () => ({ value: 'test' }));

      let stats = loader.getStats();
      expect(stats.totalLoads).toBe(1);

      loader.resetStats();

      stats = loader.getStats();
      expect(stats.totalLoads).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });
});

describe('WasmLazyLoader', () => {
  let wasmLoader: WasmLazyLoader;

  beforeEach(() => {
    wasmLoader = new WasmLazyLoader();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    wasmLoader.clearCache();
  });

  describe('loadWasm', () => {
    it('should load WASM from URL', async () => {
      const mockWasmBytes = new ArrayBuffer(8);
      const mockResponse = {
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(mockWasmBytes),
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Mock WebAssembly.instantiate
      const mockInstance = { exports: {} };
      const mockResult = { instance: mockInstance, module: {} };
      global.WebAssembly = {
        instantiate: jest.fn().mockResolvedValue(mockResult),
      } as any;

      const result = await wasmLoader.loadWasm('test-wasm', 'http://example.com/test.wasm');

      expect(global.fetch).toHaveBeenCalledWith('http://example.com/test.wasm');
      expect(global.WebAssembly.instantiate).toHaveBeenCalledWith(mockWasmBytes, undefined);
      expect(result).toBe(mockResult);
    });

    it('should load WASM from buffer', async () => {
      const mockWasmBytes = new ArrayBuffer(8);
      const mockInstance = { exports: {} };
      const mockResult = { instance: mockInstance, module: {} };
      
      global.WebAssembly = {
        instantiate: jest.fn().mockResolvedValue(mockResult),
      } as any;

      const result = await wasmLoader.loadWasm('test-wasm', mockWasmBytes);

      expect(global.WebAssembly.instantiate).toHaveBeenCalledWith(mockWasmBytes, undefined);
      expect(result).toBe(mockResult);
    });

    it('should handle fetch failures', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(
        wasmLoader.loadWasm('test-wasm', 'http://example.com/test.wasm')
      ).rejects.toThrow('Failed to fetch WASM');
    });
  });

  describe('loadWasmInstance', () => {
    it('should return only the instance', async () => {
      const mockWasmBytes = new ArrayBuffer(8);
      const mockInstance = { exports: {} };
      const mockResult = { instance: mockInstance, module: {} };
      
      global.WebAssembly = {
        instantiate: jest.fn().mockResolvedValue(mockResult),
      } as any;

      const result = await wasmLoader.loadWasmInstance('test-wasm', mockWasmBytes);

      expect(result).toBe(mockInstance);
    });
  });
});

describe('Global LazyLoader', () => {
  it('should provide global instance', () => {
    const loader1 = getGlobalLazyLoader();
    const loader2 = getGlobalLazyLoader();
    expect(loader1).toBe(loader2);
  });

  it('should provide global WASM loader instance', () => {
    const loader1 = getGlobalWasmLazyLoader();
    const loader2 = getGlobalWasmLazyLoader();
    expect(loader1).toBe(loader2);
  });

  it('should allow configuration', () => {
    configureGlobalLazyLoader({ enableCaching: false });
    const loader = getGlobalLazyLoader();
    expect(loader).toBeInstanceOf(LazyLoader);
  });
});