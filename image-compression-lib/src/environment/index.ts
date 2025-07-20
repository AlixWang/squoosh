/**
 * Environment detection and compatibility utilities
 */

export { DefaultEnvironmentDetector, environmentDetector } from './environment-detector';
export { FeatureDetector, featureDetector, type FeatureSupport } from './feature-detector';
export {
  FallbackManager,
  fallbackManager,
  type FallbackConfig,
  DEFAULT_FALLBACK_CONFIG,
} from './fallback-manager';

// Node.js specific utilities
export {
  BufferUtils,
  NodeFileSystem,
  NodeWasmLoader,
  nodeFileSystem,
  bufferUtils,
  nodeWasmLoader,
} from './node-utils';

export {
  NodeWorkerManager,
  nodeWorkerManager,
  type NodeWorkerPoolConfig,
  DEFAULT_NODE_WORKER_CONFIG,
} from './node-worker-manager';

// Re-export interfaces
export type { EnvironmentDetector, EnvironmentInfo } from '../interfaces/environment';