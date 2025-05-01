import { CategoryManager } from './categories.js';
import { SecurityManager } from './utils/security.js';
import { NotificationManager } from './utils/notification-manager.js';
import { Logger } from './utils/logger.js';
import { PerformanceMonitor } from './utils/performance-monitor.js';
import { SessionSharing } from './utils/session-sharing.js';
import { UserGuide } from './utils/user-guide.js';
import { ErrorHandler } from './utils/error-handler.js';

export class ExtensionCoordinator {
    constructor() {
        this.sessionData = new Map();
        this.cookieData = new Map();
        this.cookieBackups = new Map();
        this.sharedSessions = new Map();
        this.categoryManager = new CategoryManager();
        this.securityManager = new SecurityManager();
        this.notificationManager = new NotificationManager();
        this.logger = new Logger();
        this.performanceMonitor = new PerformanceMonitor(this.logger);
        this.userGuide = new UserGuide();
        this.errorHandler = new ErrorHandler(this.logger, this.notificationManager, this.userGuide);
        this.sessionSharing = new SessionSharing(this.securityManager);
        this.features = {
            cookieManagement: true,
            sessionManagement: true,
            categories: true,
            encryption: true,
            notifications: true,
            logging: true,
            performanceMonitoring: true
        };
        this.sessionLock = false;
        this.initializeFeatures();
        this.initializeListeners();
        this.setupAutoBackup();
        this.checkStorageUsage();
        this.setupErrorReporting();
        this.setupPerformanceMonitoring();
    }

    setupPerformanceMonitoring() {
        if (this.features.performanceMonitoring) {
            // Set up long task monitoring
            this.performanceMonitor.setupLongTaskMonitoring();

            // Set up periodic memory checks
            setInterval(async () => {
                await this.performanceMonitor.checkMemoryUsage();
            }, 5 * 60 * 1000); // Check every 5 minutes
        }
    }

    setupErrorReporting() {
        // Global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            if (this.features.logging) {
                this.logger.error('Global error caught', error, {
                    message,
                    source,
                    lineno,
                    colno
                });
            }
        };

        // Unhandled promise rejection handler
        window.onunhandledrejection = (event) => {
            if (this.features.logging) {
                this.logger.error('Unhandled promise rejection', event.reason, {
                    promise: event.promise
                });
            }
        };
    }

    async checkStorageUsage() {
        try {
            const { bytesInUse, quota } = await chrome.storage.local.getBytesInUse();
            
            if (this.features.logging) {
                this.logger.info('Storage usage checked', {
                    bytesInUse,
                    quota,
                    usagePercentage: (bytesInUse / quota) * 100
                });
            }

            await this.notificationManager.showStorageWarning(bytesInUse, quota);
        } catch (error) {
            if (this.features.logging) {
                this.logger.error('Error checking storage usage', error);
            }
            console.error('Error checking storage usage:', error);
        }
    }

    async initializeFeatures() {
        await this.categoryManager.initialize();
    }

    initializeListeners() {
        // Existing listeners
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.handleTabUpdate(tab);
            }
        });

        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });
    }

    async handleMessage(message, sender, sendResponse) {
        if (this.features.logging) {
            this.logger.debug('Message received', { 
                action: message?.action,
                sender: sender?.id
            });
        }

        try {
            if (!message || typeof message !== 'object') {
                const error = 'Invalid message';
                if (this.features.logging) {
                    this.logger.warn(error, { message });
                }
                sendResponse({ success: false, error });
                return;
            }

            let response;
            switch (message.action) {
                // Enhanced Session Management
                case 'SAVE_SESSION':
                    response = await this.handleSaveSession(message.data, message.category);
                    break;
                case 'UPDATE_SESSION_CATEGORY':
                    response = await this.categoryManager.updateSessionCategory(
                        message.sessionId, 
                        message.category
                    );
                    break;
                case 'GET_SESSIONS_BY_CATEGORY':
                    response = {
                        success: true,
                        sessions: await this.categoryManager.getSessionsByCategory(message.category)
                    };
                    break;
                case 'SEARCH_SESSIONS':
                    response = await this.categoryManager.searchSessions(
                        message.query,
                        message.filters
                    );
                    break;
                case 'GET_CATEGORIES':
                    response = {
                        success: true,
                        categories: this.categoryManager.getAllCategories()
                    };
                    break;
                case 'ADD_CATEGORY':
                    response = await this.categoryManager.addCategory(message.name);
                    break;
                case 'REMOVE_CATEGORY':
                    response = await this.categoryManager.removeCategory(message.name);
                    break;
                case 'TOGGLE_FAVORITE':
                    response = await this.handleToggleFavorite(message.sessionId);
                    break;

                // Existing handlers
                case 'LOAD_SESSION':
                    response = await this.handleLoadSession(message.sessionId);
                    break;
                case 'DELETE_SESSION':
                    response = await this.handleDeleteSession(message.sessionId);
                    break;
                case 'EXPORT_SESSIONS':
                    response = await this.handleExportSessions();
                    break;
                case 'IMPORT_SESSIONS':
                    response = await this.handleImportSessions(message.data);
                    break;
                case 'GET_SESSIONS':
                    response = await this.handleGetSessions();
                    break;

                // Cookie Management (existing)
                case 'EXPORT_COOKIES':
                    response = await this.handleExportCookies(message.domain);
                    break;
                case 'IMPORT_COOKIES':
                    response = await this.handleImportCookies(message.cookies);
                    break;
                case 'CLEAR_COOKIES':
                    response = await this.handleClearCookies(message.domain);
                    break;
                case 'BACKUP_COOKIES':
                    response = await this.handleBackupCookies();
                    break;
                case 'RESTORE_COOKIES':
                    response = await this.handleRestoreCookies();
                    break;
                case 'GET_DOMAINS':
                    response = await this.handleGetDomains();
                    break;

                // Session Sharing
                case 'SHARE_SESSION':
                    response = await this.handleShareSession(message.sessionId);
                    break;
                case 'ACCESS_SHARED_SESSION':
                    response = await this.handleAccessSharedSession(message.shareToken);
                    break;
                case 'REVOKE_SHARED_SESSION':
                    response = await this.handleRevokeSharedSession(message.shareToken);
                    break;
                case 'LIST_SHARED_SESSIONS':
                    response = await this.handleListSharedSessions();
                    break;

                default:
                    response = { success: false, error: 'Unknown action' };
            }

            sendResponse(response);
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    // Enhanced session saving with category support
    async handleSaveSession(data, category = 'All Sessions') {
        const opId = this.features.performanceMonitoring ? 
            this.performanceMonitor.startOperation('sessionSave', { category }) : null;

        try {
            if (!this.features.sessionManagement) {
                throw new Error('Session management feature is disabled');
            }

            // Check storage usage before saving
            const storageStats = await this.performanceMonitor.monitorStorageOperation('checkQuota');
            if (storageStats.usagePercentage > 90) {
                throw new Error('Storage quota nearly full. Please remove some sessions before saving new ones.');
            }

            // Validate and sanitize session data
            const sanitizedData = this.securityManager.sanitizeSessionData({
                ...data,
                category,
                createdAt: Date.now(),
                favorite: false,
                expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
                version: 1
            });

            this.securityManager.validateSessionData(sanitizedData);

            // Acquire lock
            await this.acquireLock();

            try {
                const sessionId = Date.now().toString();
                let encryptionSuccess = true;
                
                // Encrypt session data if encryption is enabled
                let storageData;
                if (this.features.encryption) {
                    try {
                        const encryptedData = await this.securityManager.encryptData(sanitizedData);
                        storageData = {
                            ...encryptedData,
                            encrypted: true,
                            version: 1,
                            name: sanitizedData.name, // Keep name accessible for notifications
                            category: sanitizedData.category, // Keep category accessible for filtering
                            createdAt: sanitizedData.createdAt, // Keep timestamp for sorting
                            favorite: sanitizedData.favorite // Keep favorite status for filtering
                        };
                    } catch (encryptError) {
                        console.error('Encryption failed:', encryptError);
                        encryptionSuccess = false;
                        storageData = {
                            ...sanitizedData,
                            encrypted: false,
                            version: 1
                        };
                    }
                } else {
                    storageData = {
                        ...sanitizedData,
                        encrypted: false,
                        version: 1
                    };
                }

                // Save to storage
                await chrome.storage.local.set({ [sessionId]: storageData });
                this.sessionData.set(sessionId, storageData);

                // Create backup
                await this.createSessionBackup(sessionId, storageData);

                // Show notifications if enabled
                if (this.features.notifications) {
                    if (this.features.encryption) {
                        await this.notificationManager.showEncryptionStatus(
                            encryptionSuccess,
                            sanitizedData.name || 'Unnamed Session'
                        );
                    }

                    // Check storage usage after saving
                    await this.checkStorageUsage();
                }

                const result = {
                    success: true,
                    sessionId,
                    session: {
                        ...sanitizedData,
                        id: sessionId
                    },
                    encryptionSuccess
                };

                if (this.features.performanceMonitoring) {
                    this.performanceMonitor.endOperation(opId);
                }

                return result;
            } finally {
                this.releaseLock();
            }
        } catch (error) {
            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    }

    async handleLoadSession(sessionId) {
        const opId = this.features.performanceMonitoring ? 
            this.performanceMonitor.startOperation('sessionLoad', { sessionId }) : null;

        try {
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const sessionData = data[sessionId];
            let recoveredFromBackup = false;

            // Handle encrypted sessions
            let decryptedSession;
            if (sessionData.encrypted) {
                const decryptOpId = this.features.performanceMonitoring ? 
                    this.performanceMonitor.startOperation('sessionDecrypt') : null;

                try {
                    decryptedSession = await this.securityManager.decryptData(
                        sessionData.encrypted,
                        sessionData.key,
                        sessionData.iv
                    );

                    if (this.features.notifications) {
                        await this.notificationManager.showEncryptionStatus(true, sessionData.name || 'Unnamed Session');
                    }

                    if (this.features.performanceMonitoring) {
                        this.performanceMonitor.endOperation(decryptOpId);
                    }
                } catch (decryptError) {
                    if (this.features.performanceMonitoring) {
                        this.performanceMonitor.endOperation(decryptOpId);
                    }
                    console.error('Decryption failed:', decryptError);
                    
                    // Try to recover from backup
                    const backup = await this.findLatestBackup(sessionId);
                    if (backup) {
                        const backupDecryptOpId = this.features.performanceMonitoring ? 
                            this.performanceMonitor.startOperation('backupDecrypt') : null;

                        try {
                            decryptedSession = backup.encrypted ? 
                                await this.securityManager.decryptData(
                                    backup.encrypted,
                                    backup.key,
                                    backup.iv
                                ) : backup;
                            recoveredFromBackup = true;

                            if (this.features.notifications) {
                                await this.notificationManager.showSessionRecovery(backup.name || 'Unnamed Session');
                            }

                            if (this.features.performanceMonitoring) {
                                this.performanceMonitor.endOperation(backupDecryptOpId);
                            }
                        } catch (backupError) {
                            if (this.features.performanceMonitoring) {
                                this.performanceMonitor.endOperation(backupDecryptOpId);
                            }
                            console.error('Backup decryption failed:', backupError);
                            throw new Error('Failed to decrypt both session and backup');
                        }
                    } else {
                        throw new Error('Failed to decrypt session and no backup found');
                    }
                }
            } else {
                decryptedSession = sessionData;
            }

            // Validate decrypted data
            this.securityManager.validateSessionData(decryptedSession);

            // Check session expiration
            if (decryptedSession.expiresAt) {
                const daysUntilExpiration = Math.ceil((decryptedSession.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiration <= 7 && this.features.notifications) {
                    await this.notificationManager.showExpirationWarning(
                        decryptedSession.name || 'Unnamed Session',
                        daysUntilExpiration
                    );
                }
            }

            // Create new tabs
            for (const tab of decryptedSession.tabs) {
                await chrome.tabs.create({ 
                    url: this.securityManager.sanitizeString(tab.url)
                });
            }

            const result = {
                success: true,
                recoveredFromBackup,
                sessionName: decryptedSession.name || 'Unnamed Session'
            };

            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }

            return result;
        } catch (error) {
            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }
            console.error('Error loading session:', error);
            if (this.features.notifications) {
                await this.notificationManager.showEncryptionStatus(false, 'Session');
            }
            return { success: false, error: error.message };
        }
    }

    // Toggle session favorite status
    async handleToggleFavorite(sessionId) {
        try {
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const session = data[sessionId];
            session.favorite = !session.favorite;

            await chrome.storage.local.set({ [sessionId]: session });
            return { success: true, session };
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return { success: false, error: error.message };
        }
    }

    // Enhanced getCurrentSessionData with metadata and validation
    async getCurrentSessionData() {
        const tabs = await chrome.tabs.query({});
        const sessionData = {
            name: `Session ${new Date().toLocaleString()}`,
            tabs: tabs.map(tab => ({
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl
            })),
            createdAt: Date.now(),
            category: 'All Sessions',
            favorite: false,
            version: 1
        };

        return this.securityManager.sanitizeSessionData(sessionData);
    }

    // Lock management
    async acquireLock() {
        const startTime = Date.now();
        while (this.sessionLock) {
            if (Date.now() - startTime > 5000) {
                throw new Error('Session lock timeout');
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.sessionLock = true;
    }

    releaseLock() {
        this.sessionLock = false;
    }

    // Automatic backup system
    setupAutoBackup() {
        // Create alarms for both backup and maintenance
        chrome.alarms.create('sessionBackup', {
            periodInMinutes: 60 // Backup every hour
        });

        chrome.alarms.create('sessionMaintenance', {
            periodInMinutes: 120 // Maintenance every 2 hours
        });

        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'sessionBackup') {
                this.performAutoBackup();
            } else if (alarm.name === 'sessionMaintenance') {
                this.performMaintenance();
            }
        });
    }

    async performMaintenance() {
        try {
            if (this.features.logging) {
                this.logger.info('Starting maintenance routine');
            }

            await this.cleanupExpiredSessions();
            await this.validateStorageIntegrity();

            // Log maintenance statistics
            if (this.features.logging) {
                const stats = await this.getMaintenanceStats();
                this.logger.info('Maintenance completed', stats);
            }
        } catch (error) {
            if (this.features.logging) {
                this.logger.error('Error during maintenance', error);
            }
            console.error('Error during maintenance:', error);
        }
    }

    async getMaintenanceStats() {
        const data = await chrome.storage.local.get(null);
        return {
            totalSessions: Object.keys(data).filter(key => !key.startsWith('backup_')).length,
            totalBackups: Object.keys(data).filter(key => key.startsWith('backup_')).length,
            storageUsage: await chrome.storage.local.getBytesInUse(),
            lastMaintenance: Date.now()
        };
    }

    async cleanupExpiredSessions() {
        try {
            const now = Date.now();
            const data = await chrome.storage.local.get(null);
            const expiredSessions = Object.entries(data)
                .filter(([key, value]) => 
                    !key.startsWith('backup_') && 
                    value.tabs &&
                    value.expiresAt &&
                    value.expiresAt < now
                )
                .map(([key]) => key);

            if (expiredSessions.length > 0) {
                // Remove expired sessions and their backups
                for (const sessionId of expiredSessions) {
                    await this.handleDeleteSession(sessionId);
                }

                console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
            }
        } catch (error) {
            console.error('Error cleaning up expired sessions:', error);
        }
    }

    async validateStorageIntegrity() {
        try {
            const data = await chrome.storage.local.get(null);
            const invalidSessions = [];

            // Check each session for data integrity
            for (const [key, session] of Object.entries(data)) {
                if (!key.startsWith('backup_') && session.tabs) {
                    try {
                        // Attempt to validate the session data
                        if (session.encrypted) {
                            // For encrypted sessions, verify encryption data is present
                            if (!session.key || !session.iv) {
                                invalidSessions.push(key);
                            }
                        } else {
                            // For unencrypted sessions, validate structure
                            this.securityManager.validateSessionData(session);
                        }
                    } catch (error) {
                        console.error(`Invalid session data for ${key}:`, error);
                        invalidSessions.push(key);
                    }
                }
            }

            // Move invalid sessions to a quarantine area
            if (invalidSessions.length > 0) {
                const quarantineData = invalidSessions.reduce((acc, key) => {
                    acc[`quarantine_${key}`] = {
                        ...data[key],
                        quarantinedAt: Date.now(),
                        reason: 'Data integrity validation failed'
                    };
                    return acc;
                }, {});

                await chrome.storage.local.set(quarantineData);
                await chrome.storage.local.remove(invalidSessions);

                if (this.features.notifications) {
                    await this.notificationManager.showQuarantineNotification(invalidSessions.length);
                }

                console.log(`Quarantined ${invalidSessions.length} invalid sessions`);
            }
        } catch (error) {
            console.error('Error validating storage integrity:', error);
        }
    }

    async handleImportSessions(importData) {
        try {
            await this.acquireLock();

            try {
                let sessionsToImport;

                // Handle encrypted import data
                if (importData.encrypted) {
                    sessionsToImport = await this.securityManager.decryptData(
                        importData.encrypted,
                        importData.key,
                        importData.iv
                    );
                } else {
                    sessionsToImport = importData;
                }

                // Validate import data
                if (!sessionsToImport.version || !sessionsToImport.sessions) {
                    throw new Error('Invalid import data format');
                }

                // Process each session
                const results = [];
                for (const [id, session] of Object.entries(sessionsToImport.sessions)) {
                    try {
                        // Generate new ID to avoid conflicts
                        const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Sanitize and validate session data
                        const sanitizedSession = this.securityManager.sanitizeSessionData(session);
                        this.securityManager.validateSessionData(sanitizedSession);

                        // Save the session
                        await chrome.storage.local.set({ 
                            [newId]: {
                                ...sanitizedSession,
                                importedAt: Date.now(),
                                originalId: id
                            }
                        });

                        results.push({
                            originalId: id,
                            newId,
                            success: true
                        });
                    } catch (sessionError) {
                        results.push({
                            originalId: id,
                            success: false,
                            error: sessionError.message
                        });
                    }
                }

                const summary = {
                    total: results.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length
                };

                if (this.features.notifications) {
                    await this.notificationManager.showImportResults(summary);
                }

                return { success: true, results, summary };
            } finally {
                this.releaseLock();
            }
        } catch (error) {
            console.error('Error importing sessions:', error);
            return { success: false, error: error.message };
        }
    }

    async createSessionBackup(sessionId, sessionData) {
        try {
            const backupKey = `backup_${sessionId}_${Date.now()}`;
            await chrome.storage.local.set({
                [backupKey]: {
                    ...sessionData,
                    originalId: sessionId,
                    backupTime: Date.now()
                }
            });
            return true;
        } catch (error) {
            console.error('Backup creation failed:', error);
            return false;
        }
    }

    async performAutoBackup() {
        try {
            const data = await chrome.storage.local.get(null);
            const sessions = Object.entries(data)
                .filter(([key, value]) => !key.startsWith('backup_') && value.tabs);
            
            for (const [id, session] of sessions) {
                await this.createSessionBackup(id, session);
            }

            // Clean up old backups (keep last 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const allData = await chrome.storage.local.get(null);
            const oldBackups = Object.entries(allData)
                .filter(([key, value]) => 
                    key.startsWith('backup_') && 
                    value.backupTime < sevenDaysAgo
                )
                .map(([key]) => key);

            if (oldBackups.length > 0) {
                await chrome.storage.local.remove(oldBackups);
            }

            // Show backup completion notification
            if (this.features.notifications) {
                await this.notificationManager.showBackupComplete(sessions.length);
            }
        } catch (error) {
            console.error('Auto backup failed:', error);
        }
    }

    // Rest of the existing methods remain unchanged...

    async handleLoadSession(sessionId) {
        try {
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const sessionData = data[sessionId];
            let recoveredFromBackup = false;

            // Handle encrypted sessions
            let decryptedSession;
            if (sessionData.encrypted) {
                try {
                    decryptedSession = await this.securityManager.decryptData(
                        sessionData.encrypted,
                        sessionData.key,
                        sessionData.iv
                    );

                    if (this.features.notifications) {
                        await this.notificationManager.showEncryptionStatus(true, sessionData.name || 'Unnamed Session');
                    }
                } catch (decryptError) {
                    console.error('Decryption failed:', decryptError);
                    
                    // Try to recover from backup
                    const backup = await this.findLatestBackup(sessionId);
                    if (backup) {
                        try {
                            decryptedSession = backup.encrypted ? 
                                await this.securityManager.decryptData(
                                    backup.encrypted,
                                    backup.key,
                                    backup.iv
                                ) : backup;
                            recoveredFromBackup = true;

                            if (this.features.notifications) {
                                await this.notificationManager.showSessionRecovery(backup.name || 'Unnamed Session');
                            }
                        } catch (backupError) {
                            console.error('Backup decryption failed:', backupError);
                            throw new Error('Failed to decrypt both session and backup');
                        }
                    } else {
                        throw new Error('Failed to decrypt session and no backup found');
                    }
                }
            } else {
                decryptedSession = sessionData;
            }

            // Validate decrypted data
            this.securityManager.validateSessionData(decryptedSession);

            // Check session expiration
            if (decryptedSession.expiresAt) {
                const daysUntilExpiration = Math.ceil((decryptedSession.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
                if (daysUntilExpiration <= 7 && this.features.notifications) {
                    await this.notificationManager.showExpirationWarning(
                        decryptedSession.name || 'Unnamed Session',
                        daysUntilExpiration
                    );
                }
            }

            // Create new tabs
            for (const tab of decryptedSession.tabs) {
                await chrome.tabs.create({ 
                    url: this.securityManager.sanitizeString(tab.url)
                });
            }

            return { 
                success: true,
                recoveredFromBackup,
                sessionName: decryptedSession.name || 'Unnamed Session'
            };
        } catch (error) {
            console.error('Error loading session:', error);
            if (this.features.notifications) {
                await this.notificationManager.showEncryptionStatus(false, 'Session');
            }
            return { success: false, error: error.message };
        }
    }

    async findLatestBackup(sessionId) {
        try {
            const data = await chrome.storage.local.get(null);
            const backups = Object.entries(data)
                .filter(([key, value]) => 
                    key.startsWith(`backup_${sessionId}_`) &&
                    value.originalId === sessionId
                )
                .sort(([, a], [, b]) => b.backupTime - a.backupTime);

            return backups.length > 0 ? backups[0][1] : null;
        } catch (error) {
            console.error('Error finding backup:', error);
            return null;
        }
    }

    // Handle session sharing with enhanced error handling and user guidance
    async handleShareSession(sessionId) {
        const opId = this.features.performanceMonitoring ? 
            this.performanceMonitor.startOperation('sessionShare') : null;

        try {
            // Get session data
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const sessionData = data[sessionId];

            // Check for warnings before sharing
            const warnings = this.errorHandler.validateSharingPrerequisites(sessionData);
            for (const warning of warnings) {
                await this.errorHandler.handleWarning(warning, { sessionId, sessionName: sessionData.name });
            }
            
            // Get current tabs for the session
            const tabs = await chrome.tabs.query({});

            // Package session for sharing
            const { token, package: sharePackage } = await this.sessionSharing.packageSessionForSharing(
                sessionData,
                tabs
            );

            // Encrypt the package if encryption is enabled
            let storageData;
            if (this.features.encryption) {
                storageData = await this.securityManager.encryptSharedSession(sharePackage);
            } else {
                storageData = sharePackage;
            }

            // Store the shared session
            await chrome.storage.local.set({ [token]: storageData });
            this.sharedSessions.set(token, {
                sessionId,
                createdAt: Date.now(),
                expiresAt: sharePackage.sessionData.expiresAt,
                warnings
            });

            // Show notification
            if (this.features.notifications) {
                const hoursUntilExpiration = Math.ceil(
                    (sharePackage.sessionData.expiresAt - Date.now()) / (1000 * 60 * 60)
                );
                await this.notificationManager.showSessionShared(
                    sessionData.name || 'Unnamed Session',
                    hoursUntilExpiration
                );
            }

            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }

            return {
                success: true,
                shareToken: token,
                expiresAt: sharePackage.sessionData.expiresAt,
                warnings,
                guide: this.userGuide.getGuide('sessionSharing')
            };
        } catch (error) {
            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }
            return await this.errorHandler.handleSharingError(error, { sessionId });
        }
    }

    // Handle accessing a shared session with enhanced error handling and monitoring
    async handleAccessSharedSession(shareToken) {
        const opId = this.features.performanceMonitoring ? 
            this.performanceMonitor.startOperation('sessionAccess') : null;

        try {
            // Validate token
            this.securityManager.validateShareToken(shareToken);

            // Get shared session data
            const data = await chrome.storage.local.get(shareToken);
            if (!data[shareToken]) {
                throw new Error('Shared session not found or expired');
            }

            const sharedData = data[shareToken];

            // Monitor access patterns
            await this.errorHandler.monitorSessionAccess(shareToken, {
                type: 'access',
                extensionId: chrome.runtime.id
            });

            // Decrypt if necessary
            let sharePackage;
            if (sharedData.encrypted) {
                try {
                    sharePackage = await this.securityManager.decryptData(
                        sharedData.encrypted,
                        sharedData.key,
                        sharedData.iv
                    );
                } catch (error) {
                    throw new Error('Failed to decrypt shared session');
                }
            } else {
                sharePackage = sharedData;
            }

            // Check warnings from original share
            if (sharedData.warnings && sharedData.warnings.length > 0) {
                for (const warning of sharedData.warnings) {
                    await this.errorHandler.handleWarning(warning, {
                        sessionName: sharePackage.sessionData.name
                    });
                }
            }

            // Restore the shared session
            const result = await this.sessionSharing.restoreSharedSession(sharePackage);

            // Show notifications
            if (this.features.notifications) {
                await this.notificationManager.showCookieRestorationStatus(
                    result.sessionName,
                    result.success,
                    result.successfulTabs === result.tabCount
                        ? ''
                        : `${result.successfulTabs}/${result.tabCount} tabs restored`
                );
            }

            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }

            return {
                success: true,
                ...result,
                guide: this.userGuide.getGuide('sessionSharing')
            };
        } catch (error) {
            if (this.features.performanceMonitoring) {
                this.performanceMonitor.endOperation(opId);
            }
            return await this.errorHandler.handleSharingError(error, { shareToken });
        }
    }

    // Handle revoking a shared session
    async handleRevokeSharedSession(shareToken) {
        try {
            // Validate token
            this.securityManager.validateShareToken(shareToken);

            // Remove shared session
            await this.sessionSharing.revokeSharedSession(shareToken);
            this.sharedSessions.delete(shareToken);

            // Show notification
            if (this.features.notifications) {
                const sessionData = await chrome.storage.local.get(shareToken);
                if (sessionData[shareToken]) {
                    await this.notificationManager.showShareRevoked(
                        sessionData[shareToken].sessionData?.name || 'Unnamed Session'
                    );
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error revoking shared session:', error);
            return { success: false, error: error.message };
        }
    }

    // Handle listing shared sessions
    async handleListSharedSessions() {
        try {
            const sharedSessions = Array.from(this.sharedSessions.entries())
                .map(([token, data]) => ({
                    token,
                    ...data,
                    isExpired: data.expiresAt < Date.now()
                }));

            return {
                success: true,
                sessions: sharedSessions
            };
        } catch (error) {
            console.error('Error listing shared sessions:', error);
            return { success: false, error: error.message };
        }
    }

    async handleDeleteSession(sessionId) {
        try {
            // Acquire lock to prevent concurrent modifications
            await this.acquireLock();

            try {
                // Check if session exists
                const data = await chrome.storage.local.get(sessionId);
                if (!data[sessionId]) {
                    throw new Error('Session not found');
                }

                // Find all backups for this session
                const allData = await chrome.storage.local.get(null);
                const backupKeys = Object.keys(allData).filter(key => 
                    key.startsWith(`backup_${sessionId}_`)
                );

                // Remove session and all its backups
                const keysToRemove = [sessionId, ...backupKeys];
                await chrome.storage.local.remove(keysToRemove);

                // Remove from memory cache
                this.sessionData.delete(sessionId);

                return { 
                    success: true, 
                    message: `Session and ${backupKeys.length} backups deleted successfully` 
                };
            } finally {
                this.releaseLock();
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    }

    async handleExportSessions() {
        try {
            const data = await chrome.storage.local.get(null);
            const sessions = Object.entries(data)
                .filter(([key, value]) => !key.startsWith('backup_') && value.tabs)
                .reduce((acc, [id, session]) => {
                    acc[id] = session;
                    return acc;
                }, {});

            // Create export package with metadata
            const exportPackage = {
                version: '1.0',
                timestamp: Date.now(),
                sessions,
                metadata: {
                    sessionCount: Object.keys(sessions).length,
                    exportedBy: chrome.runtime.getManifest().name,
                    exportedVersion: chrome.runtime.getManifest().version
                }
            };

            // Encrypt the entire export package
            if (this.features.encryption) {
                const encryptedData = await this.securityManager.encryptData(exportPackage);
                return {
                    success: true,
                    data: {
                        ...encryptedData,
                        encrypted: true,
                        exportVersion: '1.0'
                    }
                };
            }

            return {
                success: true,
                data: {
                    ...exportPackage,
                    encrypted: false
                }
            };
        } catch (error) {
            console.error('Error exporting sessions:', error);
            return { success: false, error: error.message };
        }
    }

    async handleImportSessions(importData) {
        try {
            await this.acquireLock();

            try {
                let sessionsToImport;

                // Handle encrypted import data
                if (importData.encrypted) {
                    sessionsToImport = await this.securityManager.decryptData(
                        importData.encrypted,
                        importData.key,
                        importData.iv
                    );
                } else {
                    sessionsToImport = importData;
                }

                // Validate import data
                if (!sessionsToImport.version || !sessionsToImport.sessions) {
                    throw new Error('Invalid import data format');
                }

                // Process each session
                const results = [];
                for (const [id, session] of Object.entries(sessionsToImport.sessions)) {
                    try {
                        // Generate new ID to avoid conflicts
                        const newId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        
                        // Sanitize and validate session data
                        const sanitizedSession = this.securityManager.sanitizeSessionData(session);
                        this.securityManager.validateSessionData(sanitizedSession);

                        // Save the session
                        await chrome.storage.local.set({ 
                            [newId]: {
                                ...sanitizedSession,
                                importedAt: Date.now(),
                                originalId: id
                            }
                        });

                        results.push({
                            originalId: id,
                            newId,
                            success: true
                        });
                    } catch (sessionError) {
                        results.push({
                            originalId: id,
                            success: false,
                            error: sessionError.message
                        });
                    }
                }

                return {
                    success: true,
                    results,
                    summary: {
                        total: results.length,
                        successful: results.filter(r => r.success).length,
                        failed: results.filter(r => !r.success).length
                    }
                };
            } finally {
                this.releaseLock();
            }
        } catch (error) {
            console.error('Error importing sessions:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize the coordinator
const coordinator = new ExtensionCoordinator();
