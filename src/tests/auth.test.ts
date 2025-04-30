import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Auth } from '@/auth';
import { Storage } from '@/utils/storage';

// Mock the storage module
vi.mock('@/utils/storage', () => ({
  Storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('Auth', () => {
  let auth: Auth;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    
    // Create a new Auth instance for each test
    auth = new Auth();
    
    // Mock Storage methods
    vi.mocked(Storage.get).mockResolvedValue({ token: 'mock-token', user: { id: 1, email: 'test@example.com' } });
    vi.mocked(Storage.set).mockResolvedValue();
    vi.mocked(Storage.remove).mockResolvedValue();

    // Mock fetch
    global.fetch = vi.fn();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(auth.initialize()).resolves.not.toThrow();
    });

    it('should handle storage errors', async () => {
      vi.mocked(Storage.get).mockRejectedValueOnce(new Error('Storage error'));

      await expect(auth.initialize()).rejects.toThrow('Failed to initialize auth');
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      await auth.initialize();

      const mockUser = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'mock-token', user: { id: 1, email: 'test@example.com' } }),
      } as Response);

      await expect(auth.register(mockUser)).resolves.not.toThrow();
    });

    it('should handle registration errors', async () => {
      await auth.initialize();

      const mockUser = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(auth.register(mockUser)).rejects.toThrow('Network error');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      await auth.initialize();

      const mockCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token: 'mock-token', user: { id: 1, email: 'test@example.com' } }),
      } as Response);

      await expect(auth.login(mockCredentials)).resolves.not.toThrow();
    });

    it('should handle login errors', async () => {
      await auth.initialize();

      const mockCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      await expect(auth.login(mockCredentials)).rejects.toThrow('Network error');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      await auth.initialize();
      await expect(auth.logout()).resolves.not.toThrow();
    });

    it('should handle logout errors', async () => {
      await auth.initialize();

      vi.mocked(Storage.remove).mockRejectedValueOnce(new Error('Storage error'));

      await expect(auth.logout()).rejects.toThrow('Storage error');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', async () => {
      await auth.initialize();
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('should return false when token is null', async () => {
      await auth.initialize();
      await auth.logout();
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when authenticated', async () => {
      await auth.initialize();
      expect(auth.getCurrentUser()).toEqual({ id: 1, email: 'test@example.com' });
    });

    it('should return null when not authenticated', async () => {
      await auth.initialize();
      await auth.logout();
      expect(auth.getCurrentUser()).toBeNull();
    });
  });
}); 