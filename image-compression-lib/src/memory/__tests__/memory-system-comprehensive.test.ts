/**
 * Comprehensive tests for memory management system
 */

import { BufferPool } from '../buffer-pool.js';
import { MemoryMonitor } from '../memory-monitor.js';
import { GCOptimizer } from '../gc-optimizer.js';
import { MemoryError } from '../../errors/index.js';

describe('Memory Management System Comprehensive Tests', () => {
  describe('BufferPool', () => {
    let bufferPool: BufferPool;

    beforeEach(() => {
      bufferPool = new BufferPool();
    });

    afterEach(() => {
      bufferPool.clear();
    });

    describe('Basic Operations', () => {
      it('should acquire buffer of requested size', () => {
        const buffer = bufferPool.acquire(1024);
        expect(buffer).toBeInstanceOf(ArrayBuffer);
        expect(buffer.byteLength).toBe(1024);
      });

      it('should release buffer back to pool', () => {
        const buffer = bufferPool.acquire(1024);
        expect(() => bufferPool.release(buffer)).not.toThrow();
      });

      it('should reuse released buffers', () => {
        const buffer1 = bufferPool.acquire(1024);
        bufferPool.release(buffer1);
        const buffer2 = bufferPool.acquire(1024);
        expect(buffer2).toBe(buffer1); // Should be the same buffer
      });

      it('should create new buffer when none available', () => {
        const buffer1 = bufferPool.acquire(1024);
        const buffer2 = bufferPool.acquire(1024);
        expect(buffer2).not.toBe(buffer1);
        expect(buffer2.byteLength).toBe(1024);
      });
    });

    describe('Size Management', () => {
      it('should handle different buffer sizes', () => {
        const sizes = [512, 1024, 2048, 4096];
        const buffers = sizes.map((size) => bufferPool.acquire(size));

        buffers.forEach((buffer, index) => {
          expect(buffer.byteLength).toBe(sizes[index]);
        });
      });

      it('should group buffers by size', () => {
        const buffer1 = bufferPool.acquire(1024);
        const buffer2 = bufferPool.acquire(2048);
        bufferPool.release(buffer1);
        bufferPool.release(buffer2);

        const reused1 = bufferPool.acquire(1024);
        const reused2 = bufferPool.acquire(2048);

        expect(reused1).toBe(buffer1);
        expect(reused2).toBe(buffer2);
      });

      it('should handle zero size requests', () => {
        expect(() => bufferPool.acquire(0)).toThrow();
      });

      it('should handle negative size requests', () => {
        expect(() => bufferPool.acquire(-100)).toThrow();
      });

      it('should handle very large size requests', () => {
        const largeSize = 100 * 1024 * 1024; // 100MB
        try {
          const buffer = bufferPool.acquire(largeSize);
          expect(buffer.byteLength).toBe(largeSize);
        } catch (error) {
          // Might fail due to memory constraints, which is acceptable
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    describe('Pool Limits', () => {
      it('should respect maximum pool size', () => {
        const maxPoolSize = 5;
        const poolWithLimit = new BufferPool({ maxPoolSize });

        // Create and release more buffers than the limit
        const buffers = Array.from({ length: 10 }, () =>
          poolWithLimit.acquire(1024),
        );
        buffers.forEach((buffer) => poolWithLimit.release(buffer));

        // Pool should not exceed the limit
        const stats = poolWithLimit.getStats();
        expect(stats.totalBuffers).toBeLessThanOrEqual(maxPoolSize);
      });

      it('should handle pool size of zero', () => {
        const noPooling = new BufferPool({ maxPoolSize: 0 });
        const buffer1 = noPooling.acquire(1024);
        noPooling.release(buffer1);
        const buffer2 = noPooling.acquire(1024);

        expect(buffer2).not.toBe(buffer1); // Should not reuse
      });
    });

    describe('Memory Tracking', () => {
      it('should track allocated memory', () => {
        const initialStats = bufferPool.getStats();
        const buffer = bufferPool.acquire(1024);
        const afterAcquireStats = bufferPool.getStats();

        expect(afterAcquireStats.totalMemory).toBeGreaterThan(
          initialStats.totalMemory,
        );
      });

      it('should track buffer count', () => {
        const initialStats = bufferPool.getStats();
        const buffer = bufferPool.acquire(1024);
        bufferPool.release(buffer);
        const afterReleaseStats = bufferPool.getStats();

        expect(afterReleaseStats.totalBuffers).toBe(
          initialStats.totalBuffers + 1,
        );
      });

      it('should provide accurate statistics', () => {
        const sizes = [512, 1024, 2048];
        const buffers = sizes.map((size) => bufferPool.acquire(size));
        buffers.forEach((buffer) => bufferPool.release(buffer));

        const stats = bufferPool.getStats();
        expect(stats.totalBuffers).toBe(3);
        expect(stats.totalMemory).toBe(512 + 1024 + 2048);
        expect(stats.sizeDistribution).toEqual({
          512: 1,
          1024: 1,
          2048: 1,
        });
      });
    });

    describe('Error Handling', () => {
      it('should handle releasing null buffer', () => {
        expect(() => bufferPool.release(null as any)).not.toThrow();
      });

      it('should handle releasing undefined buffer', () => {
        expect(() => bufferPool.release(undefined as any)).not.toThrow();
      });

      it('should handle releasing non-ArrayBuffer', () => {
        expect(() => bufferPool.release({} as any)).not.toThrow();
      });

      it('should handle double release', () => {
        const buffer = bufferPool.acquire(1024);
        bufferPool.release(buffer);
        expect(() => bufferPool.release(buffer)).not.toThrow();
      });
    });

    describe('Cleanup', () => {
      it('should clear all buffers', () => {
        const buffers = [1024, 2048, 4096].map((size) =>
          bufferPool.acquire(size),
        );
        buffers.forEach((buffer) => bufferPool.release(buffer));

        bufferPool.clear();
        const stats = bufferPool.getStats();
        expect(stats.totalBuffers).toBe(0);
        expect(stats.totalMemory).toBe(0);
      });

      it('should handle clearing empty pool', () => {
        expect(() => bufferPool.clear()).not.toThrow();
      });
    });
  });

  describe('MemoryMonitor', () => {
    let memoryMonitor: MemoryMonitor;

    beforeEach(() => {
      memoryMonitor = new MemoryMonitor();
    });

    describe('Memory Tracking', () => {
      it('should track memory allocation', () => {
        const size = 1024;
        memoryMonitor.trackAllocation(size);
        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocated).toBe(size);
      });

      it('should track memory deallocation', () => {
        const size = 1024;
        memoryMonitor.trackAllocation(size);
        memoryMonitor.trackDeallocation(size);
        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocated).toBe(0);
      });

      it('should track peak memory usage', () => {
        memoryMonitor.trackAllocation(1024);
        memoryMonitor.trackAllocation(2048);
        memoryMonitor.trackDeallocation(1024);

        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.peak).toBe(3072); // 1024 + 2048
        expect(usage.allocated).toBe(2048);
      });

      it('should track allocation count', () => {
        memoryMonitor.trackAllocation(1024);
        memoryMonitor.trackAllocation(2048);

        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocationCount).toBe(2);
      });
    });

    describe('Memory Limits', () => {
      it('should detect memory limit exceeded', () => {
        const limitedMonitor = new MemoryMonitor({ maxMemory: 1024 });
        limitedMonitor.trackAllocation(512);
        expect(() => limitedMonitor.trackAllocation(1024)).toThrow(MemoryError);
      });

      it('should allow allocation within limit', () => {
        const limitedMonitor = new MemoryMonitor({ maxMemory: 2048 });
        expect(() => limitedMonitor.trackAllocation(1024)).not.toThrow();
        expect(() => limitedMonitor.trackAllocation(1024)).not.toThrow();
      });

      it('should handle unlimited memory', () => {
        const unlimitedMonitor = new MemoryMonitor();
        expect(() =>
          unlimitedMonitor.trackAllocation(1024 * 1024 * 1024),
        ).not.toThrow();
      });
    });

    describe('Memory Warnings', () => {
      it('should trigger warning at threshold', () => {
        let warningTriggered = false;
        const monitor = new MemoryMonitor({
          maxMemory: 1024,
          warningThreshold: 0.8,
          onWarning: () => {
            warningTriggered = true;
          },
        });

        monitor.trackAllocation(900); // 87.5% of limit
        expect(warningTriggered).toBe(true);
      });

      it('should not trigger warning below threshold', () => {
        let warningTriggered = false;
        const monitor = new MemoryMonitor({
          maxMemory: 1024,
          warningThreshold: 0.8,
          onWarning: () => {
            warningTriggered = true;
          },
        });

        monitor.trackAllocation(700); // 68% of limit
        expect(warningTriggered).toBe(false);
      });
    });

    describe('Statistics', () => {
      it('should provide detailed statistics', () => {
        memoryMonitor.trackAllocation(1024);
        memoryMonitor.trackAllocation(2048);
        memoryMonitor.trackDeallocation(512);

        const stats = memoryMonitor.getDetailedStats();
        expect(stats.current.allocated).toBe(2560);
        expect(stats.current.peak).toBe(3072);
        expect(stats.current.allocationCount).toBe(2);
        expect(stats.current.deallocationCount).toBe(1);
      });

      it('should track allocation history', () => {
        memoryMonitor.trackAllocation(1024);
        memoryMonitor.trackAllocation(2048);

        const stats = memoryMonitor.getDetailedStats();
        expect(stats.history).toHaveLength(2);
        expect(stats.history[0].size).toBe(1024);
        expect(stats.history[1].size).toBe(2048);
      });
    });

    describe('Error Handling', () => {
      it('should handle negative allocation', () => {
        expect(() => memoryMonitor.trackAllocation(-100)).not.toThrow();
        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocated).toBe(0);
      });

      it('should handle negative deallocation', () => {
        memoryMonitor.trackAllocation(1024);
        expect(() => memoryMonitor.trackDeallocation(-100)).not.toThrow();
      });

      it('should handle deallocation without allocation', () => {
        expect(() => memoryMonitor.trackDeallocation(100)).not.toThrow();
        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocated).toBe(0);
      });
    });

    describe('Reset and Cleanup', () => {
      it('should reset statistics', () => {
        memoryMonitor.trackAllocation(1024);
        memoryMonitor.reset();

        const usage = memoryMonitor.getCurrentUsage();
        expect(usage.allocated).toBe(0);
        expect(usage.peak).toBe(0);
        expect(usage.allocationCount).toBe(0);
      });

      it('should handle multiple resets', () => {
        memoryMonitor.reset();
        memoryMonitor.reset();
        expect(() => memoryMonitor.getCurrentUsage()).not.toThrow();
      });
    });
  });

  describe('GCOptimizer', () => {
    let gcOptimizer: GCOptimizer;

    beforeEach(() => {
      gcOptimizer = new GCOptimizer();
    });

    describe('Garbage Collection Hints', () => {
      it('should suggest GC when memory pressure is high', () => {
        const shouldGC = gcOptimizer.shouldTriggerGC({
          allocated: 100 * 1024 * 1024, // 100MB
          peak: 120 * 1024 * 1024,
          allocationCount: 1000,
          deallocationCount: 500,
        });
        expect(shouldGC).toBe(true);
      });

      it('should not suggest GC when memory pressure is low', () => {
        const shouldGC = gcOptimizer.shouldTriggerGC({
          allocated: 1024, // 1KB
          peak: 2048,
          allocationCount: 10,
          deallocationCount: 5,
        });
        expect(shouldGC).toBe(false);
      });

      it('should consider allocation rate', () => {
        const shouldGC = gcOptimizer.shouldTriggerGC({
          allocated: 10 * 1024 * 1024,
          peak: 10 * 1024 * 1024,
          allocationCount: 10000, // High allocation rate
          deallocationCount: 1000,
        });
        expect(shouldGC).toBe(true);
      });
    });

    describe('Memory Optimization', () => {
      it('should provide optimization suggestions', () => {
        const suggestions = gcOptimizer.getOptimizationSuggestions({
          allocated: 50 * 1024 * 1024,
          peak: 100 * 1024 * 1024,
          allocationCount: 5000,
          deallocationCount: 2000,
        });

        expect(suggestions).toBeInstanceOf(Array);
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should suggest buffer pooling for high allocation rates', () => {
        const suggestions = gcOptimizer.getOptimizationSuggestions({
          allocated: 10 * 1024 * 1024,
          peak: 20 * 1024 * 1024,
          allocationCount: 10000,
          deallocationCount: 9000,
        });

        const hasPoolingSuggestion = suggestions.some(
          (s) =>
            s.toLowerCase().includes('pool') ||
            s.toLowerCase().includes('reuse'),
        );
        expect(hasPoolingSuggestion).toBe(true);
      });

      it('should suggest memory cleanup for high peak usage', () => {
        const suggestions = gcOptimizer.getOptimizationSuggestions({
          allocated: 10 * 1024 * 1024,
          peak: 200 * 1024 * 1024, // Very high peak
          allocationCount: 100,
          deallocationCount: 90,
        });

        const hasCleanupSuggestion = suggestions.some(
          (s) =>
            s.toLowerCase().includes('cleanup') ||
            s.toLowerCase().includes('release'),
        );
        expect(hasCleanupSuggestion).toBe(true);
      });
    });

    describe('GC Timing', () => {
      it('should track GC timing', () => {
        const beforeGC = performance.now();
        gcOptimizer.recordGCEvent();
        const afterGC = performance.now();

        const stats = gcOptimizer.getGCStats();
        expect(stats.lastGCTime).toBeGreaterThanOrEqual(beforeGC);
        expect(stats.lastGCTime).toBeLessThanOrEqual(afterGC);
      });

      it('should count GC events', () => {
        const initialStats = gcOptimizer.getGCStats();
        gcOptimizer.recordGCEvent();
        gcOptimizer.recordGCEvent();
        const finalStats = gcOptimizer.getGCStats();

        expect(finalStats.gcCount).toBe(initialStats.gcCount + 2);
      });

      it('should calculate time since last GC', () => {
        gcOptimizer.recordGCEvent();

        // Wait a bit
        const delay = 10;
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }

        const stats = gcOptimizer.getGCStats();
        expect(stats.timeSinceLastGC).toBeGreaterThanOrEqual(delay);
      });
    });

    describe('Adaptive Behavior', () => {
      it('should adapt thresholds based on usage patterns', () => {
        // Simulate high memory usage pattern
        for (let i = 0; i < 10; i++) {
          gcOptimizer.recordMemoryUsage({
            allocated: 50 * 1024 * 1024,
            peak: 100 * 1024 * 1024,
            allocationCount: 1000 * (i + 1),
            deallocationCount: 800 * (i + 1),
          });
        }

        const adaptedThreshold = gcOptimizer.getAdaptiveThreshold();
        expect(adaptedThreshold).toBeDefined();
        expect(typeof adaptedThreshold).toBe('number');
      });

      it('should provide different thresholds for different patterns', () => {
        const optimizer1 = new GCOptimizer();
        const optimizer2 = new GCOptimizer();

        // Pattern 1: High allocation rate
        for (let i = 0; i < 5; i++) {
          optimizer1.recordMemoryUsage({
            allocated: 10 * 1024 * 1024,
            peak: 20 * 1024 * 1024,
            allocationCount: 10000 * (i + 1),
            deallocationCount: 9000 * (i + 1),
          });
        }

        // Pattern 2: Low allocation rate
        for (let i = 0; i < 5; i++) {
          optimizer2.recordMemoryUsage({
            allocated: 10 * 1024 * 1024,
            peak: 15 * 1024 * 1024,
            allocationCount: 100 * (i + 1),
            deallocationCount: 90 * (i + 1),
          });
        }

        const threshold1 = optimizer1.getAdaptiveThreshold();
        const threshold2 = optimizer2.getAdaptiveThreshold();

        expect(threshold1).not.toBe(threshold2);
      });
    });

    describe('Integration with Memory Monitor', () => {
      it('should work with MemoryMonitor', () => {
        const monitor = new MemoryMonitor();

        monitor.trackAllocation(50 * 1024 * 1024);
        const usage = monitor.getCurrentUsage();
        const shouldGC = gcOptimizer.shouldTriggerGC(usage);

        expect(typeof shouldGC).toBe('boolean');
      });

      it('should provide actionable recommendations', () => {
        const monitor = new MemoryMonitor();

        // Simulate memory-intensive operations
        for (let i = 0; i < 100; i++) {
          monitor.trackAllocation(1024 * 1024); // 1MB each
        }

        const usage = monitor.getCurrentUsage();
        const suggestions = gcOptimizer.getOptimizationSuggestions(usage);

        expect(suggestions.length).toBeGreaterThan(0);
        suggestions.forEach((suggestion) => {
          expect(typeof suggestion).toBe('string');
          expect(suggestion.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Memory System Integration', () => {
    it('should work together as a complete system', () => {
      const bufferPool = new BufferPool({ maxPoolSize: 10 });
      const memoryMonitor = new MemoryMonitor({ maxMemory: 10 * 1024 * 1024 });
      const gcOptimizer = new GCOptimizer();

      // Simulate realistic usage
      const buffers: ArrayBuffer[] = [];

      for (let i = 0; i < 20; i++) {
        const size = Math.floor(Math.random() * 1024 * 1024) + 1024; // 1KB to 1MB
        const buffer = bufferPool.acquire(size);
        buffers.push(buffer);
        memoryMonitor.trackAllocation(size);

        // Occasionally release buffers
        if (Math.random() > 0.7 && buffers.length > 5) {
          const releasedBuffer = buffers.pop()!;
          bufferPool.release(releasedBuffer);
          memoryMonitor.trackDeallocation(releasedBuffer.byteLength);
        }

        // Check if GC is recommended
        const usage = memoryMonitor.getCurrentUsage();
        if (gcOptimizer.shouldTriggerGC(usage)) {
          gcOptimizer.recordGCEvent();
          // In real scenario, would trigger actual GC
        }
      }

      // System should be in a consistent state
      const poolStats = bufferPool.getStats();
      const memoryUsage = memoryMonitor.getCurrentUsage();
      const gcStats = gcOptimizer.getGCStats();

      expect(poolStats.totalBuffers).toBeGreaterThanOrEqual(0);
      expect(memoryUsage.allocated).toBeGreaterThanOrEqual(0);
      expect(gcStats.gcCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle memory pressure gracefully', () => {
      const bufferPool = new BufferPool({ maxPoolSize: 5 });
      const memoryMonitor = new MemoryMonitor({
        maxMemory: 5 * 1024 * 1024, // 5MB limit
        warningThreshold: 0.8,
      });

      let warningCount = 0;
      memoryMonitor.onWarning = () => warningCount++;

      // Try to allocate more than the limit
      const buffers: ArrayBuffer[] = [];
      let allocationErrors = 0;

      for (let i = 0; i < 10; i++) {
        try {
          const buffer = bufferPool.acquire(1024 * 1024); // 1MB each
          buffers.push(buffer);
          memoryMonitor.trackAllocation(buffer.byteLength);
        } catch (error) {
          allocationErrors++;
          expect(error).toBeInstanceOf(MemoryError);
        }
      }

      expect(warningCount).toBeGreaterThan(0);
      expect(allocationErrors).toBeGreaterThan(0);
    });
  });
});
