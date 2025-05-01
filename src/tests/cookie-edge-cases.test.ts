import { describe, it, expect, vi, beforeEach } from 'vitest';
import CookieUtils, { exportCookies, importCookies } from '../cookie-utils.js';

// Define interfaces for cookie operations
interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  expirationDate?: number;
}

interface ExportResult {
  cookies: Cookie[];
  version: string;
  timestamp: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
}

describe('Cookie Edge Cases', () => {
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

  describe('Empty Cookie List', () => {
    it('should handle empty cookie list when getting all cookies', async () => {
      mockBrowser.cookies.getAll.mockResolvedValue([]);
      const cookies = await CookieUtils.getAllCookies('example.com');
      expect(cookies).toEqual([]);
    });

    it('should handle empty cookie list when exporting', async () => {
      mockChrome.cookies.getAll.mockResolvedValue([]);
      const result = await exportCookies() as ExportResult;
      expect(result.cookies).toEqual([]);
      expect(result.version).toBe('1.0');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Invalid Cookie Data', () => {
    it('should handle cookies with missing required fields', async () => {
      const invalidCookies = [
        { name: 'test' }, // missing value
        { value: 'test' }, // missing name
        { name: 'test', value: 'test' } // missing domain
      ];

      mockChrome.cookies.set
        .mockRejectedValueOnce(new Error('Missing value'))
        .mockRejectedValueOnce(new Error('Missing name'))
        .mockRejectedValueOnce(new Error('Missing domain'));

      const result = await importCookies({ cookies: invalidCookies }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(3);
    });

    it('should handle malformed cookie data', async () => {
      const malformedCookies = [
        { name: 'test', value: 'test', domain: 'example.com', secure: 'not-a-boolean' },
        { name: 'test', value: 'test', domain: 'example.com', expirationDate: 'not-a-number' }
      ];

      mockChrome.cookies.set.mockRejectedValue(new Error('Invalid cookie data'));

      const result = await importCookies({ cookies: malformedCookies }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  describe('Duplicate Cookies', () => {
    it('should handle duplicate cookies with same name and domain', async () => {
      const duplicateCookies = [
        { name: 'test', value: 'value1', domain: 'example.com' },
        { name: 'test', value: 'value2', domain: 'example.com' }
      ];

      mockChrome.cookies.set
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Cookie already exists'));

      const result = await importCookies({ cookies: duplicateCookies }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('Cookie Expiration', () => {
    it('should handle cookies with past expiration dates', async () => {
      const expiredCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        expirationDate: Date.now() - 1000 * 60 * 60 // 1 hour in the past
      };

      mockChrome.cookies.set.mockRejectedValue(new Error('Cookie has expired'));

      const result = await importCookies({ cookies: [expiredCookie] }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should handle cookies with invalid expiration dates', async () => {
      const invalidExpirationCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        expirationDate: 'invalid-date'
      };

      mockChrome.cookies.set.mockRejectedValue(new Error('Invalid expiration date'));

      const result = await importCookies({ cookies: [invalidExpirationCookie] }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('Secure Cookies', () => {
    it('should handle secure cookies over HTTP', async () => {
      const secureCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        secure: true
      };

      mockChrome.cookies.set.mockRejectedValue(new Error('Secure cookie can only be set over HTTPS'));

      const result = await importCookies({ cookies: [secureCookie] }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('Cookie Size Limits', () => {
    it('should handle cookies exceeding size limits', async () => {
      // Create a cookie value that exceeds typical 4096 byte limit
      const largeValue = 'a'.repeat(5000);
      const largeCookie = {
        name: 'test',
        value: largeValue,
        domain: 'example.com'
      };

      mockChrome.cookies.set.mockRejectedValue(new Error('Cookie size exceeds limit'));

      const result = await importCookies({ cookies: [largeCookie] }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting when setting multiple cookies', async () => {
      const cookies = Array(100).fill(null).map((_, i) => ({
        name: `test${i}`,
        value: 'value',
        domain: 'example.com'
      }));

      // Simulate rate limiting after 50 cookies
      mockChrome.cookies.set.mockImplementation((cookie: Cookie) => {
        if (cookie.name.startsWith('test5')) {
          throw new Error('Rate limit exceeded');
        }
        return Promise.resolve(null);
      });

      const result = await importCookies({ cookies }) as ImportResult;
      expect(result.success).toBe(true);
      expect(result.imported).toBeLessThan(100);
      expect(result.failed).toBeGreaterThan(0);
    });
  });

  describe('Chrome API Errors', () => {
    it('should handle Chrome API errors gracefully', async () => {
      mockChrome.cookies.getAll.mockRejectedValue(new Error('Chrome API error'));
      
      await expect(exportCookies()).rejects.toThrow('Chrome API error');
    });

    it('should handle Chrome API timeouts', async () => {
      mockChrome.cookies.getAll.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 1000);
        });
      });

      await expect(exportCookies()).rejects.toThrow('Timeout');
    });
  });
}); 