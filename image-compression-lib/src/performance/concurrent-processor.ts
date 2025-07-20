/**
 * Concurrent processing capabilities for handling multiple images simultaneously
 */

// ImageData type is available globally in browser/Node.js environments
import { getGlobalMemoryMonitor } from '../memory/memory-monitor';
import { getGlobalGCOptimizer } from '../memory/gc-optimizer';

export interface ConcurrentProcessingOptions {
  /** Maximum number of concurrent operations */
  maxConcurrency?: number;
  /** Memory threshold for throttling (0-1) */
  memoryThreshold?: number;
  /** Enable automatic memory optimization */
  enableMemoryOptimization?: boolean;
  /** Timeout for individual operations (ms) */
  operationTimeout?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface ProcessingTask<T> {
  id: string;
  operation: () => Promise<T>;
  priority?: number;
  estimatedMemoryUsage?: number;
}

export interface ProcessingResult<T> {
  id: string;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  memoryUsed?: number;
}

export interface ConcurrentProcessingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  peakConcurrency: number;
  totalMemoryUsed: number;
}

/**
 * Manages concurrent processing of multiple image operations with memory optimization
 */
export class ConcurrentProcessor {
  private options: Required<ConcurrentProcessingOptions>;
  private activeTasks = new Map<string, Promise<any>>();
  private taskQueue: ProcessingTask<any>[] = [];
  private stats: ConcurrentProcessingStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageDuration: 0,
    peakConcurrency: 0,
    totalMemoryUsed: 0,
  };

  constructor(options: ConcurrentProcessingOptions = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency ?? 4,
      memoryThreshold: options.memoryThreshold ?? 0.8,
      enableMemoryOptimization: options.enableMemoryOptimization ?? true,
      operationTimeout: options.operationTimeout ?? 30000, // 30 seconds
      debug: options.debug ?? false,
    };
  }

  /**
   * Process multiple tasks concurrently
   */
  async processAll<T>(tasks: ProcessingTask<T>[]): Promise<ProcessingResult<T>[]> {
    if (tasks.length === 0) {
      return [];
    }

    // Sort tasks by priority (higher priority first)
    const sortedTasks = [...tasks].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    
    // Add tasks to queue
    this.taskQueue.push(...sortedTasks);
    this.stats.totalTasks += tasks.length;

    const results: ProcessingResult<T>[] = [];
    const promises: Promise<ProcessingResult<T>>[] = [];

    // Process tasks with concurrency control
    while (this.taskQueue.length > 0 || this.activeTasks.size > 0) {
      // Start new tasks if we have capacity
      while (
        this.taskQueue.length > 0 &&
        this.activeTasks.size < this.options.maxConcurrency &&
        this.canStartNewTask()
      ) {
        const task = this.taskQueue.shift()!;
        const promise = this.executeTask(task);
        promises.push(promise);
        this.activeTasks.set(task.id, promise);
        
        // Update peak concurrency
        this.stats.peakConcurrency = Math.max(
          this.stats.peakConcurrency,
          this.activeTasks.size
        );
      }

      // Wait for at least one task to complete
      if (this.activeTasks.size > 0) {
        const completed = await Promise.race(Array.from(this.activeTasks.values()));
        results.push(completed);
        this.activeTasks.delete(completed.id);
      }
    }

    // Wait for any remaining promises
    const remainingResults = await Promise.all(promises);
    
    // Merge results (avoiding duplicates)
    const allResults = [...results];
    for (const result of remainingResults) {
      if (!allResults.find(r => r.id === result.id)) {
        allResults.push(result);
      }
    }

    return allResults;
  }

  /**
   * Process a single task with timeout and memory optimization
   */
  async processTask<T>(task: ProcessingTask<T>): Promise<ProcessingResult<T>> {
    return this.executeTask(task);
  }

  /**
   * Get current processing statistics
   */
  getStats(): ConcurrentProcessingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDuration: 0,
      peakConcurrency: 0,
      totalMemoryUsed: 0,
    };
  }

  /**
   * Clear task queue
   */
  clearQueue(): void {
    this.taskQueue = [];
  }

  private async executeTask<T>(task: ProcessingTask<T>): Promise<ProcessingResult<T>> {
    const startTime = Date.now();
    const memoryBefore = this.getMemoryUsage();

    if (this.options.debug) {
      console.log(`ConcurrentProcessor: Starting task ${task.id}`);
    }

    // Memory optimization before task
    if (this.options.enableMemoryOptimization && task.estimatedMemoryUsage) {
      getGlobalGCOptimizer().optimizeBeforeOperation(task.estimatedMemoryUsage);
    }

    try {
      // Execute task with timeout
      const result = await this.withTimeout(task.operation(), this.options.operationTimeout);
      
      const duration = Date.now() - startTime;
      const memoryAfter = this.getMemoryUsage();
      const memoryUsed = memoryAfter && memoryBefore ? memoryAfter - memoryBefore : 0;

      // Update statistics
      this.stats.completedTasks++;
      this.updateAverageDuration(duration);
      this.stats.totalMemoryUsed += Math.max(0, memoryUsed);

      if (this.options.debug) {
        console.log(`ConcurrentProcessor: Completed task ${task.id} in ${duration}ms`);
      }

      return {
        id: task.id,
        success: true,
        result,
        duration,
        memoryUsed: Math.max(0, memoryUsed),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Update statistics
      this.stats.failedTasks++;
      this.updateAverageDuration(duration);

      if (this.options.debug) {
        console.log(`ConcurrentProcessor: Failed task ${task.id} after ${duration}ms:`, error);
      }

      return {
        id: task.id,
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
      };
    } finally {
      // Memory optimization after task
      if (this.options.enableMemoryOptimization) {
        getGlobalGCOptimizer().optimizeAfterOperation();
      }
    }
  }

  private canStartNewTask(): boolean {
    if (!this.options.enableMemoryOptimization) {
      return true;
    }

    // Check memory usage
    const memoryMonitor = getGlobalMemoryMonitor();
    const usage = memoryMonitor.getCurrentUsage();
    
    if (usage.usedJSHeapSize && usage.jsHeapSizeLimit) {
      const memoryRatio = usage.usedJSHeapSize / usage.jsHeapSizeLimit;
      if (memoryRatio > this.options.memoryThreshold) {
        if (this.options.debug) {
          console.log(`ConcurrentProcessor: Throttling due to high memory usage: ${(memoryRatio * 100).toFixed(1)}%`);
        }
        return false;
      }
    }

    return true;
  }

  private async withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
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

  private updateAverageDuration(duration: number): void {
    const totalTasks = this.stats.completedTasks + this.stats.failedTasks;
    this.stats.averageDuration = 
      (this.stats.averageDuration * (totalTasks - 1) + duration) / totalTasks;
  }
}

// Global concurrent processor instance
let globalConcurrentProcessor: ConcurrentProcessor | null = null;

/**
 * Get the global concurrent processor instance
 */
export function getGlobalConcurrentProcessor(): ConcurrentProcessor {
  if (!globalConcurrentProcessor) {
    globalConcurrentProcessor = new ConcurrentProcessor();
  }
  return globalConcurrentProcessor;
}

/**
 * Configure the global concurrent processor
 */
export function configureGlobalConcurrentProcessor(options: ConcurrentProcessingOptions): void {
  globalConcurrentProcessor = new ConcurrentProcessor(options);
}