/**
 * Node.js specific utilities for file system operations and Buffer compatibility
 */

import { environmentDetector } from './environment-detector';

/**
 * Node.js file system operations interface
 */
export interface NodeFileSystem {
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer | Uint8Array): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
}

/**
 * Buffer compatibility utilities
 */
export class BufferUtils {
  /**
   * Converts ArrayBuffer to Buffer (Node.js) or Uint8Array (browser)
   */
  static fromArrayBuffer(arrayBuffer: ArrayBuffer): Buffer | Uint8Array {
    if (environmentDetector.isNode()) {
      return Buffer.from(arrayBuffer);
    } else {
      return new Uint8Array(arrayBuffer);
    }
  }

  /**
   * Converts Buffer or Uint8Array to ArrayBuffer
   */
  static toArrayBuffer(data: Buffer | Uint8Array): ArrayBuffer {
    if (data instanceof ArrayBuffer) {
      return data;
    }

    if (environmentDetector.isNode() && Buffer.isBuffer(data)) {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }

    if (data instanceof Uint8Array) {
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }

    // Fallback: create new ArrayBuffer and copy data
    const length = (data as any).length || 0;
    const buffer = new ArrayBuffer(length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < length; i++) {
      view[i] = (data as any)[i];
    }
    return buffer;
  }

  /**
   * Creates a Buffer or Uint8Array from various input types
   */
  static from(data: ArrayBuffer | Uint8Array | Buffer | number[]): Buffer | Uint8Array {
    if (environmentDetector.isNode()) {
      if (Buffer.isBuffer(data)) {
        return data;
      }
      if (data instanceof ArrayBuffer) {
        return Buffer.from(data);
      }
      if (data instanceof Uint8Array) {
        return Buffer.from(data);
      }
      if (Array.isArray(data)) {
        return Buffer.from(data);
      }
    } else {
      if (data instanceof Uint8Array) {
        return data;
      }
      if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
      }
      if (Buffer.isBuffer(data)) {
        return new Uint8Array(data);
      }
      if (Array.isArray(data)) {
        return new Uint8Array(data);
      }
    }

    throw new Error('Unsupported data type for buffer conversion');
  }

  /**
   * Checks if the data is a Buffer (Node.js) or Uint8Array (browser)
   */
  static isBuffer(data: any): data is Buffer | Uint8Array {
    return Buffer.isBuffer(data) || data instanceof Uint8Array;
  }

  /**
   * Gets the byte length of buffer-like data
   */
  static byteLength(data: ArrayBuffer | Uint8Array | Buffer): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    }
    return data.length;
  }

  /**
   * Concatenates multiple buffers
   */
  static concat(buffers: (ArrayBuffer | Uint8Array | Buffer)[]): Buffer | Uint8Array {
    if (environmentDetector.isNode()) {
      const nodeBuffers = buffers.map(buf => {
        if (Buffer.isBuffer(buf)) return buf;
        if (buf instanceof ArrayBuffer) return Buffer.from(buf);
        if (buf instanceof Uint8Array) return Buffer.from(buf);
        throw new Error('Invalid buffer type');
      });
      return Buffer.concat(nodeBuffers);
    } else {
      const totalLength = buffers.reduce((sum, buf) => sum + BufferUtils.byteLength(buf), 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;

      for (const buf of buffers) {
        const uint8Array = buf instanceof ArrayBuffer ? new Uint8Array(buf) : 
                          Buffer.isBuffer(buf) ? new Uint8Array(buf) : buf;
        result.set(uint8Array, offset);
        offset += uint8Array.length;
      }

      return result;
    }
  }
}

/**
 * Node.js file system implementation
 */
export class NodeFileSystem implements NodeFileSystem {
  private fs: any = null;
  private path: any = null;

  constructor() {
    if (environmentDetector.isNode()) {
      this.initializeNodeModules();
    }
  }

  private async initializeNodeModules(): Promise<void> {
    if (!this.fs) {
      try {
        this.fs = await import('fs/promises');
        this.path = await import('path');
      } catch (error) {
        throw new Error(`Failed to initialize Node.js file system modules: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Read a file and return its contents as Buffer
   */
  async readFile(filePath: string): Promise<Buffer> {
    if (!environmentDetector.isNode()) {
      throw new Error('File system operations are only available in Node.js environment');
    }

    await this.initializeNodeModules();
    
    try {
      return await this.fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write data to a file
   */
  async writeFile(filePath: string, data: Buffer | Uint8Array): Promise<void> {
    if (!environmentDetector.isNode()) {
      throw new Error('File system operations are only available in Node.js environment');
    }

    await this.initializeNodeModules();
    
    try {
      // Ensure directory exists
      const dir = this.path.dirname(filePath);
      await this.mkdir(dir, { recursive: true });
      
      await this.fs.writeFile(filePath, data);
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a file or directory exists
   */
  async exists(filePath: string): Promise<boolean> {
    if (!environmentDetector.isNode()) {
      throw new Error('File system operations are only available in Node.js environment');
    }

    await this.initializeNodeModules();
    
    try {
      await this.fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a directory
   */
  async mkdir(dirPath: string, options: { recursive?: boolean } = {}): Promise<void> {
    if (!environmentDetector.isNode()) {
      throw new Error('File system operations are only available in Node.js environment');
    }

    await this.initializeNodeModules();
    
    try {
      await this.fs.mkdir(dirPath, options);
    } catch (error: any) {
      // Ignore error if directory already exists
      if (error.code !== 'EEXIST') {
        throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
      }
    }
  }
}

/**
 * Node.js specific WASM module loading utilities
 */
export class NodeWasmLoader {
  private static moduleCache = new Map<string, WebAssembly.Module>();

  /**
   * Load a WASM module from file path (Node.js only)
   */
  static async loadFromFile(filePath: string): Promise<WebAssembly.Module> {
    if (!environmentDetector.isNode()) {
      throw new Error('File-based WASM loading is only available in Node.js environment');
    }

    // Check cache first
    if (this.moduleCache.has(filePath)) {
      return this.moduleCache.get(filePath)!;
    }

    try {
      const fileSystem = new NodeFileSystem();
      const wasmBuffer = await fileSystem.readFile(filePath);
      const module = await WebAssembly.compile(wasmBuffer);
      
      // Cache the compiled module
      this.moduleCache.set(filePath, module);
      return module;
    } catch (error) {
      throw new Error(`Failed to load WASM module from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load a WASM module from Buffer (Node.js optimized)
   */
  static async loadFromBuffer(buffer: Buffer | Uint8Array, cacheKey?: string): Promise<WebAssembly.Module> {
    // Check cache if key provided
    if (cacheKey && this.moduleCache.has(cacheKey)) {
      return this.moduleCache.get(cacheKey)!;
    }

    try {
      const wasmBuffer = BufferUtils.toArrayBuffer(buffer);
      const module = await WebAssembly.compile(wasmBuffer);
      
      // Cache if key provided
      if (cacheKey) {
        this.moduleCache.set(cacheKey, module);
      }
      
      return module;
    } catch (error) {
      throw new Error(`Failed to compile WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Instantiate a WASM module with Node.js specific imports
   */
  static async instantiate(
    module: WebAssembly.Module,
    imports: WebAssembly.Imports = {}
  ): Promise<WebAssembly.Instance> {
    try {
      // Add Node.js specific imports if needed
      const nodeImports = {
        ...imports,
        env: {
          ...imports.env,
          // Add Node.js specific environment functions if needed
          memory: imports.env?.memory || new WebAssembly.Memory({ initial: 256 }),
        },
      };

      return await WebAssembly.instantiate(module, nodeImports);
    } catch (error) {
      throw new Error(`Failed to instantiate WASM module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the module cache
   */
  static clearCache(): void {
    this.moduleCache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.moduleCache.size,
      keys: Array.from(this.moduleCache.keys()),
    };
  }
}

/**
 * Singleton instances
 */
export const nodeFileSystem = new NodeFileSystem();
export const bufferUtils = BufferUtils;
export const nodeWasmLoader = NodeWasmLoader;