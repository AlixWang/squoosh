import { BufferPool, getGlobalBufferPool, configureGlobalBufferPool } from '../buffer-pool';

describe('BufferPool', () => {
  let bufferPool: BufferPool;

  beforeEach(() => {
    bufferPool = new BufferPool({
      maxPoolSize: 5,
      maxBufferSize: 1024 * 1024, // 1MB
      minBufferSize: 1024, // 1KB
    });
  });

  afterEach(() => {
    bufferPool.clear();
  });

  describe('getBuffer', () => {
    it('should allocate new buffer for first request', () => {
      const buffer = bufferPool.getBuffer(2048);
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThanOrEqual(2048);
    });

    it('should round up to power of 2', () => {
      const buffer = bufferPool.getBuffer(1500);
      expect(buffer.byteLength).toBe(2048); // Next power of 2
    });

    it('should reuse released buffers', () => {
      const buffer1 = bufferPool.getBuffer(2048);
      bufferPool.releaseBuffer(buffer1);
      
      const buffer2 = bufferPool.getBuffer(2048);
      expect(buffer2).toBe(buffer1);
    });

    it('should not pool buffers outside size range', () => {
      const smallBuffer = bufferPool.getBuffer(512); // Below minBufferSize
      const largeBuffer = bufferPool.getBuffer(2 * 1024 * 1024); // Above maxBufferSize
      
      expect(smallBuffer.byteLength).toBe(512);
      expect(largeBuffer.byteLength).toBe(2 * 1024 * 1024);
      
      // These should not be pooled
      bufferPool.releaseBuffer(smallBuffer);
      bufferPool.releaseBuffer(largeBuffer);
      
      const stats = bufferPool.getStats();
      expect(stats.poolSize).toBe(0);
    });
  });

  describe('releaseBuffer', () => {
    it('should add buffer to pool', () => {
      const buffer = bufferPool.getBuffer(2048);
      bufferPool.releaseBuffer(buffer);
      
      const stats = bufferPool.getStats();
      expect(stats.poolSize).toBe(1);
      expect(stats.totalReleased).toBe(1);
    });

    it('should respect max pool size', () => {
      const buffers = [];
      
      // Create more buffers than max pool size
      for (let i = 0; i < 10; i++) {
        buffers.push(bufferPool.getBuffer(2048));
      }
      
      // Release all buffers
      buffers.forEach(buffer => bufferPool.releaseBuffer(buffer));
      
      const stats = bufferPool.getStats();
      expect(stats.poolSize).toBe(5); // Should be limited to maxPoolSize
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      const buffer1 = bufferPool.getBuffer(2048);
      const buffer2 = bufferPool.getBuffer(4096);
      
      bufferPool.releaseBuffer(buffer1);
      
      const stats = bufferPool.getStats();
      expect(stats.totalAllocated).toBe(2);
      expect(stats.totalReleased).toBe(1);
      expect(stats.poolSize).toBe(1);
      expect(stats.memoryUsage).toBe(2048);
    });
  });

  describe('clear', () => {
    it('should clear all buffers from pool', () => {
      const buffer = bufferPool.getBuffer(2048);
      bufferPool.releaseBuffer(buffer);
      
      expect(bufferPool.getStats().poolSize).toBe(1);
      
      bufferPool.clear();
      
      expect(bufferPool.getStats().poolSize).toBe(0);
    });
  });
});

describe('Global BufferPool', () => {
  it('should provide global instance', () => {
    const pool1 = getGlobalBufferPool();
    const pool2 = getGlobalBufferPool();
    expect(pool1).toBe(pool2);
  });

  it('should allow configuration', () => {
    configureGlobalBufferPool({ maxPoolSize: 10 });
    const pool = getGlobalBufferPool();
    expect(pool).toBeInstanceOf(BufferPool);
  });
});