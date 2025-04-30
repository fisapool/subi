import { jest } from '@jest/globals';
import browser from 'webextension-polyfill';
import * as sync from '../src/sync.js';
import authManager from '../src/auth.js';

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

describe('Sync Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    browser.identity.getAuthToken.mockResolvedValue('mock-token');
    browser.storage.local.get.mockResolvedValue({ tasks: [] });
  });

  describe('Data Validation', () => {
    test('validateTaskData should validate task correctly', () => {
      const validTask = {
        id: '123',
        title: 'Test Task',
        completed: false,
        updatedAt: Date.now(),
        priority: 'high',
        tags: ['work', 'urgent']
      };
      expect(sync.validateTaskData(validTask)).toBe(true);
    });

    test('validateTaskData should reject invalid task', () => {
      const invalidTask = {
        id: '123',
        title: 'A'.repeat(101), // Exceeds MAX_TITLE_LENGTH
        completed: false
      };
      expect(sync.validateTaskData(invalidTask)).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    test('syncTasksToServer should handle network timeout', async () => {
      global.fetch.mockRejectedValueOnce(new Error('timeout'));
      
      await expect(sync.syncTasksToServer()).rejects.toThrow('Network timeout occurred');
    });

    test('syncTasksToServer should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);
      
      await expect(sync.syncTasksToServer()).rejects.toThrow('Maximum retry attempts reached');
    });

    test('syncTasksToServer should handle token expiration', async () => {
      const mockResponse = {
        ok: false,
        status: 401
      };
      global.fetch.mockResolvedValueOnce(mockResponse);
      
      await expect(sync.syncTasksToServer()).rejects.toThrow('Maximum retry attempts reached');
    });
  });

  describe('Conflict Resolution', () => {
    test('resolveSyncConflict should handle deleted items', () => {
      const localTasks = {
        '1': { id: '1', title: 'Local Task', version: 1, deleted: false },
        '2': { id: '2', title: 'Local Deleted', version: 1, deleted: true }
      };
      const serverTasks = {
        '1': { id: '1', title: 'Server Task', version: 2, deleted: false },
        '2': { id: '2', title: 'Server Task', version: 1, deleted: false }
      };

      const resolved = sync.resolveSyncConflict(localTasks, serverTasks);
      expect(resolved['2'].deleted).toBe(true);
    });

    test('resolveSyncConflict should use version numbers', () => {
      const localTasks = {
        '1': { id: '1', title: 'Local Task', version: 2, deleted: false }
      };
      const serverTasks = {
        '1': { id: '1', title: 'Server Task', version: 1, deleted: false }
      };

      const resolved = sync.resolveSyncConflict(localTasks, serverTasks);
      expect(resolved['1'].title).toBe('Local Task');
    });
  });
});

describe('Auth Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
  });

  describe('Token Management', () => {
    test('validateToken should refresh token before expiry', async () => {
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MTk1MjQwMDB9.mock';
      authManager.authToken = mockToken;
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 } })
      });

      const result = await authManager.validateToken();
      expect(result).toBe(true);
    });

    test('refreshToken should handle multiple simultaneous requests', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ token: 'new-token', user: { id: 1 } })
      };
      global.fetch.mockResolvedValue(mockResponse);

      const promises = [
        authManager.refreshToken(),
        authManager.refreshToken(),
        authManager.refreshToken()
      ];

      const results = await Promise.all(promises);
      expect(results.every(r => r === true)).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('login should handle rate limiting', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '1' }),
        json: () => Promise.resolve({ error: 'Rate limited' })
      };
      global.fetch.mockResolvedValue(mockResponse);

      await expect(authManager.login('test@example.com', 'password'))
        .rejects.toThrow('Maximum login attempts reached');
    });

    test('handleRequestError should handle network errors', async () => {
      const error = new Error('Failed to fetch');
      await expect(authManager.handleRequestError(error))
        .rejects.toThrow('Network error');
    });
  });
}); 