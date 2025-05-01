// Performance monitoring utility for Session Buddy with J2Cookies
export class PerformanceMonitor {
    constructor(logger) {
        this.logger = logger;
        this.metrics = new Map();
        this.thresholds = {
            sessionSave: 1000, // 1 second
            sessionLoad: 2000, // 2 seconds
            encryption: 500,   // 500ms
            backup: 3000,     // 3 seconds
            storage: 300      // 300ms
        };
    }

    // Start timing an operation
    startOperation(operationName, metadata = {}) {
        const operationId = `${operationName}_${Date.now()}`;
        this.metrics.set(operationId, {
            name: operationName,
            startTime: performance.now(),
            metadata
        });
        return operationId;
    }

    // End timing an operation and log results
    endOperation(operationId) {
        const operation = this.metrics.get(operationId);
        if (!operation) {
            this.logger.warn('Unknown operation ID', { operationId });
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - operation.startTime;

        // Check if operation exceeded threshold
        const threshold = this.thresholds[operation.name];
        if (threshold && duration > threshold) {
            this.logger.warn('Operation exceeded threshold', {
                operation: operation.name,
                duration,
                threshold,
                metadata: operation.metadata
            });
        }

        const result = {
            ...operation,
            duration,
            endTime
        };

        this.metrics.delete(operationId);
        this.logMetric(result);

        return result;
    }

    // Log performance metric
    logMetric(metric) {
        this.logger.info('Performance metric', {
            operation: metric.name,
            durationMs: metric.duration,
            ...metric.metadata
        });
    }

    // Get performance statistics
    getStatistics() {
        const stats = {};
        const operations = Array.from(this.metrics.values());

        // Group operations by name
        operations.forEach(op => {
            if (!stats[op.name]) {
                stats[op.name] = {
                    count: 0,
                    totalDuration: 0,
                    maxDuration: 0,
                    minDuration: Infinity,
                    avgDuration: 0,
                    activeOperations: 0
                };
            }

            const duration = performance.now() - op.startTime;
            stats[op.name].count++;
            stats[op.name].totalDuration += duration;
            stats[op.name].maxDuration = Math.max(stats[op.name].maxDuration, duration);
            stats[op.name].minDuration = Math.min(stats[op.name].minDuration, duration);
            stats[op.name].avgDuration = stats[op.name].totalDuration / stats[op.name].count;
            stats[op.name].activeOperations++;
        });

        return stats;
    }

    // Monitor memory usage
    async checkMemoryUsage() {
        if (performance.memory) {
            const memory = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };

            const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
            
            if (usagePercentage > 80) {
                this.logger.warn('High memory usage detected', memory);
            } else {
                this.logger.debug('Memory usage check', memory);
            }

            return memory;
        }
        return null;
    }

    // Monitor long tasks
    setupLongTaskMonitoring() {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 50) { // Tasks longer than 50ms
                    this.logger.warn('Long task detected', {
                        duration: entry.duration,
                        name: entry.name,
                        startTime: entry.startTime
                    });
                }
            });
        });

        observer.observe({ entryTypes: ['longtask'] });
    }

    // Set custom threshold for an operation
    setThreshold(operationName, threshold) {
        if (typeof threshold !== 'number' || threshold <= 0) {
            throw new Error('Invalid threshold value');
        }
        this.thresholds[operationName] = threshold;
    }

    // Clear all metrics
    clearMetrics() {
        this.metrics.clear();
    }

    // Get active operations
    getActiveOperations() {
        return Array.from(this.metrics.entries()).map(([id, op]) => ({
            id,
            name: op.name,
            duration: performance.now() - op.startTime,
            metadata: op.metadata
        }));
    }

    // Monitor storage operations
    async monitorStorageOperation(operation) {
        const operationId = this.startOperation('storage', { operation });
        try {
            const { bytesInUse, quota } = await chrome.storage.local.getBytesInUse();
            const usagePercentage = (bytesInUse / quota) * 100;

            this.logger.debug('Storage operation completed', {
                operation,
                bytesInUse,
                quota,
                usagePercentage
            });

            return { bytesInUse, quota, usagePercentage };
        } finally {
            this.endOperation(operationId);
        }
    }
}
