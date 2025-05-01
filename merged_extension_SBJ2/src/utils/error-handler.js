// Error handling utilities for Session Buddy with J2Cookies
export class ErrorHandler {
    constructor(logger, notificationManager, userGuide) {
        this.logger = logger;
        this.notificationManager = notificationManager;
        this.userGuide = userGuide;
    }

    // Handle session sharing errors
    async handleSharingError(error, context = {}) {
        // Log the error
        this.logger.error('Session sharing error', error, context);

        // Determine error type and get appropriate message
        const errorInfo = this.categorizeError(error);
        const userMessage = this.userGuide.getErrorMessage(errorInfo.code);

        // Show notification to user
        await this.notificationManager.showNotification(errorInfo.code, {
            title: userMessage.title,
            message: `${userMessage.message} ${userMessage.action}`,
            priority: errorInfo.priority
        });

        // Return structured error response
        return {
            success: false,
            error: errorInfo.code,
            message: userMessage.message,
            action: userMessage.action,
            details: error.message
        };
    }

    // Categorize errors and determine appropriate response
    categorizeError(error) {
        // Session expiration errors
        if (error.message.includes('expired') || error.message.includes('expiration')) {
            return {
                code: 'session-expired',
                priority: 1
            };
        }

        // Token validation errors
        if (error.message.includes('token') || error.message.includes('invalid')) {
            return {
                code: 'invalid-token',
                priority: 2
            };
        }

        // Cookie restoration errors
        if (error.message.includes('cookie') || error.message.includes('restoration')) {
            return {
                code: 'cookie-restoration-failed',
                priority: 2
            };
        }

        // Encryption errors
        if (error.message.includes('encrypt') || error.message.includes('decrypt')) {
            return {
                code: 'encryption-failed',
                priority: 2
            };
        }

        // Access control errors
        if (error.message.includes('permission') || error.message.includes('access')) {
            return {
                code: 'access-denied',
                priority: 2
            };
        }

        // Default unknown error
        return {
            code: 'unknown-error',
            priority: 1
        };
    }

    // Handle warnings
    async handleWarning(warningCode, context = {}) {
        // Log the warning
        this.logger.warn(`Warning: ${warningCode}`, context);

        // Get warning message
        const warningInfo = this.userGuide.getWarningMessage(warningCode);

        // Show warning notification
        await this.notificationManager.showNotification(`warning-${warningCode}`, {
            title: warningInfo.title,
            message: `${warningInfo.message} ${warningInfo.action}`,
            priority: 1
        });

        return {
            warning: warningCode,
            message: warningInfo.message,
            action: warningInfo.action
        };
    }

    // Validate session data before sharing
    validateSharingPrerequisites(sessionData) {
        const warnings = [];

        // Check for sensitive data indicators
        if (this.containsSensitiveData(sessionData)) {
            warnings.push('sensitive-data');
        }

        // Check session size
        if (this.isLargeSession(sessionData)) {
            warnings.push('large-session');
        }

        return warnings;
    }

    // Check for indicators of sensitive data
    containsSensitiveData(sessionData) {
        const sensitivePatterns = [
            /bank/i,
            /payment/i,
            /admin/i,
            /manage/i,
            /account/i,
            /secure/i,
            /private/i
        ];

        return sessionData.tabs.some(tab => 
            sensitivePatterns.some(pattern => 
                pattern.test(tab.url) || pattern.test(tab.title)
            )
        );
    }

    // Check if session is unusually large
    isLargeSession(sessionData) {
        const MAX_TABS = 50;
        const MAX_COOKIES = 100;

        return (
            sessionData.tabs.length > MAX_TABS ||
            (sessionData.cookies && sessionData.cookies.length > MAX_COOKIES)
        );
    }

    // Monitor session access patterns
    async monitorSessionAccess(sessionId, accessInfo) {
        const ACCESS_THRESHOLD = 5; // Number of accesses before warning
        const TIME_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

        try {
            // Get access history
            const history = await this.getAccessHistory(sessionId);
            
            // Add new access
            history.push({
                timestamp: Date.now(),
                ...accessInfo
            });

            // Check for suspicious patterns
            const recentAccesses = history.filter(
                access => Date.now() - access.timestamp < TIME_WINDOW
            );

            if (recentAccesses.length >= ACCESS_THRESHOLD) {
                await this.handleWarning('multiple-access', {
                    sessionId,
                    accessCount: recentAccesses.length,
                    timeWindow: TIME_WINDOW
                });
            }

            // Update access history
            await this.updateAccessHistory(sessionId, history);

        } catch (error) {
            this.logger.error('Error monitoring session access', error, {
                sessionId,
                accessInfo
            });
        }
    }

    // Get access history for a session
    async getAccessHistory(sessionId) {
        try {
            const data = await chrome.storage.local.get(`access_history_${sessionId}`);
            return data[`access_history_${sessionId}`] || [];
        } catch (error) {
            this.logger.error('Error getting access history', error, { sessionId });
            return [];
        }
    }

    // Update access history for a session
    async updateAccessHistory(sessionId, history) {
        try {
            await chrome.storage.local.set({
                [`access_history_${sessionId}`]: history
            });
        } catch (error) {
            this.logger.error('Error updating access history', error, { sessionId });
        }
    }
}
