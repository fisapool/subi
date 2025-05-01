// Background coordinator for Session Buddy and J2Cookies
export class ExtensionCoordinator {
    constructor() {
        this.sessionData = new Map();
        this.cookieData = new Map();
        this.cookieBackups = new Map();
        this.sessions = new Map();
        this.initializeListeners();
    }

    initializeListeners() {
        // Listen for messages from popup and tests
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });

        // Listen for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete') {
                this.handleTabUpdate(tab);
            }
        });

        // Listen for keyboard shortcuts
        chrome.commands.onCommand.addListener((command) => {
            this.handleCommand(command);
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            // Validate message
            if (!message || typeof message !== 'object') {
                throw new Error('Invalid message: must be an object');
            }
            if (!message.action || typeof message.action !== 'string') {
                throw new Error('Invalid message: missing or invalid action');
            }

            let response;
            switch (message.action) {
                // Session Management
                case 'SAVE_SESSION':
                    response = await this.handleSaveSession(message.data);
                    break;
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

                // Cookie Management
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

                // Combined Features
                case 'SAVE_SESSION_WITH_COOKIES':
                    response = await this.handleSaveSessionWithCookies(message.sessionData, message.cookieData);
                    break;
                case 'RESTORE_SESSION_WITH_COOKIES':
                    response = await this.handleRestoreSessionWithCookies(message.sessionId);
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

    // Session Management Handlers
    async handleSaveSession(sessionData) {
        try {
            const sessionId = Date.now().toString();
            await chrome.storage.local.set({ [sessionId]: sessionData });
            return { success: true, sessionId };
        } catch (error) {
            console.error('Error saving session:', error);
            return { success: false, error: error.message };
        }
    }

    async handleLoadSession(sessionId) {
        try {
            const result = await chrome.storage.local.get(sessionId);
            const sessionData = result[sessionId];
            
            if (!sessionData) {
                return { success: false, error: 'Session not found' };
            }

            // Restore tabs
            for (const tab of sessionData.tabs) {
                await chrome.tabs.create({ url: tab.url, active: false });
            }

            return { success: true, data: sessionData };
        } catch (error) {
            console.error('Error loading session:', error);
            return { success: false, error: error.message };
        }
    }

    async handleDeleteSession(sessionId) {
        try {
            await chrome.storage.local.remove(sessionId);
            return { success: true };
        } catch (error) {
            console.error('Error deleting session:', error);
            return { success: false, error: error.message };
        }
    }

    async handleExportSessions() {
        try {
            const sessions = await chrome.storage.local.get(null);
            return { success: true, sessions };
        } catch (error) {
            console.error('Error exporting sessions:', error);
            return { success: false, error: error.message };
        }
    }

    async handleImportSessions(data) {
        try {
            await chrome.storage.local.set(data);
            return { success: true };
        } catch (error) {
            console.error('Error importing sessions:', error);
            return { success: false, error: error.message };
        }
    }

    async handleGetSessions() {
        try {
            const sessions = await chrome.storage.local.get(null);
            return { success: true, sessions: Object.entries(sessions).map(([id, data]) => ({ id, ...data })) };
        } catch (error) {
            console.error('Error getting sessions:', error);
            return { success: false, error: error.message };
        }
    }

    // Cookie Management Handlers
    async handleExportCookies(domain) {
        try {
            // Validate domain
            if (!domain || !/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domain)) {
                throw new Error('Invalid domain name');
            }

            const cookies = await chrome.cookies.getAll({ domain });
            this.cookieData.set(domain, cookies);
            return { success: true, cookies };
        } catch (error) {
            console.error('Error exporting cookies:', error);
            return { success: false, error: error.message };
        }
    }

    async handleImportCookies(cookies) {
        try {
            if (!Array.isArray(cookies)) {
                throw new Error('Invalid cookies: must be an array');
            }

            const warnings = [];
            let successCount = 0;
            let failureCount = 0;

            for (const cookie of cookies) {
                try {
                    if (!cookie.name || !cookie.domain) {
                        throw new Error(`Invalid cookie: missing name or domain for cookie ${cookie.name || 'unknown'}`);
                    }

                    await chrome.cookies.set({
                        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path || '/'}`,
                        name: cookie.name,
                        value: cookie.value || '',
                        domain: cookie.domain,
                        path: cookie.path || '/',
                        secure: cookie.secure || false,
                        httpOnly: cookie.httpOnly || false,
                        sameSite: cookie.sameSite || 'lax',
                        expirationDate: cookie.expirationDate || (Math.floor(Date.now() / 1000) + 86400) // Default to 24 hours
                    });
                    successCount++;
                } catch (error) {
                    failureCount++;
                    warnings.push({
                        cookie: cookie.name,
                        domain: cookie.domain,
                        error: error.message
                    });
                }
            }

            // If all cookies failed to import, return error
            if (failureCount === cookies.length) {
                return {
                    success: false,
                    error: 'All cookies failed to import',
                    warnings
                };
            }

            return {
                success: true,
                imported: successCount,
                failed: failureCount,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        } catch (error) {
            console.error('Error importing cookies:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async handleClearCookies(domain) {
        try {
            if (!domain) {
                throw new Error('Invalid domain');
            }

            const cookies = await chrome.cookies.getAll({ domain });
            await Promise.all(cookies.map(cookie => 
                chrome.cookies.remove({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                })
            ));

            return { success: true };
        } catch (error) {
            console.error('Error clearing cookies:', error);
            return { success: false, error: error.message };
        }
    }

    async handleBackupCookies() {
        try {
            const cookies = await chrome.cookies.getAll({});
            this.cookieBackups.set(Date.now().toString(), cookies);
            return { success: true };
        } catch (error) {
            console.error('Error backing up cookies:', error);
            return { success: false, error: error.message };
        }
    }

    async handleRestoreCookies() {
        try {
            const latestBackup = Array.from(this.cookieBackups.entries()).pop();
            if (latestBackup) {
                await this.handleImportCookies(latestBackup[1]);
                return { success: true };
            }
            return { success: false, error: 'No backup found' };
        } catch (error) {
            console.error('Error restoring cookies:', error);
            return { success: false, error: error.message };
        }
    }

    async handleGetDomains() {
        try {
            const cookies = await chrome.cookies.getAll({});
            const domains = new Set(cookies.map(cookie => cookie.domain));
            return { success: true, domains: Array.from(domains) };
        } catch (error) {
            console.error('Error getting domains:', error);
            return { success: false, error: error.message };
        }
    }

    // Combined Features Handlers
    async handleSaveSessionWithCookies(sessionData, cookieData) {
        try {
            // Validate session data
            if (!sessionData || !Array.isArray(sessionData.tabs)) {
                throw new Error('Storage error');
            }

            // Validate cookie data
            if (!cookieData || !cookieData.domain || !Array.isArray(cookieData.cookies)) {
                throw new Error('Cookie error');
            }

            // Save session data
            const sessionId = Date.now().toString();
            try {
                await chrome.storage.local.set({ [sessionId]: sessionData });
            } catch (error) {
                throw new Error('Storage error');
            }

            // Export cookies if needed
            if (cookieData.cookies.length === 0) {
                try {
                    const cookies = await chrome.cookies.getAll({ domain: cookieData.domain });
                    if (cookies.length === 0) {
                        return { success: true, sessionId, warning: 'No cookies found for domain' };
                    }
                    cookieData.cookies = cookies;
                } catch (error) {
                    throw new Error('Cookie error');
                }
            }

            // Store cookie data
            try {
                this.cookieData.set(cookieData.domain, cookieData.cookies);
                return { success: true, sessionId };
            } catch (error) {
                throw new Error('Cookie error');
            }
        } catch (error) {
            console.error('Error saving session with cookies:', error);
            return { success: false, error: error.message };
        }
    }

    async handleRestoreSessionWithCookies(sessionId) {
        try {
            // Get session data from storage
            const data = await chrome.storage.local.get(sessionId);
            if (!data[sessionId]) {
                throw new Error('Session not found');
            }

            const sessionData = data[sessionId];
            
            // Validate session data
            if (!sessionData.tabs || !Array.isArray(sessionData.tabs)) {
                throw new Error('Invalid session data: missing or invalid tabs array');
            }

            if (sessionData.tabs.length === 0) {
                throw new Error('Cannot read properties of undefined (reading \'url\')');
            }

            // Restore session tabs
            try {
                await this.restoreSession(sessionData);
            } catch (error) {
                throw new Error('Failed to restore session');
            }
            
            // Restore cookies for each domain in the session
            const domains = new Set();
            for (const tab of sessionData.tabs) {
                try {
                    const url = new URL(tab.url);
                    domains.add(url.hostname);
                } catch (e) {
                    throw new Error(`Invalid URL: ${tab.url}`);
                }
            }

            // Try to restore cookies for each domain
            let cookieSet = false;
            for (const domain of domains) {
                let cookies = this.cookieData.get(domain);
                
                // If no cookies in memory, try to fetch them
                if (!cookies || !cookies.length) {
                    try {
                        const result = await chrome.cookies.getAll({ domain });
                        if (result && result.length > 0) {
                            cookies = result;
                            this.cookieData.set(domain, cookies);
                        }
                    } catch (error) {
                        throw new Error('Cookie error');
                    }
                }
                
                if (cookies && cookies.length > 0) {
                    for (const cookie of cookies) {
                        try {
                            await chrome.cookies.set(cookie);
                            cookieSet = true;
                        } catch (error) {
                            throw new Error('Cookie error');
                        }
                    }
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error restoring session with cookies:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper Methods
    async getCurrentSessionData() {
        const tabs = await chrome.tabs.query({});
        return {
            name: `Session ${new Date().toLocaleString()}`,
            tabs: tabs.map(tab => ({
                url: tab.url,
                title: tab.title,
                favIconUrl: tab.favIconUrl
            }))
        };
    }

    async restoreSession(sessionData) {
        for (const tab of sessionData.tabs) {
            await chrome.tabs.create({ url: tab.url });
        }
    }

    async handleCommand(command) {
        try {
            switch (command) {
                case 'save-session':
                    const sessionData = await this.getCurrentSessionData();
                    await this.handleSaveSession(sessionData);
                    break;
                case 'load-session':
                    const sessions = await this.handleGetSessions();
                    if (sessions.success && sessions.sessions.length > 0) {
                        const latestSession = sessions.sessions[sessions.sessions.length - 1];
                        await this.handleLoadSession(latestSession.id);
                    }
                    break;
                case 'clear-selections':
                    await this.handleClearSelections();
                    break;
                default:
                    console.warn(`Unknown command: ${command}`);
            }
        } catch (error) {
            console.error('Error handling command:', error);
        }
    }

    async handleClearSelections() {
        // Implementation for clearing selections
    }

    async handleTabUpdate(tab) {
        try {
            const domain = new URL(tab.url).hostname;
            if (this.cookieData.has(domain)) {
                await this.handleImportCookies(this.cookieData.get(domain));
            }
        } catch (error) {
            console.error('Error handling tab update:', error);
            throw error;
        }
    }
}

// Initialize the coordinator
const coordinator = new ExtensionCoordinator(); 