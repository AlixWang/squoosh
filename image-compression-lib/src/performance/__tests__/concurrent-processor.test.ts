import { ConcurrentProcessor, ProcessingTask, getGlobalConcurrentProcessor, configureGlobalConcurrentProcessor } from '../concurrent-processor';

// Mock memory utilities
jest.mock('../../memory/memory-monitor', () => ({
  getGlobalMemoryMonitor: () => ({
    getCurrentUsage: () => ({
      usedJSHeapSize: 50 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    }),
  }),
}));

jest.mock('../../memory/gc-optimizer', () => ({
  getGlobalGCOptimizer: () => ({
    optimizeBeforeOperation: jest.fn(),
    optimizeAfterOperation: jest.fn(),
  }),
}));

describe('ConcurrentProcessor', () => {
  let processor: ConcurrentProcessor;

  beforeEach(() => {
    processor = new ConcurrentProcessor({
      maxConcurrency: 2,
      memoryThreshold: 0.8,
      operationTimeout: 1000,
      enableMemoryOptimization: false, // Disable for testing
    });
  });

  afterEach(() => {
    processor.resetStats();
    processor.clearQueue();
  });

  describe('processTask', () => {
    it('should process a single task successfully', async () => {
      const task: ProcessingTask<string> = {
        id: 'test-1',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'result';
        },
      };

      const result = await processor.processTask(task);

      expect(result.success).toBe(true);
      expect(result.result).toBe('result');
      expect(result.id).toBe('test-1');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle task failures', async () => {
      const task: ProcessingTask<string> = {
        id: 'test-fail',
        operation: async () => {
          throw new Error('Task failed');
        },
      };

      const result = await processor.processTask(task);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Task failed');
    });

    it('should handle task timeout', async () => {
      const task: ProcessingTask<string> = {
        id: 'test-timeout',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Longer than timeout
          return 'result';
        },
      };

      const result = await processor.processTask(task);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('processAll', () => {
    it('should process multiple tasks concurrently', async () => {
      const tasks: ProcessingTask<number>[] = [
        {
          id: 'task-1',
          operation: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 1;
          },
        },
        {
          id: 'task-2',
          operation: async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return 2;
          },
        },
        {
          id: 'task-3',
          operation: async () => {
            await new Promise(resolve => setTimeout(resolve, 20));
            return 3;
          },
        },
      ];

      const startTime = Date.now();
      const results = await processor.processAll(tasks);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      
      // Should be faster than sequential processing
      expect(totalTime).toBeLessThan(100); // Sequential would be ~100ms
      
      const stats = processor.getStats();
      expect(stats.completedTasks).toBe(3);
      expect(stats.totalTasks).toBe(3);
    });

    it('should respect concurrency limits', async () => {
      const concurrentTasks = new Set<string>();
      let maxConcurrent = 0;

      const tasks: ProcessingTask<number>[] = Array.from({ length: 5 }, (_, i) => ({
        id: `task-${i}`,
        operation: async () => {
          concurrentTasks.add(`task-${i}`);
          maxConcurrent = Math.max(maxConcurrent, concurrentTasks.size);
          
          await new Promise(resolve => setTimeout(resolve, 50));
          
          concurrentTasks.delete(`task-${i}`);
          return i;
        },
      }));

      await processor.processAll(tasks);

      expect(maxConcurrent).toBeLessThanOrEqual(2); // maxConcurrency is 2
    });

    it('should handle mixed success and failure', async () => {
      const tasks: ProcessingTask<number>[] = [
        {
          id: 'success-1',
          operation: async () => 1,
        },
        {
          id: 'failure-1',
          operation: async () => {
            throw new Error('Failed');
          },
        },
        {
          id: 'success-2',
          operation: async () => 2,
        },
      ];

      const results = await processor.processAll(tasks);

      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(2);
      expect(results.filter(r => !r.success)).toHaveLength(1);
    });

    it('should process tasks by priority', async () => {
      const executionOrder: string[] = [];
      
      const tasks: ProcessingTask<number>[] = [
        {
          id: 'low-priority',
          priority: 1,
          operation: async () => {
            executionOrder.push('low-priority');
            return 1;
          },
        },
        {
          id: 'high-priority',
          priority: 10,
          operation: async () => {
            executionOrder.push('high-priority');
            return 2;
          },
        },
        {
          id: 'medium-priority',
          priority: 5,
          operation: async () => {
            executionOrder.push('medium-priority');
            return 3;
          },
        },
      ];

      await processor.processAll(tasks);

      // High priority should execute first
      expect(executionOrder[0]).toBe('high-priority');
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const tasks: ProcessingTask<number>[] = [
        { 
          id: 'task-1', 
          operation: async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 1;
          }
        },
        { 
          id: 'task-2', 
          operation: async () => { 
            await new Promise(resolve => setTimeout(resolve, 5));
            throw new Error('fail'); 
          } 
        },
      ];

      await processor.processAll(tasks);

      const stats = processor.getStats();
      expect(stats.totalTasks).toBe(2);
      expect(stats.completedTasks).toBe(1);
      expect(stats.failedTasks).toBe(1);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', async () => {
      const task: ProcessingTask<number> = {
        id: 'task-1',
        operation: async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          return 1;
        },
      };

      await processor.processTask(task);
      
      let stats = processor.getStats();
      expect(stats.completedTasks).toBe(1); // Check completed tasks instead

      processor.resetStats();
      
      stats = processor.getStats();
      expect(stats.totalTasks).toBe(0);
      expect(stats.completedTasks).toBe(0);
      expect(stats.failedTasks).toBe(0);
    });
  });
});

describe('Global ConcurrentProcessor', () => {
  it('should provide global instance', () => {
    const processor1 = getGlobalConcurrentProcessor();
    const processor2 = getGlobalConcurrentProcessor();
    expect(processor1).toBe(processor2);
  });

  it('should allow configuration', () => {
    configureGlobalConcurrentProcessor({ maxConcurrency: 8 });
    const processor = getGlobalConcurrentProcessor();
    expect(processor).toBeInstanceOf(ConcurrentProcessor);
  });
});