import { jest } from '@jest/globals';
import browser from './mocks/webextension-polyfill.js';

// Mock browser API
global.browser = browser;

describe('Background Script', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Handling', () => {
    it('should handle cookie management messages', async () => {
      const { handleMessage } = await import('../src/background.js');
      const message = { type: 'getCookies', domain: 'example.com' };
      const sendResponse = jest.fn();

      await handleMessage(message, {}, sendResponse);
      
      expect(browser.cookies.getAll).toHaveBeenCalledWith({
        domain: 'example.com'
      });
      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle cookie deletion messages', async () => {
      const { handleMessage } = await import('../src/background.js');
      const message = { type: 'deleteCookie', domain: 'example.com', name: 'testCookie' };
      const sendResponse = jest.fn();

      await handleMessage(message, {}, sendResponse);
      
      expect(browser.cookies.remove).toHaveBeenCalledWith({
        name: 'testCookie',
        domain: 'example.com'
      });
      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle invalid message types', async () => {
      const { handleMessage } = await import('../src/background.js');
      const message = { type: 'invalid' };
      const sendResponse = jest.fn();

      await handleMessage(message, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ error: 'Invalid message type' });
    });
  });

  describe('Storage Management', () => {
    it('should save settings to storage', async () => {
      const { saveSettings } = await import('../src/background.js');
      const settings = { autoDelete: true };

      await saveSettings(settings);
      
      expect(browser.storage.local.set).toHaveBeenCalledWith(settings);
    });

    it('should retrieve settings from storage', async () => {
      const { getSettings } = await import('../src/background.js');
      
      const settings = await getSettings();
      
      expect(settings).toEqual({ autoDelete: true });
    });

    it('should handle storage errors gracefully', async () => {
      const { getSettings } = await import('../src/background.js');
      
      browser.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
      
      const settings = await getSettings();
      
      expect(settings).toEqual({});
    });
  });

  describe('Cookie Management', () => {
    it('should get cookies for a domain', async () => {
      const { getCookiesForDomain } = await import('../src/background.js');
      
      const cookies = await getCookiesForDomain('example.com');
      
      expect(cookies).toEqual([{ name: 'cookie1', domain: 'example.com' }]);
    });

    it('should delete cookies for a domain', async () => {
      const { deleteCookiesForDomain } = await import('../src/background.js');
      
      await deleteCookiesForDomain('example.com');
      
      expect(browser.cookies.remove).toHaveBeenCalledWith({
        name: 'cookie1',
        domain: 'example.com'
      });
    });

    it('should handle cookie deletion errors', async () => {
      const { deleteCookiesForDomain } = await import('../src/background.js');
      
      await expect(deleteCookiesForDomain('error.com')).rejects.toThrow('Deletion failed');
    });
  });

  describe('Alarm Management', () => {
    it('should create periodic cleanup alarm', async () => {
      const { scheduleCleanup } = await import('../src/background.js');
      
      await scheduleCleanup();
      
      expect(browser.alarms.create).toHaveBeenCalledWith('cleanup', {
        periodInMinutes: 60
      });
    });

    it('should handle alarm events', async () => {
      const { initializeAlarms } = await import('../src/background.js');
      
      await initializeAlarms();
      
      expect(browser.alarms.onAlarm.addListener).toHaveBeenCalled();
    });

    it('should clear alarms when needed', async () => {
      const { clearCleanupAlarm } = await import('../src/background.js');
      
      await clearCleanupAlarm();
      
      expect(browser.alarms.clear).toHaveBeenCalledWith('cleanup');
    });
  });

  describe('Tab Management', () => {
    it('should query active tabs', async () => {
      const { getActiveTab } = await import('../src/background.js');
      
      const tab = await getActiveTab();
      
      expect(tab).toBeDefined();
      expect(browser.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true
      });
    });

    it('should send messages to tabs', async () => {
      const { sendMessageToTab } = await import('../src/background.js');
      
      await sendMessageToTab(1, { type: 'test' });
      
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'test' });
    });

    it('should handle tab message errors', async () => {
      const { sendMessageToTab } = await import('../src/background.js');
      
      await expect(sendMessageToTab('error', { type: 'test' })).rejects.toThrow('Message failed');
    });
  });
}); 