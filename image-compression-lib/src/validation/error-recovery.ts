import {
  ImageCompressionError,
  WorkerError,
  ModuleError,
  EnvironmentError,
  ErrorCode,
  ErrorContext
} from '../errors/index.js';

/**
 * Configuration for retry operations
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorCode.WORKER_COMMUNICATION_FAILED,
    ErrorCode.WORKER_TIMEOUT,
    ErrorCode.MODULE_LOAD_FAILED,
    ErrorCode.MEMORY_ALLOCATION_FAILED,
    ErrorCode.WASM_INITIALIZATION_FAILED
  ]
};

/**
 * Fallback options for graceful degradation
 */
export interface FallbackOptions {
  useMainThread?: boolean;
  useFallbackCodec?: boolean;
  reduceQuality?: boolean;
  skipOptimizations?: boolean;
}

/**
 * Error recovery utilities for handling transient failures and graceful degradation
 */
export class ErrorRecovery {
  /**
   * Retry an operation with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    context: ErrorContext = {}
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;
    let attempt = 0;

    while (attempt < finalConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        attempt++;

        // Check if error is retryable
        if (error instanceof ImageCompressionError) {
          if (!finalConfig.retryableErrors.includes(error.code)) {
            throw error; // Not retryable, throw immediately
          }
        }

        // If this was the last attempt, throw the error
        if (attempt >= finalConfig.maxAttempts) {
          throw this.wrapRetryError(lastError, attempt, context);
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt - 1),
          finalConfig.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * delay * 0.1;

        await this.sleep(jitteredDelay);
      }
    }

    throw this.wrapRetryError(lastError!, finalConfig.maxAttempts, context);
  }

  /**
   * Attempt operation with fallback strategies
   */
  static async withFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOptions: FallbackOptions = {},
    context: ErrorContext = {}
  ): Promise<T> {
    try {
      return await primaryOperation();
    } catch (error) {
      if (!(error instanceof ImageCompressionError)) {
        throw error;
      }

      // Try fallback strategies based on error type
      switch (error.code) {
        case ErrorCode.WORKER_INITIALIZATION_FAILED:
        case ErrorCode.WORKER_COMMUNICATION_FAILED:
        case ErrorCode.WORKER_TIMEOUT:
          if (fallbackOptions.useMainThread) {
            return await this.fallbackToMainThread(primaryOperation, context);
          }
          break;

        case ErrorCode.ENCODER_NOT_AVAILABLE:
        case ErrorCode.DECODER_NOT_AVAILABLE:
          if (fallbackOptions.useFallbackCodec) {
            return await this.fallbackToAlternativeCodec(error, context);
          }
          break;

        case ErrorCode.OUT_OF_MEMORY:
        case ErrorCode.MEMORY_ALLOCATION_FAILED:
          if (fallbackOptions.reduceQuality) {
            return await this.fallbackWithReducedQuality(primaryOperation, context);
          }
          break;

        case ErrorCode.FEATURE_NOT_AVAILABLE:
          if (fallbackOptions.skipOptimizations) {
            return await this.fallbackWithoutOptimizations(primaryOperation, context);
          }
          break;
      }

      // If no fallback strategy worked, throw the original error
      throw error;
    }
  }

  /**
   * Handle worker failures by falling back to main thread
   */
  private static async fallbackToMainThread<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    // This would need to be implemented based on the specific operation
    // For now, we'll just re-throw as this is a framework for fallback
    throw new WorkerError(
      'Worker fallback to main thread not implemented for this operation',
      ErrorCode.WORKER_COMMUNICATION_FAILED,
      { ...context, fallbackAttempted: true }
    );
  }

  /**
   * Handle codec unavailability by using alternative codec
   */
  private static async fallbackToAlternativeCodec<T>(
    originalError: ImageCompressionError,
    context: ErrorContext
  ): Promise<T> {
    // This would need to be implemented based on available codecs
    // For now, we'll just re-throw as this is a framework for fallback
    throw new ImageCompressionError(
      'Alternative codec fallback not implemented',
      originalError.code,
      { ...context, fallbackAttempted: true, originalError: originalError.message }
    );
  }

  /**
   * Handle memory issues by reducing quality/complexity
   */
  private static async fallbackWithReducedQuality<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    // This would need to be implemented based on the specific operation
    // For now, we'll just re-throw as this is a framework for fallback
    throw new ImageCompressionError(
      'Quality reduction fallback not implemented for this operation',
      ErrorCode.OUT_OF_MEMORY,
      { ...context, fallbackAttempted: true }
    );
  }

  /**
   * Handle feature unavailability by skipping optimizations
   */
  private static async fallbackWithoutOptimizations<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    // This would need to be implemented based on the specific operation
    // For now, we'll just re-throw as this is a framework for fallback
    throw new EnvironmentError(
      'Optimization skip fallback not implemented for this operation',
      ErrorCode.FEATURE_NOT_AVAILABLE,
      { ...context, fallbackAttempted: true }
    );
  }

  /**
   * Wrap retry errors with additional context
   */
  private static wrapRetryError(
    originalError: Error,
    attempts: number,
    context: ErrorContext
  ): ImageCompressionError {
    if (originalError instanceof ImageCompressionError) {
      return new ImageCompressionError(
        `Operation failed after ${attempts} attempts: ${originalError.message}`,
        originalError.code,
        {
          ...originalError.context,
          ...context,
          retryAttempts: attempts,
          originalError: originalError.message
        }
      );
    }

    return new ImageCompressionError(
      `Operation failed after ${attempts} attempts: ${originalError.message}`,
      ErrorCode.UNKNOWN_ERROR,
      {
        ...context,
        retryAttempts: attempts,
        originalError: originalError.message,
        cause: originalError
      }
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: Error, retryableErrors: ErrorCode[] = DEFAULT_RETRY_CONFIG.retryableErrors): boolean {
    if (!(error instanceof ImageCompressionError)) {
      return false;
    }

    return retryableErrors.includes(error.code);
  }

  /**
   * Get suggested fallback options based on error
   */
  static getSuggestedFallbacks(error: ImageCompressionError): FallbackOptions {
    const fallbacks: FallbackOptions = {};

    switch (error.code) {
      case ErrorCode.WORKER_INITIALIZATION_FAILED:
      case ErrorCode.WORKER_COMMUNICATION_FAILED:
      case ErrorCode.WORKER_TIMEOUT:
        fallbacks.useMainThread = true;
        break;

      case ErrorCode.ENCODER_NOT_AVAILABLE:
      case ErrorCode.DECODER_NOT_AVAILABLE:
        fallbacks.useFallbackCodec = true;
        break;

      case ErrorCode.OUT_OF_MEMORY:
      case ErrorCode.MEMORY_ALLOCATION_FAILED:
        fallbacks.reduceQuality = true;
        fallbacks.skipOptimizations = true;
        break;

      case ErrorCode.FEATURE_NOT_AVAILABLE:
        fallbacks.skipOptimizations = true;
        break;

      case ErrorCode.ENVIRONMENT_NOT_SUPPORTED:
        fallbacks.useMainThread = true;
        fallbacks.skipOptimizations = true;
        break;
    }

    return fallbacks;
  }

  /**
   * Create a circuit breaker for preventing cascading failures
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    options: {
      failureThreshold: number;
      resetTimeout: number;
      monitoringPeriod: number;
    } = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 10000
    }
  ): () => Promise<T> {
    let failures = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async (): Promise<T> => {
      const now = Date.now();

      // Reset failure count if monitoring period has passed
      if (now - lastFailureTime > options.monitoringPeriod) {
        failures = 0;
      }

      // Check circuit breaker state
      if (state === 'open') {
        if (now - lastFailureTime > options.resetTimeout) {
          state = 'half-open';
        } else {
          throw new ImageCompressionError(
            'Circuit breaker is open - operation temporarily disabled',
            ErrorCode.UNKNOWN_ERROR,
            {
              circuitBreakerState: state,
              failures,
              lastFailureTime,
              resetTimeout: options.resetTimeout
            }
          );
        }
      }

      try {
        const result = await operation();
        
        // Success - reset circuit breaker
        if (state === 'half-open') {
          state = 'closed';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = now;

        // Open circuit breaker if threshold reached
        if (failures >= options.failureThreshold) {
          state = 'open';
        }

        throw error;
      }
    };
  }
}