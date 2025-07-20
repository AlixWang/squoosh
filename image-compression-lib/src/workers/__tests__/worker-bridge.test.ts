/**
 * Tests for WorkerBridge
 */

import { WorkerBridge, UniversalWorkerBridge } from '../worker-bridge.js';
import { WorkerMessage, WorkerResponse } from '../../types/index.js';

// Mock Worker for testing
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;
  private messageHandlers: ((message: any) => void)[] = [];

  constructor(public script: string | URL, public options?: WorkerOptions) {}

  postMessage(message: any): void {
    // Simulate async message processing
    setTimeout(() => {
      this.messageHandlers.forEach(handler => handler(message));
    }, 10);
  }

  terminate(): void {
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.messageHandlers = [];
  }

  // Test helper to simulate worker responses
  simulateResponse(response: WorkerResponse): void {
    if (this.onmessage) {
      this.onmessage({ data: response } as MessageEvent);
    }
  }

  // Test helper to simulate worker errors
  simulateError(error: string): void {
    if (this.onerror) {
      this.onerror({ message: error } as ErrorEvent);
    }
  }

  // Test helper to add message handler
  addMessageHandler(handler: (message: any) => void): void {
    this.messageHandlers.push(handler);
  }
}

// Mock global Worker
const originalWorker = global.Worker;
beforeAll(() => {
  (global as any).Worker = MockWorker;
});

afterAll(() => {
  global.Worker = originalWorker;
});

describe('WorkerBridge', () => {
  let workerBridge: WorkerBridge;
  let mockWorker: MockWorker;

  beforeEach(() => {
    workerBridge = new WorkerBridge('test-worker.js', { timeout: 1000 });
  });

  afterEach(() => {
    workerBridge.terminate();
  });

  describe('initialization', () => {
    it('should initialize worker successfully', async () => {
      await workerBridge.initialize();
      expect(workerBridge.isReady()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      await workerBridge.initialize();
      const firstReady = workerBridge.isReady();
      await workerBridge.initialize();
      expect(workerBridge.isReady()).toBe(firstReady);
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await workerBridge.initialize();
      // Get reference to the mock worker
      mockWorker = (workerBridge as any).worker;
    });

    it('should send message and receive response', async () => {
      const testMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100),
          options: { quality: 80 }
        }
      };

      // Set up mock worker to respond
      mockWorker.addMessageHandler((message: WorkerMessage) => {
        const response: WorkerResponse = {
          id: message.id,
          success: true,
          result: new ArrayBuffer(50),
          timing: 100
        };
        mockWorker.simulateResponse(response);
      });

      const response = await workerBridge.sendMessage(testMessage);
      expect(response.success).toBe(true);
      expect(response.result).toBeInstanceOf(ArrayBuffer);
      expect(response.timing).toBe(100);
    });

    it('should handle worker errors', async () => {
      const testMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100)
        }
      };

      // Set up mock worker to respond with error
      mockWorker.addMessageHandler((message: WorkerMessage) => {
        const response: WorkerResponse = {
          id: message.id,
          success: false,
          error: 'Encoding failed'
        };
        mockWorker.simulateResponse(response);
      });

      await expect(workerBridge.sendMessage(testMessage)).rejects.toThrow('Encoding failed');
    });

    it('should timeout on no response', async () => {
      const testMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100)
        }
      };

      // Don't set up any response handler - should timeout
      await expect(workerBridge.sendMessage(testMessage)).rejects.toThrow('Worker message timeout');
    });

    it('should track pending messages', async () => {
      const testMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100)
        }
      };

      expect(workerBridge.getPendingCount()).toBe(0);

      // Set up response handler before sending message
      mockWorker.addMessageHandler((message: WorkerMessage) => {
        const response: WorkerResponse = {
          id: message.id,
          success: true,
          result: new ArrayBuffer(50)
        };
        mockWorker.simulateResponse(response);
      });

      const responsePromise = workerBridge.sendMessage(testMessage);
      expect(workerBridge.getPendingCount()).toBe(1);

      await responsePromise;
      expect(workerBridge.getPendingCount()).toBe(0);
    });
  });

  describe('termination', () => {
    it('should terminate worker and reject pending messages', async () => {
      await workerBridge.initialize();
      
      const testMessage: Omit<WorkerMessage, 'id'> = {
        type: 'encode',
        payload: {
          operation: 'webp-encode',
          data: new ArrayBuffer(100)
        }
      };

      const responsePromise = workerBridge.sendMessage(testMessage);
      expect(workerBridge.getPendingCount()).toBe(1);

      workerBridge.terminate();
      expect(workerBridge.isReady()).toBe(false);
      expect(workerBridge.getPendingCount()).toBe(0);

      await expect(responsePromise).rejects.toThrow('Worker terminated');
    });
  });
});

describe('UniversalWorkerBridge', () => {
  it('should create appropriate bridge based on environment', () => {
    // Mock browser environment
    (global as any).window = {};
    (global as any).Worker = MockWorker;

    const bridge = new UniversalWorkerBridge('test-worker.js');
    expect(bridge).toBeInstanceOf(UniversalWorkerBridge);

    // Clean up
    delete (global as any).window;
  });

  it('should throw error in unsupported environment', () => {
    // Remove both window and process
    const originalWindow = (global as any).window;
    const originalProcess = (global as any).process;
    
    delete (global as any).window;
    delete (global as any).process;
    delete (global as any).Worker;

    expect(() => {
      new UniversalWorkerBridge('test-worker.js');
    }).toThrow('Unsupported environment for worker bridge');

    // Restore
    (global as any).window = originalWindow;
    (global as any).process = originalProcess;
    (global as any).Worker = MockWorker;
  });
});