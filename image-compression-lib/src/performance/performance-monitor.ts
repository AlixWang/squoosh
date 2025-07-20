/**
 * Performance monitoring and benchmarking utilities
 */

export interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    metadata?: Record<string, any> | undefined;
}

export interface BenchmarkResult {
    name: string;
    iterations: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    standardDeviation: number;
    operationsPerSecond: number;
    metadata?: Record<string, any> | undefined;
}

export interface PerformanceReport {
    metrics: PerformanceMetric[];
    benchmarks: BenchmarkResult[];
    summary: {
        totalOperations: number;
        totalTime: number;
        averageOperationTime: number;
        slowestOperation: string;
        fastestOperation: string;
    };
}

/**
 * Monitors and tracks performance metrics for image processing operations
 */
export class PerformanceMonitor {
    private metrics: PerformanceMetric[] = [];
    private activeMetrics = new Map<string, PerformanceMetric>();
    private benchmarks: BenchmarkResult[] = [];

    /**
     * Start timing an operation
     */
    startTiming(name: string, metadata?: Record<string, any>): void {
        const metric: PerformanceMetric = {
            name,
            startTime: this.getHighResTime(),
            metadata,
        };

        this.activeMetrics.set(name, metric);
    }

    /**
     * End timing an operation
     */
    endTiming(name: string): number | null {
        const metric = this.activeMetrics.get(name);
        if (!metric) {
            console.warn(`PerformanceMonitor: No active timing found for ${name}`);
            return null;
        }

        metric.endTime = this.getHighResTime();
        metric.duration = metric.endTime - metric.startTime;

        this.metrics.push(metric);
        this.activeMetrics.delete(name);

        return metric.duration;
    }

    /**
     * Time a function execution
     */
    async timeFunction<T>(
        name: string,
        fn: () => Promise<T> | T,
        metadata?: Record<string, any>
    ): Promise<{ result: T; duration: number }> {
        this.startTiming(name, metadata);

        try {
            const result = await fn();
            const duration = this.endTiming(name) ?? 0;
            return { result, duration };
        } catch (error) {
            this.endTiming(name);
            throw error;
        }
    }

    /**
     * Run a benchmark with multiple iterations
     */
    async benchmark<T>(
        name: string,
        fn: () => Promise<T> | T,
        options: {
            iterations?: number;
            warmupIterations?: number;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<BenchmarkResult> {
        const {
            iterations = 10,
            warmupIterations = 2,
            metadata,
        } = options;

        // Warmup runs
        for (let i = 0; i < warmupIterations; i++) {
            await fn();
        }

        // Benchmark runs
        const times: number[] = [];
        const totalStartTime = this.getHighResTime();

        for (let i = 0; i < iterations; i++) {
            const startTime = this.getHighResTime();
            await fn();
            const endTime = this.getHighResTime();
            times.push(endTime - startTime);
        }

        const totalTime = this.getHighResTime() - totalStartTime;
        const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);

        // Calculate standard deviation
        const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / times.length;
        const standardDeviation = Math.sqrt(variance);

        const operationsPerSecond = 1000 / averageTime; // Convert ms to ops/sec

        const result: BenchmarkResult = {
            name,
            iterations,
            totalTime,
            averageTime,
            minTime,
            maxTime,
            standardDeviation,
            operationsPerSecond,
            metadata,
        };

        this.benchmarks.push(result);
        return result;
    }

    /**
     * Get all recorded metrics
     */
    getMetrics(): PerformanceMetric[] {
        return [...this.metrics];
    }

    /**
     * Get metrics by name pattern
     */
    getMetricsByName(pattern: string | RegExp): PerformanceMetric[] {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        return this.metrics.filter(metric => regex.test(metric.name));
    }

    /**
     * Get all benchmark results
     */
    getBenchmarks(): BenchmarkResult[] {
        return [...this.benchmarks];
    }

    /**
     * Generate a performance report
     */
    generateReport(): PerformanceReport {
        const completedMetrics = this.metrics.filter(m => m.duration !== undefined);

        if (completedMetrics.length === 0) {
            return {
                metrics: [],
                benchmarks: [...this.benchmarks],
                summary: {
                    totalOperations: 0,
                    totalTime: 0,
                    averageOperationTime: 0,
                    slowestOperation: '',
                    fastestOperation: '',
                },
            };
        }

        const totalTime = completedMetrics.reduce((sum, m) => sum + (m.duration ?? 0), 0);
        const averageOperationTime = totalTime / completedMetrics.length;

        const slowest = completedMetrics.reduce((prev, current) =>
            (current.duration ?? 0) > (prev.duration ?? 0) ? current : prev
        );

        const fastest = completedMetrics.reduce((prev, current) =>
            (current.duration ?? 0) < (prev.duration ?? 0) ? current : prev
        );

        return {
            metrics: [...this.metrics],
            benchmarks: [...this.benchmarks],
            summary: {
                totalOperations: completedMetrics.length,
                totalTime,
                averageOperationTime,
                slowestOperation: slowest.name,
                fastestOperation: fastest.name,
            },
        };
    }

    /**
     * Clear all metrics and benchmarks
     */
    clear(): void {
        this.metrics = [];
        this.activeMetrics.clear();
        this.benchmarks = [];
    }

    /**
     * Export performance data as JSON
     */
    exportData(): string {
        return JSON.stringify(this.generateReport(), null, 2);
    }

    private getHighResTime(): number {
        // Use performance.now() if available (browser/Node.js with perf_hooks)
        if (typeof performance !== 'undefined' && performance.now) {
            return performance.now();
        }

        // Fallback to Date.now()
        return Date.now();
    }
}

/**
 * Decorator for automatically timing method calls
 */
export function timed(monitor: PerformanceMonitor, name?: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;
        const metricName = name || `${target.constructor.name}.${propertyKey}`;

        descriptor.value = async function (...args: any[]) {
            const { result, duration } = await monitor.timeFunction(
                metricName,
                () => originalMethod.apply(this, args)
            );
            return result;
        };

        return descriptor;
    };
}

/**
 * Utility class for comparing performance between different implementations
 */
export class PerformanceComparator {
    private monitor = new PerformanceMonitor();

    /**
     * Compare performance of multiple implementations
     */
    async compare<T>(
        implementations: Record<string, () => Promise<T> | T>,
        options: {
            iterations?: number;
            warmupIterations?: number;
        } = {}
    ): Promise<Record<string, BenchmarkResult>> {
        const results: Record<string, BenchmarkResult> = {};

        for (const [name, implementation] of Object.entries(implementations)) {
            results[name] = await this.monitor.benchmark(name, implementation, options);
        }

        return results;
    }

    /**
     * Get comparison report
     */
    getComparisonReport(results: Record<string, BenchmarkResult>): string {
        const entries = Object.entries(results);
        if (entries.length === 0) {
            return 'No results to compare';
        }

        // Sort by average time (fastest first)
        entries.sort(([, a], [, b]) => a.averageTime - b.averageTime);

        let report = 'Performance Comparison:\n';
        report += '='.repeat(50) + '\n';

        const fastest = entries[0]![1];

        entries.forEach(([name, result], index) => {
            const speedRatio = result.averageTime / fastest.averageTime;
            const speedText = index === 0 ? '(fastest)' : `(${speedRatio.toFixed(2)}x slower)`;

            report += `${index + 1}. ${name} ${speedText}\n`;
            report += `   Average: ${result.averageTime.toFixed(2)}ms\n`;
            report += `   Min: ${result.minTime.toFixed(2)}ms\n`;
            report += `   Max: ${result.maxTime.toFixed(2)}ms\n`;
            report += `   Ops/sec: ${result.operationsPerSecond.toFixed(0)}\n`;
            report += `   Std Dev: ${result.standardDeviation.toFixed(2)}ms\n\n`;
        });

        return report;
    }
}

// Global performance monitor instance
let globalPerformanceMonitor: PerformanceMonitor | null = null;

/**
 * Get the global performance monitor instance
 */
export function getGlobalPerformanceMonitor(): PerformanceMonitor {
    if (!globalPerformanceMonitor) {
        globalPerformanceMonitor = new PerformanceMonitor();
    }
    return globalPerformanceMonitor;
}