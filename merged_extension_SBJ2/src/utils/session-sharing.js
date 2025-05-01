// Session sharing utilities for Session Buddy with J2Cookies
import { APIClient } from './api-client.js';

export class SessionSharing {
    constructor(securityManager) {
        this.securityManager = securityManager;
        this.apiClient = new APIClient();
        this.shareTokenPrefix = 'share_';
        this.cookieProperties = [
            'name',
            'value',
            'domain',
            'path',
            'secure',
            'httpOnly',
            'sameSite',
            'expirationDate'
        ];
    }

    // Generate a unique sharing token
    generateShareToken() {
        return `${this.shareTokenPrefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Package session data with cookies for sharing
    async packageSessionForSharing(sessionData, tabs, options = {}) {
        try {
            // Get cookies for all tabs in the session
            const cookiesByTab = await Promise.all(
                tabs.map(async (tab) => {
                    try {
                        const url = new URL(tab.url);
                        const cookies = await chrome.cookies.getAll({ url: tab.url });
                        return {
                            url: tab.url,
                            cookies: cookies.map(cookie => 
                                this.cookieProperties.reduce((obj, prop) => {
                                    if (cookie[prop] !== undefined) {
                                        obj[prop] = cookie[prop];
                                    }
                                    return obj;
                                }, {})
                            )
                        };
                    } catch (error) {
                        console.error(`Error getting cookies for tab ${tab.url}:`, error);
                        return { url: tab.url, cookies: [] };
                    }
                })
            );

            // Create sharing package
            const sharePackage = {
                sessionData: {
                    ...sessionData,
                    sharedAt: Date.now(),
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hour expiration
                },
                cookieData: cookiesByTab,
                metadata: {
                    version: '1.0',
                    sharedBy: chrome.runtime.id,
                    tabCount: tabs.length,
                    cookieCount: cookiesByTab.reduce((sum, tab) => sum + tab.cookies.length, 0)
                }
            };

            // Encrypt the package if requested
            if (options.encrypt) {
                const encryptedPackage = await this.securityManager.encryptSharedSession(sharePackage);
                sharePackage.encrypted = encryptedPackage;
            }

            // Generate token and store on server
            const shareToken = this.generateShareToken();
            await this.apiClient.storeSession({
                token: shareToken,
                package: sharePackage
            });

            // Store token locally for reference
            await chrome.storage.local.set({ 
                [`${shareToken}_meta`]: { 
                    createdAt: Date.now(),
                    name: sessionData.name
                }
            });

            return {
                token: shareToken,
                package: sharePackage
            };
        } catch (error) {
            console.error('Error packaging session for sharing:', error);
            throw new Error('Failed to package session for sharing');
        }
    }

    // Validate shared session package
    validateSharedPackage(sharePackage) {
        // Validate basic structure
        if (!sharePackage.sessionData || !sharePackage.cookieData || !sharePackage.metadata) {
            throw new Error('Invalid share package structure');
        }

        // Validate session data
        this.securityManager.validateSessionData(sharePackage.sessionData);

        // Validate cookie data
        if (!Array.isArray(sharePackage.cookieData)) {
            throw new Error('Invalid cookie data structure');
        }

        sharePackage.cookieData.forEach((tabData, index) => {
            if (!tabData.url || !Array.isArray(tabData.cookies)) {
                throw new Error(`Invalid cookie data for tab ${index}`);
            }

            // Validate each cookie
            tabData.cookies.forEach((cookie, cookieIndex) => {
                if (!cookie.name || !cookie.value) {
                    throw new Error(`Invalid cookie at index ${cookieIndex} for tab ${index}`);
                }
            });
        });

        // Check expiration
        if (sharePackage.sessionData.expiresAt < Date.now()) {
            throw new Error('Shared session has expired');
        }

        return true;
    }

    // Restore shared session with cookies
    async restoreSharedSession(token) {
        try {
            // Validate token and get session from server
            await this.apiClient.validateToken(token);
            const response = await this.apiClient.getSession(token);
            
            if (!response) {
                throw new Error('Invalid or expired share token');
            }

            // Decrypt if necessary
            const sharePackage = response.encrypted ? 
                await this.securityManager.decryptData(
                    response.encrypted.data,
                    response.encrypted.key,
                    response.encrypted.iv
                ) : 
                response;

            // Validate package
            this.validateSharedPackage(sharePackage);

            // Create tabs and restore cookies
            const results = await Promise.all(
                sharePackage.cookieData.map(async (tabData) => {
                    try {
                        // Create new tab
                        const tab = await chrome.tabs.create({ 
                            url: tabData.url,
                            active: false
                        });

                        // Set cookies for the tab
                        const cookieResults = await Promise.all(
                            tabData.cookies.map(async (cookie) => {
                                try {
                                    await chrome.cookies.set({
                                        url: tabData.url,
                                        ...cookie
                                    });
                                    return { success: true, cookie: cookie.name };
                                } catch (error) {
                                    console.error(`Error setting cookie ${cookie.name}:`, error);
                                    return { success: false, cookie: cookie.name, error };
                                }
                            })
                        );

                        return {
                            success: true,
                            url: tabData.url,
                            tabId: tab.id,
                            cookies: cookieResults
                        };
                    } catch (error) {
                        console.error(`Error restoring tab ${tabData.url}:`, error);
                        return {
                            success: false,
                            url: tabData.url,
                            error
                        };
                    }
                })
            );

            return {
                success: true,
                results,
                sessionName: sharePackage.sessionData.name,
                tabCount: results.length,
                successfulTabs: results.filter(r => r.success).length
            };
        } catch (error) {
            console.error('Error restoring shared session:', error);
            throw new Error('Failed to restore shared session');
        }
    }

    // Revoke shared session
    async revokeSharedSession(token) {
        try {
            // Revoke on server and remove local reference
            await this.apiClient.revokeToken(token);
            await chrome.storage.local.remove(`${token}_meta`);
            return true;
        } catch (error) {
            console.error('Error revoking shared session:', error);
            return false;
        }
    }
}
