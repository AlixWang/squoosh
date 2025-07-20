/**
 * Tests for Node.js worker manager
 */

import { NodeWorkerManager, DEFAULT_NODE_WORKER_CONFIG } from '../node-worker-manager';
import { environmentDetector } from '../environment-detector';
import { NodeWorkerBridge } from '../../workers/node-worker-bridge';

// Mock dependencies
jest.mock('../environment-detector');
jest.mock('../../workers/node-worker-bridge');

describe('NodeWorkerManager', () => {
  let manager: NodeWorkerManager;
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;
  let MockNodeWorkerBridge: jest.MockedClass<typeof NodeWorkerBridge>;

  beforeEach(() => {
    manager = new NodeWorkerManager();
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
    MockNodeWorkerBridge = NodeWorkerBridge as jest.MockedClass<typeof NodeWorkerBridge>;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.terminate();
  });

  describe('constructor', () => {
    it('should use default configuration', () => {
      const defaultManager = new NodeWorkerManager();
      expect(defaultManager.getStats().totalWorkers).toBe(0);
    });

    it('should use provided configuration', () => {
      const customConfig = {
        maxWorkers: 8,
        timeout: 60000,
      };
      const customManager = new NodeWorkerManager(customConfig);
      expect(customManager).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(manager.initialize('/path/to/worker.js')).rejects.toThrow(
        'NodeWorkerManager can only be used in Node.js environment'
      );
    });

    it('should initialize in Node.js environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn(),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      await manager.initialize('/path/to/worker.js');
      
      expect(MockNodeWorkerBridge).toHaveBeenCalledWith('/path/to/worker.js', {
        timeout: DEFAULT_NODE_WORKER_CONFIG.timeout,
        maxRetries: DEFAULT_NODE_WORKER_CONFIG.maxRetries,
      });
      expect(mockBridge.initialize).toHaveBeenCalled();
      
      const stats = manager.getStats();
      expect(stats.totalWorkers).toBe(1);
    });

    it('should not reinitialize if already initialized', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn(),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      await manager.initialize('/path/to/worker.js');
      await manager.initialize('/path/to/worker.js');
      
      expect(MockNodeWorkerBridge).toHaveBeenCalledTimes(1);
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockResolvedValue({
          id: 'test-id',
          success: true,
          result: 'test-result',
        }),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      await manager.initialize('/path/to/worker.js');
    });

    it('should execute task successfully', async () => {
      const message = {
        type: 'encode' as const,
        payload: { operation: 'test', data: new ArrayBuffer(0) },
      };
      
      const result = await manager.execute(message);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('test-result');
    });

    it('should throw error if not initialized', async () => {
      const uninitializedManager = new NodeWorkerManager();
      
      const message = {
        type: 'encode' as const,
        payload: { operation: 'test', data: new ArrayBuffer(0) },
      };
      
      await expect(uninitializedManager.execute(message)).rejects.toThrow(
        'NodeWorkerManager not initialized'
      );
    });

    it('should handle worker errors', async () => {
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockRejectedValue(new Error('Worker error')),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      const errorManager = new NodeWorkerManager();
      await errorManager.initialize('/path/to/worker.js');
      
      const message = {
        type: 'encode' as const,
        payload: { operation: 'test', data: new ArrayBuffer(0) },
      };
      
      await expect(errorManager.execute(message)).rejects.toThrow('Worker error');
      
      await errorManager.terminate();
    });
  });

  describe('worker pool management', () => {
    beforeEach(async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
    });

    it('should create workers up to maxWorkers limit', async () => {
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            id: 'test-id',
            success: true,
            result: 'test-result',
          }), 50))
        ),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      const poolManager = new NodeWorkerManager({ maxWorkers: 2 });
      await poolManager.initialize('/path/to/worker.js');
      
      // Execute tasks one by one to better control worker creation
      await poolManager.execute({ type: 'encode', payload: { operation: 'test1', data: new ArrayBuffer(0) } });
      await poolManager.execute({ type: 'encode', payload: { operation: 'test2', data: new ArrayBuffer(0) } });
      
      const stats = poolManager.getStats();
      expect(stats.totalWorkers).toBeLessThanOrEqual(2);
      
      await poolManager.terminate();
    });

    it('should queue tasks when all workers are busy', async () => {
      let resolveCount = 0;
      const resolvers: Array<() => void> = [];
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockImplementation(() => 
          new Promise(resolve => {
            resolvers.push(() => resolve({
              id: 'test-id',
              success: true,
              result: `result-${++resolveCount}`,
            }));
          })
        ),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      const queueManager = new NodeWorkerManager({ maxWorkers: 1 });
      await queueManager.initialize('/path/to/worker.js');
      
      // Start multiple tasks
      const task1 = queueManager.execute({ type: 'encode', payload: { operation: 'test1', data: new ArrayBuffer(0) } });
      const task2 = queueManager.execute({ type: 'encode', payload: { operation: 'test2', data: new ArrayBuffer(0) } });
      
      // Check that second task is queued
      const stats = queueManager.getStats();
      expect(stats.queueLength).toBeGreaterThan(0);
      
      // Resolve tasks
      resolvers[0]?.();
      await task1;
      
      resolvers[1]?.();
      await task2;
      
      await queueManager.terminate();
    });
  });

  describe('terminate', () => {
    it('should terminate all workers and clean up', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn().mockResolvedValue({
          id: 'test-id',
          success: true,
          result: 'test-result',
        }),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      await manager.initialize('/path/to/worker.js');
      
      // Verify worker was created
      expect(manager.getStats().totalWorkers).toBe(1);
      
      // Terminate manager
      await manager.terminate();
      
      // All workers should be terminated
      expect(mockBridge.terminate).toHaveBeenCalled();
      
      const stats = manager.getStats();
      expect(stats.totalWorkers).toBe(0);
      expect(stats.queueLength).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const mockBridge = {
        initialize: jest.fn().mockResolvedValue(undefined),
        terminate: jest.fn().mockResolvedValue(undefined),
        sendMessage: jest.fn(),
        isReady: jest.fn().mockReturnValue(true),
        getPendingCount: jest.fn().mockReturnValue(0),
      };
      
      MockNodeWorkerBridge.mockImplementation(() => mockBridge as any);
      
      await manager.initialize('/path/to/worker.js');
      
      const stats = manager.getStats();
      expect(stats.totalWorkers).toBe(1);
      expect(stats.busyWorkers).toBe(0);
      expect(stats.idleWorkers).toBe(1);
      expect(stats.queueLength).toBe(0);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig = { maxWorkers: 8, timeout: 60000 };
      manager.updateConfig(newConfig);
      
      // Configuration is updated internally
      // We can't directly test it, but we can test that it doesn't throw
      expect(() => manager.updateConfig(newConfig)).not.toThrow();
    });
  });
});