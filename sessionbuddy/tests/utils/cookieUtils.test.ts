import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertChromeCookie,
  convertToChromeCookie,
  getCookiesForDomain,
  setCookie,
  removeCookie,
  isValidCookie
} from '@/utils/cookieUtils';
import type { Cookie } from '@/types/cookie';

// Mock chrome.cookies API
const mockChromeAPI = {
  cookies: {
    getAll: vi.fn().mockImplementation(async () => []),
    set: vi.fn().mockImplementation(async () => undefined),
    remove: vi.fn().mockImplementation(async () => undefined)
  }
};

// Set up global chrome object
global.chrome = mockChromeAPI as any;

describe('Cookie Utils', () => {
  const mockChromeCookie: chrome.cookies.Cookie = {
    name: 'test',
    value: 'value',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    expirationDate: 1234567890
  };

  const mockCookie: Cookie = {
    name: 'test',
    value: 'value',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    expirationDate: 1234567890
  };

  // Spy on console.error
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('convertChromeCookie', () => {
    it('should convert Chrome cookie to internal format', () => {
      const result = convertChromeCookie(mockChromeCookie);
      expect(result).toEqual(mockCookie);
    });
  });

  describe('convertToChromeCookie', () => {
    it('should convert internal cookie to Chrome format', () => {
      const result = convertToChromeCookie(mockCookie);
      expect(result).toEqual({
        name: mockCookie.name,
        value: mockCookie.value,
        domain: mockCookie.domain,
        path: mockCookie.path,
        secure: mockCookie.secure,
        httpOnly: mockCookie.httpOnly,
        sameSite: mockCookie.sameSite,
        expirationDate: mockCookie.expirationDate
      });
    });
  });

  describe('getCookiesForDomain', () => {
    it('should get cookies for a domain', async () => {
      vi.mocked(chrome.cookies.getAll).mockResolvedValue([mockChromeCookie]);

      const result = await getCookiesForDomain('example.com');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCookie);
    });

    it('should handle errors', async () => {
      vi.mocked(chrome.cookies.getAll).mockRejectedValue(new Error('Test error'));

      await expect(getCookiesForDomain('example.com')).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('Error getting cookies for domain:', expect.any(Error));
    });
  });

  describe('setCookie', () => {
    it('should set a cookie', async () => {
      vi.mocked(chrome.cookies.set).mockResolvedValue(undefined);

      await expect(setCookie(mockCookie)).resolves.not.toThrow();
      expect(chrome.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
        name: mockCookie.name,
        value: mockCookie.value
      }));
    });

    it('should handle errors', async () => {
      vi.mocked(chrome.cookies.set).mockRejectedValue(new Error('Test error'));

      await expect(setCookie(mockCookie)).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('Error setting cookie:', expect.any(Error));
    });
  });

  describe('removeCookie', () => {
    it('should remove a cookie', async () => {
      vi.mocked(chrome.cookies.remove).mockResolvedValue(undefined);

      await expect(removeCookie(mockCookie)).resolves.not.toThrow();
      expect(chrome.cookies.remove).toHaveBeenCalledWith({
        url: `https://${mockCookie.domain}${mockCookie.path}`,
        name: mockCookie.name
      });
    });

    it('should handle errors', async () => {
      vi.mocked(chrome.cookies.remove).mockRejectedValue(new Error('Test error'));

      await expect(removeCookie(mockCookie)).rejects.toThrow('Test error');
      expect(console.error).toHaveBeenCalledWith('Error removing cookie:', expect.any(Error));
    });
  });

  describe('isValidCookie', () => {
    it('should validate a valid cookie', () => {
      expect(isValidCookie(mockCookie)).toBe(true);
    });

    it('should reject an invalid cookie', () => {
      const invalidCookie = { ...mockCookie, sameSite: 'invalid' as any };
      expect(isValidCookie(invalidCookie)).toBe(false);
    });
  });
}); 