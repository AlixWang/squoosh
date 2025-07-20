import { ErrorRecovery, DEFAULT_RETRY_CONFIG } from '../error-recovery.js';
import { 
  ImageCompressionError, 
  WorkerError, 
  ModuleError, 
  ErrorCode 
} from '../../errors/index.js';

describe('ErrorRecovery', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorRecovery.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new WorkerError('Worker failed', ErrorCode.WORKER_COMMUNICATION_FAILED))
        .mockResolvedValue('success');
      
      const result = await ErrorRecovery.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new ImageCompressionError('Invalid input', ErrorCode.INVALID_INPUT));
      
      await expect(ErrorRecovery.withRetry(operation)).rejects.toThrow('Invalid input');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect max attempts', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new WorkerError('Worker failed', ErrorCode.WORKER_COMMUNICATION_FAILED));
      
      const config = { maxAttempts: 2 };
      
      await expect(ErrorRecovery.withRetry(operation, config)).rejects.toThrow();
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new ModuleError('Module failed', ErrorCode.MODULE_LOAD_FAILED));
      
      const config = { maxAttempts: 3, baseDelay: 10, backoffMultiplier: 2 };
      const startTime = Date.now();
      
      await expect(ErrorRecovery.withRetry(operation, config)).rejects.toThrow();
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should have waited at least baseDelay + baseDelay*2 = 30ms (plus jitter)
      expect(totalTime).toBeGreaterThan(25);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should wrap retry errors with context', async () => {
      const originalError = new WorkerError('Worker failed', ErrorCode.WORKER_COMMUNICATION_FAILED);
      const operation = jest.fn().mockRejectedValue(originalError);
      
      const config = { maxAttempts: 2 };
      const context = { operation: 'encode', format: 'webp' };
      
      try {
        await ErrorRecovery.withRetry(operation, config, context);
      } catch (error) {
        expect(error).toBeInstanceOf(ImageCompressionError);
        expect((error as ImageCompressionError).context.retryAttempts).toBe(2);
        expect((error as ImageCompressionError).context.operation).toBe('encode');
        expect((error as ImageCompressionError).context.format).toBe('webp');
      }
    });

    it('should handle non-ImageCompressionError', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Generic error'));
      
      const config = { maxAttempts: 2 };
      
      try {
        await ErrorRecovery.withRetry(operation, config);
      } catch (error) {
        expect(error).toBeInstanceOf(ImageCompressionError);
        expect((error as ImageCompressionError).code).toBe(ErrorCode.UNKNOWN_ERROR);
        expect((error as ImageCompressionError).context.retryAttempts).toBe(2);
      }
    });
  });

  describe('withFallback', () => {
    it('should return primary operation result on success', async () => {
      const primaryOperation = jest.fn().mockResolvedValue('primary success');
      
      const result = await ErrorRecovery.withFallback(primaryOperation);
      
      expect(result).toBe('primary success');
      expect(primaryOperation).toHaveBeenCalledTimes(1);
    });

    it('should re-throw non-ImageCompressionError', async () => {
      const primaryOperation = jest.fn().mockRejectedValue(new Error('Generic error'));
      
      await expect(ErrorRecovery.withFallback(primaryOperation)).rejects.toThrow('Generic error');
    });

    it('should attempt fallback for worker errors', async () => {
      const workerError = new WorkerError('Worker failed', ErrorCode.WORKER_INITIALIZATION_FAILED);
      const primaryOperation = jest.fn().mockRejectedValue(workerError);
      
      const fallbackOptions = { useMainThread: true };
      
      // Since fallback is not implemented, it should throw the fallback error
      await expect(ErrorRecovery.withFallback(primaryOperation, fallbackOptions))
        .rejects.toThrow('Worker fallback to main thread not implemented');
    });

    it('should re-throw original error if no fallback options', async () => {
      const workerError = new WorkerError('Worker failed', ErrorCode.WORKER_INITIALIZATION_FAILED);
      const primaryOperation = jest.fn().mockRejectedValue(workerError);
      
      await expect(ErrorRecovery.withFallback(primaryOperation)).rejects.toThrow('Worker failed');
    });
  });

  describe('isRetryable', () => {
    it('should identify retryable errors', () => {
      const retryableError = new WorkerError('Worker failed', ErrorCode.WORKER_COMMUNICATION_FAILED);
      expect(ErrorRecovery.isRetryable(retryableError)).toBe(true);
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableError = new ImageCompressionError('Invalid input', ErrorCode.INVALID_INPUT);
      expect(ErrorRecovery.isRetryable(nonRetryableError)).toBe(false);
    });

    it('should handle non-ImageCompressionError', () => {
      const genericError = new Error('Generic error');
      expect(ErrorRecovery.isRetryable(genericError)).toBe(false);
    });

    it('should use custom retryable errors list', () => {
      const error = new ImageCompressionError('Test', ErrorCode.INVALID_INPUT);
      const customRetryableErrors = [ErrorCode.INVALID_INPUT];
      
      expect(ErrorRecovery.isRetryable(error, customRetryableErrors)).toBe(true);
    });
  });

  describe('getSuggestedFallbacks', () => {
    it('should suggest main thread for worker errors', () => {
      const workerError = new WorkerError('Worker failed', ErrorCode.WORKER_INITIALIZATION_FAILED);
      const fallbacks = ErrorRecovery.getSuggestedFallbacks(workerError);
      
      expect(fallbacks.useMainThread).toBe(true);
    });

    it('should suggest fallback codec for codec errors', () => {
      const codecError = new ImageCompressionError('Encoder not available', ErrorCode.ENCODER_NOT_AVAILABLE);
      const fallbacks = ErrorRecovery.getSuggestedFallbacks(codecError);
      
      expect(fallbacks.useFallbackCodec).toBe(true);
    });

    it('should suggest quality reduction for memory errors', () => {
      const memoryError = new ImageCompressionError('Out of memory', ErrorCode.OUT_OF_MEMORY);
      const fallbacks = ErrorRecovery.getSuggestedFallbacks(memoryError);
      
      expect(fallbacks.reduceQuality).toBe(true);
      expect(fallbacks.skipOptimizations).toBe(true);
    });

    it('should suggest skip optimizations for feature errors', () => {
      const featureError = new ImageCompressionError('Feature not available', ErrorCode.FEATURE_NOT_AVAILABLE);
      const fallbacks = ErrorRecovery.getSuggestedFallbacks(featureError);
      
      expect(fallbacks.skipOptimizations).toBe(true);
    });

    it('should suggest multiple fallbacks for environment errors', () => {
      const envError = new ImageCompressionError('Environment not supported', ErrorCode.ENVIRONMENT_NOT_SUPPORTED);
      const fallbacks = ErrorRecovery.getSuggestedFallbacks(envError);
      
      expect(fallbacks.useMainThread).toBe(true);
      expect(fallbacks.skipOptimizations).toBe(true);
    });
  });

  describe('createCircuitBreaker', () => {
    it('should allow operations when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const circuitBreaker = ErrorRecovery.createCircuitBreaker(operation);
      
      const result = await circuitBreaker();
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      const circuitBreaker = ErrorRecovery.createCircuitBreaker(operation, {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      });
      
      // First two failures should execute
      await expect(circuitBreaker()).rejects.toThrow('Operation failed');
      await expect(circuitBreaker()).rejects.toThrow('Operation failed');
      
      // Third attempt should be blocked by circuit breaker
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should reset circuit after timeout', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockRejectedValueOnce(new Error('Failure 2'))
        .mockResolvedValue('success after reset');
      
      const circuitBreaker = ErrorRecovery.createCircuitBreaker(operation, {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 5000
      });
      
      // Trigger failures to open circuit
      await expect(circuitBreaker()).rejects.toThrow('Failure 1');
      await expect(circuitBreaker()).rejects.toThrow('Failure 2');
      
      // Circuit should be open
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      // Fast forward past reset timeout
      jest.advanceTimersByTime(1001);
      
      // Circuit should be half-open and allow one attempt
      const result = await circuitBreaker();
      expect(result).toBe('success after reset');
      
      jest.useRealTimers();
    });

    it('should reset failure count after monitoring period', async () => {
      jest.useFakeTimers();
      
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure 1'))
        .mockResolvedValue('success');
      
      const circuitBreaker = ErrorRecovery.createCircuitBreaker(operation, {
        failureThreshold: 2,
        resetTimeout: 1000,
        monitoringPeriod: 500
      });
      
      // First failure
      await expect(circuitBreaker()).rejects.toThrow('Failure 1');
      
      // Fast forward past monitoring period
      jest.advanceTimersByTime(501);
      
      // Should succeed because failure count was reset
      const result = await circuitBreaker();
      expect(result).toBe('success');
      
      jest.useRealTimers();
    });
  });

  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const startTime = Date.now();
      await (ErrorRecovery as any).sleep(50);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(45); // Allow some tolerance
    });
  });
});