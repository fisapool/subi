import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';
import { createMockCookie, createMockStorage, resetTestEnvironment } from './utils/test-helpers.js';

// Mock chrome APIs
vi.mock('webextension-polyfill', () => ({
    browser: {
        storage: {
            local: {
                get: vi.fn(),
                set: vi.fn(),
                remove: vi.fn(),
                clear: vi.fn()
            }
        },
        cookies: {
            getAll: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
        },
        runtime: {
            sendMessage: vi.fn(),
            onMessage: {
                addListener: vi.fn()
            }
        },
        tabs: {
            onUpdated: {
                addListener: vi.fn()
            }
        },
        commands: {
            onCommand: {
                addListener: vi.fn()
            }
        }
    }
}));

// Mock chrome APIs
global.chrome = {
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
            clear: vi.fn()
        }
    },
    cookies: {
        getAll: vi.fn(),
        set: vi.fn(),
        remove: vi.fn()
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn()
        }
    },
    tabs: {
        query: vi.fn(),
        create: vi.fn(),
        onUpdated: {
            addListener: vi.fn()
        }
    },
    commands: {
        onCommand: {
            addListener: vi.fn()
        }
    }
};

describe('Background Coordinator', () => {
    let coordinator;

    beforeEach(() => {
        resetTestEnvironment();
        coordinator = new ExtensionCoordinator();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Session Management', () => {
        it('should handle save session message', async () => {
            const message = {
                action: 'SAVE_SESSION',
                data: { name: 'Test Session', tabs: [] }
            };
            const sendResponse = vi.fn();

            chrome.storage.local.set.mockResolvedValue();

            await coordinator.handleMessage(message, null, sendResponse);

            expect(chrome.storage.local.set).toHaveBeenCalled();
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('should handle load session message', async () => {
            const sessionId = 'test-session';
            const message = { action: 'LOAD_SESSION', sessionId };
            const sendResponse = vi.fn();

            chrome.storage.local.get.mockResolvedValue({ [sessionId]: { name: 'Test Session', tabs: [] } });

            await coordinator.handleMessage(message, null, sendResponse);

            expect(chrome.storage.local.get).toHaveBeenCalledWith(sessionId);
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('Cookie Management', () => {
        it('should handle export cookies message', async () => {
            const domain = 'example.com';
            const message = { action: 'EXPORT_COOKIES', domain };
            const sendResponse = vi.fn();

            const testCookies = [
                createMockCookie({ domain }),
                createMockCookie({ domain })
            ];

            chrome.cookies.getAll.mockResolvedValue(testCookies);

            await coordinator.handleMessage(message, null, sendResponse);

            expect(chrome.cookies.getAll).toHaveBeenCalledWith({ domain });
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                cookies: testCookies
            }));
        });

        it('should handle import cookies message', async () => {
            const cookies = [
                createMockCookie(),
                createMockCookie()
            ];
            const message = { action: 'IMPORT_COOKIES', cookies };
            const sendResponse = vi.fn();

            chrome.cookies.set.mockResolvedValue();

            await coordinator.handleMessage(message, null, sendResponse);

            expect(chrome.cookies.set).toHaveBeenCalledTimes(cookies.length);
            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('Message Handling', () => {
        it('should handle invalid messages', async () => {
            const message = { action: 'INVALID_ACTION' };
            const sendResponse = vi.fn();

            await coordinator.handleMessage(message, null, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.any(String)
            }));
        });

        it('should handle missing action in message', async () => {
            const message = { data: 'test' };
            const sendResponse = vi.fn();

            await coordinator.handleMessage(message, null, sendResponse);

            expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'Invalid message: missing or invalid action'
            }));
        });
    });

    describe('Command Handling', () => {
        it('should handle save-session command', async () => {
            const mockSessionData = { name: 'Test Session', tabs: [] };
            chrome.tabs.query.mockResolvedValue([]);
            chrome.storage.local.set.mockResolvedValue();

            await coordinator.handleCommand('save-session');

            expect(chrome.tabs.query).toHaveBeenCalled();
            expect(chrome.storage.local.set).toHaveBeenCalled();
        });

        it('should handle load-session command', async () => {
            const mockSessions = {
                success: true,
                sessions: [{ id: 'test-session', name: 'Test Session', tabs: [] }]
            };
            
            // Mock the necessary methods
            chrome.storage.local.get.mockResolvedValue({ sessions: mockSessions.sessions });
            chrome.tabs.create.mockResolvedValue({});
            
            // Mock handleGetSessions to return the expected data
            vi.spyOn(coordinator, 'handleGetSessions').mockResolvedValue(mockSessions);
            vi.spyOn(coordinator, 'handleLoadSession').mockResolvedValue({ success: true });

            await coordinator.handleCommand('load-session');

            expect(coordinator.handleGetSessions).toHaveBeenCalled();
            expect(coordinator.handleLoadSession).toHaveBeenCalledWith('test-session');
        });

        it('should handle clear-selections command', async () => {
            await coordinator.handleCommand('clear-selections');
            // Add specific expectations once implementation is added
        });

        it('should handle unknown command', async () => {
            const consoleSpy = vi.spyOn(console, 'warn');
            await coordinator.handleCommand('unknown-command');
            expect(consoleSpy).toHaveBeenCalledWith('Unknown command: unknown-command');
        });
    });

    describe('Tab Update Handling', () => {
        it('should handle tab update with existing cookies', async () => {
            const mockTab = { url: 'https://example.com' };
            const mockCookies = [createMockCookie({ domain: 'example.com' })];
            coordinator.cookieData.set('example.com', mockCookies);
            chrome.cookies.set.mockResolvedValue();

            await coordinator.handleTabUpdate(mockTab);

            expect(chrome.cookies.set).toHaveBeenCalledWith(mockCookies[0]);
        });

        it('should handle tab update with invalid URL', async () => {
            const mockTab = { url: 'invalid-url' };
            const consoleSpy = vi.spyOn(console, 'error');
            
            await expect(coordinator.handleTabUpdate(mockTab)).rejects.toThrow('Invalid URL');
            expect(consoleSpy).toHaveBeenCalledWith('Error handling tab update:', expect.any(Error));
        });
    });

    describe('Error Handling', () => {
        it('should handle restore session errors', async () => {
            const mockSessionData = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValue({ 'test-session': mockSessionData });
            chrome.tabs.create.mockRejectedValue(new Error('Failed to create tab'));

            const result = await coordinator.handleRestoreSessionWithCookies('test-session');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to restore session');
        });

        it('should handle cookie restoration errors', async () => {
            const mockSessionData = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValue({ 'test-session': mockSessionData });
            chrome.tabs.create.mockResolvedValue({});
            chrome.cookies.getAll.mockResolvedValue([{ name: 'test', value: 'test', domain: 'example.com' }]);
            chrome.cookies.set.mockRejectedValue(new Error('Failed to set cookie'));

            const result = await coordinator.handleRestoreSessionWithCookies('test-session');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle edge case errors in handleSaveSessionWithCookies', async () => {
            const mockSessionData = { tabs: [{ url: 'https://example.com' }] };
            const mockCookieData = {
                domain: 'example.com',
                cookies: [{ name: 'test', value: 'test' }]
            };
            chrome.storage.local.set.mockRejectedValue(new Error('Storage error'));

            const result = await coordinator.handleSaveSessionWithCookies(mockSessionData, mockCookieData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle invalid session data formats', async () => {
            // Test with missing tabs array
            chrome.storage.local.get.mockResolvedValue({ 'test-session': { name: 'Test' } });
            const result = await coordinator.handleRestoreSessionWithCookies('test-session');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid session data: missing or invalid tabs array');

            // Test with empty tabs array
            chrome.storage.local.get.mockResolvedValue({ 'test-session': { name: 'Test', tabs: [] } });
            const result2 = await coordinator.handleRestoreSessionWithCookies('test-session');
            expect(result2.success).toBe(false);
            expect(result2.error).toBe('Cannot read properties of undefined (reading \'url\')');

            // Test with invalid URL in tabs
            chrome.storage.local.get.mockResolvedValue({ 'test-session': { name: 'Test', tabs: [{ url: null }] } });
            const result3 = await coordinator.handleRestoreSessionWithCookies('test-session');
            expect(result3.success).toBe(false);
            expect(result3.error).toBe('Invalid URL: null');
        });

        it('should handle errors in command execution', async () => {
            // Mock getCurrentSessionData to throw an error
            vi.spyOn(coordinator, 'getCurrentSessionData').mockRejectedValue(new Error('Test error'));
            const consoleSpy = vi.spyOn(console, 'error');

            await coordinator.handleCommand('save-session');

            expect(consoleSpy).toHaveBeenCalledWith('Error handling command:', expect.any(Error));

            // Restore the original implementation
            vi.restoreAllMocks();
        });
    });
}); 