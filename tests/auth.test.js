import { jest } from '@jest/globals';
import browser from 'webextension-polyfill';
import authManager from '../src/auth.js';

// Mock browser API
jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    onChanged: {
      addListener: jest.fn()
    }
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock sync module
jest.mock('../src/sync.js', () => ({
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    sync: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Auth Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockReset();
    authManager.authToken = null;
    authManager.currentUser = null;
    authManager.syncManager = null;
  });

  describe('Initialization', () => {
    it('should initialize with stored credentials', async () => {
      const mockToken = 'mock-token';
      const mockUser = { id: 1, name: 'Test User' };
      
      browser.storage.local.get.mockResolvedValueOnce({
        authToken: mockToken,
        currentUser: mockUser
      });

      await authManager.init();

      expect(authManager.authToken).toBe(mockToken);
      expect(authManager.currentUser).toBe(mockUser);
      expect(browser.storage.onChanged.addListener).toHaveBeenCalledWith(
        authManager.handleStorageChange
      );
    });

    it('should handle initialization errors gracefully', async () => {
      browser.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(authManager.init()).resolves.not.toThrow();
    });
  });

  describe('Registration', () => {
    it('should register a new user successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          token: 'new-token',
          user: { id: 1, name: 'New User' }
        })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await authManager.register('test@example.com', 'password', 'Test User');
      
      expect(result).toBeDefined();
      expect(authManager.authToken).toBe('new-token');
      expect(authManager.currentUser).toBeDefined();
    });

    it('should handle registration errors', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: 'Registration failed' })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      await expect(authManager.register('test@example.com', 'password', 'Test User'))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('Login', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          token: 'login-token',
          user: { id: 1, name: 'Logged In User' }
        })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await authManager.login('test@example.com', 'password');
      
      expect(result).toBeDefined();
      expect(authManager.authToken).toBe('login-token');
      expect(authManager.currentUser).toBeDefined();
    });

    it('should handle login errors', async () => {
      const mockResponse = {
        ok: false,
        json: () => Promise.resolve({ error: 'Login failed' })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      await expect(authManager.login('test@example.com', 'password'))
        .rejects.toThrow('Login failed');
    });
  });

  describe('Logout', () => {
    it('should logout user and clear state', async () => {
      authManager.authToken = 'old-token';
      authManager.currentUser = { id: 1 };
      
      const mockResponse = { ok: true };
      global.fetch.mockResolvedValueOnce(mockResponse);

      await authManager.logout();

      expect(authManager.authToken).toBeNull();
      expect(authManager.currentUser).toBeNull();
      expect(browser.storage.local.remove).toHaveBeenCalledWith(['authToken', 'currentUser']);
    });

    it('should handle logout errors gracefully', async () => {
      authManager.authToken = 'old-token';
      global.fetch.mockRejectedValueOnce(new Error('Logout failed'));

      await expect(authManager.logout()).resolves.not.toThrow();
      expect(authManager.authToken).toBeNull();
    });
  });

  describe('Token Validation', () => {
    it('should validate token successfully', async () => {
      authManager.authToken = 'valid-token';
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ user: { id: 1 } })
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await authManager.validateToken();
      expect(result).toBe(true);
    });

    it('should handle invalid token', async () => {
      authManager.authToken = 'invalid-token';
      const mockResponse = {
        ok: false,
        status: 401
      };
      global.fetch.mockResolvedValueOnce(mockResponse);

      const result = await authManager.validateToken();
      expect(result).toBe(false);
    });
  });

  describe('State Management', () => {
    it('should handle storage changes', async () => {
      const changes = {
        authToken: { newValue: 'new-token' },
        currentUser: { newValue: { id: 1 } }
      };

      await authManager.handleStorageChange(changes, 'local');

      expect(authManager.authToken).toBe('new-token');
      expect(authManager.currentUser).toEqual({ id: 1 });
    });

    it('should check authentication status correctly', () => {
      authManager.authToken = 'token';
      authManager.currentUser = { id: 1 };
      expect(authManager.isAuthenticated()).toBe(true);

      authManager.authToken = null;
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it('should get current user and token', () => {
      authManager.authToken = 'test-token';
      authManager.currentUser = { id: 1, name: 'Test' };

      expect(authManager.getCurrentUser()).toEqual({ id: 1, name: 'Test' });
      expect(authManager.getAuthToken()).toBe('test-token');
    });
  });
}); 