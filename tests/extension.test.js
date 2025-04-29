import { jest } from '@jest/globals';
import browser from 'webextension-polyfill';

// Mock browser API
jest.mock('webextension-polyfill', () => ({
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  }
}));

describe('Chrome Extension', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Popup Page', () => {
    test('should initialize popup correctly', async () => {
      // Mock browser.runtime.sendMessage response
      browser.runtime.sendMessage.mockResolvedValueOnce({ success: true });

      // Import popup module
      const popup = await import('../src/popup.js');

      // Call initialization
      await popup.init();

      // Verify message was sent
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'getSettings'
      });
    });

    test('should handle settings update', async () => {
      // Mock browser.runtime.sendMessage response
      browser.runtime.sendMessage.mockResolvedValueOnce({ success: true });

      // Import popup module
      const popup = await import('../src/popup.js');

      // Call settings update
      await popup.updateSettings({ enabled: true });

      // Verify message was sent
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'updateSettings',
        settings: { enabled: true }
      });
    });
  });

  describe('Service Worker', () => {
    test('should handle messages correctly', async () => {
      // Import background module
      const background = await import('../src/background.js');

      // Mock message
      const message = { type: 'getSettings' };
      const sender = { id: 'test-extension' };
      const sendResponse = jest.fn();

      // Call message handler
      await background.handleMessage(message, sender, sendResponse);

      // Verify response was sent
      expect(sendResponse).toHaveBeenCalled();
    });

    test('should handle service worker restart', async () => {
      // Import background module
      const background = await import('../src/background.js');

      // Mock storage data
      browser.storage.local.get.mockResolvedValueOnce({
        settings: { enabled: true }
      });

      // Call initialization
      await background.init();

      // Verify storage was checked
      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
    });
  });

  describe('Content Script', () => {
    test('should inject UI elements', async () => {
      // Import content module
      const content = await import('../src/content.js');

      // Create test container
      document.body.innerHTML = '<div id="test-container"></div>';

      // Call initialization
      await content.init();

      // Verify UI elements were created
      expect(document.querySelector('.cookie-manager')).toBeTruthy();
    });

    test('should handle cookie updates', async () => {
      // Import content module
      const content = await import('../src/content.js');

      // Mock runtime message
      const message = {
        type: 'cookieUpdated',
        cookie: { name: 'test', value: 'value' }
      };

      // Call message handler
      await content.handleMessage(message);

      // Verify UI was updated
      expect(document.querySelector('.cookie-item')).toBeTruthy();
    });
  });
}); 