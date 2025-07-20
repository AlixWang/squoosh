/**
 * Memory usage monitoring and tracking utilities
 */

export interface MemoryUsage {
  /** Used heap size in bytes */
  usedJSHeapSize?: number;
  /** Total heap size in bytes */
  totalJSHeapSize?: number;
  /** Heap size limit in bytes */
  jsHeapSizeLimit?: number;
  /** Timestamp when measurement was taken */
  timestamp: number;
}

export interface MemoryThresholds {
  /** Warning threshold as percentage of heap limit (0-1) */
  warningThreshold?: number;
  /** Critical threshold as percentage of heap limit (0-1) */
  criticalThreshold?: number;
  /** Enable automatic garbage collection suggestions */
  enableGCHints?: boolean;
}

export interface MemoryAlert {
  level: 'warning' | 'critical';
  message: string;
  usage: MemoryUsage;
  threshold: number;
}

/**
 * Monitors memory usage and provides alerts when thresholds are exceeded
 */
export class MemoryMonitor {
  private thresholds: Required<MemoryThresholds>;
  private measurements: MemoryUsage[] = [];
  private maxMeasurements = 100;
  private alertCallbacks: ((alert: MemoryAlert) => void)[] = [];

  constructor(thresholds: MemoryThresholds = {}) {
    this.thresholds = {
      warningThreshold: thresholds.warningThreshold ?? 0.7,
      criticalThreshold: thresholds.criticalThreshold ?? 0.9,
      enableGCHints: thresholds.enableGCHints ?? true,
    };
  }

  /**
   * Get current memory usage
   */
  getCurrentUsage(): MemoryUsage {
    const usage: MemoryUsage = {
      timestamp: Date.now(),
    };

    // Try to get memory info from performance API (browser)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      usage.usedJSHeapSize = memory.usedJSHeapSize;
      usage.totalJSHeapSize = memory.totalJSHeapSize;
      usage.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }
    // Try to get memory info from process (Node.js)
    else if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      usage.usedJSHeapSize = memory.heapUsed;
      usage.totalJSHeapSize = memory.heapTotal;
      usage.jsHeapSizeLimit = memory.heapTotal * 2; // Estimate
    }

    return usage;
  }

  /**
   * Record a memory measurement and check thresholds
   */
  recordMeasurement(): MemoryUsage {
    const usage = this.getCurrentUsage();
    
    // Add to measurements history
    this.measurements.push(usage);
    if (this.measurements.length > this.maxMeasurements) {
      this.measurements.shift();
    }

    // Check thresholds and emit alerts
    this.checkThresholds(usage);

    return usage;
  }

  /**
   * Get memory usage statistics
   */
  getStats() {
    if (this.measurements.length === 0) {
      return null;
    }

    const recent = this.measurements.slice(-10);
    const usedSizes = recent
      .map(m => m.usedJSHeapSize)
      .filter((size): size is number => size !== undefined);

    if (usedSizes.length === 0) {
      return null;
    }

    const avgUsed = usedSizes.reduce((sum, size) => sum + size, 0) / usedSizes.length;
    const maxUsed = Math.max(...usedSizes);
    const minUsed = Math.min(...usedSizes);

    const latest = this.measurements[this.measurements.length - 1];

    return {
      current: latest,
      average: avgUsed,
      maximum: maxUsed,
      minimum: minUsed,
      measurementCount: this.measurements.length,
      trend: this.calculateTrend(),
    };
  }

  /**
   * Add callback for memory alerts
   */
  onAlert(callback: (alert: MemoryAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Remove alert callback
   */
  offAlert(callback: (alert: MemoryAlert) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  /**
   * Suggest garbage collection if supported
   */
  suggestGC(): boolean {
    if (!this.thresholds.enableGCHints) {
      return false;
    }

    // Try to trigger GC in Node.js
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      return true;
    }

    // No direct GC control in browser, but we can suggest it
    return false;
  }

  /**
   * Clear measurement history
   */
  clearHistory(): void {
    this.measurements = [];
  }

  private checkThresholds(usage: MemoryUsage): void {
    if (!usage.usedJSHeapSize || !usage.jsHeapSizeLimit) {
      return;
    }

    const usageRatio = usage.usedJSHeapSize / usage.jsHeapSizeLimit;

    if (usageRatio >= this.thresholds.criticalThreshold) {
      this.emitAlert({
        level: 'critical',
        message: `Critical memory usage: ${(usageRatio * 100).toFixed(1)}%`,
        usage,
        threshold: this.thresholds.criticalThreshold,
      });
    } else if (usageRatio >= this.thresholds.warningThreshold) {
      this.emitAlert({
        level: 'warning',
        message: `High memory usage: ${(usageRatio * 100).toFixed(1)}%`,
        usage,
        threshold: this.thresholds.warningThreshold,
      });
    }
  }

  private emitAlert(alert: MemoryAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in memory alert callback:', error);
      }
    });
  }

  private calculateTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.measurements.length < 5) {
      return 'stable';
    }

    const recent = this.measurements.slice(-5);
    const usedSizes = recent
      .map(m => m.usedJSHeapSize)
      .filter((size): size is number => size !== undefined);

    if (usedSizes.length < 5) {
      return 'stable';
    }

    const first = usedSizes[0];
    const last = usedSizes[usedSizes.length - 1];
    
    if (first === undefined || last === undefined) {
      return 'stable';
    }
    
    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }
}

// Global memory monitor instance
let globalMemoryMonitor: MemoryMonitor | null = null;

/**
 * Get the global memory monitor instance
 */
export function getGlobalMemoryMonitor(): MemoryMonitor {
  if (!globalMemoryMonitor) {
    globalMemoryMonitor = new MemoryMonitor();
  }
  return globalMemoryMonitor;
}

/**
 * Configure the global memory monitor
 */
export function configureGlobalMemoryMonitor(thresholds: MemoryThresholds): void {
  globalMemoryMonitor = new MemoryMonitor(thresholds);
}