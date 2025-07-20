/**
 * Worker manager for handling worker pool and lifecycle
 */

import { UniversalWorkerBridge } from './worker-bridge.js';
import { WasmModuleCache } from './wasm-module-cache.js';
import { WorkerMessage, WorkerResponse } from '../types/index.js';

export interface WorkerManagerOptions {
  maxWorkers?: number;
  workerIdleTimeout?: number;
  taskTimeout?: number;
  wasmCacheOptions?: {
    maxSize?: number;
    maxAge?: number;
    maxModules?: number;
  };
}

interface WorkerInfo {
  bridge: UniversalWorkerBridge;
  id: string;
  busy: boolean;
  lastUsed: number;
  taskCount: number;
}

interface QueuedTask {
  message: Omit<WorkerMessage, 'id'>;
  resolve: (response: WorkerResponse) => void;
  reject: (error: Error) => void;
  priority: number;
  timestamp: number;
}

export class WorkerManager {
  private workers = new Map<string, WorkerInfo>();
  private taskQueue: QueuedTask[] = [];
  private wasmCache: WasmModuleCache;
  private options: Required<WorkerManagerOptions>;
  private nextWorkerId = 1;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private workerScript: string | URL,
    options: WorkerManagerOptions = {}
  ) {
    this.options = {
      maxWorkers: options.maxWorkers ?? Math.max(2, Math.min(navigator?.hardwareConcurrency ?? 4, 8)),
      workerIdleTimeout: options.workerIdleTimeout ?? 5 * 60 * 1000, // 5 minutes
      taskTimeout: options.taskTimeout ?? 30 * 1000, // 30 seconds
      wasmCacheOptions: options.wasmCacheOptions ?? {},
    };

    this.wasmCache = new WasmModuleCache(this.options.wasmCacheOptions);
    this.startCleanupTimer();
  }

  /**
   * Execute a task using the worker pool
   */
  async executeTask(
    message: Omit<WorkerMessage, 'id'>,
    priority: number = 0
  ): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        message,
        resolve,
        reject,
        priority,
        timestamp: Date.now(),
      };

      this.taskQueue.push(task);
      this.taskQueue.sort((a, b) => b.priority - a.priority || a.timestamp - b.timestamp);
      
      this.processQueue();
    });
  }

  /**
   * Preload a WASM module into the cache
   */
  async preloadWasmModule(url: string): Promise<void> {
    return this.wasmCache.preloadModule(url);
  }

  /**
   * Get a cached WASM module
   */
  async getWasmModule(url: string): Promise<WebAssembly.Module> {
    return this.wasmCache.getModule(url);
  }

  /**
   * Get worker pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queuedTasks: number;
    wasmCache: ReturnType<WasmModuleCache['getStats']>;
  } {
    const busyWorkers = Array.from(this.workers.values()).filter(w => w.busy).length;
    
    return {
      totalWorkers: this.workers.size,
      busyWorkers,
      idleWorkers: this.workers.size - busyWorkers,
      queuedTasks: this.taskQueue.length,
      wasmCache: this.wasmCache.getStats(),
    };
  }

  /**
   * Terminate all workers and clean up resources
   */
  async terminate(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('Worker manager terminated'));
    }
    this.taskQueue = [];

    // Terminate all workers
    const terminationPromises = Array.from(this.workers.values()).map(async (worker) => {
      try {
        await worker.bridge.terminate();
      } catch (error) {
        console.warn(`Error terminating worker ${worker.id}:`, error);
      }
    });

    await Promise.allSettled(terminationPromises);
    this.workers.clear();

    // Clear WASM cache
    this.wasmCache.clear();
  }

  private async processQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Find an available worker or create one
    let worker: WorkerInfo | null = null;
    try {
      worker = await this.getAvailableWorker();
    } catch (error) {
      // Worker creation failed, reject the task
      const task = this.taskQueue.shift();
      if (task) {
        task.reject(error instanceof Error ? error : new Error('Failed to create worker'));
      }
      return;
    }

    if (!worker) {
      return; // No workers available and can't create more
    }

    const task = this.taskQueue.shift();
    if (!task) {
      return;
    }

    // Mark worker as busy
    worker.busy = true;
    worker.lastUsed = Date.now();
    worker.taskCount++;

    try {
      const response = await worker.bridge.sendMessage(task.message);
      task.resolve(response);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error('Unknown worker error'));
    } finally {
      // Mark worker as available
      worker.busy = false;
      worker.lastUsed = Date.now();
      
      // Process next task if any
      if (this.taskQueue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async getAvailableWorker(): Promise<WorkerInfo | null> {
    // Find idle worker
    for (const worker of this.workers.values()) {
      if (!worker.busy) {
        return worker;
      }
    }

    // Create new worker if under limit
    if (this.workers.size < this.options.maxWorkers) {
      return this.createWorker();
    }

    return null; // No workers available
  }

  private async createWorker(): Promise<WorkerInfo> {
    const id = `worker_${this.nextWorkerId++}`;
    const bridge = new UniversalWorkerBridge(this.workerScript);
    
    try {
      await bridge.initialize();
    } catch (error) {
      throw new Error(`Failed to create worker ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const worker: WorkerInfo = {
      bridge,
      id,
      busy: false,
      lastUsed: Date.now(),
      taskCount: 0,
    };

    this.workers.set(id, worker);
    return worker;
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Run cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();
    const workersToRemove: string[] = [];

    // Find idle workers that have exceeded timeout
    for (const [id, worker] of this.workers) {
      if (!worker.busy && now - worker.lastUsed > this.options.workerIdleTimeout) {
        workersToRemove.push(id);
      }
    }

    // Keep at least one worker if possible
    if (workersToRemove.length >= this.workers.size && this.workers.size > 0) {
      workersToRemove.pop();
    }

    // Terminate idle workers
    for (const id of workersToRemove) {
      const worker = this.workers.get(id);
      if (worker) {
        worker.bridge.terminate();
        this.workers.delete(id);
      }
    }

    // Cleanup WASM cache
    this.wasmCache.cleanup();

    // Remove expired tasks from queue
    const expiredTasks: QueuedTask[] = [];
    this.taskQueue = this.taskQueue.filter(task => {
      if (now - task.timestamp > this.options.taskTimeout) {
        expiredTasks.push(task);
        return false;
      }
      return true;
    });

    // Reject expired tasks
    for (const task of expiredTasks) {
      task.reject(new Error('Task timeout'));
    }
  }
}