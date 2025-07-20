/**
 * Buffer pool for efficient memory reuse
 * Manages a pool of ArrayBuffers to reduce garbage collection pressure
 */

export interface BufferPoolOptions {
  /** Maximum number of buffers to keep in pool */
  maxPoolSize?: number;
  /** Maximum size of individual buffers to pool (in bytes) */
  maxBufferSize?: number;
  /** Minimum size of buffers to pool (in bytes) */
  minBufferSize?: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface BufferPoolStats {
  poolSize: number;
  totalAllocated: number;
  totalReused: number;
  totalReleased: number;
  memoryUsage: number;
}

/**
 * Manages a pool of reusable ArrayBuffers to reduce memory allocation overhead
 */
export class BufferPool {
  private pool: Map<number, ArrayBuffer[]> = new Map();
  private stats = {
    totalAllocated: 0,
    totalReused: 0,
    totalReleased: 0,
  };

  private readonly maxPoolSize: number;
  private readonly maxBufferSize: number;
  private readonly minBufferSize: number;
  private readonly debug: boolean;

  constructor(options: BufferPoolOptions = {}) {
    this.maxPoolSize = options.maxPoolSize ?? 50;
    this.maxBufferSize = options.maxBufferSize ?? 50 * 1024 * 1024; // 50MB
    this.minBufferSize = options.minBufferSize ?? 1024; // 1KB
    this.debug = options.debug ?? false;
  }

  /**
   * Get a buffer of at least the specified size
   */
  getBuffer(size: number): ArrayBuffer {
    if (size < this.minBufferSize || size > this.maxBufferSize) {
      this.stats.totalAllocated++;
      if (this.debug) {
        console.log(`BufferPool: Allocating new buffer (${size} bytes) - outside pool range`);
      }
      return new ArrayBuffer(size);
    }

    // Round up to nearest power of 2 for better pooling
    const poolSize = this.getPoolSize(size);
    const poolBuffers = this.pool.get(poolSize);

    if (poolBuffers && poolBuffers.length > 0) {
      const buffer = poolBuffers.pop()!;
      this.stats.totalReused++;
      if (this.debug) {
        console.log(`BufferPool: Reusing buffer (${poolSize} bytes)`);
      }
      return buffer;
    }

    // No buffer available, create new one
    this.stats.totalAllocated++;
    if (this.debug) {
      console.log(`BufferPool: Allocating new buffer (${poolSize} bytes)`);
    }
    return new ArrayBuffer(poolSize);
  }

  /**
   * Return a buffer to the pool for reuse
   */
  releaseBuffer(buffer: ArrayBuffer): void {
    const size = buffer.byteLength;
    
    if (size < this.minBufferSize || size > this.maxBufferSize) {
      if (this.debug) {
        console.log(`BufferPool: Not pooling buffer (${size} bytes) - outside pool range`);
      }
      return;
    }

    const poolSize = this.getPoolSize(size);
    let poolBuffers = this.pool.get(poolSize);

    if (!poolBuffers) {
      poolBuffers = [];
      this.pool.set(poolSize, poolBuffers);
    }

    if (poolBuffers.length < this.maxPoolSize) {
      poolBuffers.push(buffer);
      this.stats.totalReleased++;
      if (this.debug) {
        console.log(`BufferPool: Released buffer to pool (${poolSize} bytes)`);
      }
    } else if (this.debug) {
      console.log(`BufferPool: Pool full, discarding buffer (${poolSize} bytes)`);
    }
  }

  /**
   * Get current pool statistics
   */
  getStats(): BufferPoolStats {
    let poolSize = 0;
    let memoryUsage = 0;

    this.pool.forEach((buffers, size) => {
      poolSize += buffers.length;
      memoryUsage += size * buffers.length;
    });

    return {
      poolSize,
      memoryUsage,
      totalAllocated: this.stats.totalAllocated,
      totalReused: this.stats.totalReused,
      totalReleased: this.stats.totalReleased,
    };
  }

  /**
   * Clear all buffers from the pool
   */
  clear(): void {
    this.pool.clear();
    if (this.debug) {
      console.log('BufferPool: Cleared all buffers');
    }
  }

  /**
   * Get the pool size for a given buffer size (rounded to power of 2)
   */
  private getPoolSize(size: number): number {
    return Math.pow(2, Math.ceil(Math.log2(size)));
  }
}

// Global buffer pool instance
let globalBufferPool: BufferPool | null = null;

/**
 * Get the global buffer pool instance
 */
export function getGlobalBufferPool(): BufferPool {
  if (!globalBufferPool) {
    globalBufferPool = new BufferPool();
  }
  return globalBufferPool;
}

/**
 * Configure the global buffer pool
 */
export function configureGlobalBufferPool(options: BufferPoolOptions): void {
  globalBufferPool = new BufferPool(options);
}