import { jest } from '@jest/globals';
import browser from 'webextension-polyfill';
import * as sync from '../src/sync.js';

// Mock browser API
jest.mock('webextension-polyfill', () => ({
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

describe('Service Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    browser.identity.getAuthToken.mockResolvedValue('mock-token');
    browser.storage.local.get.mockResolvedValue({ tasks: [] });
  });

  describe('Sync Operations', () => {
    test('should handle service worker termination during sync', async () => {
      // Mock a sync operation that gets interrupted
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      // Start sync operation
      const syncPromise = sync.syncTasksToServer();

      // Simulate service worker termination
      await browser.alarms.onAlarm.addListener.mock.calls[0][0]({ name: 'sync' });

      // Wait for sync to complete
      await expect(syncPromise).resolves.toBeDefined();
    });

    test('should retry sync after service worker restart', async () => {
      // Mock initial sync failure
      global.fetch.mockRejectedValueOnce(new Error('Service worker terminated'));

      // Mock successful retry
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      // Attempt sync
      const result = await sync.syncTasksToServer();

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from network errors', async () => {
      // Mock network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Mock successful retry
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      // Attempt sync
      const result = await sync.syncTasksToServer();

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test('should handle rate limiting', async () => {
      // Mock rate limit response
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' })
      };
      global.fetch.mockResolvedValueOnce(rateLimitResponse);

      // Mock successful response after retry
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      // Attempt sync
      const result = await sync.syncTasksToServer();

      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
}); 