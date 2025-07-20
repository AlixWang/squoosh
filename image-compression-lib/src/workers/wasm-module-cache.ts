/**
 * WASM module cache for efficient module reuse
 */

export interface WasmModuleInfo {
  module: WebAssembly.Module;
  url: string;
  size: number;
  loadTime: number;
  lastAccessed: number;
}

export interface WasmModuleCacheOptions {
  maxSize?: number; // Maximum cache size in bytes
  maxAge?: number; // Maximum age in milliseconds
  maxModules?: number; // Maximum number of cached modules
}

export class WasmModuleCache {
  private cache = new Map<string, WasmModuleInfo>();
  private options: Required<WasmModuleCacheOptions>;

  constructor(options: WasmModuleCacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize ?? 50 * 1024 * 1024, // 50MB default
      maxAge: options.maxAge ?? 30 * 60 * 1000, // 30 minutes default
      maxModules: options.maxModules ?? 10, // 10 modules default
    };
  }

  /**
   * Get a cached WASM module or load it if not cached
   */
  async getModule(url: string): Promise<WebAssembly.Module> {
    const cached = this.cache.get(url);
    
    if (cached && this.isValidCacheEntry(cached)) {
      cached.lastAccessed = Date.now();
      return cached.module;
    }

    // Load the module
    const module = await this.loadModule(url);
    const moduleInfo: WasmModuleInfo = {
      module,
      url,
      size: await this.estimateModuleSize(module),
      loadTime: Date.now(),
      lastAccessed: Date.now(),
    };

    // Add to cache with cleanup if needed
    this.addToCache(url, moduleInfo);
    
    return module;
  }

  /**
   * Preload a WASM module into the cache
   */
  async preloadModule(url: string): Promise<void> {
    if (!this.cache.has(url)) {
      await this.getModule(url);
    }
  }

  /**
   * Check if a module is cached
   */
  hasModule(url: string): boolean {
    const cached = this.cache.get(url);
    return cached !== undefined && this.isValidCacheEntry(cached);
  }

  /**
   * Remove a module from the cache
   */
  removeModule(url: string): boolean {
    return this.cache.delete(url);
  }

  /**
   * Clear all cached modules
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    moduleCount: number;
    totalSize: number;
    urls: string[];
    oldestModule: string | null;
    newestModule: string | null;
  } {
    const modules = Array.from(this.cache.values());
    const totalSize = modules.reduce((sum, info) => sum + info.size, 0);
    
    let oldestModule: string | null = null;
    let newestModule: string | null = null;
    let oldestTime = Infinity;
    let newestTime = 0;

    for (const [url, info] of this.cache) {
      if (info.loadTime < oldestTime) {
        oldestTime = info.loadTime;
        oldestModule = url;
      }
      if (info.loadTime > newestTime) {
        newestTime = info.loadTime;
        newestModule = url;
      }
    }

    return {
      moduleCount: this.cache.size,
      totalSize,
      urls: Array.from(this.cache.keys()),
      oldestModule,
      newestModule,
    };
  }

  /**
   * Cleanup expired and least recently used modules
   */
  cleanup(): void {
    const now = Date.now();
    const modules = Array.from(this.cache.entries());

    // Remove expired modules
    for (const [url, info] of modules) {
      if (now - info.loadTime > this.options.maxAge) {
        this.cache.delete(url);
      }
    }

    // Check size limits
    this.enforceSize();
    this.enforceCount();
  }

  private async loadModule(url: string): Promise<WebAssembly.Module> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch WASM module: ${response.status} ${response.statusText}`);
      }

      const bytes = await response.arrayBuffer();
      return await WebAssembly.compile(bytes);
    } catch (error) {
      throw new Error(`Failed to load WASM module from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async estimateModuleSize(module: WebAssembly.Module): Promise<number> {
    try {
      // Try to get the actual size by serializing the module
      const bytes = WebAssembly.Module.customSections(module, 'name');
      return bytes.reduce((sum, section) => sum + section.byteLength, 0) || 1024; // Fallback estimate
    } catch {
      // Fallback to a reasonable estimate
      return 1024 * 1024; // 1MB estimate
    }
  }

  private isValidCacheEntry(info: WasmModuleInfo): boolean {
    const now = Date.now();
    return now - info.loadTime <= this.options.maxAge;
  }

  private addToCache(url: string, info: WasmModuleInfo): void {
    this.cache.set(url, info);
    
    // Cleanup if needed
    this.enforceSize();
    this.enforceCount();
  }

  private enforceSize(): void {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, info) => sum + info.size, 0);

    if (totalSize <= this.options.maxSize) {
      return;
    }

    // Remove least recently used modules until under size limit
    const sortedByAccess = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let currentSize = totalSize;
    for (const [url, info] of sortedByAccess) {
      if (currentSize <= this.options.maxSize) {
        break;
      }
      this.cache.delete(url);
      currentSize -= info.size;
    }
  }

  private enforceCount(): void {
    if (this.cache.size <= this.options.maxModules) {
      return;
    }

    // Remove least recently used modules until under count limit
    const sortedByAccess = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    const toRemove = this.cache.size - this.options.maxModules;
    for (let i = 0; i < toRemove && i < sortedByAccess.length; i++) {
      const entry = sortedByAccess[i];
      if (entry) {
        const [url] = entry;
        this.cache.delete(url);
      }
    }
  }
}