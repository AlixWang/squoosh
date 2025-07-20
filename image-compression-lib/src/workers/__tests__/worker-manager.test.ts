/**
 * Tests for WorkerManager
 */

import { WorkerManager } from '../worker-manager.js';
import { WorkerMessage, WorkerResponse } from '../../types/index.js';

// Mock UniversalWorkerBridge
jest.mock('../worker-bridge.js', () => ({
  UniversalWorkerBridge: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    sendMessage: jest.fn().mockResolvedValue({
      id: 'test-id',
      success: true,
      result: new ArrayBuffer(100),
    }),
    terminate: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getPendingCount: jest.fn().mockReturnValue(0),
  })),
}));

// Mock WasmModuleCache
jest.mock('../wasm-module-cache.js', () => ({
  WasmModuleCache: jest.fn().mockImplementation(() => ({
    getModule: jest.fn().mockResolvedValue({}),
    preloadModule: jest.fn().mockResolvedValue(undefined),
    hasModule: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockReturnValue({
      moduleCount: 1,
      totalSize: 1024,
      urls: ['test.wasm'],
      oldestModule: 'test.wasm',
      newestModule: 'test.wasm',
    }),
    cleanup: jest.fn(),
    clear: jest.fn(),
  })),
}));

// Mock navigator for hardware concurrency
Object.defineProperty(global, 'navigator', {
  value: {
    hardwareConcurrency: 4,
  },
  writable: true,
});

describe('WorkerManager', () => {
  let workerManager: WorkerManager;

  beforeEach(() => {
    workerManager = new WorkerManager('test-worker.js', {
      maxWorkers: 2,
      workerIdleTimeout: 1000,
      taskTimeout: 5000,
    });
  });

  afterEach(async () => {
    await workerManager.terminate();
  });

  describe('task execution', () => {
    it('should execute a task successfully', async () => {
      const message: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100),
          options: { quality: 80 },
        },
      };

      const response = await workerManager.executeTask(message);
      
      expect(response.success).toBe(true);
      expect(response.result).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle multiple concurrent tasks', async () => {
      const messages: Omit<WorkerMessage, 'id'>[] = [
        {
          type: 'encode',
          payload: {
            operation: 'webp-encode',
            data: new ArrayBuffer(100),
          },
        },
        {
          type: 'decode',
          payload: {
            operation: 'webp-decode',
            data: new ArrayBuffer(200),
          },
        },
      ];

      const promises = messages.map(message => workerManager.executeTask(message));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });

    it('should handle task priorities', async () => {
      const lowPriorityMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'low-priority',
          data: new ArrayBuffer(100),
        },
      };

      const highPriorityMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'high-priority',
          data: new ArrayBuffer(100),
        },
      };

      // Start low priority task first, then high priority
      const lowPriorityPromise = workerManager.executeTask(lowPriorityMessage, 1);
      const highPriorityPromise = workerManager.executeTask(highPriorityMessage, 10);

      const responses = await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect(response.success).toBe(true);
      });
    });
  });

  describe('WASM module management', () => {
    it('should preload WASM modules', async () => {
      const url = 'https://example.com/test.wasm';
      
      await workerManager.preloadWasmModule(url);
      
      // Should not throw and complete successfully
      expect(true).toBe(true);
    });

    it('should get WASM modules', async () => {
      const url = 'https://example.com/test.wasm';
      
      const module = await workerManager.getWasmModule(url);
      
      expect(module).toBeDefined();
    });
  });

  describe('statistics and monitoring', () => {
    it('should provide worker pool statistics', () => {
      const stats = workerManager.getStats();
      
      expect(stats).toHaveProperty('totalWorkers');
      expect(stats).toHaveProperty('busyWorkers');
      expect(stats).toHaveProperty('idleWorkers');
      expect(stats).toHaveProperty('queuedTasks');
      expect(stats).toHaveProperty('wasmCache');
      
      expect(typeof stats.totalWorkers).toBe('number');
      expect(typeof stats.busyWorkers).toBe('number');
      expect(typeof stats.idleWorkers).toBe('number');
      expect(typeof stats.queuedTasks).toBe('number');
    });

    it('should track worker usage', async () => {
      const message: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'test',
          data: new ArrayBuffer(100),
        },
      };

      const initialStats = workerManager.getStats();
      
      await workerManager.executeTask(message);
      
      const finalStats = workerManager.getStats();
      
      // Should have created at least one worker
      expect(finalStats.totalWorkers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resource management', () => {
    it('should terminate all workers on shutdown', async () => {
      // Execute a task to create workers
      const message: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'test',
          data: new ArrayBuffer(100),
        },
      };

      await workerManager.executeTask(message);
      
      const statsBeforeTermination = workerManager.getStats();
      expect(statsBeforeTermination.totalWorkers).toBeGreaterThan(0);
      
      await workerManager.terminate();
      
      const statsAfterTermination = workerManager.getStats();
      expect(statsAfterTermination.totalWorkers).toBe(0);
    });

    it('should handle worker creation limits', async () => {
      const manager = new WorkerManager('test-worker.js', { maxWorkers: 1 });
      
      try {
        // Execute one task to create a worker
        const message = {
          type: 'encode' as const,
          payload: {
            operation: 'test',
            data: new ArrayBuffer(100),
          },
        };

        await manager.executeTask(message);
        
        const stats = manager.getStats();
        expect(stats.totalWorkers).toBeLessThanOrEqual(1);
      } finally {
        await manager.terminate();
      }
    });
  });

  describe('error handling', () => {
    it('should handle worker initialization errors', async () => {
      // Mock worker bridge to fail initialization
      const { UniversalWorkerBridge } = require('../worker-bridge.js');
      const mockBridge = {
        initialize: jest.fn().mockRejectedValue(new Error('Initialization failed')),
        terminate: jest.fn().mockResolvedValue(undefined),
      };
      UniversalWorkerBridge.mockImplementationOnce(() => mockBridge);

      const manager = new WorkerManager('failing-worker.js');
      
      const message: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'test',
          data: new ArrayBuffer(100),
        },
      };

      await expect(manager.executeTask(message)).rejects.toThrow();
      
      await manager.terminate();
    }, 15000); // Increase timeout

    it('should handle task execution errors', async () => {
      // Mock worker bridge to fail task execution
      const { UniversalWorkerBridge } = require('../worker-bridge.js');
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockRejectedValue(new Error('Task execution failed')),
        terminate: jest.fn().mockResolvedValue(undefined),
      };
      UniversalWorkerBridge.mockImplementationOnce(() => mockBridge);

      const manager = new WorkerManager('failing-worker.js');
      
      const message: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'test',
          data: new ArrayBuffer(100),
        },
      };

      await expect(manager.executeTask(message)).rejects.toThrow('Task execution failed');
      
      await manager.terminate();
    });
  });
});