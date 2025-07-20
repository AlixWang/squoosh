/**
 * Fallback mechanisms for unsupported features
 */

import { environmentDetector } from './environment-detector';
import { featureDetector, FeatureSupport } from './feature-detector';

/**
 * Fallback strategy configuration
 */
export interface FallbackConfig {
  enableWorkerFallback: boolean;
  enableWasmFallback: boolean;
  enableFormatFallback: boolean;
  maxRetries: number;
  timeoutMs: number;
}

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enableWorkerFallback: true,
  enableWasmFallback: true,
  enableFormatFallback: true,
  maxRetries: 3,
  timeoutMs: 30000,
};

/**
 * Manages fallback strategies for unsupported features
 */
export class FallbackManager {
  private config: FallbackConfig;
  private features: FeatureSupport | null = null;

  constructor(config: FallbackConfig = DEFAULT_FALLBACK_CONFIG) {
    this.config = { ...config };
  }

  /**
   * Initializes the fallback manager with feature detection
   */
  async initialize(): Promise<void> {
    this.features = await featureDetector.getFeatureSupport();
  }

  /**
   * Gets fallback strategy for worker operations
   */
  getWorkerFallback(): {
    useWorkers: boolean;
    fallbackToMainThread: boolean;
    strategy: 'workers' | 'main-thread' | 'hybrid';
  } {
    if (!this.features) {
      throw new Error('FallbackManager not initialized');
    }

    if (this.features.workers && this.config.enableWorkerFallback) {
      return {
        useWorkers: true,
        fallbackToMainThread: true,
        strategy: 'hybrid',
      };
    }

    return {
      useWorkers: false,
      fallbackToMainThread: true,
      strategy: 'main-thread',
    };
  }

  /**
   * Gets fallback strategy for WebAssembly operations
   */
  getWasmFallback(): {
    useWasm: boolean;
    fallbackToJS: boolean;
    strategy: 'wasm' | 'js' | 'hybrid';
  } {
    if (!this.features) {
      throw new Error('FallbackManager not initialized');
    }

    if (this.features.webAssembly && this.config.enableWasmFallback) {
      return {
        useWasm: true,
        fallbackToJS: true,
        strategy: 'hybrid',
      };
    }

    return {
      useWasm: false,
      fallbackToJS: true,
      strategy: 'js',
    };
  }

  /**
   * Gets fallback formats for unsupported image formats
   */
  getFormatFallback(requestedFormat: string): {
    primaryFormat: string;
    fallbackFormats: string[];
    strategy: 'exact' | 'fallback' | 'best-effort';
  } {
    if (!this.config.enableFormatFallback) {
      return {
        primaryFormat: requestedFormat,
        fallbackFormats: [],
        strategy: 'exact',
      };
    }

    const fallbackMap: Record<string, string[]> = {
      'avif': ['webp', 'jpeg'],
      'jxl': ['webp', 'png'],
      'jpeg-xl': ['webp', 'png'],
      'webp': ['png', 'jpeg'],
      'qoi': ['png'],
      'wp2': ['webp', 'png'],
    };

    const fallbacks = fallbackMap[requestedFormat.toLowerCase()] || [];

    return {
      primaryFormat: requestedFormat,
      fallbackFormats: fallbacks,
      strategy: fallbacks.length > 0 ? 'fallback' : 'exact',
    };
  }

  /**
   * Creates a fallback ImageData implementation for Node.js
   */
  createImageDataFallback(width: number, height: number, data?: Uint8ClampedArray): ImageData {
    if (environmentDetector.isBrowser() && typeof ImageData !== 'undefined') {
      return data ? new ImageData(data, width, height) : new ImageData(width, height);
    }

    // Fallback implementation for Node.js
    const imageData = {
      width,
      height,
      data: data || new Uint8ClampedArray(width * height * 4),
    };

    // Add ImageData-like methods if needed
    Object.defineProperty(imageData, 'constructor', {
      value: function ImageData() {},
      writable: false,
    });

    return imageData as ImageData;
  }

  /**
   * Creates a fallback Canvas implementation for Node.js
   */
  createCanvasFallback(width: number, height: number): HTMLCanvasElement | any {
    if (environmentDetector.isBrowser() && typeof HTMLCanvasElement !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    // Try to use node-canvas if available
    if (environmentDetector.isNode()) {
      try {
        const { createCanvas } = require('canvas');
        return createCanvas(width, height);
      } catch {
        // Return a minimal canvas-like object
        return {
          width,
          height,
          getContext: () => null,
        };
      }
    }

    return null;
  }

  /**
   * Creates a fallback Blob implementation for Node.js
   */
  createBlobFallback(data: ArrayBuffer | Uint8Array, type?: string): Blob | Buffer {
    if (environmentDetector.isBrowser() && typeof Blob !== 'undefined') {
      return new Blob([data], type ? { type } : undefined);
    }

    // In Node.js, return Buffer which has similar functionality
    if (environmentDetector.isNode()) {
      return Buffer.from(data);
    }

    throw new Error('Blob not supported in this environment');
  }

  /**
   * Executes an operation with fallback retry logic
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    operationName: string = 'operation'
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`${operationName} timeout`)), this.config.timeoutMs);
        });

        const result = await Promise.race([operation(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this is the last attempt and we have a fallback, try it
        if (attempt === this.config.maxRetries - 1 && fallbackOperation) {
          try {
            return await fallbackOperation();
          } catch (fallbackError) {
            // If fallback also fails, throw the original error
            throw lastError;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.config.maxRetries} attempts`);
  }

  /**
   * Updates fallback configuration
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current fallback configuration
   */
  getConfig(): FallbackConfig {
    return { ...this.config };
  }
}

/**
 * Singleton instance of the fallback manager
 */
export const fallbackManager = new FallbackManager();