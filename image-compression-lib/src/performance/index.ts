/**
 * Performance optimization utilities for image processing
 */

export {
  ConcurrentProcessor,
  ConcurrentProcessingOptions,
  ProcessingTask,
  ProcessingResult,
  ConcurrentProcessingStats,
  getGlobalConcurrentProcessor,
  configureGlobalConcurrentProcessor,
} from './concurrent-processor';

export {
  LazyLoader,
  WasmLazyLoader,
  LazyLoadOptions,
  LoadedModule,
  LazyLoadStats,
  getGlobalLazyLoader,
  getGlobalWasmLazyLoader,
  configureGlobalLazyLoader,
  configureGlobalWasmLazyLoader,
} from './lazy-loader';

export {
  PerformanceMonitor,
  PerformanceComparator,
  PerformanceMetric,
  BenchmarkResult,
  PerformanceReport,
  timed,
  getGlobalPerformanceMonitor,
} from './performance-monitor';