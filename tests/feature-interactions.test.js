import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';
import { createMockCookie, createMockStorage, resetTestEnvironment } from './utils/test-helpers.js';

describe('Feature Interactions', () => {
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

    describe('Session and Cookie Management Integration', () => {
        it('should maintain cookie state when saving and restoring multiple sessions', async () => {
            // Create two sessions with different cookies
            const session1Data = { tabs: [{ url: 'https://site1.com' }] };
            const session2Data = { tabs: [{ url: 'https://site2.com' }] };
            
            const cookies1 = [
                createMockCookie({ domain: 'site1.com', name: 'session1-cookie' }),
                createMockCookie({ domain: 'site1.com', name: 'auth-cookie' })
            ];
            
            const cookies2 = [
                createMockCookie({ domain: 'site2.com', name: 'session2-cookie' }),
                createMockCookie({ domain: 'site2.com', name: 'preferences-cookie' })
            ];

            // Save first session
            chrome.cookies.getAll.mockResolvedValueOnce(cookies1);
            await coordinator.handleSaveSessionWithCookies(session1Data, { domain: 'site1.com', cookies: cookies1 });
            
            // Save second session
            chrome.cookies.getAll.mockResolvedValueOnce(cookies2);
            await coordinator.handleSaveSessionWithCookies(session2Data, { domain: 'site2.com', cookies: cookies2 });

            // Verify both sessions' cookies are stored
            expect(coordinator.cookieData.get('site1.com')).toEqual(cookies1);
            expect(coordinator.cookieData.get('site2.com')).toEqual(cookies2);
        });

        it('should handle concurrent session operations correctly', async () => {
            const session1Id = 'session1';
            const session2Id = 'session2';
            const session1Data = { tabs: [{ url: 'https://site1.com' }] };
            const session2Data = { tabs: [{ url: 'https://site2.com' }] };

            // Set up storage to return different data for different sessions
            chrome.storage.local.get.mockImplementation((key) => {
                if (key === session1Id) return Promise.resolve({ [session1Id]: session1Data });
                if (key === session2Id) return Promise.resolve({ [session2Id]: session2Data });
                return Promise.resolve({});
            });

            // Attempt to restore both sessions concurrently
            const [result1, result2] = await Promise.all([
                coordinator.handleRestoreSessionWithCookies(session1Id),
                coordinator.handleRestoreSessionWithCookies(session2Id)
            ]);

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('Command and Tab Update Integration', () => {
        it('should handle tab updates during session restoration', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = [createMockCookie({ domain: 'example.com' })];

            // Start session restoration
            chrome.storage.local.get.mockResolvedValue({ 'test-session': sessionData });
            chrome.cookies.getAll.mockResolvedValue(cookieData);
            
            const restorePromise = coordinator.handleRestoreSessionWithCookies('test-session');
            
            // Simulate tab update during restoration
            const tab = { id: 1, url: 'https://example.com', status: 'complete' };
            await coordinator.handleTabUpdate(tab);
            
            // Complete restoration
            await restorePromise;

            expect(chrome.cookies.set).toHaveBeenCalled();
            expect(chrome.tabs.create).toHaveBeenCalled();
        });

        it('should handle command execution during active session operations', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = [createMockCookie({ domain: 'example.com' })];

            // Start saving a session
            chrome.cookies.getAll.mockResolvedValue(cookieData);
            const savePromise = coordinator.handleSaveSessionWithCookies(sessionData, { domain: 'example.com', cookies: cookieData });

            // Execute a command during save
            await coordinator.handleCommand('clear-selections');

            // Complete the save operation
            await savePromise;

            expect(chrome.storage.local.set).toHaveBeenCalled();
            expect(coordinator.cookieData.get('example.com')).toEqual(cookieData);
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should recover from storage errors during session operations', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = [createMockCookie({ domain: 'example.com' })];

            // Simulate storage error on first attempt
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            chrome.storage.local.set.mockResolvedValueOnce();

            // Attempt to save session
            const result = await coordinator.handleSaveSessionWithCookies(sessionData, { domain: 'example.com', cookies: cookieData });

            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
        });

        it('should handle cookie restoration failures gracefully', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = [
                createMockCookie({ domain: 'example.com', name: 'valid-cookie' }),
                createMockCookie({ domain: 'example.com', name: 'invalid-cookie' })
            ];

            // Set up storage and cookie mocks
            chrome.storage.local.get.mockResolvedValue({ 'test-session': sessionData });
            chrome.cookies.set.mockImplementation((cookie) => {
                if (cookie.name === 'invalid-cookie') {
                    return Promise.reject(new Error('Cookie set failed'));
                }
                return Promise.resolve();
            });

            const result = await coordinator.handleRestoreSessionWithCookies('test-session');

            expect(result.success).toBe(true);
            expect(chrome.cookies.set).toHaveBeenCalledTimes(2);
            expect(chrome.tabs.create).toHaveBeenCalled();
        });
    });
}); 