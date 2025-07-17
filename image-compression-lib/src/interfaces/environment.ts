/**
 * Environment detection and feature support interfaces
 */

// Environment detection interface
export interface EnvironmentDetector {
  /**
   * Determines if the code is running in a browser environment
   */
  isBrowser(): boolean;

  /**
   * Determines if the code is running in a Node.js environment
   */
  isNode(): boolean;

  /**
   * Checks if WebAssembly is supported in the current environment
   */
  supportsWasm(): boolean;

  /**
   * Checks if Web Workers are supported in the current environment
   */
  supportsWorkers(): boolean;

  /**
   * Checks if WebAssembly threads are supported in the current environment
   */
  supportsWasmThreads(): Promise<boolean>;

  /**
   * Checks if the OffscreenCanvas API is supported in the current environment
   */
  supportsOffscreenCanvas(): boolean;

  /**
   * Gets information about the current environment
   */
  getEnvironmentInfo(): EnvironmentInfo;
}

// Environment information interface
export interface EnvironmentInfo {
  environment: 'browser' | 'node' | 'unknown';
  wasmSupport: boolean;
  workerSupport: boolean;
  wasmThreadsSupport: boolean;
  offscreenCanvasSupport: boolean;
  concurrency: number;
}
