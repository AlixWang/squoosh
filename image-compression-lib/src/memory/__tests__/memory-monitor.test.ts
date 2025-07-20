import { MemoryMonitor, getGlobalMemoryMonitor, configureGlobalMemoryMonitor } from '../memory-monitor';

// Mock performance.memory
const mockPerformanceMemory = {
  usedJSHeapSize: 10 * 1024 * 1024, // 10MB
  totalJSHeapSize: 20 * 1024 * 1024, // 20MB
  jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
};

// Mock performance object
const mockPerformance = {
  memory: mockPerformanceMemory,
};

describe('MemoryMonitor', () => {
  let memoryMonitor: MemoryMonitor;
  let originalPerformance: any;

  beforeEach(() => {
    memoryMonitor = new MemoryMonitor({
      warningThreshold: 0.7,
      criticalThreshold: 0.9,
    });

    // Mock performance.memory
    originalPerformance = global.performance;
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    });
    memoryMonitor.clearHistory();
  });

  describe('getCurrentUsage', () => {
    it('should return memory usage with performance.memory', () => {
      const usage = memoryMonitor.getCurrentUsage();
      
      expect(usage.usedJSHeapSize).toBe(mockPerformanceMemory.usedJSHeapSize);
      expect(usage.totalJSHeapSize).toBe(mockPerformanceMemory.totalJSHeapSize);
      expect(usage.jsHeapSizeLimit).toBe(mockPerformanceMemory.jsHeapSizeLimit);
      expect(usage.timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should handle missing performance.memory', () => {
      // Mock performance without memory property
      Object.defineProperty(global, 'performance', {
        value: {},
        writable: true,
        configurable: true,
      });
      
      // Mock process to not have memoryUsage
      const originalProcess = global.process;
      Object.defineProperty(global, 'process', {
        value: {},
        writable: true,
        configurable: true,
      });
      
      const usage = memoryMonitor.getCurrentUsage();
      
      expect(usage.usedJSHeapSize).toBeUndefined();
      expect(usage.timestamp).toBeCloseTo(Date.now(), -2);
      
      // Restore process
      Object.defineProperty(global, 'process', {
        value: originalProcess,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('recordMeasurement', () => {
    it('should record measurement and return usage', () => {
      const usage = memoryMonitor.recordMeasurement();
      
      expect(usage.usedJSHeapSize).toBe(mockPerformanceMemory.usedJSHeapSize);
      
      const stats = memoryMonitor.getStats();
      expect(stats?.measurementCount).toBe(1);
    });

    it('should limit measurement history', () => {
      // Record more than max measurements
      for (let i = 0; i < 150; i++) {
        memoryMonitor.recordMeasurement();
      }
      
      const stats = memoryMonitor.getStats();
      expect(stats?.measurementCount).toBe(100); // Should be limited
    });
  });

  describe('alert system', () => {
    it('should emit warning alert when threshold exceeded', (done) => {
      // Set high memory usage to trigger warning
      Object.defineProperty(global, 'performance', {
        value: {
          memory: {
            ...mockPerformanceMemory,
            usedJSHeapSize: 75 * 1024 * 1024, // 75MB (75% of 100MB limit)
          },
        },
        writable: true,
        configurable: true,
      });

      memoryMonitor.onAlert((alert) => {
        expect(alert.level).toBe('warning');
        expect(alert.message).toContain('High memory usage');
        done();
      });

      memoryMonitor.recordMeasurement();
    });

    it('should emit critical alert when threshold exceeded', (done) => {
      // Set very high memory usage to trigger critical alert
      Object.defineProperty(global, 'performance', {
        value: {
          memory: {
            ...mockPerformanceMemory,
            usedJSHeapSize: 95 * 1024 * 1024, // 95MB (95% of 100MB limit)
          },
        },
        writable: true,
        configurable: true,
      });

      memoryMonitor.onAlert((alert) => {
        expect(alert.level).toBe('critical');
        expect(alert.message).toContain('Critical memory usage');
        done();
      });

      memoryMonitor.recordMeasurement();
    });

    it('should allow removing alert callbacks', () => {
      const callback = jest.fn();
      
      memoryMonitor.onAlert(callback);
      memoryMonitor.offAlert(callback);
      
      // Set high memory usage
      Object.defineProperty(global, 'performance', {
        value: {
          memory: {
            ...mockPerformanceMemory,
            usedJSHeapSize: 95 * 1024 * 1024,
          },
        },
        writable: true,
        configurable: true,
      });

      memoryMonitor.recordMeasurement();
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return null when no measurements', () => {
      const stats = memoryMonitor.getStats();
      expect(stats).toBeNull();
    });

    it('should calculate statistics correctly', () => {
      // Record several measurements with different memory usage
      const usages = [10, 15, 20, 25, 30].map(mb => mb * 1024 * 1024);
      
      usages.forEach(usage => {
        Object.defineProperty(global, 'performance', {
          value: {
            memory: {
              ...mockPerformanceMemory,
              usedJSHeapSize: usage,
            },
          },
          writable: true,
          configurable: true,
        });
        memoryMonitor.recordMeasurement();
      });

      const stats = memoryMonitor.getStats();
      
      expect(stats).not.toBeNull();
      expect(stats!.measurementCount).toBe(5);
      expect(stats!.maximum).toBe(30 * 1024 * 1024);
      expect(stats!.minimum).toBe(10 * 1024 * 1024);
      expect(stats!.average).toBe(20 * 1024 * 1024);
    });
  });

  describe('suggestGC', () => {
    it('should return false when GC hints disabled', () => {
      const monitor = new MemoryMonitor({ enableGCHints: false });
      const result = monitor.suggestGC();
      expect(result).toBe(false);
    });

    it('should attempt GC when global.gc is available', () => {
      const mockGC = jest.fn();
      (global as any).gc = mockGC;

      const result = memoryMonitor.suggestGC();
      
      expect(result).toBe(true);
      expect(mockGC).toHaveBeenCalled();
      
      delete (global as any).gc;
    });
  });
});

describe('Global MemoryMonitor', () => {
  it('should provide global instance', () => {
    const monitor1 = getGlobalMemoryMonitor();
    const monitor2 = getGlobalMemoryMonitor();
    expect(monitor1).toBe(monitor2);
  });

  it('should allow configuration', () => {
    configureGlobalMemoryMonitor({ warningThreshold: 0.8 });
    const monitor = getGlobalMemoryMonitor();
    expect(monitor).toBeInstanceOf(MemoryMonitor);
  });
});