import { describe, it, expect, vi, beforeEach } from 'vitest';
import SessionManager from '../../session-manager';
import { mockBrowser } from '../mocks/webextension-polyfill';
import { resetDOM } from '../mocks/dom';
import type { Browser } from 'webextension-polyfill';

// Mock cookie data
const mockCookies = [
  {
    name: 'session',
    value: 'test-session',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'no_restriction',
    expirationDate: Date.now() / 1000 + 3600,
    hostOnly: false,
    session: false,
    storeId: '0',
    firstPartyDomain: ''
  }
];

// Define a minimal Browser type that includes only what we need
type MinimalBrowser = Pick<Browser, 'cookies' | 'storage'>;

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Reset all mocks and DOM
    vi.clearAllMocks();
    resetDOM();
    
    // Initialize SessionManager with mock browser
    global.browser = mockBrowser as unknown as MinimalBrowser;
    sessionManager = new SessionManager();
  });

  describe('getSessionCookies', () => {
    it('should get cookies for a domain', async () => {
      (mockBrowser.cookies.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockCookies);

      const cookies = await sessionManager.getSessionCookies('example.com');

      expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(cookies).toEqual(mockCookies);
    });

    it('should handle errors and return empty array', async () => {
      (mockBrowser.cookies.getAll as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to get cookies'));

      const cookies = await sessionManager.getSessionCookies('example.com');

      expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(cookies).toEqual([]);
    });
  });

  describe('saveSession', () => {
    it('should save session with cookies', async () => {
      (mockBrowser.cookies.getAll as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockCookies);
      (mockBrowser.storage.local.set as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await sessionManager.saveSession('test-session', 'example.com');

      expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        'session_test-session': {
          cookies: mockCookies,
          domain: 'example.com',
          timestamp: expect.any(Number)
        }
      });
      expect(result).toBe(true);
    });

    it('should handle errors when saving session', async () => {
      (mockBrowser.cookies.getAll as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to get cookies'));

      const result = await sessionManager.saveSession('test-session', 'example.com');

      expect(result).toBe(false);
    });
  });

  describe('loadSession', () => {
    it('should load cookies from storage and set them', async () => {
      const storedSession = {
        cookies: mockCookies,
        domain: 'example.com',
        timestamp: Date.now()
      };

      (mockBrowser.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        'session_test-session': storedSession
      });
      (mockBrowser.cookies.set as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const result = await sessionManager.loadSession('test-session');

      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith('session_test-session');
      expect(mockBrowser.cookies.set).toHaveBeenCalledWith(mockCookies[0]);
      expect(result).toBe(true);
    });

    it('should handle errors when loading session', async () => {
      (mockBrowser.storage.local.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to load session'));

      const result = await sessionManager.loadSession('test-session');

      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      (mockBrowser.storage.local.remove as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const result = await sessionManager.deleteSession('test-session');

      expect(mockBrowser.storage.local.remove).toHaveBeenCalledWith('session_test-session');
      expect(result).toBe(true);
    });

    it('should handle errors when deleting session', async () => {
      (mockBrowser.storage.local.remove as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to delete session'));

      const result = await sessionManager.deleteSession('test-session');

      expect(result).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('should list all sessions', async () => {
      const mockData = {
        'session_test1': { domain: 'example.com', timestamp: Date.now() },
        'session_test2': { domain: 'example.org', timestamp: Date.now() },
        'other_data': { some: 'data' }
      };

      (mockBrowser.storage.local.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockData);

      const sessions = await sessionManager.listSessions();

      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith(null);
      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toEqual({
        name: 'test1',
        domain: 'example.com',
        timestamp: expect.any(Number)
      });
      expect(sessions[1]).toEqual({
        name: 'test2',
        domain: 'example.org',
        timestamp: expect.any(Number)
      });
    });

    it('should handle errors when listing sessions', async () => {
      (mockBrowser.storage.local.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed to list sessions'));

      const sessions = await sessionManager.listSessions();

      expect(sessions).toEqual([]);
    });
  });
}); 