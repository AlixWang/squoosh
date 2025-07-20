import { GCOptimizer, getGlobalGCOptimizer, configureGlobalGCOptimizer } from '../gc-optimizer';

// Mock performance.memory
const mockPerformanceMemory = {
  usedJSHeapSize: 50 * 1024 * 1024, // 50MB
  totalJSHeapSize: 80 * 1024 * 1024, // 80MB
  jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
};

describe('GCOptimizer', () => {
  let gcOptimizer: GCOptimizer;
  let originalPerformance: any;
  let mockGC: jest.Mock;

  beforeEach(() => {
    gcOptimizer = new GCOptimizer({
      enableAutoGC: false, // Disable auto GC for testing
      gcThreshold: 0.8,
      gcInterval: 1000, // 1 second
    });

    // Mock performance.memory
    originalPerformance = global.performance;
    global.performance = {
      memory: mockPerformanceMemory,
    } as any;

    // Mock global.gc
    mockGC = jest.fn();
    (global as any).gc = mockGC;
  });

  afterEach(() => {
    global.performance = originalPerformance;
    delete (global as any).gc;
    gcOptimizer.resetStats();
  });

  describe('suggestGC', () => {
    it('should execute GC when global.gc is available', () => {
      const result = gcOptimizer.suggestGC();
      
      expect(result).toBe(true);
      expect(mockGC).toHaveBeenCalled();
      
      const stats = gcOptimizer.getStats();
      expect(stats.gcSuggestions).toBe(1);
      expect(stats.gcExecutions).toBe(1);
    });

    it('should respect GC interval', () => {
      // First GC should work
      const result1 = gcOptimizer.suggestGC();
      expect(result1).toBe(true);
      
      // Second GC should be skipped due to interval
      const result2 = gcOptimizer.suggestGC();
      expect(result2).toBe(false);
      
      const stats = gcOptimizer.getStats();
      expect(stats.gcSuggestions).toBe(1); // Only first one counted
    });

    it('should work without global.gc', () => {
      delete (global as any).gc;
      
      const result = gcOptimizer.suggestGC();
      
      expect(result).toBe(false);
      
      const stats = gcOptimizer.getStats();
      expect(stats.gcSuggestions).toBe(1);
      expect(stats.gcExecutions).toBe(0);
    });
  });

  describe('optimizeBeforeOperation', () => {
    it('should trigger GC for large operations', () => {
      const largeMemoryUsage = 40 * 1024 * 1024; // 40MB
      
      gcOptimizer.optimizeBeforeOperation(largeMemoryUsage);
      
      expect(mockGC).toHaveBeenCalled();
    });

    it('should not trigger GC for small operations', () => {
      const smallMemoryUsage = 1 * 1024 * 1024; // 1MB
      
      gcOptimizer.optimizeBeforeOperation(smallMemoryUsage);
      
      expect(mockGC).not.toHaveBeenCalled();
    });
  });

  describe('optimizeAfterOperation', () => {
    it('should suggest GC after operations', () => {
      gcOptimizer.optimizeAfterOperation();
      
      expect(mockGC).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      gcOptimizer.suggestGC();
      
      const stats = gcOptimizer.getStats();
      
      expect(stats.gcSuggestions).toBe(1);
      expect(stats.gcExecutions).toBe(1);
      expect(stats.lastGCTime).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('resetStats', () => {
    it('should reset all statistics', () => {
      gcOptimizer.suggestGC();
      
      let stats = gcOptimizer.getStats();
      expect(stats.gcSuggestions).toBe(1);
      
      gcOptimizer.resetStats();
      
      stats = gcOptimizer.getStats();
      expect(stats.gcSuggestions).toBe(0);
      expect(stats.gcExecutions).toBe(0);
      expect(stats.lastGCTime).toBe(0);
    });
  });

  describe('auto GC', () => {
    it('should setup auto GC when enabled', () => {
      // This test verifies that auto GC setup doesn't throw errors
      const autoGCOptimizer = new GCOptimizer({
        enableAutoGC: true,
        gcThreshold: 0.7,
      });
      
      expect(autoGCOptimizer).toBeInstanceOf(GCOptimizer);
    });
  });

  describe('memory calculations', () => {
    it('should handle missing performance.memory', () => {
      global.performance = {} as any;
      
      // Should not throw error
      gcOptimizer.optimizeBeforeOperation(10 * 1024 * 1024);
      gcOptimizer.optimizeAfterOperation();
    });

    it('should handle Node.js process.memoryUsage', () => {
      global.performance = undefined as any;
      
      const mockMemoryUsage = jest.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
      });
      
      (global as any).process = {
        memoryUsage: mockMemoryUsage,
      };

      gcOptimizer.optimizeBeforeOperation(40 * 1024 * 1024);
      
      expect(mockMemoryUsage).toHaveBeenCalled();
      
      delete (global as any).process;
    });
  });
});

describe('Global GCOptimizer', () => {
  it('should provide global instance', () => {
    const optimizer1 = getGlobalGCOptimizer();
    const optimizer2 = getGlobalGCOptimizer();
    expect(optimizer1).toBe(optimizer2);
  });

  it('should allow configuration', () => {
    configureGlobalGCOptimizer({ enableAutoGC: false });
    const optimizer = getGlobalGCOptimizer();
    expect(optimizer).toBeInstanceOf(GCOptimizer);
  });
});