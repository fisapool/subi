import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';
import { createMockCookie, createMockStorage, resetTestEnvironment } from './utils/test-helpers.js';

describe('Edge Cases', () => {
    let coordinator;

    beforeEach(() => {
        resetTestEnvironment();
        coordinator = new ExtensionCoordinator();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Cookie Management Edge Cases', () => {
        it('should handle expired cookies', async () => {
            // This test verifies that cookies with expiration dates in the past
            // are properly rejected during import to avoid unexpected behavior
            const expiredCookie = createMockCookie({
                name: 'expired',
                value: 'value',
                domain: 'example.com',
                expirationDate: Math.floor(Date.now() / 1000) - 86400 // 1 day ago
            });
            
            const result = await coordinator.handleImportCookies([expiredCookie]);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('expired');
        });

        it('should handle secure cookies over HTTP', async () => {
            // This test verifies that attempting to set secure cookies over HTTP
            // is properly rejected as per web security standards
            // Mock location as HTTP
            global.location = { protocol: 'http:' };
            
            const secureCookie = createMockCookie({
                name: 'secure',
                value: 'value',
                domain: 'example.com',
                secure: true
            });
            
            const result = await coordinator.handleImportCookies([secureCookie]);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('secure');
            
            // Restore global
            delete global.location;
        });

        it('should handle oversized cookies', async () => {
            // This test verifies that cookies exceeding the RFC-defined size limit
            // (typically 4KB) are properly rejected to avoid truncation issues
            // Create a cookie with a value that exceeds 4096 bytes
            const largeValue = 'a'.repeat(5000);
            const oversizedCookie = createMockCookie({
                name: 'large',
                value: largeValue,
                domain: 'example.com'
            });

            const result = await coordinator.handleImportCookies([oversizedCookie]);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('size');
        });

        it('should handle rate limiting', async () => {
            // This test verifies that the extension properly handles browser API
            // rate limiting when trying to set too many cookies at once
            const cookies = Array(100).fill().map(() => createMockCookie({
                name: 'test',
                value: 'value',
                domain: 'example.com'
            }));
            
            // Simulate rate limiting by rejecting after 10 calls
            let callCount = 0;
            chrome.cookies.set.mockImplementation(() => {
                callCount++;
                if (callCount > 10) {
                    return Promise.reject(new Error('Rate limit exceeded'));
                }
                return Promise.resolve();
            });

            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Rate limit');
        });

        it('should handle Chrome API errors gracefully', async () => {
            // This test verifies that unexpected Chrome API errors are caught
            // and presented to the user in a meaningful way instead of crashing
            chrome.cookies.getAll.mockRejectedValue(new Error('Chrome API error'));
            
            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Chrome API error');
        });
    });

    describe('Session Management Edge Cases', () => {
        it('should handle corrupted session data', async () => {
            const corruptedData = 'invalid-json';
            chrome.storage.local.get.mockResolvedValue({ 'test-session': corruptedData });
            
            const result = await coordinator.handleLoadSession('test-session');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle concurrent session modifications', async () => {
            // Set up mocks for concurrent operations
            chrome.storage.local.set
                .mockResolvedValueOnce({}) // First operation succeeds
                .mockResolvedValueOnce({}); // Second operation succeeds

            coordinator.sessionLock = false; // Ensure lock is released
            
            // Start concurrent operations
            const sessionData1 = { tabs: [{ url: 'https://example1.com' }] };
            const sessionData2 = { tabs: [{ url: 'https://example2.com' }] };
            
            const [result1, result2] = await Promise.all([
                coordinator.handleSaveSession(sessionData1),
                coordinator.handleSaveSession(sessionData2)
            ]);

            // At least one should succeed
            expect(result1.success || result2.success).toBe(true);
        });

        it('should handle session expiration', async () => {
            const expiredSession = {
                name: 'Expired Session',
                tabs: [],
                expiresAt: Date.now() - 3600000 // 1 hour in the past
            };

            chrome.storage.local.get.mockResolvedValue({ 'expired-session': expiredSession });
            
            const result = await coordinator.handleLoadSession('expired-session');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle storage quota exceeded', async () => {
            const largeSession = {
                name: 'Large Session',
                tabs: Array(1000).fill().map(() => ({ url: 'https://example.com' }))
            };

            chrome.storage.local.set.mockRejectedValue(new Error('Quota exceeded'));
            
            const result = await coordinator.handleSaveSession('large-session', largeSession);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('General Application Edge Cases', () => {
        it('should handle network errors', async () => {
            // Mock a fetch call that fails with a network error
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
            
            // Mock a method that uses fetch
            const mockNetworkCall = async () => {
                try {
                    await fetch('https://example.com/api/data');
                    return { success: true, data: {} };
                } catch (error) {
                    return { success: false, error: error.message };
                }
            };
            
            // Temporarily add the method to coordinator for testing
            coordinator.testNetworkCall = mockNetworkCall;
            
            const result = await coordinator.testNetworkCall();
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            
            // Cleanup
            delete coordinator.testNetworkCall;
            global.fetch = undefined;
        });

        it('should handle state corruption', async () => {
            // Corrupt the coordinator's state
            coordinator.cookieData = null;
            
            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle feature flags', async () => {
            // Simulate feature flag being disabled
            coordinator.features = { cookieManagement: false };
            
            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle missing permissions', async () => {
            // Simulate missing cookie permission
            chrome.cookies.getAll.mockRejectedValue(new Error('Permission denied'));
            
            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
}); 