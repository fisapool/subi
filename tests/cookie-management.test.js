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
        it('should handle cookie import with warnings', async () => {
            const cookies = [
                createMockCookie({ domain: 'example.com' }),
                createMockCookie({ domain: 'invalid-domain' })
            ];

            chrome.cookies.set
                .mockResolvedValueOnce() // First cookie succeeds
                .mockRejectedValueOnce(new Error('Invalid domain')); // Second cookie fails

            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(true);
            expect(result.warnings).toHaveLength(1);
        });

        it('should handle all cookies failing to import', async () => {
            const cookies = [
                createMockCookie({ domain: 'invalid1.com' }),
                createMockCookie({ domain: 'invalid2.com' })
            ];

            chrome.cookies.set.mockRejectedValue(new Error('Invalid domain'));

            const result = await coordinator.handleImportCookies(cookies);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle invalid cookie data', async () => {
            const invalidCookies = 'not an array';

            const result = await coordinator.handleImportCookies(invalidCookies);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Cookie Clearing', () => {
        it('should clear cookies for a domain', async () => {
            const domain = 'example.com';
            const mockCookies = [
                createMockCookie({ domain }),
                createMockCookie({ domain })
            ];

            chrome.cookies.getAll.mockResolvedValue(mockCookies);
            chrome.cookies.remove.mockResolvedValue();

            const result = await coordinator.handleClearCookies(domain);
            expect(result.success).toBe(true);
            expect(chrome.cookies.remove).toHaveBeenCalledTimes(mockCookies.length);
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