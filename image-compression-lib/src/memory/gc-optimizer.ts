/**
 * Garbage collection optimization strategies and utilities
 */

import { getGlobalMemoryMonitor } from './memory-monitor';
import { getGlobalBufferPool } from './buffer-pool';

export interface GCOptimizerOptions {
  /** Enable automatic GC suggestions */
  enableAutoGC?: boolean;
  /** Memory threshold for triggering GC (0-1) */
  gcThreshold?: number;
  /** Minimum interval between GC suggestions (ms) */
  gcInterval?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface GCStats {
  /** Number of GC suggestions made */
  gcSuggestions: number;
  /** Number of successful GC calls */
  gcExecutions: number;
  /** Last GC suggestion timestamp */
  lastGCTime: number;
  /** Memory freed by last GC (bytes) */
  lastMemoryFreed: number;
}

/**
 * Optimizes garbage collection to reduce memory pressure during image processing
 */
export class GCOptimizer {
  private options: Required<GCOptimizerOptions>;
  private stats: GCStats = {
    gcSuggestions: 0,
    gcExecutions: 0,
    lastGCTime: 0,
    lastMemoryFreed: 0,
  };

  constructor(options: GCOptimizerOptions = {}) {
    this.options = {
      enableAutoGC: options.enableAutoGC ?? true,
      gcThreshold: options.gcThreshold ?? 0.8,
      gcInterval: options.gcInterval ?? 5000, // 5 seconds
      debug: options.debug ?? false,
    };

    if (this.options.enableAutoGC) {
      this.setupAutoGC();
    }
  }

  /**
   * Manually suggest garbage collection
   */
  suggestGC(): boolean {
    const now = Date.now();
    
    // Check if enough time has passed since last GC
    if (now - this.stats.lastGCTime < this.options.gcInterval) {
      if (this.options.debug) {
        console.log('GCOptimizer: Skipping GC - too soon since last attempt');
      }
      return false;
    }

    const memoryBefore = this.getMemoryUsage();
    this.stats.gcSuggestions++;

    let gcExecuted = false;

    // Try Node.js global.gc()
    if (typeof global !== 'undefined' && global.gc) {
      global.gc();
      gcExecuted = true;
      this.stats.gcExecutions++;
    }
    // Try exposed gc() function (if --expose-gc flag is used)
    else if (typeof gc !== 'undefined') {
      gc();
      gcExecuted = true;
      this.stats.gcExecutions++;
    }

    this.stats.lastGCTime = now;

    if (gcExecuted) {
      // Measure memory freed
      setTimeout(() => {
        const memoryAfter = this.getMemoryUsage();
        if (memoryBefore && memoryAfter) {
          this.stats.lastMemoryFreed = memoryBefore - memoryAfter;
          if (this.options.debug) {
            console.log(`GCOptimizer: GC freed ${this.formatBytes(this.stats.lastMemoryFreed)}`);
          }
        }
      }, 100);
    }

    if (this.options.debug) {
      console.log(`GCOptimizer: GC ${gcExecuted ? 'executed' : 'suggested'}`);
    }

    return gcExecuted;
  }

  /**
   * Optimize memory before processing large operations
   */
  optimizeBeforeOperation(estimatedMemoryUsage: number): void {
    const currentUsage = this.getMemoryUsage();
    
    if (!currentUsage) {
      return;
    }

    // Check if we need to free memory before the operation
    const availableMemory = this.getAvailableMemory();
    if (availableMemory && estimatedMemoryUsage > availableMemory * 0.5) {
      if (this.options.debug) {
        console.log(`GCOptimizer: Pre-operation cleanup - estimated need: ${this.formatBytes(estimatedMemoryUsage)}`);
      }
      
      // Clear buffer pool to free memory
      getGlobalBufferPool().clear();
      
      // Suggest GC
      this.suggestGC();
    }
  }

  /**
   * Optimize memory after completing operations
   */
  optimizeAfterOperation(): void {
    if (this.options.debug) {
      console.log('GCOptimizer: Post-operation cleanup');
    }

    // Suggest GC to clean up temporary objects
    this.suggestGC();
  }

  /**
   * Get current GC optimizer statistics
   */
  getStats(): GCStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      gcSuggestions: 0,
      gcExecutions: 0,
      lastGCTime: 0,
      lastMemoryFreed: 0,
    };
  }

  private setupAutoGC(): void {
    const memoryMonitor = getGlobalMemoryMonitor();
    
    memoryMonitor.onAlert((alert) => {
      if (alert.level === 'critical' || 
          (alert.level === 'warning' && alert.threshold >= this.options.gcThreshold)) {
        if (this.options.debug) {
          console.log(`GCOptimizer: Auto GC triggered by ${alert.level} alert`);
        }
        this.suggestGC();
      }
    });
  }

  private getMemoryUsage(): number | null {
    // Try performance.memory (browser)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    // Try process.memoryUsage (Node.js)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }

    return null;
  }

  private getAvailableMemory(): number | null {
    // Try performance.memory (browser)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.jsHeapSizeLimit - memory.usedJSHeapSize;
    }
    
    // Try process.memoryUsage (Node.js)
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      // Estimate available memory (this is approximate)
      return memory.heapTotal - memory.heapUsed;
    }

    return null;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

// Global GC optimizer instance
let globalGCOptimizer: GCOptimizer | null = null;

/**
 * Get the global GC optimizer instance
 */
export function getGlobalGCOptimizer(): GCOptimizer {
  if (!globalGCOptimizer) {
    globalGCOptimizer = new GCOptimizer();
  }
  return globalGCOptimizer;
}

/**
 * Configure the global GC optimizer
 */
export function configureGlobalGCOptimizer(options: GCOptimizerOptions): void {
  globalGCOptimizer = new GCOptimizer(options);
}