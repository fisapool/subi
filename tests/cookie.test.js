import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleCookieChange, handleCookieRemoval } from '../src/background.js';

// Mock chrome API
const mockChrome = {
  cookies: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  }
};

describe('Cookie Management', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup chrome API mock
    global.chrome = mockChrome;
  });

  describe('handleCookieChange', () => {
    it('should handle cookie addition successfully', async () => {
      const mockCookie = {
        name: 'test-cookie',
        value: 'test-value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expirationDate: Date.now() + 86400000
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ cookies: [] });
      });

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await handleCookieChange(mockCookie);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-cookie',
              value: 'test-value',
              domain: 'example.com'
            })
          ])
        })
      );
    });

    it('should handle cookie update successfully', async () => {
      const mockCookie = {
        name: 'test-cookie',
        value: 'new-value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expirationDate: Date.now() + 86400000
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          cookies: [{
            name: 'test-cookie',
            value: 'old-value',
            domain: 'example.com'
          }]
        });
      });

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await handleCookieChange(mockCookie);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-cookie',
              value: 'new-value',
              domain: 'example.com'
            })
          ])
        })
      );
    });
  });

  describe('handleCookieRemoval', () => {
    it('should handle cookie removal successfully', async () => {
      const mockCookie = {
        name: 'test-cookie',
        domain: 'example.com'
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          cookies: [{
            name: 'test-cookie',
            value: 'test-value',
            domain: 'example.com'
          }]
        });
      });

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await handleCookieRemoval(mockCookie);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: expect.not.arrayContaining([
            expect.objectContaining({
              name: 'test-cookie',
              domain: 'example.com'
            })
          ])
        })
      );
    });

    it('should handle non-existent cookie removal', async () => {
      const mockCookie = {
        name: 'nonexistent-cookie',
        domain: 'example.com'
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          cookies: [{
            name: 'test-cookie',
            value: 'test-value',
            domain: 'example.com'
          }]
        });
      });

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await handleCookieRemoval(mockCookie);

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: expect.arrayContaining([
            expect.objectContaining({
              name: 'test-cookie',
              domain: 'example.com'
            })
          ])
        })
      );
    });
  });
}); 