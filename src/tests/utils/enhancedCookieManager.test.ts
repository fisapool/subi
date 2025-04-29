import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveEnhancedCookies, restoreEnhancedCookies, clearEnhancedCookies } from '../../utils/enhancedCookieManager';

// Mock the chrome API
const mockChrome = {
  cookies: {
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  },
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn()
    }
  },
  runtime: {
    lastError: null
  }
};

// Mock the global chrome object
(global as any).chrome = mockChrome;

describe('Enhanced Cookie Manager', () => {
  const mockCookies = [
    {
      domain: 'example.com',
      name: 'session',
      value: 'abc123',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      expirationDate: 1735689600,
      storeId: 'store1'
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset Chrome API mock state
    mockChrome.runtime.lastError = null;

    // Setup default mock behaviors
    mockChrome.cookies.getAll.mockImplementation((_, callback) => callback(mockCookies));
    mockChrome.cookies.set.mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve({
        name: details.name,
        value: details.value,
        domain: details.domain,
        path: details.path
      });
    });
    mockChrome.cookies.remove.mockImplementation((details, callback) => {
      if (callback) callback();
      return Promise.resolve({
        name: details.name,
        url: details.url,
        storeId: details.storeId
      });
    });
    mockChrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });
    mockChrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ cookies: mockCookies });
    });
  });

  describe('saveEnhancedCookies', () => {
    it('should save cookies to local storage', async () => {
      const url = 'https://example.com';
      const result = await saveEnhancedCookies(url);

      expect(mockChrome.cookies.getAll).toHaveBeenCalledWith({ url }, expect.any(Function));
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ cookies: mockCookies }, expect.any(Function));
      expect(result).toEqual(mockCookies);
    });

    it('should handle chrome.cookies.getAll error', async () => {
      (mockChrome.runtime.lastError as any) = { message: 'Failed to get cookies' };
      mockChrome.cookies.getAll.mockImplementation((_, callback) => callback([]));

      await expect(saveEnhancedCookies('https://example.com')).rejects.toThrow('Failed to get cookies');
    });

    it('should handle chrome.storage.local.set error', async () => {
      mockChrome.runtime.lastError = null;
      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        (mockChrome.runtime.lastError as any) = { message: 'Failed to save cookies' };
        if (callback) callback();
      });

      await expect(saveEnhancedCookies('https://example.com')).rejects.toThrow('Failed to save cookies');
    });
  });

  describe('restoreEnhancedCookies', () => {
    it('should restore cookies from local storage', async () => {
      await restoreEnhancedCookies('example.com');

      expect(mockChrome.storage.local.get).toHaveBeenCalledWith('cookies', expect.any(Function));
      expect(mockChrome.cookies.set).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com/',
          name: 'session',
          value: 'abc123',
          domain: 'example.com'
        }),
        expect.any(Function)
      );
    });

    it('should handle chrome.storage.local.get error', async () => {
      (mockChrome.runtime.lastError as any) = { message: 'Failed to get stored cookies' };
      mockChrome.storage.local.get.mockImplementation((key, callback) => callback({}));

      await expect(restoreEnhancedCookies('example.com')).rejects.toThrow('Failed to get stored cookies');
    });

    it('should handle empty stored cookies', async () => {
      mockChrome.storage.local.get.mockImplementation((key, callback) => callback({ cookies: [] }));

      await restoreEnhancedCookies('example.com');
      expect(mockChrome.cookies.set).not.toHaveBeenCalled();
    });

    it('should handle chrome.cookies.set error', async () => {
      mockChrome.cookies.set.mockImplementation((details, callback) => {
        (mockChrome.runtime.lastError as any) = { message: 'Failed to set cookie' };
        if (callback) callback();
      });

      await expect(restoreEnhancedCookies('example.com')).rejects.toThrow('Failed to set cookie');
    });
  });

  describe('clearEnhancedCookies', () => {
    it('should clear all cookies for a domain', async () => {
      const url = 'https://example.com';
      await clearEnhancedCookies(url);

      expect(mockChrome.cookies.getAll).toHaveBeenCalledWith({ url }, expect.any(Function));
      expect(mockChrome.cookies.remove).toHaveBeenCalledWith(
        expect.objectContaining({
          url,
          name: 'session',
          storeId: 'store1'
        }),
        expect.any(Function)
      );
    });

    it('should handle chrome.cookies.getAll error', async () => {
      (mockChrome.runtime.lastError as any) = { message: 'Failed to get cookies' };
      mockChrome.cookies.getAll.mockImplementation((_, callback) => callback([]));

      await expect(clearEnhancedCookies('https://example.com')).rejects.toThrow('Failed to get cookies');
    });

    it('should handle empty cookie list', async () => {
      mockChrome.cookies.getAll.mockImplementation((_, callback) => callback([]));

      await clearEnhancedCookies('https://example.com');
      expect(mockChrome.cookies.remove).not.toHaveBeenCalled();
    });

    it('should handle chrome.cookies.remove error', async () => {
      mockChrome.cookies.remove.mockImplementation((details, callback) => {
        (mockChrome.runtime.lastError as any) = { message: 'Failed to remove cookie' };
        if (callback) callback();
      });

      await expect(clearEnhancedCookies('https://example.com')).rejects.toThrow('Failed to remove cookie');
    });
  });
}); 