/**
 * Environment detection and feature support interfaces
 */

/**
 * Interface for detecting the current runtime environment and its capabilities.
 * Used to adapt library behavior based on available features.
 *
 * @public
 */
export interface EnvironmentDetector {
  /**
   * Determines if the code is running in a browser environment.
   *
   * @returns True if running in a browser
   *
   * @example
   * ```typescript
   * if (detector.isBrowser()) {
   *   // Use browser-specific APIs
   * }
   * ```
   */
  isBrowser(): boolean;

  /**
   * Determines if the code is running in a Node.js environment.
   *
   * @returns True if running in Node.js
   *
   * @example
   * ```typescript
   * if (detector.isNode()) {
   *   // Use Node.js-specific APIs
   * }
   * ```
   */
  isNode(): boolean;

  /**
   * Checks if WebAssembly is supported in the current environment.
   *
   * @returns True if WebAssembly is available
   */
  supportsWasm(): boolean;

  /**
   * Checks if Web Workers are supported in the current environment.
   * In Node.js, this checks for worker_threads support.
   *
   * @returns True if workers are available
   */
  supportsWorkers(): boolean;

  /**
   * Checks if WebAssembly threads are supported in the current environment.
   * This requires both WebAssembly and SharedArrayBuffer support.
   *
   * @returns Promise that resolves to true if WASM threads are supported
   */
  supportsWasmThreads(): Promise<boolean>;

  /**
   * Checks if the OffscreenCanvas API is supported in the current environment.
   * Useful for image processing in workers.
   *
   * @returns True if OffscreenCanvas is available
   */
  supportsOffscreenCanvas(): boolean;

  /**
   * Gets comprehensive information about the current environment and its capabilities.
   *
   * @returns Object containing environment information
   *
   * @example
   * ```typescript
   * const info = detector.getEnvironmentInfo();
   * console.log(`Running in ${info.environment} with ${info.concurrency} threads`);
   * ```
   */
  getEnvironmentInfo(): EnvironmentInfo;
}

/**
 * Comprehensive information about the current runtime environment.
 *
 * @public
 */
export interface EnvironmentInfo {
  /** The detected environment type */
  environment: 'browser' | 'node' | 'unknown';

  /** Whether WebAssembly is supported */
  wasmSupport: boolean;

  /** Whether workers are supported */
  workerSupport: boolean;

  /** Whether WebAssembly threads are supported */
  wasmThreadsSupport: boolean;

  /** Whether OffscreenCanvas is supported */
  offscreenCanvasSupport: boolean;

  /** Number of available CPU cores/threads */
  concurrency: number;
}
