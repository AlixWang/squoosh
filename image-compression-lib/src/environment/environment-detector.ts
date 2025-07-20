/**
 * Environment detection utilities for determining runtime capabilities
 */

import { EnvironmentDetector, EnvironmentInfo } from '../interfaces/environment';

/**
 * Default implementation of environment detection
 */
export class DefaultEnvironmentDetector implements EnvironmentDetector {
  private _environmentInfo: EnvironmentInfo | null = null;

  /**
   * Determines if the code is running in a browser environment
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }

  /**
   * Determines if the code is running in a Node.js environment
   */
  isNode(): boolean {
    return (
      typeof process !== 'undefined' &&
      process.versions != null &&
      process.versions.node != null
    );
  }

  /**
   * Checks if WebAssembly is supported in the current environment
   */
  supportsWasm(): boolean {
    try {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
        // Test with a minimal WASM module
        const module = new WebAssembly.Module(
          new Uint8Array([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
        );
        return module instanceof WebAssembly.Module;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Checks if Web Workers are supported in the current environment
   */
  supportsWorkers(): boolean {
    if (this.isBrowser()) {
      return typeof Worker !== 'undefined';
    } else if (this.isNode()) {
      try {
        // Check if worker_threads module is available
        require.resolve('worker_threads');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Checks if WebAssembly threads are supported in the current environment
   */
  async supportsWasmThreads(): Promise<boolean> {
    if (!this.supportsWasm() || !this.supportsWorkers()) {
      return false;
    }

    try {
      if (this.isBrowser()) {
        // Check for SharedArrayBuffer and Atomics support
        return (
          typeof SharedArrayBuffer !== 'undefined' &&
          typeof Atomics !== 'undefined' &&
          this.isSecureContext()
        );
      } else if (this.isNode()) {
        // In Node.js, check if worker_threads supports SharedArrayBuffer
        try {
          const { Worker } = require('worker_threads');
          return typeof SharedArrayBuffer !== 'undefined' && typeof Worker !== 'undefined';
        } catch {
          return false;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the OffscreenCanvas API is supported in the current environment
   */
  supportsOffscreenCanvas(): boolean {
    return this.isBrowser() && typeof OffscreenCanvas !== 'undefined';
  }

  /**
   * Gets information about the current environment
   */
  getEnvironmentInfo(): EnvironmentInfo {
    if (this._environmentInfo) {
      return this._environmentInfo;
    }

    const environment = this.isBrowser() ? 'browser' : this.isNode() ? 'node' : 'unknown';
    const wasmSupport = this.supportsWasm();
    const workerSupport = this.supportsWorkers();
    const offscreenCanvasSupport = this.supportsOffscreenCanvas();
    const concurrency = this.getConcurrency();

    this._environmentInfo = {
      environment,
      wasmSupport,
      workerSupport,
      wasmThreadsSupport: false, // Will be updated asynchronously
      offscreenCanvasSupport,
      concurrency,
    };

    // Update WASM threads support asynchronously
    this.supportsWasmThreads().then((supported) => {
      if (this._environmentInfo) {
        this._environmentInfo.wasmThreadsSupport = supported;
      }
    });

    return this._environmentInfo;
  }

  /**
   * Checks if the current context is secure (required for SharedArrayBuffer)
   */
  private isSecureContext(): boolean {
    if (this.isBrowser()) {
      return typeof window !== 'undefined' && window.isSecureContext === true;
    }
    return true; // Node.js is always considered secure
  }

  /**
   * Gets the number of logical CPU cores available
   */
  private getConcurrency(): number {
    if (this.isBrowser()) {
      return typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4; // Default fallback
    } else if (this.isNode()) {
      try {
        const os = require('os');
        return os.cpus().length;
      } catch {
        return 4; // Default fallback
      }
    }
    return 1; // Conservative fallback
  }

  /**
   * Clears cached environment information
   */
  clearCache(): void {
    this._environmentInfo = null;
  }
}

/**
 * Singleton instance of the environment detector
 */
export const environmentDetector = new DefaultEnvironmentDetector();