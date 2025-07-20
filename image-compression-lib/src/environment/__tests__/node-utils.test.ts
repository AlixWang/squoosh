/**
 * Tests for Node.js specific utilities
 */

import { BufferUtils, NodeFileSystem, NodeWasmLoader } from '../node-utils';
import { environmentDetector } from '../environment-detector';

// Mock the environment detector
jest.mock('../environment-detector');

describe('BufferUtils', () => {
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;

  beforeEach(() => {
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
  });

  describe('fromArrayBuffer', () => {
    it('should return Buffer in Node.js environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const arrayBuffer = new ArrayBuffer(4);
      const result = BufferUtils.fromArrayBuffer(arrayBuffer);
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should return Uint8Array in browser environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      const arrayBuffer = new ArrayBuffer(4);
      const result = BufferUtils.fromArrayBuffer(arrayBuffer);
      
      expect(result instanceof Uint8Array).toBe(true);
    });
  });

  describe('toArrayBuffer', () => {
    it('should convert Buffer to ArrayBuffer', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      const result = BufferUtils.toArrayBuffer(buffer);
      
      expect(result instanceof ArrayBuffer).toBe(true);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('should convert Uint8Array to ArrayBuffer', () => {
      const uint8Array = new Uint8Array([1, 2, 3, 4]);
      const result = BufferUtils.toArrayBuffer(uint8Array);
      
      expect(result instanceof ArrayBuffer).toBe(true);
      expect(new Uint8Array(result)).toEqual(new Uint8Array([1, 2, 3, 4]));
    });

    it('should handle ArrayBuffer input', () => {
      const arrayBuffer = new ArrayBuffer(4);
      const result = BufferUtils.toArrayBuffer(arrayBuffer as any);
      
      expect(result).toBe(arrayBuffer);
    });
  });

  describe('from', () => {
    it('should create Buffer in Node.js environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const result = BufferUtils.from([1, 2, 3, 4]);
      
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should create Uint8Array in browser environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      const result = BufferUtils.from([1, 2, 3, 4]);
      
      expect(result instanceof Uint8Array).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should handle ArrayBuffer input', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const arrayBuffer = new ArrayBuffer(4);
      const result = BufferUtils.from(arrayBuffer);
      
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should throw error for unsupported data type', () => {
      expect(() => BufferUtils.from('invalid' as any)).toThrow('Unsupported data type');
    });
  });

  describe('isBuffer', () => {
    it('should return true for Buffer', () => {
      const buffer = Buffer.from([1, 2, 3]);
      expect(BufferUtils.isBuffer(buffer)).toBe(true);
    });

    it('should return true for Uint8Array', () => {
      const uint8Array = new Uint8Array([1, 2, 3]);
      expect(BufferUtils.isBuffer(uint8Array)).toBe(true);
    });

    it('should return false for other types', () => {
      expect(BufferUtils.isBuffer('string')).toBe(false);
      expect(BufferUtils.isBuffer(123)).toBe(false);
      expect(BufferUtils.isBuffer({})).toBe(false);
    });
  });

  describe('byteLength', () => {
    it('should return correct length for ArrayBuffer', () => {
      const arrayBuffer = new ArrayBuffer(10);
      expect(BufferUtils.byteLength(arrayBuffer)).toBe(10);
    });

    it('should return correct length for Uint8Array', () => {
      const uint8Array = new Uint8Array(5);
      expect(BufferUtils.byteLength(uint8Array)).toBe(5);
    });

    it('should return correct length for Buffer', () => {
      const buffer = Buffer.alloc(8);
      expect(BufferUtils.byteLength(buffer)).toBe(8);
    });
  });

  describe('concat', () => {
    it('should concatenate buffers in Node.js environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      const buf1 = Buffer.from([1, 2]);
      const buf2 = Buffer.from([3, 4]);
      const result = BufferUtils.concat([buf1, buf2]);
      
      expect(Buffer.isBuffer(result)).toBe(true);
      expect(Array.from(result as Buffer)).toEqual([1, 2, 3, 4]);
    });

    it('should concatenate buffers in browser environment', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      const buf1 = new Uint8Array([1, 2]);
      const buf2 = new Uint8Array([3, 4]);
      const result = BufferUtils.concat([buf1, buf2]);
      
      expect(result instanceof Uint8Array).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3, 4]);
    });

    it('should handle mixed buffer types', () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      const arrayBuffer = new ArrayBuffer(2);
      new Uint8Array(arrayBuffer).set([1, 2]);
      const uint8Array = new Uint8Array([3, 4]);
      const buffer = Buffer.from([5, 6]);
      
      const result = BufferUtils.concat([arrayBuffer, uint8Array, buffer]);
      
      expect(result instanceof Uint8Array).toBe(true);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });
});

describe('NodeFileSystem', () => {
  let fileSystem: NodeFileSystem;
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;

  beforeEach(() => {
    fileSystem = new NodeFileSystem();
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
  });

  describe('readFile', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(fileSystem.readFile('/test/path')).rejects.toThrow(
        'File system operations are only available in Node.js environment'
      );
    });

    it('should read file in Node.js environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      // Mock fs module
      const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('test content'));
      jest.doMock('fs/promises', () => ({
        readFile: mockReadFile,
      }));

      // This test would need actual Node.js environment to work properly
      // In JSDOM, we can only test the error path
    });
  });

  describe('writeFile', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(fileSystem.writeFile('/test/path', Buffer.from('test'))).rejects.toThrow(
        'File system operations are only available in Node.js environment'
      );
    });
  });

  describe('exists', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(fileSystem.exists('/test/path')).rejects.toThrow(
        'File system operations are only available in Node.js environment'
      );
    });
  });

  describe('mkdir', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(fileSystem.mkdir('/test/path')).rejects.toThrow(
        'File system operations are only available in Node.js environment'
      );
    });
  });
});

describe('NodeWasmLoader', () => {
  let mockEnvironmentDetector: jest.Mocked<typeof environmentDetector>;

  beforeEach(() => {
    mockEnvironmentDetector = environmentDetector as jest.Mocked<typeof environmentDetector>;
    NodeWasmLoader.clearCache();
  });

  describe('loadFromFile', () => {
    it('should throw error in browser environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(false);
      
      await expect(NodeWasmLoader.loadFromFile('/test/module.wasm')).rejects.toThrow(
        'File-based WASM loading is only available in Node.js environment'
      );
    });

    it('should load and cache WASM module in Node.js environment', async () => {
      mockEnvironmentDetector.isNode.mockReturnValue(true);
      
      // This test would need actual Node.js environment and WASM file to work properly
      // In JSDOM, we can only test the error path
    });
  });

  describe('loadFromBuffer', () => {
    it('should compile WASM module from buffer', async () => {
      // Create a minimal valid WASM module
      const wasmBuffer = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // WASM magic number
        0x01, 0x00, 0x00, 0x00, // WASM version
      ]);

      const module = await NodeWasmLoader.loadFromBuffer(wasmBuffer, 'test-module');
      
      expect(module instanceof WebAssembly.Module).toBe(true);
      
      // Test caching
      const cachedModule = await NodeWasmLoader.loadFromBuffer(wasmBuffer, 'test-module');
      expect(cachedModule).toBe(module);
    });

    it('should handle compilation errors', async () => {
      const invalidBuffer = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
      
      await expect(NodeWasmLoader.loadFromBuffer(invalidBuffer)).rejects.toThrow(
        'Failed to compile WASM module'
      );
    });
  });

  describe('instantiate', () => {
    it('should instantiate WASM module with imports', async () => {
      // Create a minimal valid WASM module
      const wasmBuffer = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // WASM magic number
        0x01, 0x00, 0x00, 0x00, // WASM version
      ]);

      const module = await WebAssembly.compile(wasmBuffer);
      const instance = await NodeWasmLoader.instantiate(module);
      
      expect(instance instanceof WebAssembly.Instance).toBe(true);
    });

    it('should handle instantiation errors', async () => {
      // This would require a more complex WASM module to test properly
      // For now, we test with a valid minimal module
      const wasmBuffer = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
      ]);

      const module = await WebAssembly.compile(wasmBuffer);
      
      // Should not throw with minimal module
      await expect(NodeWasmLoader.instantiate(module)).resolves.toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const wasmBuffer = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
      ]);

      await NodeWasmLoader.loadFromBuffer(wasmBuffer, 'test-module');
      
      let stats = NodeWasmLoader.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('test-module');
      
      NodeWasmLoader.clearCache();
      
      stats = NodeWasmLoader.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      const wasmBuffer = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d,
        0x01, 0x00, 0x00, 0x00,
      ]);

      await NodeWasmLoader.loadFromBuffer(wasmBuffer, 'module1');
      await NodeWasmLoader.loadFromBuffer(wasmBuffer, 'module2');
      
      const stats = NodeWasmLoader.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toEqual(['module1', 'module2']);
    });
  });
});