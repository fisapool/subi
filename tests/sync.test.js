import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';
import mockBrowser from '../src/tests/mocks/webextension-polyfill';
import * as sync from '../src/sync.js';
import authManager from '../src/auth.js';

// Mock browser API
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Sync Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Data Validation', () => {
    it('validateTaskData should validate task correctly', () => {
      const validTask = {
        id: '1',
        title: 'Test Task',
        completed: false,
        createdAt: Date.now()
      };

      expect(sync.validateTaskData(validTask)).toBe(true);
    });

    it('validateTaskData should reject invalid task', () => {
      const invalidTask = {
        id: '1',
        // Missing title
        completed: false
      };

      expect(sync.validateTaskData(invalidTask)).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('syncTasksToServer should handle network timeout', async () => {
      // Mock auth token
      browser.identity.getAuthToken.mockResolvedValue('mock-token');

      // Mock fetch to timeout
      global.fetch.mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 1000);
      }));

      // Attempt sync
      await expect(sync.syncTasksToServer()).rejects.toThrow('Network timeout');
    });

    it('syncTasksToServer should handle rate limiting', async () => {
      // Mock auth token
      browser.identity.getAuthToken.mockResolvedValue('mock-token');

      // Mock rate limit response
      const rateLimitResponse = {
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' })
      };
      global.fetch.mockResolvedValueOnce(rateLimitResponse);

      // Attempt sync
      await expect(sync.syncTasksToServer()).rejects.toThrow('Rate limit exceeded');
    });

    it('syncTasksToServer should handle token expiration', async () => {
      // Mock auth token to expire
      browser.identity.getAuthToken.mockResolvedValueOnce('expired-token');
      browser.identity.getAuthToken.mockResolvedValueOnce('new-token');

      // Mock unauthorized response
      const unauthorizedResponse = {
        ok: false,
        status: 401
      };
      global.fetch.mockResolvedValueOnce(unauthorizedResponse);

      // Mock successful response after token refresh
      const successResponse = {
        ok: true,
        json: () => Promise.resolve({ success: true })
      };
      global.fetch.mockResolvedValueOnce(successResponse);

      // Attempt sync
      await sync.syncTasksToServer();

      // Verify token was refreshed
      expect(browser.identity.getAuthToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('Conflict Resolution', () => {
    it('resolveSyncConflict should handle deleted items', async () => {
      const localTask = { id: '1', deleted: true };
      const remoteTask = { id: '1', title: 'Test Task' };

      const resolved = await sync.resolveSyncConflict(localTask, remoteTask);

      expect(resolved).toBeNull();
    });

    it('resolveSyncConflict should use version numbers', async () => {
      const localTask = { id: '1', version: 2, title: 'Local' };
      const remoteTask = { id: '1', version: 1, title: 'Remote' };

      const resolved = await sync.resolveSyncConflict(localTask, remoteTask);

      expect(resolved).toEqual(localTask);
    });
  });
});

describe('Auth Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Management', () => {
    it('refreshToken should handle multiple simultaneous requests', async () => {
      // Mock auth token
      browser.identity.getAuthToken.mockResolvedValue('new-token');

      // Create multiple refresh requests
      const requests = Array(5).fill(null).map(() => authManager.refreshToken());

      // Wait for all requests to complete
      const results = await Promise.all(requests);

      // Verify all requests succeeded
      expect(results.every(r => r === true)).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('login should handle rate limiting', async () => {
      // Mock auth flow to fail with rate limit
      browser.identity.launchWebAuthFlow.mockRejectedValue(new Error('Maximum login attempts exceeded'));

      // Attempt login
      await expect(authManager.login())
        .rejects.toThrow('Maximum login attempts exceeded');
    });
  });
}); 