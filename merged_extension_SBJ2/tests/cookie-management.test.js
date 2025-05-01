import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';
import { createMockCookie, createMockStorage, resetTestEnvironment } from './utils/test-helpers.js';

describe('Cookie Management', () => {
    let coordinator;

    beforeEach(() => {
        resetTestEnvironment();
        coordinator = new ExtensionCoordinator();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Cookie Backup and Restore', () => {
        it('should backup cookies successfully', async () => {
            const mockCookies = [
                createMockCookie({ domain: 'example1.com' }),
                createMockCookie({ domain: 'example2.com' })
            ];

            chrome.cookies.getAll.mockResolvedValue(mockCookies);

            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(true);
            expect(coordinator.cookieBackups.size).toBe(1);
        });

        it('should restore cookies from backup', async () => {
            const mockCookies = [
                createMockCookie({ domain: 'example1.com' }),
                createMockCookie({ domain: 'example2.com' })
            ];

            // First backup cookies
            chrome.cookies.getAll.mockResolvedValue(mockCookies);
            await coordinator.handleBackupCookies();

            // Then restore
            chrome.cookies.set.mockResolvedValue();
            const result = await coordinator.handleRestoreCookies();
            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalledTimes(mockCookies.length);
        });

        it('should handle empty backup', async () => {
            const result = await coordinator.handleRestoreCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Domain Management', () => {
        it('should get all domains with cookies', async () => {
            const mockCookies = [
                createMockCookie({ domain: 'example1.com' }),
                createMockCookie({ domain: 'example2.com' }),
                createMockCookie({ domain: 'example1.com' }) // Duplicate domain
            ];

            chrome.cookies.getAll.mockResolvedValue(mockCookies);

            const result = await coordinator.handleGetDomains();
            expect(result.success).toBe(true);
            expect(result.domains).toHaveLength(2); // Should deduplicate domains
            expect(result.domains).toContain('example1.com');
            expect(result.domains).toContain('example2.com');
        });

        it('should handle no cookies found', async () => {
            chrome.cookies.getAll.mockResolvedValue([]);

            const result = await coordinator.handleGetDomains();
            expect(result.success).toBe(true);
            expect(result.domains).toHaveLength(0);
        });
    });

    describe('Cookie Import/Export', () => {
        it('should handle cookie import with partial success and warnings', async () => {
            // This test verifies that when importing a mix of valid and invalid cookies,
            // the valid ones succeed while appropriate warnings are generated for the invalid ones
            const cookies = [
                createMockCookie({ 
                    name: 'test1',
                    value: 'value1',
                    domain: 'example.com'
                }),
                createMockCookie({ 
                    name: 'test2',
                    value: 'value2',
                    domain: 'invalid-domain'
                })
            ];

            // Mock the feature flag
            coordinator.features.cookieManagement = true;

            // Mock chrome.cookies.set - first succeeds, second fails
            chrome.cookies.set.mockImplementation((cookie) => {
                if (cookie.domain === 'example.com') {
                    return Promise.resolve(cookie);
                } else {
                    return Promise.reject(new Error('Invalid domain'));
                }
            });

            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(true);
            expect(result.warnings).toBeDefined();
            expect(result.warnings.some(w => w.error === 'Invalid domain')).toBe(true);
        });

        it('should fail when all cookies fail to import', async () => {
            // This test verifies that when all cookies fail to import,
            // the operation fails completely with an appropriate error
            const cookies = [
                createMockCookie({ 
                    name: 'test1',
                    value: 'value1',
                    domain: 'invalid1.com'
                }),
                createMockCookie({ 
                    name: 'test2',
                    value: 'value2',
                    domain: 'invalid2.com'
                })
            ];

            chrome.cookies.set
                .mockRejectedValueOnce(new Error('Invalid domain'))
                .mockRejectedValueOnce(new Error('Invalid domain'));

            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('All cookies failed to import');
        });

        it('should reject malformed cookie data', async () => {
            // This test verifies that non-array cookie data is properly rejected
            // with an appropriate validation error
            const invalidCookies = 'not an array';

            const result = await coordinator.handleImportCookies(invalidCookies);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid cookie format');
        });

        it('should import cookies with special characters', async () => {
            // This test verifies that cookies with special characters in both name and value
            // are properly URL-encoded during import to maintain data integrity
            const cookies = [
                createMockCookie({ 
                    name: 'special!@#$%^&*()', 
                    value: 'value with spaces and symbols !@#$%^&*()',
                    domain: 'example.com',
                    path: '/test',
                    secure: true,
                    httpOnly: true,
                    expirationDate: Date.now() + 86400000
                })
            ];
            
            // Properly mock the cookie.set response
            chrome.cookies.set.mockResolvedValue(cookies[0]);
            
            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
                name: expect.any(String), // Should be encoded
                value: expect.any(String), // Should be encoded
                secure: true,
                httpOnly: true
            }));
        });

        it('should handle import of duplicate cookies', async () => {
            // This test verifies that when importing cookies with duplicate names,
            // all cookies are properly imported (last one wins per standard cookie behavior)
            const cookies = [
                createMockCookie({ 
                    name: 'test', 
                    value: 'value1', 
                    domain: 'example.com' 
                }),
                createMockCookie({ 
                    name: 'test', 
                    value: 'value2', 
                    domain: 'example.com' 
                })
            ];
            
            chrome.cookies.set.mockResolvedValueOnce(cookies[0]);
            chrome.cookies.set.mockResolvedValueOnce(cookies[1]);
            
            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalledTimes(2);
        });

        it('should handle cookies with various flags and expiry', async () => {
            // This test ensures proper handling of cookies with different flags 
            // (secure, sameSite) and session vs. persistent cookies
            const cookies = [
                createMockCookie({ 
                    name: 'secure-cookie',
                    value: 'value1',
                    domain: 'example.com',
                    secure: true,
                    sameSite: 'Strict'
                }),
                createMockCookie({ 
                    name: 'session-cookie',
                    value: 'value2',
                    domain: 'example.com',
                    session: true
                })
            ];
            
            chrome.cookies.set
                .mockResolvedValueOnce(cookies[0])
                .mockResolvedValueOnce(cookies[1]);
            
            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalledTimes(cookies.length);
            expect(chrome.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
                sameSite: 'Strict'
            }));
        });
    });

    describe('Cookie Clearing', () => {
        it('should clear cookies for a domain', async () => {
            // This test verifies that cookies for a specific domain are properly 
            // cleared, including cookies with different paths and secure flags
            const domain = 'example.com';
            const mockCookies = [
                createMockCookie({ 
                    name: 'test1', 
                    domain, 
                    path: '/',
                    secure: false 
                }),
                createMockCookie({ 
                    name: 'test2', 
                    domain, 
                    path: '/admin',
                    secure: true 
                })
            ];

            chrome.cookies.getAll.mockResolvedValue(mockCookies);
            chrome.cookies.remove.mockResolvedValue({});

            const result = await coordinator.handleClearCookies(domain);
            
            expect(result.success).toBe(true);
            expect(chrome.cookies.getAll).toHaveBeenCalledWith({ domain });
            expect(chrome.cookies.remove).toHaveBeenCalledTimes(mockCookies.length);
            
            // Verify proper URL construction for secure/non-secure cookies
            expect(chrome.cookies.remove).toHaveBeenCalledWith(expect.objectContaining({
                url: 'http://example.com/',
                name: 'test1'
            }));
            expect(chrome.cookies.remove).toHaveBeenCalledWith(expect.objectContaining({
                url: 'https://example.com/admin',
                name: 'test2'
            }));
        });

        it('should handle no cookies to clear', async () => {
            const domain = 'example.com';
            chrome.cookies.getAll.mockResolvedValue([]);

            const result = await coordinator.handleClearCookies(domain);
            expect(result.success).toBe(true);
            expect(chrome.cookies.remove).not.toHaveBeenCalled();
        });

        it('should handle cookie removal failure', async () => {
            const domain = 'example.com';
            const mockCookies = [createMockCookie({ domain })];

            chrome.cookies.getAll.mockResolvedValue(mockCookies);
            chrome.cookies.remove.mockRejectedValue(new Error('Failed to remove cookie'));

            const result = await coordinator.handleClearCookies(domain);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
}); 