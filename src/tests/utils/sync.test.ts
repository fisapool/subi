import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAuthToken,
  clearAuthToken,
  validateTaskData,
  sanitizeTaskData,
  syncTasksToServer,
  syncTasksFromServer,
  resolveSyncConflict,
  scheduleSync,
  cancelSync,
  initializeSync,
} from '../../sync';

// Mock browser APIs
const mockBrowser = {
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
};

(global as any).browser = mockBrowser;
(global as any).fetch = vi.fn();

describe('Sync', () => {
  const mockToken = 'test-token';
  const mockTask = {
    id: '123',
    title: 'Test Task',
    completed: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    deleted: false,
    priority: 'medium' as const,
    tags: [],
    dueDate: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockBrowser.identity.getAuthToken.mockResolvedValue(mockToken);
    mockBrowser.identity.removeCachedAuthToken.mockResolvedValue();
    mockBrowser.storage.local.get.mockResolvedValue({ tasks: [] });
    mockBrowser.storage.local.set.mockResolvedValue();
    mockBrowser.alarms.create.mockResolvedValue();
    mockBrowser.alarms.clear.mockResolvedValue();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({ tasks: [] }),
    });
  });

  describe('Authentication', () => {
    it('should get auth token', async () => {
      const token = await getAuthToken();
      expect(token).toBe(mockToken);
      expect(mockBrowser.identity.getAuthToken).toHaveBeenCalledWith({ interactive: true });
    });

    it('should handle auth timeout', async () => {
      mockBrowser.identity.getAuthToken.mockRejectedValue(new Error('timeout'));
      await expect(getAuthToken()).rejects.toThrow('Authentication timeout');
    });

    it('should clear auth token', async () => {
      await clearAuthToken();
      expect(mockBrowser.identity.removeCachedAuthToken).toHaveBeenCalledWith({ token: mockToken });
    });
  });

  describe('Task Validation', () => {
    it('should validate task data', () => {
      expect(validateTaskData(mockTask)).toBe(true);
    });

    it('should reject invalid task data', () => {
      const invalidTask = { ...mockTask, title: 'a'.repeat(101) };
      expect(validateTaskData(invalidTask)).toBe(false);
    });

    it('should sanitize task data', () => {
      const unsanitizedTask = {
        ...mockTask,
        title: '  Test Task  ',
        completed: 'true',
        tags: 'not-an-array',
      };
      const sanitized = sanitizeTaskData(unsanitizedTask);
      expect(sanitized.title).toBe('Test Task');
      expect(sanitized.completed).toBe(true);
      expect(Array.isArray(sanitized.tags)).toBe(true);
    });
  });

  describe('Sync Operations', () => {
    it('should sync tasks to server', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({ tasks: [mockTask] });
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ success: true }),
      });

      await syncTasksToServer();
      expect(fetch).toHaveBeenCalledWith(
        'https://api.bytescookies.com/sync',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    it('should handle rate limiting', async () => {
      const headers = new Headers();
      headers.set('Retry-After', '1');
      (global as any).fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve({ success: true }),
        });

      await syncTasksToServer();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should sync tasks from server', async () => {
      (global as any).fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve({ tasks: [mockTask] }),
      });

      const tasks = await syncTasksFromServer();
      expect(tasks).toEqual([mockTask]);
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ tasks: [mockTask] });
    });

    it('should handle network errors', async () => {
      (global as any).fetch.mockRejectedValue(new Error('Network error'));
      await expect(syncTasksFromServer()).rejects.toThrow('Network error');
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve sync conflicts', () => {
      const localTasks = {
        '1': { ...mockTask, id: '1', version: 2 },
        '2': { ...mockTask, id: '2', deleted: true },
      };
      const serverTasks = {
        '1': { ...mockTask, id: '1', version: 1 },
        '3': { ...mockTask, id: '3' },
      };

      const resolved = resolveSyncConflict(localTasks, serverTasks);
      expect(resolved['1'].version).toBe(2); // Local version wins
      expect(resolved['2'].deleted).toBe(true); // Local deletion wins
      expect(resolved['3']).toBeDefined(); // Server task included
    });
  });

  describe('Sync Scheduling', () => {
    it('should schedule sync', async () => {
      await scheduleSync();
      expect(mockBrowser.alarms.create).toHaveBeenCalledWith('sync', {
        periodInMinutes: 30,
      });
    });

    it('should cancel sync', async () => {
      await cancelSync();
      expect(mockBrowser.alarms.clear).toHaveBeenCalledWith('sync');
    });

    it('should initialize sync', async () => {
      await initializeSync();
      expect(mockBrowser.alarms.create).toHaveBeenCalled();
      expect(mockBrowser.alarms.onAlarm.addListener).toHaveBeenCalled();
    });
  });
}); 