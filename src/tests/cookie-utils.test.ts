import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookieUtils, { exportCookies, importCookies } from '../cookie-utils.js';

// Define types for cookie operations
interface CookieParams {
  domain?: string;
  [key: string]: any;
}

type CookieCallback = (result: any) => void;

describe('Cookie Utils', () => {
  let mockBrowser: any;
  let mockChrome: any;

  beforeEach(() => {
    // Mock browser API
    mockBrowser = {
      cookies: {
        getAll: vi.fn(),
        set: vi.fn(),
        remove: vi.fn()
      }
    };
    global.browser = mockBrowser;

    // Mock chrome API
    mockChrome = {
      cookies: {
        getAll: vi.fn(),
        set: vi.fn(),
        remove: vi.fn()
      }
    };
    global.chrome = mockChrome;
  });

  describe('Safe Operation', () => {
    it('should handle successful operations', async () => {
      const operation = async () => 'success';
      const result = await CookieUtils.safeOperation(operation);
      expect(result).toBe('success');
    });

    it('should handle specific error and use chrome API as fallback', async () => {
      const operation = {
        name: 'cookies',
        arguments: [{ domain: 'example.com' }],
        async call() {
          throw new Error('Expected at most 1 argument');
        }
      };

      mockChrome.cookies.getAll.mockImplementation((params: CookieParams, callback: CookieCallback) => {
        callback('fallback success');
      });

      const result = await CookieUtils.safeOperation(operation);
      expect(result).toBe('fallback success');
    });

    it('should throw other errors', async () => {
      const operation = async () => {
        throw new Error('Other error');
      };

      await expect(CookieUtils.safeOperation(operation)).rejects.toThrow('Other error');
    });
  });

  describe('Cookie URL Creation', () => {
    it('should create HTTP URL for non-secure cookies', () => {
      const cookie = {
        secure: false,
        domain: 'example.com',
        path: '/path'
      };

      const url = CookieUtils.createCookieUrl(cookie);
      expect(url).toBe('http://example.com/path');
    });

    it('should create HTTPS URL for secure cookies', () => {
      const cookie = {
        secure: true,
        domain: 'example.com',
        path: '/path'
      };

      const url = CookieUtils.createCookieUrl(cookie);
      expect(url).toBe('https://example.com/path');
    });
  });

  describe('Cookie Operations', () => {
    it('should get all cookies for a domain', async () => {
      const mockCookies = [{ name: 'test', value: 'value' }];
      mockBrowser.cookies.getAll.mockResolvedValue(mockCookies);

      const cookies = await CookieUtils.getAllCookies('example.com');
      expect(cookies).toEqual(mockCookies);
      expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
    });

    it('should set a cookie', async () => {
      const cookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        expirationDate: 1234567890
      };

      mockBrowser.cookies.set.mockResolvedValue(cookie);

      const result = await CookieUtils.setCookie(cookie);
      expect(result).toEqual(cookie);
      expect(mockBrowser.cookies.set).toHaveBeenCalledWith({
        url: 'https://example.com/',
        ...cookie
      });
    });

    it('should remove a cookie', async () => {
      const cookie = {
        name: 'test',
        domain: 'example.com',
        path: '/',
        secure: false
      };

      mockBrowser.cookies.remove.mockResolvedValue(null);

      await CookieUtils.removeCookie(cookie);
      expect(mockBrowser.cookies.remove).toHaveBeenCalledWith({
        url: 'http://example.com/',
        name: 'test'
      });
    });
  });

  describe('Cookie Export/Import', () => {
    it('should export cookies', async () => {
      const mockCookies = [{ name: 'test', value: 'value' }];
      mockChrome.cookies.getAll.mockResolvedValue(mockCookies);

      const result = await exportCookies();
      expect(result).toEqual({
        cookies: mockCookies,
        version: '1.0',
        timestamp: expect.any(Number)
      });
    });

    it('should handle export errors', async () => {
      mockChrome.cookies.getAll.mockRejectedValue(new Error('Export failed'));

      await expect(exportCookies()).rejects.toThrow('Export failed');
    });

    it('should import cookies', async () => {
      const importData = {
        cookies: [
          {
            name: 'test',
            value: 'value',
            domain: 'example.com',
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'strict',
            expirationDate: 1234567890
          }
        ],
        version: '1.0'
      };

      mockChrome.cookies.set.mockResolvedValue(null);

      const result = await importCookies(importData);
      expect(result).toEqual({
        success: true,
        imported: 1,
        failed: 0
      });
    });

    it('should handle invalid import data', async () => {
      const invalidData = { cookies: 'not an array' };

      await expect(importCookies(invalidData)).rejects.toThrow('Invalid import data format');
    });

    it('should handle unsupported version', async () => {
      const invalidVersion = {
        cookies: [],
        version: '2.0'
      };

      await expect(importCookies(invalidVersion)).rejects.toThrow('Unsupported version');
    });

    it('should handle import failures', async () => {
      const importData = {
        cookies: [
          { name: 'test1' },
          { name: 'test2' }
        ],
        version: '1.0'
      };

      mockChrome.cookies.set
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Import failed'));

      const result = await importCookies(importData);
      expect(result).toEqual({
        success: true,
        imported: 1,
        failed: 1
      });
    });
  });
}); 