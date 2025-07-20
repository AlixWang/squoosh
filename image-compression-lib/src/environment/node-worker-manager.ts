/**
 * Node.js specific worker manager using worker_threads
 */

import { NodeWorkerBridge } from '../workers/node-worker-bridge';
import { WorkerMessage, WorkerResponse } from '../types/index';
import { environmentDetector } from './environment-detector';

/**
 * Node.js worker pool configuration
 */
export interface NodeWorkerPoolConfig {
  maxWorkers: number;
  workerScript: string;
  timeout: number;
  maxRetries: number;
  idleTimeout: number;
}

/**
 * Default Node.js worker pool configuration
 */
export const DEFAULT_NODE_WORKER_CONFIG: NodeWorkerPoolConfig = {
  maxWorkers: 4,
  workerScript: '',
  timeout: 30000,
  maxRetries: 3,
  idleTimeout: 60000, // 1 minute
};

/**
 * Worker pool entry
 */
interface WorkerPoolEntry {
  bridge: NodeWorkerBridge;
  busy: boolean;
  lastUsed: number;
  idleTimeout?: NodeJS.Timeout | undefined;
}

/**
 * Node.js specific worker manager
 */
export class NodeWorkerManager {
  private config: NodeWorkerPoolConfig;
  private workers: WorkerPoolEntry[] = [];
  private queue: Array<{
    message: Omit<WorkerMessage, 'id'>;
    resolve: (response: WorkerResponse) => void;
    reject: (error: Error) => void;
  }> = [];
  private initialized = false;

  constructor(config: Partial<NodeWorkerPoolConfig> = {}) {
    this.config = { ...DEFAULT_NODE_WORKER_CONFIG, ...config };
  }

  /**
   * Initialize the worker pool
   */
  async initialize(workerScript: string): Promise<void> {
    if (!environmentDetector.isNode()) {
      throw new Error('NodeWorkerManager can only be used in Node.js environment');
    }

    if (this.initialized) {
      return;
    }

    this.config.workerScript = workerScript;
    this.initialized = true;

    // Pre-create one worker to ensure the script is valid
    await this.createWorker();
  }

  /**
   * Execute a task using the worker pool
   */
  async execute(message: Omit<WorkerMessage, 'id'>): Promise<WorkerResponse> {
    if (!this.initialized) {
      throw new Error('NodeWorkerManager not initialized');
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ message, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Terminate all workers and clean up
   */
  async terminate(): Promise<void> {
    // Reject all queued tasks
    for (const { reject } of this.queue) {
      reject(new Error('Worker manager terminated'));
    }
    this.queue.length = 0;

    // Terminate all workers
    const terminationPromises = this.workers.map(async (entry) => {
      if (entry.idleTimeout) {
        clearTimeout(entry.idleTimeout);
      }
      await entry.bridge.terminate();
    });

    await Promise.all(terminationPromises);
    this.workers.length = 0;
    this.initialized = false;
  }

  /**
   * Get worker pool statistics
   */
  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queueLength: number;
  } {
    const busyWorkers = this.workers.filter(w => w.busy).length;
    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      idleWorkers: this.workers.length - busyWorkers,
      queueLength: this.queue.length,
    };
  }

  /**
   * Process the task queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    // Find an available worker
    let worker = this.workers.find(w => !w.busy);

    // Create a new worker if none available and under limit
    if (!worker && this.workers.length < this.config.maxWorkers) {
      try {
        worker = await this.createWorker();
      } catch (error) {
        // If we can't create a worker, the task will wait for an existing one
        console.warn('Failed to create new worker:', error);
      }
    }

    // If we have a worker, process the next task
    if (worker) {
      const task = this.queue.shift();
      if (task) {
        await this.executeTask(worker, task);
      }
    }
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<WorkerPoolEntry> {
    const bridge = new NodeWorkerBridge(this.config.workerScript, {
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });

    await bridge.initialize();

    const entry: WorkerPoolEntry = {
      bridge,
      busy: false,
      lastUsed: Date.now(),
    };

    this.workers.push(entry);
    return entry;
  }

  /**
   * Execute a task with a specific worker
   */
  private async executeTask(
    worker: WorkerPoolEntry,
    task: {
      message: Omit<WorkerMessage, 'id'>;
      resolve: (response: WorkerResponse) => void;
      reject: (error: Error) => void;
    }
  ): Promise<void> {
    worker.busy = true;
    worker.lastUsed = Date.now();

    // Clear idle timeout if set
    if (worker.idleTimeout) {
      clearTimeout(worker.idleTimeout);
      delete worker.idleTimeout;
    }

    try {
      const response = await worker.bridge.sendMessage(task.message);
      task.resolve(response);
    } catch (error) {
      task.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      worker.busy = false;
      worker.lastUsed = Date.now();

      // Set idle timeout for worker cleanup
      worker.idleTimeout = setTimeout(() => {
        this.cleanupIdleWorker(worker);
      }, this.config.idleTimeout);

      // Process next task in queue
      this.processQueue();
    }
  }

  /**
   * Clean up an idle worker
   */
  private async cleanupIdleWorker(worker: WorkerPoolEntry): Promise<void> {
    if (worker.busy) {
      return; // Worker became busy, don't clean up
    }

    const index = this.workers.indexOf(worker);
    if (index === -1) {
      return; // Worker already removed
    }

    // Keep at least one worker alive
    if (this.workers.length <= 1) {
      return;
    }

    try {
      await worker.bridge.terminate();
      this.workers.splice(index, 1);
    } catch (error) {
      console.warn('Error terminating idle worker:', error);
    }
  }

  /**
   * Update worker pool configuration
   */
  updateConfig(newConfig: Partial<NodeWorkerPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // If max workers decreased, terminate excess workers
    if (newConfig.maxWorkers && newConfig.maxWorkers < this.workers.length) {
      const excessWorkers = this.workers.splice(newConfig.maxWorkers);
      excessWorkers.forEach(async (worker) => {
        if (!worker.busy) {
          await worker.bridge.terminate();
        }
      });
    }
  }
}

/**
 * Singleton Node.js worker manager instance
 */
export const nodeWorkerManager = new NodeWorkerManager();