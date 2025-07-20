/**
 * Node.js worker bridge using worker_threads
 */

import { WorkerMessage, WorkerResponse } from '../types/index.js';
import { WorkerBridgeOptions } from './worker-bridge.js';

// Node.js worker_threads types (will be imported dynamically)
interface NodeWorker {
  postMessage(value: any): void;
  terminate(): Promise<number>;
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
}

export class NodeWorkerBridge {
  private worker: NodeWorker | null = null;
  private messageId = 0;
  private pendingMessages = new Map<string, {
    resolve: (value: WorkerResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private options: Required<WorkerBridgeOptions>;

  constructor(
    private workerScript: string,
    options: WorkerBridgeOptions = {}
  ) {
    this.options = {
      timeout: options.timeout ?? 30000, // 30 seconds default
      maxRetries: options.maxRetries ?? 3,
    };
  }

  /**
   * Initialize the Node.js worker
   */
  async initialize(): Promise<void> {
    if (this.worker) {
      return;
    }

    try {
      // Dynamic import to avoid issues in browser environments
      const { Worker } = await import('worker_threads');
      this.worker = new Worker(this.workerScript) as NodeWorker;
      this.setupMessageHandling();
    } catch (error) {
      throw new Error(`Failed to initialize Node.js worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  async sendMessage(message: Omit<WorkerMessage, 'id'>): Promise<WorkerResponse> {
    if (!this.worker) {
      await this.initialize();
    }

    const id = this.generateMessageId();
    const fullMessage: WorkerMessage = { ...message, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error(`Worker message timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);

      this.pendingMessages.set(id, { resolve, reject, timeout });
      
      if (this.worker) {
        this.worker.postMessage(fullMessage);
      } else {
        clearTimeout(timeout);
        this.pendingMessages.delete(id);
        reject(new Error('Worker not available'));
      }
    });
  }

  /**
   * Terminate the worker and clean up resources
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }

    // Reject all pending messages
    for (const [, { reject, timeout }] of this.pendingMessages) {
      clearTimeout(timeout);
      reject(new Error('Worker terminated'));
    }
    this.pendingMessages.clear();
  }

  /**
   * Check if the worker is ready
   */
  isReady(): boolean {
    return this.worker !== null;
  }

  /**
   * Get the number of pending messages
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }

  private setupMessageHandling(): void {
    if (!this.worker) return;

    this.worker.on('message', (response: WorkerResponse) => {
      const pending = this.pendingMessages.get(response.id);

      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingMessages.delete(response.id);

        if (response.success) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response.error || 'Worker operation failed'));
        }
      }
    });

    this.worker.on('error', (error: Error) => {
      console.error('Node.js worker error:', error);
      
      // Reject all pending messages
      for (const [, { reject, timeout }] of this.pendingMessages) {
        clearTimeout(timeout);
        reject(new Error(`Worker error: ${error.message}`));
      }
      this.pendingMessages.clear();
    });

    this.worker.on('exit', (code: number) => {
      if (code !== 0) {
        console.error(`Node.js worker stopped with exit code ${code}`);
        
        // Reject all pending messages
        for (const [, { reject, timeout }] of this.pendingMessages) {
          clearTimeout(timeout);
          reject(new Error(`Worker exited with code ${code}`));
        }
        this.pendingMessages.clear();
      }
    });
  }

  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }
}