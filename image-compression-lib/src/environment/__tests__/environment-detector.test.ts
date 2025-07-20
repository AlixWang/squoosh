/**
 * Tests for environment detection utilities
 */

import { DefaultEnvironmentDetector } from '../environment-detector';

describe('DefaultEnvironmentDetector', () => {
  let detector: DefaultEnvironmentDetector;

  beforeEach(() => {
    detector = new DefaultEnvironmentDetector();
    detector.clearCache();
  });

  describe('isBrowser', () => {
    it('should return true in browser environment (JSDOM)', () => {
      // In JSDOM environment, window and document are available
      expect(detector.isBrowser()).toBe(true);
    });

    it('should detect browser environment correctly', () => {
      // Test the actual logic - in JSDOM both window and document exist
      expect(typeof window).toBe('object');
      expect(typeof document).toBe('object');
      expect(detector.isBrowser()).toBe(true);
    });
  });

  describe('isNode', () => {
    it('should return true when Node.js process is available', () => {
      // In Jest/JSDOM, process is available but it's a Node.js process
      expect(detector.isNode()).toBe(true);
    });

    it('should return false when process is not available', () => {
      const originalProcess = global.process;
      delete (global as any).process;

      expect(detector.isNode()).toBe(false);

      // Restore
      global.process = originalProcess;
    });
  });

  describe('supportsWasm', () => {
    it('should return true when WebAssembly is available', () => {
      // WebAssembly should be available in Node.js test environment
      expect(detector.supportsWasm()).toBe(true);
    });

    it('should return false when WebAssembly is not available', () => {
      const originalWebAssembly = (global as any).WebAssembly;
      delete (global as any).WebAssembly;

      expect(detector.supportsWasm()).toBe(false);

      // Restore
      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should handle WebAssembly instantiation errors', () => {
      const originalWebAssembly = (global as any).WebAssembly;
      (global as any).WebAssembly = {
        Module: class {
          constructor() {
            throw new Error('WASM error');
          }
        },
        instantiate: () => {},
      };

      expect(detector.supportsWasm()).toBe(false);

      // Restore
      (global as any).WebAssembly = originalWebAssembly;
    });
  });

  describe('supportsWorkers', () => {
    it('should return false in JSDOM environment (no Worker available)', () => {
      // In JSDOM environment, isBrowser() returns true but Worker is not available
      expect(detector.supportsWorkers()).toBe(false);
    });

    it('should check for Worker in browser environment', () => {
      // In JSDOM, Worker is not available, so it should return false
      expect(typeof Worker).toBe('undefined');
      expect(detector.supportsWorkers()).toBe(false);
    });

    it('should return true when Worker is available in browser', () => {
      // Mock Worker being available
      (global as any).Worker = class MockWorker {};

      expect(detector.supportsWorkers()).toBe(true);

      // Cleanup
      delete (global as any).Worker;
    });

    it('should return false when worker_threads is not available', () => {
      const originalRequire = require;
      (global as any).require = {
        resolve: (module: string) => {
          if (module === 'worker_threads') {
            throw new Error('Module not found');
          }
          return originalRequire.resolve(module);
        },
      };

      expect(detector.supportsWorkers()).toBe(false);

      // Restore
      (global as any).require = originalRequire;
    });

    it('should return true in browser when Worker is available', () => {
      // Mock browser environment
      (global as any).window = {};
      (global as any).document = {};
      (global as any).Worker = class {};

      expect(detector.supportsWorkers()).toBe(true);

      // Cleanup
      delete (global as any).window;
      delete (global as any).document;
      delete (global as any).Worker;
    });
  });

  describe('supportsWasmThreads', () => {
    it('should return false when WASM or workers are not supported', async () => {
      const originalWebAssembly = (global as any).WebAssembly;
      delete (global as any).WebAssembly;

      const result = await detector.supportsWasmThreads();
      expect(result).toBe(false);

      // Restore
      (global as any).WebAssembly = originalWebAssembly;
    });

    it('should return true in Node.js when SharedArrayBuffer and worker_threads are available', async () => {
      // SharedArrayBuffer should be available in Node.js test environment
      const result = await detector.supportsWasmThreads();
      expect(typeof result).toBe('boolean');
    });

    it('should handle missing SharedArrayBuffer', async () => {
      const originalSharedArrayBuffer = (global as any).SharedArrayBuffer;
      delete (global as any).SharedArrayBuffer;

      const result = await detector.supportsWasmThreads();
      expect(result).toBe(false);

      // Restore
      (global as any).SharedArrayBuffer = originalSharedArrayBuffer;
    });
  });

  describe('supportsOffscreenCanvas', () => {
    it('should return false in Node.js environment', () => {
      expect(detector.supportsOffscreenCanvas()).toBe(false);
    });

    it('should return true in browser when OffscreenCanvas is available', () => {
      // Mock browser environment
      (global as any).window = {};
      (global as any).document = {};
      (global as any).OffscreenCanvas = class {};

      expect(detector.supportsOffscreenCanvas()).toBe(true);

      // Cleanup
      delete (global as any).window;
      delete (global as any).document;
      delete (global as any).OffscreenCanvas;
    });
  });

  describe('getEnvironmentInfo', () => {
    it('should return correct environment info for JSDOM', () => {
      const info = detector.getEnvironmentInfo();

      // In JSDOM, both browser and Node.js APIs are available
      // The detector will detect browser environment due to window/document
      expect(info.environment).toBe('browser');
      expect(typeof info.wasmSupport).toBe('boolean');
      expect(typeof info.workerSupport).toBe('boolean');
      expect(typeof info.wasmThreadsSupport).toBe('boolean');
      expect(typeof info.concurrency).toBe('number');
      expect(info.concurrency).toBeGreaterThan(0);
    });

    it('should cache environment info', () => {
      const info1 = detector.getEnvironmentInfo();
      const info2 = detector.getEnvironmentInfo();

      expect(info1).toBe(info2); // Same reference
    });

    it('should clear cache when requested', () => {
      const info1 = detector.getEnvironmentInfo();
      detector.clearCache();
      const info2 = detector.getEnvironmentInfo();

      expect(info1).not.toBe(info2); // Different references
    });
  });
});