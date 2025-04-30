import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';
import mockBrowser from '../src/tests/mocks/webextension-polyfill';

// Mock browser API
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Chrome Extension', () => {
  describe('Popup Page', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should initialize popup correctly', async () => {
      // Mock browser.runtime.sendMessage
      browser.runtime.sendMessage.mockResolvedValue({ success: true });

      // Import popup module
      const popup = await import('../src/popup.js');

      // Call initialization
      await popup.initialize();

      // Verify message was sent
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'INITIALIZE'
      });
    });

    it('should handle settings update', async () => {
      // Mock browser.runtime.sendMessage
      browser.runtime.sendMessage.mockResolvedValue({ success: true });

      // Import popup module
      const popup = await import('../src/popup.js');

      // Call settings update
      await popup.updateSettings({ enabled: true });

      // Verify message was sent
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_SETTINGS',
        settings: { enabled: true }
      });
    });
  });

  describe('Service Worker', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should handle messages correctly', async () => {
      // Mock message handler
      const sendResponse = vi.fn();
      const message = { type: 'TEST' };

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call message handler
      await serviceWorker.handleMessage(message, {}, sendResponse);

      // Verify response was sent
      expect(sendResponse).toHaveBeenCalled();
    });

    it('should handle service worker restart', async () => {
      // Mock storage data
      browser.storage.local.get.mockResolvedValue({
        settings: { enabled: true }
      });

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call restart handler
      await serviceWorker.handleRestart();

      // Verify settings were loaded
      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
    });
  });

  describe('Content Script', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should inject UI elements', async () => {
      // Import content script module
      const content = await import('../src/content.js');

      // Call initialization
      await content.init();

      // Verify UI elements were created
      expect(document.getElementById('cookie-consent-banner')).toBeTruthy();
    });

    it('should handle cookie updates', async () => {
      // Import content script module
      const content = await import('../src/content.js');

      // Call message handler
      await content.handleMessage({
        type: 'COOKIE_UPDATE',
        cookies: [{ name: 'test', value: 'value' }]
      });

      // Verify UI was updated
      expect(document.getElementById('cookie-consent-banner')).toBeTruthy();
    });
  });
}); 