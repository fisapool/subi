import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';
import mockBrowser from '../src/tests/mocks/webextension-polyfill';

// Mock browser API
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Options Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <form id="settings-form">
        <input type="checkbox" id="auto-save" />
        <input type="number" id="save-interval" />
        <button type="submit">Save</button>
      </form>
      <div id="status-message"></div>
      <button id="upgrade-button">Upgrade to Premium</button>
    `;
  });

  describe('Settings Management', () => {
    it('should load saved settings on page load', async () => {
      // Mock storage data
      browser.storage.sync.get.mockResolvedValue({
        autoSave: true,
        saveInterval: 30
      });

      // Import options module
      const options = await import('../src/options.js');

      // Call initialization
      await options.initialize();

      // Verify settings were loaded
      expect(document.getElementById('auto-save').checked).toBe(true);
      expect(document.getElementById('save-interval').value).toBe('30');
    });

    it('should save settings when form is submitted', async () => {
      // Mock storage
      browser.storage.sync.set.mockResolvedValue();

      // Import options module
      const options = await import('../src/options.js');

      // Initialize
      await options.initialize();

      // Set form values
      document.getElementById('auto-save').checked = true;
      document.getElementById('save-interval').value = '30';

      // Submit form
      document.getElementById('settings-form').dispatchEvent(new Event('submit'));

      // Verify settings were saved
      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        autoSave: true,
        saveInterval: 30
      });
    });
  });

  describe('Premium Features', () => {
    it('should handle premium upgrade flow', async () => {
      // Mock identity flow
      browser.identity.launchWebAuthFlow.mockResolvedValue('https://example.com/callback#token=123');

      // Import options module
      const options = await import('../src/options.js');

      // Initialize
      await options.initialize();

      // Click upgrade button
      document.getElementById('upgrade-button').click();

      // Verify auth flow was started
      expect(browser.identity.launchWebAuthFlow).toHaveBeenCalled();
    });

    it('should show error message when premium upgrade fails', async () => {
      // Mock identity flow to fail
      browser.identity.launchWebAuthFlow.mockRejectedValue(new Error('Auth failed'));

      // Import options module
      const options = await import('../src/options.js');

      // Initialize
      await options.initialize();

      // Click upgrade button
      document.getElementById('upgrade-button').click();

      // Wait for the error message
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error message was shown
      expect(document.getElementById('status-message').textContent).toContain('Failed to upgrade');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // Mock storage to fail
      browser.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      // Import options module
      const options = await import('../src/options.js');

      // Initialize
      await options.initialize();

      // Verify error message was shown
      expect(document.getElementById('status-message').textContent).toContain('Failed to load settings');
    });

    it('should handle network errors during premium upgrade', async () => {
      // Mock identity flow to fail with network error
      browser.identity.launchWebAuthFlow.mockRejectedValue(new Error('Network error'));

      // Import options module
      const options = await import('../src/options.js');

      // Initialize
      await options.initialize();

      // Click upgrade button
      document.getElementById('upgrade-button').click();

      // Wait for the error message
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify error message was shown
      expect(document.getElementById('status-message').textContent).toContain('Network error');
    });
  });
}); 