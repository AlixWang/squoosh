/**
 * Lazy loading utilities for codec modules and WebAssembly files
 */

export interface LazyLoadOptions {
  /** Cache loaded modules */
  enableCaching?: boolean;
  /** Preload modules on first access */
  enablePreloading?: boolean;
  /** Timeout for module loading (ms) */
  loadTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface LoadedModule<T> {
  module: T;
  loadTime: number;
  size?: number;
}

export interface LazyLoadStats {
  totalLoads: number;
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  totalLoadTime: number;
}

/**
 * Manages lazy loading of modules with caching and performance optimization
 */
export class LazyLoader {
  private options: Required<LazyLoadOptions>;
  private cache = new Map<string, LoadedModule<any>>();
  private loadingPromises = new Map<string, Promise<any>>();
  private stats: LazyLoadStats = {
    totalLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTime: 0,
    totalLoadTime: 0,
  };

  constructor(options: LazyLoadOptions = {}) {
    this.options = {
      enableCaching: options.enableCaching ?? true,
      enablePreloading: options.enablePreloading ?? false,
      loadTimeout: options.loadTimeout ?? 10000, // 10 seconds
      debug: options.debug ?? false,
    };
  }

  /**
   * Load a module lazily with caching
   */
  async load<T>(
    key: string,
    loader: () => Promise<T>,
    preload: boolean = false
  ): Promise<T> {
    // Check cache first
    if (this.options.enableCaching && this.cache.has(key)) {
      this.stats.cacheHits++;
      if (this.options.debug) {
        console.log(`LazyLoader: Cache hit for ${key}`);
      }
      return this.cache.get(key)!.module;
    }

    // Check if already loading
    if (this.loadingPromises.has(key)) {
      if (this.options.debug) {
        console.log(`LazyLoader: Waiting for existing load of ${key}`);
      }
      return this.loadingPromises.get(key)!;
    }

    // Start loading
    const loadPromise = this.loadModule(key, loader);
    this.loadingPromises.set(key, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  /**
   * Preload modules for better performance
   */
  async preload<T>(loaders: Record<string, () => Promise<T>>): Promise<void> {
    if (!this.options.enablePreloading) {
      return;
    }

    const preloadPromises = Object.entries(loaders).map(([key, loader]) =>
      this.load(key, loader, true).catch(error => {
        if (this.options.debug) {
          console.warn(`LazyLoader: Failed to preload ${key}:`, error);
        }
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Check if a module is cached
   */
  isCached(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cached module without loading
   */
  getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    return cached ? cached.module : null;
  }

  /**
   * Clear cache for specific key or all keys
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
      if (this.options.debug) {
        console.log(`LazyLoader: Cleared cache for ${key}`);
      }
    } else {
      this.cache.clear();
      if (this.options.debug) {
        console.log('LazyLoader: Cleared all cache');
      }
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): LazyLoadStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalLoads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTime: 0,
      totalLoadTime: 0,
    };
  }

  private async loadModule<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    
    if (this.options.debug) {
      console.log(`LazyLoader: Loading ${key}`);
    }

    try {
      // Load with timeout
      const module = await this.withTimeout(loader(), this.options.loadTimeout);
      const loadTime = Date.now() - startTime;

      // Update statistics
      this.stats.totalLoads++;
      this.stats.cacheMisses++;
      this.stats.totalLoadTime += loadTime;
      this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.totalLoads;

      // Cache the module
      if (this.options.enableCaching) {
        this.cache.set(key, {
          module,
          loadTime,
        });
      }

      if (this.options.debug) {
        console.log(`LazyLoader: Loaded ${key} in ${loadTime}ms`);
      }

      return module;
    } catch (error) {
      if (this.options.debug) {
        console.error(`LazyLoader: Failed to load ${key}:`, error);
      }
      throw error;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Module loading timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }
}

/**
 * Specialized lazy loader for WebAssembly modules
 */
export class WasmLazyLoader extends LazyLoader {
  /**
   * Load WebAssembly module from URL or buffer
   */
  async loadWasm(
    key: string,
    source: string | ArrayBuffer | Uint8Array,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
    return this.load(key, async () => {
      if (typeof source === 'string') {
        // Load from URL
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(`Failed to fetch WASM from ${source}: ${response.statusText}`);
        }
        const bytes = await response.arrayBuffer();
        return WebAssembly.instantiate(bytes, imports);
      } else {
        // Load from buffer
        return WebAssembly.instantiate(source, imports);
      }
    });
  }

  /**
   * Load WebAssembly module and return only the instance
   */
  async loadWasmInstance(
    key: string,
    source: string | ArrayBuffer | Uint8Array,
    imports?: WebAssembly.Imports
  ): Promise<WebAssembly.Instance> {
    const result = await this.loadWasm(key, source, imports);
    return result.instance;
  }
}

// Global lazy loader instances
let globalLazyLoader: LazyLoader | null = null;
let globalWasmLazyLoader: WasmLazyLoader | null = null;

/**
 * Get the global lazy loader instance
 */
export function getGlobalLazyLoader(): LazyLoader {
  if (!globalLazyLoader) {
    globalLazyLoader = new LazyLoader();
  }
  return globalLazyLoader;
}

/**
 * Get the global WASM lazy loader instance
 */
export function getGlobalWasmLazyLoader(): WasmLazyLoader {
  if (!globalWasmLazyLoader) {
    globalWasmLazyLoader = new WasmLazyLoader();
  }
  return globalWasmLazyLoader;
}

/**
 * Configure the global lazy loader
 */
export function configureGlobalLazyLoader(options: LazyLoadOptions): void {
  globalLazyLoader = new LazyLoader(options);
}

/**
 * Configure the global WASM lazy loader
 */
export function configureGlobalWasmLazyLoader(options: LazyLoadOptions): void {
  globalWasmLazyLoader = new WasmLazyLoader(options);
}