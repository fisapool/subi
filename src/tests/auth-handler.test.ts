import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthHandler from '../auth-handler.js';
import SessionManager from '../session-manager.js';

// Mock SessionManager
vi.mock('../session-manager.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getSessionCookies: vi.fn(),
      saveSession: vi.fn(),
      loadSession: vi.fn(),
      deleteSession: vi.fn(),
      listSessions: vi.fn()
    }))
  };
});

describe('Auth Handler', () => {
  let authHandler: any;
  let mockBrowser: any;

  beforeEach(() => {
    // Mock browser API
    mockBrowser = {
      cookies: {
        remove: vi.fn()
      }
    };
    global.browser = mockBrowser;

    // Create new instance for each test
    authHandler = new AuthHandler();
  });

  describe('Login Status', () => {
    it('should detect login status with session cookie', async () => {
      const mockCookies = [
        { name: 'sessionId', value: 'test-session' },
        { name: 'other', value: 'test' }
      ];

      (authHandler.sessionManager.getSessionCookies as any).mockResolvedValue(mockCookies);

      const isLoggedIn = await authHandler.checkLoginStatus('example.com');
      expect(isLoggedIn).toBe(true);
      expect(authHandler.sessionManager.getSessionCookies).toHaveBeenCalledWith('example.com');
    });

    it('should detect login status with auth cookie', async () => {
      const mockCookies = [
        { name: 'auth', value: 'test-auth' },
        { name: 'other', value: 'test' }
      ];

      (authHandler.sessionManager.getSessionCookies as any).mockResolvedValue(mockCookies);

      const isLoggedIn = await authHandler.checkLoginStatus('example.com');
      expect(isLoggedIn).toBe(true);
    });

    it('should handle no session cookies', async () => {
      const mockCookies = [
        { name: 'other', value: 'test' }
      ];

      (authHandler.sessionManager.getSessionCookies as any).mockResolvedValue(mockCookies);

      const isLoggedIn = await authHandler.checkLoginStatus('example.com');
      expect(isLoggedIn).toBe(false);
    });

    it('should handle errors when checking login status', async () => {
      (authHandler.sessionManager.getSessionCookies as any).mockRejectedValue(new Error('Test error'));

      const isLoggedIn = await authHandler.checkLoginStatus('example.com');
      expect(isLoggedIn).toBe(false);
    });
  });

  describe('Logout', () => {
    it('should remove all session cookies on logout', async () => {
      const mockCookies = [
        { name: 'sessionId', domain: 'example.com', path: '/', secure: true },
        { name: 'auth', domain: 'example.com', path: '/', secure: false }
      ];

      (authHandler.sessionManager.getSessionCookies as any).mockResolvedValue(mockCookies);
      mockBrowser.cookies.remove.mockResolvedValue(null);

      const success = await authHandler.logout('example.com');

      expect(success).toBe(true);
      expect(mockBrowser.cookies.remove).toHaveBeenCalledTimes(2);
      expect(mockBrowser.cookies.remove).toHaveBeenCalledWith({
        url: 'https://example.com/',
        name: 'sessionId'
      });
      expect(mockBrowser.cookies.remove).toHaveBeenCalledWith({
        url: 'http://example.com/',
        name: 'auth'
      });
    });

    it('should handle errors during logout', async () => {
      (authHandler.sessionManager.getSessionCookies as any).mockRejectedValue(new Error('Test error'));

      const success = await authHandler.logout('example.com');
      expect(success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should save current session', async () => {
      (authHandler.sessionManager.saveSession as any).mockResolvedValue(true);

      const success = await authHandler.saveCurrentSession('test-session', 'example.com');
      expect(success).toBe(true);
      expect(authHandler.sessionManager.saveSession).toHaveBeenCalledWith('test-session', 'example.com');
    });

    it('should load saved session', async () => {
      (authHandler.sessionManager.loadSession as any).mockResolvedValue(true);

      const success = await authHandler.loadSavedSession('test-session');
      expect(success).toBe(true);
      expect(authHandler.sessionManager.loadSession).toHaveBeenCalledWith('test-session');
    });

    it('should delete saved session', async () => {
      (authHandler.sessionManager.deleteSession as any).mockResolvedValue(true);

      const success = await authHandler.deleteSavedSession('test-session');
      expect(success).toBe(true);
      expect(authHandler.sessionManager.deleteSession).toHaveBeenCalledWith('test-session');
    });

    it('should list saved sessions', async () => {
      const mockSessions = ['session1', 'session2'];
      (authHandler.sessionManager.listSessions as any).mockResolvedValue(mockSessions);

      const sessions = await authHandler.getSavedSessions();
      expect(sessions).toEqual(mockSessions);
      expect(authHandler.sessionManager.listSessions).toHaveBeenCalled();
    });
  });
}); 