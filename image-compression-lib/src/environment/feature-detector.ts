/**
 * Feature detection utilities for specific capabilities
 */

import { environmentDetector } from './environment-detector';

/**
 * Feature detection results
 */
export interface FeatureSupport {
  webAssembly: boolean;
  workers: boolean;
  wasmThreads: boolean;
  offscreenCanvas: boolean;
  sharedArrayBuffer: boolean;
  atomics: boolean;
  imageData: boolean;
  canvas: boolean;
  blob: boolean;
  arrayBuffer: boolean;
}

/**
 * Detects available features in the current environment
 */
export class FeatureDetector {
  private _cachedFeatures: FeatureSupport | null = null;

  /**
   * Gets comprehensive feature support information
   */
  async getFeatureSupport(): Promise<FeatureSupport> {
    if (this._cachedFeatures) {
      return this._cachedFeatures;
    }

    const features: FeatureSupport = {
      webAssembly: this.detectWebAssembly(),
      workers: this.detectWorkers(),
      wasmThreads: await this.detectWasmThreads(),
      offscreenCanvas: this.detectOffscreenCanvas(),
      sharedArrayBuffer: this.detectSharedArrayBuffer(),
      atomics: this.detectAtomics(),
      imageData: this.detectImageData(),
      canvas: this.detectCanvas(),
      blob: this.detectBlob(),
      arrayBuffer: this.detectArrayBuffer(),
    };

    this._cachedFeatures = features;
    return features;
  }

  /**
   * Detects WebAssembly support
   */
  private detectWebAssembly(): boolean {
    return environmentDetector.supportsWasm();
  }

  /**
   * Detects Worker support
   */
  private detectWorkers(): boolean {
    return environmentDetector.supportsWorkers();
  }

  /**
   * Detects WebAssembly threads support
   */
  private async detectWasmThreads(): Promise<boolean> {
    return await environmentDetector.supportsWasmThreads();
  }

  /**
   * Detects OffscreenCanvas support
   */
  private detectOffscreenCanvas(): boolean {
    return environmentDetector.supportsOffscreenCanvas();
  }

  /**
   * Detects SharedArrayBuffer support
   */
  private detectSharedArrayBuffer(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  }

  /**
   * Detects Atomics support
   */
  private detectAtomics(): boolean {
    return typeof Atomics !== 'undefined';
  }

  /**
   * Detects ImageData support
   */
  private detectImageData(): boolean {
    if (environmentDetector.isBrowser()) {
      return typeof ImageData !== 'undefined';
    } else if (environmentDetector.isNode()) {
      // In Node.js, we might need to use a polyfill or canvas library
      try {
        // Check if canvas is available (common Node.js image library)
        require.resolve('canvas');
        return true;
      } catch {
        // Check if we have a custom ImageData implementation
        return typeof global !== 'undefined' && 'ImageData' in global;
      }
    }
    return false;
  }

  /**
   * Detects Canvas support
   */
  private detectCanvas(): boolean {
    if (environmentDetector.isBrowser()) {
      return typeof HTMLCanvasElement !== 'undefined';
    } else if (environmentDetector.isNode()) {
      try {
        require.resolve('canvas');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Detects Blob support
   */
  private detectBlob(): boolean {
    if (environmentDetector.isBrowser()) {
      return typeof Blob !== 'undefined';
    } else if (environmentDetector.isNode()) {
      // Node.js has Buffer, which can be used similarly to Blob
      return typeof Buffer !== 'undefined';
    }
    return false;
  }

  /**
   * Detects ArrayBuffer support
   */
  private detectArrayBuffer(): boolean {
    return typeof ArrayBuffer !== 'undefined';
  }

  /**
   * Checks if a specific codec format is likely to be supported
   */
  async isCodecSupported(format: string): Promise<boolean> {
    const features = await this.getFeatureSupport();
    
    // Basic requirement: WebAssembly support for most codecs
    if (!features.webAssembly) {
      return false;
    }

    // Format-specific checks
    switch (format.toLowerCase()) {
      case 'webp':
        // WebP has good browser support, but we might need WASM fallback
        return true;
      
      case 'avif':
        // AVIF requires more modern features
        return features.webAssembly;
      
      case 'jxl':
      case 'jpeg-xl':
        // JPEG XL is newer and might benefit from threading
        return features.webAssembly;
      
      case 'png':
      case 'jpeg':
        // Basic formats should work everywhere
        return true;
      
      default:
        // Unknown format, require WebAssembly
        return features.webAssembly;
    }
  }

  /**
   * Determines the optimal processing strategy based on available features
   */
  async getOptimalProcessingStrategy(): Promise<{
    useWorkers: boolean;
    useWasmThreads: boolean;
    maxConcurrency: number;
    preferredFormats: string[];
  }> {
    const features = await this.getFeatureSupport();
    const envInfo = environmentDetector.getEnvironmentInfo();

    return {
      useWorkers: features.workers && envInfo.concurrency > 1,
      useWasmThreads: features.wasmThreads,
      maxConcurrency: Math.max(1, Math.min(envInfo.concurrency, 8)), // Cap at 8 workers
      preferredFormats: this.getPreferredFormats(features),
    };
  }

  /**
   * Gets preferred image formats based on feature support
   */
  private getPreferredFormats(features: FeatureSupport): string[] {
    const formats: string[] = [];

    // Always support basic formats
    formats.push('png', 'jpeg');

    // Add modern formats if WebAssembly is available
    if (features.webAssembly) {
      formats.push('webp', 'avif');
      
      // Add cutting-edge formats if threading is available
      if (features.wasmThreads) {
        formats.push('jxl');
      }
    }

    return formats;
  }

  /**
   * Clears cached feature detection results
   */
  clearCache(): void {
    this._cachedFeatures = null;
  }
}

/**
 * Singleton instance of the feature detector
 */
export const featureDetector = new FeatureDetector();