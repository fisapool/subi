// Logger utility for Session Buddy with J2Cookies
export class Logger {
    constructor() {
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3
        };
        this.currentLevel = this.logLevels.INFO;
        this.maxLogSize = 1000; // Keep last 1000 logs
        this.logs = [];
    }

    // Set log level
    setLogLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.currentLevel = this.logLevels[level];
        }
    }

    // Format message
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data ? JSON.stringify(data) : undefined
        };

        // Maintain log size limit
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogSize) {
            this.logs.shift();
        }

        return logEntry;
    }

    // Log methods
    debug(message, data = null) {
        if (this.currentLevel <= this.logLevels.DEBUG) {
            const entry = this.formatMessage('DEBUG', message, data);
            console.debug(`[${entry.timestamp}] DEBUG:`, message, data || '');
            return entry;
        }
    }

    info(message, data = null) {
        if (this.currentLevel <= this.logLevels.INFO) {
            const entry = this.formatMessage('INFO', message, data);
            console.info(`[${entry.timestamp}] INFO:`, message, data || '');
            return entry;
        }
    }

    warn(message, data = null) {
        if (this.currentLevel <= this.logLevels.WARN) {
            const entry = this.formatMessage('WARN', message, data);
            console.warn(`[${entry.timestamp}] WARN:`, message, data || '');
            return entry;
        }
    }

    error(message, error = null, data = null) {
        if (this.currentLevel <= this.logLevels.ERROR) {
            const errorData = error ? {
                message: error.message,
                stack: error.stack,
                ...data
            } : data;

            const entry = this.formatMessage('ERROR', message, errorData);
            console.error(`[${entry.timestamp}] ERROR:`, message, errorData || '');
            return entry;
        }
    }

    // Get logs with filtering
    getLogs(options = {}) {
        let filteredLogs = [...this.logs];

        if (options.level) {
            filteredLogs = filteredLogs.filter(log => log.level === options.level);
        }

        if (options.search) {
            const searchLower = options.search.toLowerCase();
            filteredLogs = filteredLogs.filter(log => 
                log.message.toLowerCase().includes(searchLower) ||
                (log.data && log.data.toLowerCase().includes(searchLower))
            );
        }

        if (options.startDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) >= new Date(options.startDate)
            );
        }

        if (options.endDate) {
            filteredLogs = filteredLogs.filter(log => 
                new Date(log.timestamp) <= new Date(options.endDate)
            );
        }

        return filteredLogs;
    }

    // Export logs
    async exportLogs(options = {}) {
        const logs = this.getLogs(options);
        const exportData = {
            timestamp: new Date().toISOString(),
            version: chrome.runtime.getManifest().version,
            logs
        };

        try {
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            
            await chrome.downloads.download({
                url: url,
                filename: `session-buddy-logs-${new Date().toISOString()}.json`,
                saveAs: true
            });

            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('Error exporting logs:', error);
            return false;
        }
    }

    // Clear logs
    clearLogs() {
        this.logs = [];
        return true;
    }

    // Get log statistics
    getStatistics() {
        return {
            total: this.logs.length,
            byLevel: Object.keys(this.logLevels).reduce((acc, level) => {
                acc[level] = this.logs.filter(log => log.level === level).length;
                return acc;
            }, {}),
            oldestLog: this.logs[0]?.timestamp,
            newestLog: this.logs[this.logs.length - 1]?.timestamp
        };
    }
}
