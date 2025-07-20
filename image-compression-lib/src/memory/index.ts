/**
 * Memory management utilities for efficient image processing
 */

export {
  BufferPool,
  BufferPoolOptions,
  BufferPoolStats,
  getGlobalBufferPool,
  configureGlobalBufferPool,
} from './buffer-pool';

export {
  MemoryMonitor,
  MemoryUsage,
  MemoryThresholds,
  MemoryAlert,
  getGlobalMemoryMonitor,
  configureGlobalMemoryMonitor,
} from './memory-monitor';

export {
  GCOptimizer,
  GCOptimizerOptions,
  GCStats,
  getGlobalGCOptimizer,
  configureGlobalGCOptimizer,
} from './gc-optimizer';