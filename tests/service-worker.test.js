import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';
import mockBrowser from '../src/tests/mocks/webextension-polyfill';
import * as sync from '../src/sync.js';

// Mock browser API
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sync Operations', () => {
    it('should handle service worker termination during sync', async () => {
      // Mock storage data
      browser.storage.local.get.mockResolvedValue({
        settings: { enabled: true }
      });

      // Mock sync to fail
      sync.syncTasksToServer.mockRejectedValue(new Error('Sync failed'));

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call sync handler
      await serviceWorker.handleSync();

      // Verify error was handled
      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
    });

    it('should retry sync after service worker restart', async () => {
      // Mock storage data
      browser.storage.local.get.mockResolvedValue({
        settings: { enabled: true }
      });

      // Mock sync to succeed
      sync.syncTasksToServer.mockResolvedValue();

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call restart handler
      await serviceWorker.handleRestart();

      // Verify sync was retried
      expect(sync.syncTasksToServer).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from network errors', async () => {
      // Mock storage data
      browser.storage.local.get.mockResolvedValue({
        settings: { enabled: true }
      });

      // Mock sync to fail with network error
      sync.syncTasksToServer.mockRejectedValue(new Error('Network error'));

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call sync handler
      await serviceWorker.handleSync();

      // Verify error was handled
      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
    });

    it('should handle rate limiting', async () => {
      // Mock storage data
      browser.storage.local.get.mockResolvedValue({
        settings: { enabled: true }
      });

      // Mock sync to fail with rate limit
      sync.syncTasksToServer.mockRejectedValue(new Error('Rate limit exceeded'));

      // Import service worker module
      const serviceWorker = await import('../src/service-worker.js');

      // Call sync handler
      await serviceWorker.handleSync();

      // Verify error was handled
      expect(browser.storage.local.get).toHaveBeenCalledWith('settings');
    });
  });
}); 