import { CookieManager } from './CookieManager.js';

class SessionManager {
    constructor() {
        this.cookieManager = new CookieManager();
        this.initializeUI();
        this.loadSessions();
        this.warningDialog = document.getElementById('warningDialog');
        this.overlay = document.getElementById('overlay');
        this.warningDialogContent = document.getElementById('warningDialogContent');
        this.pendingWarnings = null;
        this.pendingSessionId = null;
    }

    initializeUI() {
        // Initialize buttons
        document.getElementById('newSession').addEventListener('click', () => this.createNewSession());
        document.getElementById('settings').addEventListener('click', () => this.openSettings());
        document.getElementById('closeWarningDialog').addEventListener('click', () => this.hideWarningDialog());
        document.getElementById('cancelImport').addEventListener('click', () => this.hideWarningDialog());
        document.getElementById('proceedImport').addEventListener('click', () => this.proceedWithWarnings());

        // Initialize session list container
        this.sessionList = document.getElementById('sessionList');
        this.statusElement = document.getElementById('status');
        
        // Add event delegation for session actions
        this.sessionList.addEventListener('click', (event) => {
            const target = event.target;
            
            // Check if the clicked element is a button
            if (target.classList.contains('btn')) {
                // Find the closest session item
                const sessionItem = target.closest('.session-item');
                if (sessionItem) {
                    const sessionId = parseInt(sessionItem.dataset.id, 10);
                    
                    // Handle restore button
                    if (target.classList.contains('btn-primary')) {
                        this.restoreSession(sessionId);
                    }
                    // Handle delete button
                    else if (target.classList.contains('btn-secondary')) {
                        this.deleteSession(sessionId);
                    }
                }
            }
            
            // Check if the clicked element is a warning badge
            if (target.classList.contains('warning-badge')) {
                const sessionItem = target.closest('.session-item');
                if (sessionItem) {
                    const sessionId = parseInt(sessionItem.dataset.id, 10);
                    this.showWarningsForSession(sessionId);
                }
            }
        });
    }

    async loadSessions() {
        try {
            this.setStatus('Loading sessions...');
            const sessions = await chrome.storage.local.get('sessions');
            this.renderSessions(sessions.sessions || []);
            this.setStatus('Ready');
        } catch (error) {
            this.setStatus('Error loading sessions');
            console.error('Error loading sessions:', error);
        }
    }

    async createNewSession() {
        try {
            this.setStatus('Creating new session...');
            
            // Get current tabs
            const tabs = await chrome.tabs.query({ currentWindow: true });
            
            // Get cookies for each tab
            const sessionData = await Promise.all(tabs.map(async (tab) => {
                try {
                    const hostname = new URL(tab.url).hostname;
                    const cookies = await this.cookieManager.exportCookies(hostname);
                    
                    return {
                        url: tab.url,
                        title: tab.title,
                        cookies: cookies // This is now in the new format with data property
                    };
                } catch (error) {
                    console.error('Error exporting cookies for tab:', tab.url, error);
                    // Return tab data without cookies if export fails
                    return {
                        url: tab.url,
                        title: tab.title,
                        cookies: null
                    };
                }
            }));

            // Collect all warnings from cookie validation
            const allWarnings = [];
            for (const tabData of sessionData) {
                if (tabData.cookies && tabData.cookies.warnings) {
                    allWarnings.push(...tabData.cookies.warnings);
                }
            }

            // Save session
            const sessions = await chrome.storage.local.get('sessions');
            const newSession = {
                id: Date.now(),
                name: `Session ${new Date().toLocaleString()}`,
                data: sessionData,
                createdAt: Date.now(),
                warnings: allWarnings.length > 0 ? allWarnings : null
            };

            const updatedSessions = [...(sessions.sessions || []), newSession];
            await chrome.storage.local.set({ sessions: updatedSessions });

            this.renderSessions(updatedSessions);
            
            // Show warning dialog if there are warnings
            if (allWarnings.length > 0) {
                this.showWarningDialog(allWarnings);
            } else {
                this.setStatus('Session created successfully');
            }
        } catch (error) {
            this.setStatus('Error creating session');
            console.error('Error creating session:', error);
        }
    }

    async restoreSession(sessionId) {
        try {
            this.setStatus('Restoring session...');
            
            const sessions = await chrome.storage.local.get('sessions');
            const session = sessions.sessions.find(s => s.id === sessionId);
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Initialize cookie manager if not already initialized
            if (!this.cookieManager.encryptionKey) {
                await this.cookieManager.initialize();
            }

            // Validate session before proceeding
            const isSessionValid = await this.cookieManager.validateSession();
            if (!isSessionValid) {
                this.setStatus('Session validation failed - some cookies may not be restored');
                console.warn('Session validation failed - proceeding with caution');
            }

            // Restore cookies for each tab
            const importResults = {
                success: 0,
                failed: 0,
                warnings: [],
                criticalErrors: []
            };

            for (const tabData of session.data) {
                try {
                    // Check if cookies is in the expected format
                    if (tabData.cookies && tabData.cookies.data) {
                        // New format: cookies is the result of exportCookies
                        const result = await this.cookieManager.importCookies(tabData.cookies.data.cookies);
                        importResults.success += result.success.length;
                        importResults.failed += result.failed.length;
                        
                        // Only collect warnings if they're not suppressed
                        if (result.warnings) {
                            const nonSuppressedWarnings = result.warnings.filter(warning => 
                                !warning.message.includes('Invalid cookie data format') ||
                                !isSessionValid
                            );
                            importResults.warnings.push(...nonSuppressedWarnings);
                        }
                    } else if (tabData.cookies) {
                        // Old format: cookies is directly the cookie data
                        const result = await this.cookieManager.importCookies(tabData.cookies);
                        importResults.success += result.success.length;
                        importResults.failed += result.failed.length;
                        
                        // Only collect warnings if they're not suppressed
                        if (result.warnings) {
                            const nonSuppressedWarnings = result.warnings.filter(warning => 
                                !warning.message.includes('Invalid cookie data format') ||
                                !isSessionValid
                            );
                            importResults.warnings.push(...nonSuppressedWarnings);
                        }
                    } else {
                        console.warn('No cookie data found for tab:', tabData.url);
                    }
                } catch (error) {
                    // Only log critical errors
                    if (error.message && !error.message.includes('Invalid cookie data format')) {
                        console.error('Error importing cookies for tab:', tabData.url, error);
                        importResults.criticalErrors.push({
                            url: tabData.url,
                            error: error.message
                        });
                    }
                    importResults.failed++;
                }
            }

            // Check if there are critical errors
            if (importResults.criticalErrors.length > 0) {
                this.setStatus(`Session restored with ${importResults.criticalErrors.length} critical errors`);
                console.error('Critical errors during session restore:', importResults.criticalErrors);
            }

            // Check if there are warnings
            if (importResults.warnings.length > 0) {
                // Store warnings and session ID for later use
                this.pendingWarnings = importResults.warnings;
                this.pendingSessionId = sessionId;
                
                // Show warning dialog
                this.showWarningDialog(importResults.warnings);
                return;
            }

            // Create new tabs
            await Promise.all(session.data.map(tabData => 
                chrome.tabs.create({ url: tabData.url })
            ));

            // Show summary of import results
            if (importResults.failed > 0) {
                if (importResults.criticalErrors.length > 0) {
                    this.setStatus(`Session restored with ${importResults.criticalErrors.length} critical errors`);
                } else {
                    this.setStatus(`Session restored with ${importResults.failed} non-critical failures`);
                }
            } else {
                this.setStatus('Session restored successfully');
            }
        } catch (error) {
            this.setStatus('Error restoring session');
            
            // Only show detailed error if it's not a suppressed error
            if (!error.message?.includes('Invalid cookie data format')) {
                console.error('Error restoring session:', error);
                const errorMessage = error.message || 'Unknown error';
                this.setStatus(`Error restoring session: ${errorMessage}`);
            } else {
                console.debug('Suppressed error during session restore:', error);
                this.setStatus('Session restored with minor issues');
            }
        }
    }

    showWarningDialog(warnings) {
        // Populate warning dialog content
        this.warningDialogContent.innerHTML = warnings.map(warning => `
            <div class="warning-item">
                <div><strong>Cookie:</strong> ${warning.cookie}</div>
                ${warning.warnings ? warning.warnings.map(w => 
                    `<div><strong>Warning:</strong> ${w.message}</div>`
                ).join('') : `<div><strong>Warning:</strong> ${warning.message}</div>`}
            </div>
        `).join('');
        
        // Show dialog and overlay
        this.warningDialog.classList.add('visible');
        this.overlay.classList.add('visible');
    }

    hideWarningDialog() {
        this.warningDialog.classList.remove('visible');
        this.overlay.classList.remove('visible');
        this.pendingWarnings = null;
        this.pendingSessionId = null;
    }

    async proceedWithWarnings() {
        if (this.pendingSessionId) {
            this.hideWarningDialog();
            
            // Get the session
            const sessions = await chrome.storage.local.get('sessions');
            const session = sessions.sessions.find(s => s.id === this.pendingSessionId);
            
            if (session) {
                // Create new tabs
                await Promise.all(session.data.map(tabData => 
                    chrome.tabs.create({ url: tabData.url })
                ));
                
                this.setStatus('Session restored successfully (with warnings)');
            }
        }
    }

    showWarningsForSession(sessionId) {
        // Get the session
        chrome.storage.local.get('sessions', (result) => {
            const session = result.sessions.find(s => s.id === sessionId);
            
            if (session && session.warnings) {
                this.showWarningDialog(session.warnings);
            }
        });
    }

    async deleteSession(sessionId) {
        try {
            this.setStatus('Deleting session...');
            
            const sessions = await chrome.storage.local.get('sessions');
            const updatedSessions = sessions.sessions.filter(s => s.id !== sessionId);
            
            await chrome.storage.local.set({ sessions: updatedSessions });
            this.renderSessions(updatedSessions);
            
            this.setStatus('Session deleted successfully');
        } catch (error) {
            this.setStatus('Error deleting session');
            console.error('Error deleting session:', error);
        }
    }

    renderSessions(sessions) {
        this.sessionList.innerHTML = sessions.map(session => {
            // Check if session has warnings
            const hasWarnings = session.warnings && session.warnings.length > 0;
            
            return `
                <div class="session-item" data-id="${session.id}">
                    <div class="session-title">
                        ${session.name}
                        ${hasWarnings ? `<span class="warning-badge" title="This session has validation warnings">!</span>` : ''}
                    </div>
                    <div class="session-info">
                        ${session.data.length} tabs • Created ${new Date(session.createdAt).toLocaleString()}
                    </div>
                    <div class="actions">
                        <button class="btn btn-primary">Restore</button>
                        <button class="btn btn-secondary">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    setStatus(message) {
        this.statusElement.textContent = message;
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }
}

// Initialize the session manager
const sessionManager = new SessionManager();

// Make it available globally for the onclick handlers
window.sessionManager = sessionManager;