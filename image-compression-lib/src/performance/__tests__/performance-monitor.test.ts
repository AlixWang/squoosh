import { PerformanceMonitor, PerformanceComparator, timed, getGlobalPerformanceMonitor } from '../performance-monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let originalPerformance: any;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    originalPerformance = global.performance;
  });

  afterEach(() => {
    monitor.clear();
    global.performance = originalPerformance;
  });

  describe('timing operations', () => {
    it('should start and end timing', async () => {
      monitor.startTiming('test-operation');
      await new Promise(resolve => setTimeout(resolve, 10));
      const duration = monitor.endTiming('test-operation');

      expect(duration).toBeGreaterThan(0);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.name).toBe('test-operation');
      expect(metrics[0]!.duration).toBeGreaterThan(0);
    });

    it('should handle missing timing', () => {
      const duration = monitor.endTiming('non-existent');
      expect(duration).toBeNull();
    });

    it('should include metadata', async () => {
      const metadata = { operation: 'encode', format: 'webp' };
      monitor.startTiming('test-operation', metadata);
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('test-operation');

      const metrics = monitor.getMetrics();
      expect(metrics[0]!.metadata).toEqual(metadata);
    });
  });

  describe('timeFunction', () => {
    it('should time synchronous function', async () => {
      const testFn = jest.fn().mockReturnValue('result');
      
      const { result, duration } = await monitor.timeFunction('sync-test', testFn);

      expect(result).toBe('result');
      expect(duration).toBeGreaterThan(0);
      expect(testFn).toHaveBeenCalled();
    });

    it('should time asynchronous function', async () => {
      const testFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      const { result, duration } = await monitor.timeFunction('async-test', testFn);

      expect(result).toBe('async-result');
      expect(duration).toBeGreaterThan(0);
    });

    it('should handle function errors', async () => {
      const testFn = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      await expect(monitor.timeFunction('error-test', testFn)).rejects.toThrow('Test error');

      // Should still record the timing
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]!.duration).toBeGreaterThan(0);
    });
  });

  describe('benchmark', () => {
    it('should run benchmark with multiple iterations', async () => {
      // Use real timing for benchmark test
      const testFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'result';
      });

      const result = await monitor.benchmark('benchmark-test', testFn, {
        iterations: 3,
        warmupIterations: 1,
      });

      expect(testFn).toHaveBeenCalledTimes(4); // 1 warmup + 3 iterations
      expect(result.name).toBe('benchmark-test');
      expect(result.iterations).toBe(3);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeGreaterThan(0);
      expect(result.maxTime).toBeGreaterThan(0);
      expect(result.operationsPerSecond).toBeGreaterThan(0);
    });

    it('should include metadata in benchmark', async () => {
      const metadata = { algorithm: 'test' };
      const testFn = jest.fn();

      const result = await monitor.benchmark('benchmark-test', testFn, {
        iterations: 1,
        warmupIterations: 0,
        metadata,
      });

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('metrics retrieval', () => {
    beforeEach(async () => {
      // Add some test metrics
      monitor.startTiming('operation-1');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('operation-1');

      monitor.startTiming('operation-2');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('operation-2');

      monitor.startTiming('different-op');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('different-op');
    });

    it('should get all metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(3);
    });

    it('should get metrics by name pattern', () => {
      const metrics = monitor.getMetricsByName('operation');
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.name.includes('operation'))).toBe(true);
    });

    it('should get metrics by regex pattern', () => {
      const metrics = monitor.getMetricsByName(/^operation-\d+$/);
      expect(metrics).toHaveLength(2);
    });
  });

  describe('report generation', () => {
    it('should generate performance report', async () => {
      monitor.startTiming('fast-op');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('fast-op');

      monitor.startTiming('slow-op');
      await new Promise(resolve => setTimeout(resolve, 15));
      monitor.endTiming('slow-op');

      const report = monitor.generateReport();

      expect(report.metrics).toHaveLength(2);
      expect(report.summary.totalOperations).toBe(2);
      expect(report.summary.totalTime).toBeGreaterThan(0);
      expect(report.summary.averageOperationTime).toBeGreaterThan(0);
      expect(report.summary.fastestOperation).toBe('fast-op');
      expect(report.summary.slowestOperation).toBe('slow-op');
    });

    it('should handle empty report', () => {
      const report = monitor.generateReport();

      expect(report.metrics).toHaveLength(0);
      expect(report.summary.totalOperations).toBe(0);
      expect(report.summary.fastestOperation).toBe('');
      expect(report.summary.slowestOperation).toBe('');
    });
  });

  describe('data export', () => {
    it('should export data as JSON', async () => {
      monitor.startTiming('test-op');
      await new Promise(resolve => setTimeout(resolve, 5));
      monitor.endTiming('test-op');

      const exported = monitor.exportData();
      const data = JSON.parse(exported);

      expect(data.metrics).toHaveLength(1);
      expect(data.summary.totalOperations).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      monitor.startTiming('test-op');
      monitor.endTiming('test-op');

      expect(monitor.getMetrics()).toHaveLength(1);

      monitor.clear();

      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });
});

describe('timed decorator', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  it('should automatically time method calls', async () => {
    class TestClass {
      @timed(monitor, 'custom-name')
      async testMethod(value: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 10));
        return `processed-${value}`;
      }
    }

    const instance = new TestClass();
    const result = await instance.testMethod('test');

    expect(result).toBe('processed-test');

    const metrics = monitor.getMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.name).toBe('custom-name');
    expect(metrics[0]!.duration).toBeGreaterThan(0);
  });
});

describe('PerformanceComparator', () => {
  let comparator: PerformanceComparator;

  beforeEach(() => {
    comparator = new PerformanceComparator();
  });

  describe('compare', () => {
    it('should compare multiple implementations', async () => {
      const implementations = {
        'fast-impl': async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'fast';
        },
        'slow-impl': async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'slow';
        },
      };

      const results = await comparator.compare(implementations, {
        iterations: 2,
        warmupIterations: 1,
      });

      expect(results['fast-impl']).toBeDefined();
      expect(results['slow-impl']).toBeDefined();
      expect(results['fast-impl']!.averageTime).toBeLessThan(results['slow-impl']!.averageTime);
    });
  });

  describe('getComparisonReport', () => {
    it('should generate comparison report', async () => {
      const implementations = {
        'impl-a': async () => 'a',
        'impl-b': async () => 'b',
      };

      const results = await comparator.compare(implementations, { iterations: 1 });
      const report = comparator.getComparisonReport(results);

      expect(report).toContain('Performance Comparison');
      expect(report).toContain('impl-a');
      expect(report).toContain('impl-b');
      expect(report).toContain('fastest');
    });

    it('should handle empty results', () => {
      const report = comparator.getComparisonReport({});
      expect(report).toBe('No results to compare');
    });
  });
});

describe('Global PerformanceMonitor', () => {
  it('should provide global instance', () => {
    const monitor1 = getGlobalPerformanceMonitor();
    const monitor2 = getGlobalPerformanceMonitor();
    expect(monitor1).toBe(monitor2);
  });
});