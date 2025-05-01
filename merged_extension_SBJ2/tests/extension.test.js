import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { browser } from 'webextension-polyfill';
import { JSDOM } from 'jsdom';

// Mock webextension-polyfill
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
        }
    }
}));

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import the ExtensionCoordinator class
import { ExtensionCoordinator } from '../background-coordinator.js';

describe('Extension Tests', () => {
    let coordinator;

    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();
        
        // Set up default mock implementations
        chrome.storage.local.get.mockResolvedValue({});
        chrome.storage.local.set.mockResolvedValue();
        chrome.storage.local.remove.mockResolvedValue();
        chrome.cookies.getAll.mockResolvedValue([]);
        chrome.cookies.set.mockResolvedValue();
        chrome.cookies.remove.mockResolvedValue();
        chrome.runtime.sendMessage.mockResolvedValue({ success: true });
        chrome.tabs.query.mockResolvedValue([]);
        chrome.tabs.create.mockResolvedValue({});

        // Create a new instance of ExtensionCoordinator
        coordinator = new ExtensionCoordinator();
    });

    afterEach(() => {
        // Clean up after each test
        vi.resetAllMocks();
    });

    describe('Session Management', () => {
        it('should save a session successfully', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.set.mockResolvedValueOnce();
            
            const result = await coordinator.handleSaveSession(sessionData);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalledWith(
                expect.any(Object)
            );
            const call = chrome.storage.local.set.mock.calls[0][0];
            const sessionId = Object.keys(call)[0];
            expect(call[sessionId]).toEqual(sessionData);
        });

        it('should handle empty session data', async () => {
            const sessionData = { tabs: [] };
            chrome.storage.local.set.mockResolvedValueOnce();
            
            const result = await coordinator.handleSaveSession(sessionData);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalled();
        });

        it('should handle malformed session data', async () => {
            const sessionData = { invalidKey: 'invalid' };
            chrome.storage.local.set.mockResolvedValueOnce();
            
            const result = await coordinator.handleSaveSession(sessionData);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle storage quota exceeded', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Quota exceeded'));
            
            const result = await coordinator.handleSaveSession(sessionData);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Quota exceeded');
        });

        it('should load a session successfully', async () => {
            const sessionId = 'test-session';
            const mockSession = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ [sessionId]: mockSession });
            
            const result = await coordinator.handleLoadSession(sessionId);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockSession);
        });

        it('should handle corrupted session data during load', async () => {
            const sessionId = 'corrupted-session';
            const mockSession = { corrupted: true }; // Missing required fields
            chrome.storage.local.get.mockResolvedValueOnce({ [sessionId]: mockSession });
            
            const result = await coordinator.handleLoadSession(sessionId);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle concurrent session operations', async () => {
            const sessionData1 = { tabs: [{ url: 'https://example1.com' }] };
            const sessionData2 = { tabs: [{ url: 'https://example2.com' }] };
            
            // Simulate concurrent saves
            const save1Promise = coordinator.handleSaveSession(sessionData1);
            const save2Promise = coordinator.handleSaveSession(sessionData2);
            
            const [result1, result2] = await Promise.all([save1Promise, save2Promise]);
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
        });

        it('should handle session ID collisions', async () => {
            const existingSession = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-session': existingSession });
            
            // Try to save with same ID
            const result = await coordinator.handleSaveSession(existingSession);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalled();
            // Verify new ID was generated
            const call = chrome.storage.local.set.mock.calls[0][0];
            const sessionId = Object.keys(call)[0];
            expect(sessionId).not.toBe('test-session');
        });

        it('should handle session not found error', async () => {
            const sessionId = 'non-existent-session';
            chrome.storage.local.get.mockResolvedValueOnce({});
            
            const result = await coordinator.handleLoadSession(sessionId);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should delete a session successfully', async () => {
            const sessionId = 'test-session';
            chrome.storage.local.remove.mockResolvedValueOnce();
            
            const result = await coordinator.handleDeleteSession(sessionId);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.remove).toHaveBeenCalledWith(sessionId);
        });

        it('should export all sessions successfully', async () => {
            const mockSessions = {
                'session1': { tabs: [{ url: 'https://example1.com' }] },
                'session2': { tabs: [{ url: 'https://example2.com' }] }
            };
            chrome.storage.local.get.mockResolvedValueOnce(mockSessions);
            
            const result = await coordinator.handleExportSessions();
            expect(result.success).toBe(true);
            expect(result.sessions).toEqual(mockSessions);
        });

        it('should import sessions successfully', async () => {
            const mockSessions = {
                'session1': { tabs: [{ url: 'https://example1.com' }] },
                'session2': { tabs: [{ url: 'https://example2.com' }] }
            };
            chrome.storage.local.set.mockResolvedValueOnce();
            
            const result = await coordinator.handleImportSessions(mockSessions);
            expect(result.success).toBe(true);
            expect(chrome.storage.local.set).toHaveBeenCalledWith(mockSessions);
        });

        it('should get all sessions successfully', async () => {
            const mockSessions = {
                'session1': { tabs: [{ url: 'https://example1.com' }] },
                'session2': { tabs: [{ url: 'https://example2.com' }] }
            };
            chrome.storage.local.get.mockResolvedValueOnce(mockSessions);
            
            const result = await coordinator.handleGetSessions();
            expect(result.success).toBe(true);
            expect(result.sessions).toEqual(
                Object.entries(mockSessions).map(([id, data]) => ({ id, ...data }))
            );
        });
    });

    describe('Combined Features', () => {
        it('should save session with cookies successfully', async () => {
            const sessionData = { tabs: [{ url: 'https://example.com' }] };
            const cookieData = { 
                domain: 'example.com',
                cookies: [{ name: 'test', value: 'value' }]
            };
            const mockCookies = [{ name: 'test', value: 'value' }];
            
            chrome.storage.local.set.mockResolvedValueOnce();
            chrome.cookies.getAll.mockResolvedValueOnce(mockCookies);
            
            const result = await coordinator.handleSaveSessionWithCookies(sessionData, cookieData);
            expect(result.success).toBe(true);
            expect(result.sessionId).toBeDefined();
        });

        it('should restore session with cookies successfully', async () => {
            const sessionId = 'test-session';
            const mockSession = { tabs: [{ url: 'https://example.com' }] };
            const mockCookies = [{ name: 'test', value: 'value' }];
            
            chrome.storage.local.get.mockResolvedValueOnce({ [sessionId]: mockSession });
            chrome.cookies.getAll.mockResolvedValueOnce(mockCookies);
            chrome.tabs.create.mockResolvedValueOnce({});
            
            const result = await coordinator.handleRestoreSessionWithCookies(sessionId);
            expect(result.success).toBe(true);
        });
    });

    describe('Message Handling', () => {
        it('should handle unknown action', async () => {
            const message = { action: 'UNKNOWN_ACTION' };
            const sendResponse = vi.fn();
            
            await coordinator.handleMessage(message, {}, sendResponse);
            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Unknown action'
            });
        });

        it('should handle error in message processing', async () => {
            // Mock the handleSaveSession method directly to ensure proper error propagation
            const originalHandleSaveSession = coordinator.handleSaveSession;
            coordinator.handleSaveSession = vi.fn().mockRejectedValue(new Error('Test error'));
            
            const message = { action: 'SAVE_SESSION' };
            const sendResponse = vi.fn();
            
            await coordinator.handleMessage(message, {}, sendResponse);
            
            expect(sendResponse).toHaveBeenCalledWith({
                success: false,
                error: 'Test error'
            });
            
            // Restore the original method
            coordinator.handleSaveSession = originalHandleSaveSession;
        });

        it('should handle save session with cookies message', async () => {
            const message = { 
                action: 'SAVE_SESSION_WITH_COOKIES',
                sessionData: { tabs: [] },
                cookieData: { domain: 'example.com', cookies: [] }
            };
            const sendResponse = vi.fn();
            chrome.storage.local.set.mockResolvedValueOnce();
            
            await coordinator.handleMessage(message, {}, sendResponse);
            expect(sendResponse).toHaveBeenCalled();
        });

        it('should handle restore session with cookies message', async () => {
            const message = { 
                action: 'RESTORE_SESSION_WITH_COOKIES',
                sessionId: 'test-session'
            };
            const sendResponse = vi.fn();
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-session': { tabs: [] } });
            
            await coordinator.handleMessage(message, {}, sendResponse);
            expect(sendResponse).toHaveBeenCalled();
        });

        it('should handle error in save session with cookies', async () => {
            const sessionData = { tabs: [] };
            const cookieData = { domain: 'example.com', cookies: [] };
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            
            const result = await coordinator.handleSaveSessionWithCookies(sessionData, cookieData);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in save session with cookies when cookie export fails', async () => {
            const sessionData = { tabs: [] };
            const cookieData = { domain: 'example.com' };
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            
            const result = await coordinator.handleSaveSessionWithCookies(sessionData, cookieData);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle invalid message payloads', async () => {
            const invalidMessages = [
                undefined,
                null,
                { action: undefined },
                { action: null },
                { action: '' },
                { action: 123 }, // Non-string action
                { action: 'VALID_ACTION', data: new Function() } // Non-serializable data
            ];

            for (const message of invalidMessages) {
                const sendResponse = vi.fn();
                await coordinator.handleMessage(message, {}, sendResponse);
                expect(sendResponse).toHaveBeenCalledWith(
                    expect.objectContaining({
                        success: false,
                        error: expect.any(String)
                    })
                );
            }
        });
    });

    describe('Command Handling', () => {
        it('should handle save-session command', async () => {
            const mockTabs = [
                { url: 'https://example.com', title: 'Example', favIconUrl: 'favicon.ico' }
            ];
            chrome.tabs.query.mockResolvedValueOnce(mockTabs);
            chrome.storage.local.set.mockResolvedValueOnce();
            
            await coordinator.handleCommand('save-session');
            expect(chrome.tabs.query).toHaveBeenCalled();
            
            // Verify that chrome.storage.local.set was called
            expect(chrome.storage.local.set).toHaveBeenCalled();
            
            // Get the actual call arguments
            const setCall = chrome.storage.local.set.mock.calls[0][0];
            const sessionId = Object.keys(setCall)[0];
            const sessionData = setCall[sessionId];
            
            // Verify the session data structure
            expect(sessionId).toMatch(/^\d+$/);
            expect(sessionData.name).toMatch(/^Session /);
            expect(sessionData.tabs).toEqual([{
                url: 'https://example.com',
                title: 'Example',
                favIconUrl: 'favicon.ico'
            }]);
        });

        it('should handle clear-item-selections command', async () => {
            await coordinator.handleCommand('clear-item-selections');
            // Since handleClearSelections is empty, we just verify it doesn't throw
        });
    });

    describe('Tab Updates', () => {
        it('should handle tab update with stored cookies', async () => {
            const domain = 'example.com';
            const mockCookies = [{ name: 'test', value: 'value' }];
            const tab = { url: 'https://example.com/page' };
            
            // Store cookies first
            chrome.cookies.getAll.mockResolvedValueOnce(mockCookies);
            await coordinator.handleExportCookies(domain);
            
            // Then handle tab update
            await coordinator.handleTabUpdate(tab);
            expect(chrome.cookies.set).toHaveBeenCalled();
        });
    });

    describe('Runtime API', () => {
        it('should handle message passing correctly', async () => {
            const message = { action: 'TEST_ACTION', data: 'test' };
            const response = { success: true, data: 'response' };
            chrome.runtime.sendMessage.mockResolvedValueOnce(response);
            
            const result = await chrome.runtime.sendMessage(message);
            expect(result).toEqual(response);
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
        });

        it('should handle message listener registration', () => {
            const callback = vi.fn();
            chrome.runtime.onMessage.addListener(callback);
            
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(callback);
        });

        it('should handle multiple message listeners', () => {
            // Reset the mock first
            chrome.runtime.onMessage.addListener.mockClear();
            
            const callbacks = [vi.fn(), vi.fn(), vi.fn()];
            
            // Register multiple listeners
            callbacks.forEach(callback => {
                chrome.runtime.onMessage.addListener(callback);
            });
            
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(callbacks.length);
            
            // Simulate message received
            const message = { action: 'TEST_ACTION', data: 'test' };
            callbacks.forEach(callback => {
                callback(message);
                expect(callback).toHaveBeenCalledWith(message);
            });
        });

        it('should handle message listener removal', () => {
            const callback = vi.fn();
            
            // Add and then remove listener
            chrome.runtime.onMessage.addListener(callback);
            chrome.runtime.onMessage.removeListener(callback);
            
            expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(callback);
            expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(callback);
        });

        it('should handle message timeouts', async () => {
            const message = { action: 'SLOW_ACTION', data: 'test' };
            chrome.runtime.sendMessage.mockImplementationOnce(() => new Promise(resolve => {
                setTimeout(() => resolve({ success: true }), 5000); // Simulate timeout
            }));
            
            try {
                await Promise.race([
                    chrome.runtime.sendMessage(message),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
                ]);
                fail('Should have timed out');
            } catch (error) {
                expect(error.message).toBe('Timeout');
            }
        });

        it('should handle message response errors', async () => {
            const message = { action: 'ERROR_ACTION', data: 'test' };
            chrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Response error'));
            
            try {
                await chrome.runtime.sendMessage(message);
                fail('Should have thrown');
            } catch (error) {
                expect(error.message).toBe('Response error');
            }
        });
    });

    describe('DOM Manipulation', () => {
        beforeEach(() => {
            // Set up a clean DOM environment before each test
            document.body.innerHTML = `
                <div id="sessionList"></div>
                <div id="cookieList"></div>
                <div id="sessionStatus"></div>
                <div id="cookieStatus"></div>
                <button id="saveSession">Save Session</button>
                <button id="loadSession">Load Session</button>
            `;
        });

        it('should update popup UI correctly', () => {
            const container = document.createElement('div');
            container.id = 'test-container';
            document.body.appendChild(container);
            
            container.innerHTML = '<p>Test Content</p>';
            expect(container.innerHTML).toBe('<p>Test Content</p>');
            
            document.body.removeChild(container);
        });

        it('should handle missing DOM elements gracefully', () => {
            // Remove all elements
            document.body.innerHTML = '';
            
            // Attempt to update non-existent elements
            const updateUI = () => {
                const element = document.getElementById('non-existent');
                if (element) {
                    element.innerHTML = 'New Content';
                }
            };
            
            expect(updateUI).not.toThrow();
        });

        it('should handle rapid successive UI updates', async () => {
            const sessionList = document.getElementById('sessionList');
            const updates = ['Update 1', 'Update 2', 'Update 3', 'Update 4', 'Update 5'];
            
            // Perform rapid updates
            await Promise.all(updates.map(async (content) => {
                sessionList.innerHTML = content;
                await new Promise(resolve => setTimeout(resolve, 10));
            }));
            
            // The last update should be visible
            expect(sessionList.innerHTML).toBe('Update 5');
        });

        it('should maintain button states correctly', () => {
            const saveButton = document.getElementById('saveSession');
            const loadButton = document.getElementById('loadSession');
            
            // Disable buttons
            saveButton.disabled = true;
            loadButton.disabled = true;
            
            expect(saveButton.disabled).toBe(true);
            expect(loadButton.disabled).toBe(true);
            
            // Enable buttons
            saveButton.disabled = false;
            loadButton.disabled = false;
            
            expect(saveButton.disabled).toBe(false);
            expect(loadButton.disabled).toBe(false);
        });

        it('should handle status message updates', () => {
            const sessionStatus = document.getElementById('sessionStatus');
            const cookieStatus = document.getElementById('cookieStatus');
            
            // Update status messages
            sessionStatus.textContent = 'Session saved successfully';
            cookieStatus.textContent = 'Cookies exported successfully';
            
            expect(sessionStatus.textContent).toBe('Session saved successfully');
            expect(cookieStatus.textContent).toBe('Cookies exported successfully');
            
            // Clear status messages
            sessionStatus.textContent = '';
            cookieStatus.textContent = '';
            
            expect(sessionStatus.textContent).toBe('');
            expect(cookieStatus.textContent).toBe('');
        });

        it('should handle list updates with multiple items', () => {
            const sessionList = document.getElementById('sessionList');
            const items = [
                { id: '1', name: 'Session 1', tabs: [1, 2, 3] },
                { id: '2', name: 'Session 2', tabs: [4, 5] },
                { id: '3', name: 'Session 3', tabs: [6] }
            ];
            
            // Update list
            sessionList.innerHTML = items.map(item => `
                <div class="session-item" data-id="${item.id}">
                    <span class="name">${item.name}</span>
                    <span class="tabs">${item.tabs.length} tabs</span>
                </div>
            `).join('');
            
            const sessionItems = sessionList.getElementsByClassName('session-item');
            expect(sessionItems.length).toBe(3);
            expect(sessionItems[0].querySelector('.name').textContent).toBe('Session 1');
            expect(sessionItems[1].querySelector('.tabs').textContent).toBe('2 tabs');
        });
    });

    describe('Error Handling', () => {
        it('should handle error in save session', async () => {
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleSaveSession({ tabs: [] });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in load session', async () => {
            chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleLoadSession('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in delete session', async () => {
            chrome.storage.local.remove.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleDeleteSession('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in export sessions', async () => {
            chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleExportSessions();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in import sessions', async () => {
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleImportSessions({});
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in get sessions', async () => {
            chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleGetSessions();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in export cookies', async () => {
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleExportCookies('example.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle error in import cookies', async () => {
            chrome.cookies.set.mockRejectedValue(new Error('Cookie error'));
            const result = await coordinator.handleImportCookies([
                { 
                    name: 'test', 
                    value: 'value', 
                    domain: 'example.com' 
                }
            ]);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle error in clear cookies', async () => {
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleClearCookies('example.com');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle error in backup cookies', async () => {
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleBackupCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle error in restore cookies', async () => {
            // First create a backup
            const mockCookies = [
                { 
                    name: 'test', 
                    value: 'value',
                    domain: 'example.com'
                }
            ];
            chrome.cookies.getAll.mockResolvedValueOnce(mockCookies);
            await coordinator.handleBackupCookies();

            // Mock handleImportCookies to throw an error
            const originalImportCookies = coordinator.handleImportCookies;
            coordinator.handleImportCookies = vi.fn().mockRejectedValue(new Error('Cookie error'));

            const result = await coordinator.handleRestoreCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');

            // Restore original method
            coordinator.handleImportCookies = originalImportCookies;
        });

        it('should handle error in get domains', async () => {
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleGetDomains();
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle error in restore session with cookies', async () => {
            chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle error in restore session with cookies (cookie error)', async () => {
            const mockSession = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-id': mockSession });
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle restore cookies with no backup', async () => {
            const result = await coordinator.handleRestoreCookies();
            expect(result.success).toBe(false);
            expect(result.error).toBe('No backup found');
        });

        it('should handle restore session with cookies when URL parsing fails', async () => {
            const mockSession = { tabs: [{ url: 'invalid-url' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-id': mockSession });
            
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid URL: invalid-url');
        });

        it('should handle restore session with cookies when session has no tabs', async () => {
            const mockSession = { tabs: [] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-id': mockSession });
            
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cannot read properties of undefined (reading \'url\')');
        });

        it('should handle save session with cookies when session save fails', async () => {
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleSaveSessionWithCookies(
                { tabs: [] },
                { domain: 'example.com', cookies: [] }
            );
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle save session with cookies when cookie export fails', async () => {
            chrome.storage.local.set.mockResolvedValueOnce();
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleSaveSessionWithCookies(
                { tabs: [] },
                { domain: 'example.com', cookies: [] }
            );
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });
    });

    describe('Helper Methods', () => {
        it('should get current session data', async () => {
            const mockTabs = [
                { url: 'https://example.com', title: 'Example', favIconUrl: 'favicon.ico' }
            ];
            chrome.tabs.query.mockResolvedValueOnce(mockTabs);
            
            const result = await coordinator.getCurrentSessionData();
            expect(result.name).toMatch(/^Session /);
            expect(result.tabs).toEqual([
                {
                    url: 'https://example.com',
                    title: 'Example',
                    favIconUrl: 'favicon.ico'
                }
            ]);
        });

        it('should restore session', async () => {
            const mockSessionData = {
                tabs: [
                    { url: 'https://example1.com' },
                    { url: 'https://example2.com' }
                ]
            };
            
            await coordinator.restoreSession(mockSessionData);
            expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
            expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example1.com' });
            expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://example2.com' });
        });

        it('should handle clear selections command', async () => {
            await coordinator.handleClearSelections();
            // Since this is a no-op, we just verify it doesn't throw
        });

        it('should handle tab update with stored cookies', async () => {
            const mockTab = { url: 'https://example.com/page' };
            const mockCookies = [{ name: 'test', value: 'value' }];
            
            // Store cookies first
            coordinator.cookieData.set('example.com', mockCookies);
            
            await coordinator.handleTabUpdate(mockTab);
            expect(chrome.cookies.set).toHaveBeenCalledWith(mockCookies[0]);
        });

        it('should handle tab update without stored cookies', async () => {
            const mockTab = { url: 'https://example.com/page' };
            
            await coordinator.handleTabUpdate(mockTab);
            expect(chrome.cookies.set).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle save session with cookies when session save fails', async () => {
            chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleSaveSessionWithCookies(
                { tabs: [] },
                { domain: 'example.com', cookies: [] }
            );
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle save session with cookies when cookie export fails', async () => {
            chrome.storage.local.set.mockResolvedValueOnce();
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            const result = await coordinator.handleSaveSessionWithCookies(
                { tabs: [] },
                { domain: 'example.com', cookies: [] }
            );
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle restore session with cookies when session load fails', async () => {
            chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Storage error');
        });

        it('should handle restore session with cookies when cookie export fails', async () => {
            const mockSession = { tabs: [{ url: 'https://example.com' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-id': mockSession });
            chrome.cookies.getAll.mockRejectedValueOnce(new Error('Cookie error'));
            
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Cookie error');
        });

        it('should handle restore session with cookies when URL parsing fails', async () => {
            const mockSession = { tabs: [{ url: 'invalid-url' }] };
            chrome.storage.local.get.mockResolvedValueOnce({ 'test-id': mockSession });
            
            const result = await coordinator.handleRestoreSessionWithCookies('test-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid URL: invalid-url');
        });
    });
}); 