import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionSnippet, saveCurrentSession, restoreSession, getSavedSessions, deleteSession } from '../../session-snippets.js';

// Mock Chrome API
const mockChrome = {
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    executeScript: vi.fn(),
  },
  cookies: {
    getAll: vi.fn(),
    set: vi.fn(),
  },
  windows: {
    create: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

// @ts-ignore
global.chrome = mockChrome;

describe('Session Snippets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChrome.storage.local.get.mockResolvedValue({ savedSessions: [] });
    mockChrome.storage.local.set.mockResolvedValue(undefined);
  });

  describe('saveCurrentSession', () => {
    it('should save current session successfully', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example', active: true, pinned: false, windowId: 1 },
        { id: 2, url: 'https://test.com', title: 'Test', active: false, pinned: false, windowId: 1 },
      ];

      const mockCookies = [
        { name: 'cookie1', value: 'value1', domain: 'example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax' },
        { name: 'cookie2', value: 'value2', domain: 'test.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax' },
      ];

      mockChrome.tabs.query.mockResolvedValue(mockTabs);
      mockChrome.cookies.getAll.mockResolvedValue(mockCookies);
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: {} }]);

      const session = await saveCurrentSession('test-session');

      expect(session).toBeInstanceOf(SessionSnippet);
      expect(session.name).toBe('test-session');
      expect(session.tabs).toHaveLength(2);
      expect(session.cookies).toHaveProperty('example.com');
      expect(session.cookies).toHaveProperty('test.com');
    });

    it('should handle errors when saving session', async () => {
      mockChrome.tabs.query.mockRejectedValue(new Error('Failed to get tabs'));

      await expect(saveCurrentSession('test-session')).rejects.toThrow('Failed to get tabs');
    });
  });

  describe('restoreSession', () => {
    it('should restore session successfully', async () => {
      const mockSession = new SessionSnippet(
        'test-session',
        [
          { id: 1, url: 'https://example.com', title: 'Example', active: true, pinned: false, windowId: 1 },
        ],
        {
          'example.com': [
            { name: 'cookie1', value: 'value1', domain: 'example.com', path: '/', secure: true, httpOnly: true, sameSite: 'lax' },
          ],
        },
        {
          'https://example.com': { field1: 'value1' },
        }
      );

      mockChrome.windows.create.mockResolvedValue({ id: 1 });
      mockChrome.tabs.create.mockResolvedValue({ id: 1 });
      mockChrome.cookies.set.mockResolvedValue(undefined);
      mockChrome.scripting.executeScript.mockResolvedValue(undefined);

      await restoreSession(mockSession);

      expect(mockChrome.windows.create).toHaveBeenCalled();
      expect(mockChrome.tabs.create).toHaveBeenCalled();
      expect(mockChrome.cookies.set).toHaveBeenCalled();
    });

    it('should handle errors when restoring session', async () => {
      const mockSession = new SessionSnippet('test-session', [], {}, {});
      mockChrome.windows.create.mockRejectedValue(new Error('Failed to create window'));

      await expect(restoreSession(mockSession)).rejects.toThrow('Failed to create window');
    });
  });

  describe('getSavedSessions', () => {
    it('should get saved sessions successfully', async () => {
      const mockSessions = [
        new SessionSnippet('session1', [], {}, {}),
        new SessionSnippet('session2', [], {}, {}),
      ];

      mockChrome.storage.local.get.mockResolvedValue({ savedSessions: mockSessions });

      const sessions = await getSavedSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toBeInstanceOf(SessionSnippet);
      expect(sessions[1]).toBeInstanceOf(SessionSnippet);
    });

    it('should return empty array if no sessions exist', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});

      const sessions = await getSavedSessions();

      expect(sessions).toHaveLength(0);
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      const mockSessions = [
        new SessionSnippet('session1', [], {}, {}),
        new SessionSnippet('session2', [], {}, {}),
      ];

      mockChrome.storage.local.get.mockResolvedValue({ savedSessions: mockSessions });

      await deleteSession('session1');

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        savedSessions: [mockSessions[1]],
      });
    });

    it('should handle non-existent session', async () => {
      const mockSessions = [
        new SessionSnippet('session1', [], {}, {}),
        new SessionSnippet('session2', [], {}, {}),
      ];

      mockChrome.storage.local.get.mockResolvedValue({ savedSessions: mockSessions });

      await deleteSession('non-existent');

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        savedSessions: mockSessions,
      });
    });
  });
}); 