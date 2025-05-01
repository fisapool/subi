import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';
import { createMockCookie, createMockStorage, resetTestEnvironment } from './utils/test-helpers.js';

describe('Combined Features', () => {
    let coordinator;

    beforeEach(() => {
        resetTestEnvironment();
        coordinator = new ExtensionCoordinator();

        // Set up default mock implementations
        chrome.storage.local.get.mockResolvedValue({});
        chrome.storage.local.set.mockResolvedValue();
        chrome.cookies.getAll.mockResolvedValue([]);
        chrome.cookies.set.mockResolvedValue();
        chrome.tabs.query.mockResolvedValue([]);
        chrome.tabs.create.mockResolvedValue({});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Session with Cookies', () => {
        it('should save session with cookies successfully', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = {
                domain: 'example.com',
                cookies: [
                    createMockCookie({ domain: 'example.com' }),
                    createMockCookie({ domain: 'example.com' })
                ]
            };

            chrome.storage.local.set.mockResolvedValue();
            chrome.cookies.getAll.mockResolvedValue(cookieData.cookies);

            const result = await coordinator.handleSaveSessionWithCookies(sessionData, cookieData);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalled();
            expect(coordinator.cookieData.get('example.com')).toEqual(cookieData.cookies);
        });

        it('should restore session with cookies successfully', async () => {
            const sessionId = 'test-session';
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = [
                createMockCookie({ domain: 'example.com' }),
                createMockCookie({ domain: 'example.com' })
            ];

            chrome.storage.local.get.mockResolvedValue({ [sessionId]: sessionData });
            chrome.cookies.set.mockResolvedValue();
            chrome.cookies.getAll.mockResolvedValue(cookieData);
            chrome.tabs.create.mockResolvedValue({});

            const result = await coordinator.handleRestoreSessionWithCookies(sessionId);
            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalled();
            expect(chrome.tabs.create).toHaveBeenCalled();
        });

        it('should handle missing session data during restore', async () => {
            const sessionId = 'non-existent-session';
            chrome.storage.local.get.mockResolvedValue({});

            const result = await coordinator.handleRestoreSessionWithCookies(sessionId);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('Command Handling', () => {
        it('should handle save session command', async () => {
            const command = 'save-session';
            chrome.tabs.query.mockResolvedValue([{ url: 'https://example.com' }]);
            chrome.storage.local.set.mockResolvedValue();

            await coordinator.handleCommand(command);
            expect(chrome.storage.local.set).toHaveBeenCalled();
        });

        it('should handle load session command', async () => {
            const command = 'load-session';
            const sessionId = 'test-session';
            const sessionData = { tabs: [{ url: 'https://example.com' }] };

            chrome.storage.local.get.mockResolvedValue({ [sessionId]: sessionData });
            chrome.tabs.create.mockResolvedValue({});
            chrome.cookies.getAll.mockResolvedValue([]);

            await coordinator.handleCommand(command);
            expect(chrome.tabs.create).toHaveBeenCalled();
        });

        it('should handle unknown command', async () => {
            const command = 'unknown-command';
            await coordinator.handleCommand(command);
            // Should not throw error
        });
    });

    describe('Tab Updates', () => {
        it('should handle tab update with complete status', async () => {
            const tab = { id: 1, url: 'https://example.com' };
            const cookieData = [createMockCookie({ domain: 'example.com' })];
            coordinator.cookieData.set('example.com', cookieData);
            chrome.cookies.set.mockResolvedValue();

            await coordinator.handleTabUpdate(tab);
            expect(chrome.cookies.set).toHaveBeenCalled();
        });

        it('should handle tab update with no stored cookies', async () => {
            const tab = { id: 1, url: 'https://example.com' };
            await coordinator.handleTabUpdate(tab);
            expect(chrome.cookies.set).not.toHaveBeenCalled();
        });
    });

    describe('Helper Methods', () => {
        it('should get current session data', async () => {
            const mockTabs = [
                { url: 'https://example1.com', title: 'Test 1', favIconUrl: 'icon1.png' },
                { url: 'https://example2.com', title: 'Test 2', favIconUrl: 'icon2.png' }
            ];
            chrome.tabs.query.mockResolvedValue(mockTabs);

            const result = await coordinator.getCurrentSessionData();
            expect(result.tabs).toHaveLength(2);
            expect(result.tabs[0]).toEqual({
                url: mockTabs[0].url,
                title: mockTabs[0].title,
                favIconUrl: mockTabs[0].favIconUrl
            });
        });

        it('should restore session', async () => {
            const sessionData = {
                tabs: [
                    { url: 'https://example1.com' },
                    { url: 'https://example2.com' }
                ]
            };

            chrome.tabs.create.mockResolvedValue({});

            await coordinator.restoreSession(sessionData);
            expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
            expect(chrome.tabs.create).toHaveBeenCalledWith({ url: sessionData.tabs[0].url });
            expect(chrome.tabs.create).toHaveBeenCalledWith({ url: sessionData.tabs[1].url });
        });

        it('should clear selections', async () => {
            await coordinator.handleClearSelections();
            // Should not throw error
        });
    });
}); 