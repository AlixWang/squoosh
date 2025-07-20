/**
 * Worker bridge for handling communication with web workers
 */

import { WorkerMessage, WorkerResponse } from '../types/index.js';
import { NodeWorkerBridge } from './node-worker-bridge.js';

export interface WorkerBridgeOptions {
    timeout?: number;
    maxRetries?: number;
}

export class WorkerBridge {
    private worker: Worker | null = null;
    private messageId = 0;
    private pendingMessages = new Map<string, {
        resolve: (value: WorkerResponse) => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }>();
    private options: Required<WorkerBridgeOptions>;

    constructor(
        private workerScript: string | URL,
        options: WorkerBridgeOptions = {}
    ) {
        this.options = {
            timeout: options.timeout ?? 30000, // 30 seconds default
            maxRetries: options.maxRetries ?? 3,
        };
    }

    /**
     * Initialize the worker and set up message handling
     */
    async initialize(): Promise<void> {
        if (this.worker) {
            return;
        }

        try {
            this.worker = new Worker(this.workerScript, { type: 'module' });
            this.setupMessageHandling();
        } catch (error) {
            throw new Error(`Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    terminate(): void {
        if (this.worker) {
            this.worker.terminate();
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

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
            const response = event.data;
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
        };

        this.worker.onerror = (error: ErrorEvent) => {
            console.error('Worker error:', error);

            // Reject all pending messages
            for (const [, { reject, timeout }] of this.pendingMessages) {
                clearTimeout(timeout);
                reject(new Error(`Worker error: ${error.message}`));
            }
            this.pendingMessages.clear();
        };

        this.worker.onmessageerror = (error: MessageEvent) => {
            console.error('Worker message error:', error);

            // Reject all pending messages
            for (const [, { reject, timeout }] of this.pendingMessages) {
                clearTimeout(timeout);
                reject(new Error('Worker message error'));
            }
            this.pendingMessages.clear();
        };
    }

    private generateMessageId(): string {
        return `msg_${++this.messageId}_${Date.now()}`;
    }
}

/**
 * Universal worker bridge that detects environment and uses appropriate implementation
 */
export class UniversalWorkerBridge {
    private bridge: WorkerBridge | NodeWorkerBridge;

    constructor(workerScript: string | URL, options: WorkerBridgeOptions = {}) {
        // Detect environment
        if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
            // Browser environment
            this.bridge = new WorkerBridge(workerScript, options);
        } else if (typeof process !== 'undefined' && process.versions?.node) {
            // Node.js environment
            this.bridge = new NodeWorkerBridge(workerScript.toString(), options);
        } else {
            throw new Error('Unsupported environment for worker bridge');
        }
    }

    async initialize(): Promise<void> {
        return this.bridge.initialize();
    }

    async sendMessage(message: Omit<WorkerMessage, 'id'>): Promise<WorkerResponse> {
        return this.bridge.sendMessage(message);
    }

    terminate(): void | Promise<void> {
        return this.bridge.terminate();
    }

    isReady(): boolean {
        return this.bridge.isReady();
    }

    getPendingCount(): number {
        return this.bridge.getPendingCount();
    }
}