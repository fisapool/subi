import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCookieConsent, setCookieConsent, getCookieSettings, setCookieSettings, defaultSettings } from '../../utils.js';

// Mock chrome.storage.local
const mockStorage = new Map<string, any>();
const mockChrome = {
  storage: {
    local: {
      get: vi.fn((key: string) => {
        return Promise.resolve({ [key]: mockStorage.get(key) });
      }),
      set: vi.fn((obj: Record<string, any>) => {
        Object.entries(obj).forEach(([key, value]) => {
          mockStorage.set(key, value);
        });
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    lastError: null as { message: string } | null,
  },
};

(global as any).chrome = mockChrome;

describe('Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
    mockChrome.runtime.lastError = null;
  });

  describe('Cookie Consent', () => {
    it('should get cookie consent value', async () => {
      const mockConsent = true;
      mockStorage.set('cookieConsent', mockConsent);

      const result = await getCookieConsent();
      expect(result).toBe(mockConsent);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith('cookieConsent');
    });

    it('should set cookie consent value', async () => {
      const consentValue = true;

      await setCookieConsent(consentValue);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ cookieConsent: consentValue });
      expect(mockStorage.get('cookieConsent')).toBe(consentValue);
    });

    it('should handle storage errors when getting consent', async () => {
      mockChrome.storage.local.get.mockImplementationOnce(() => {
        mockChrome.runtime.lastError = { message: 'Storage error' };
        return Promise.reject(new Error('Storage error'));
      });

      await expect(getCookieConsent()).rejects.toThrow('Storage error');
    });

    it('should return false when consent is not set', async () => {
      const result = await getCookieConsent();
      expect(result).toBe(false);
    });
  });

  describe('Cookie Settings', () => {
    it('should get cookie settings', async () => {
      const mockSettings = {
        essential: true,
        analytics: false,
        marketing: true,
      };
      mockStorage.set('cookieSettings', mockSettings);

      const result = await getCookieSettings();
      expect(result).toEqual(mockSettings);
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith('cookieSettings');
    });

    it('should set cookie settings', async () => {
      const settings = {
        essential: true,
        analytics: true,
        marketing: false,
      };

      await setCookieSettings(settings);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({ cookieSettings: settings });
      expect(mockStorage.get('cookieSettings')).toEqual(settings);
    });

    it('should handle storage errors when getting settings', async () => {
      mockChrome.storage.local.get.mockImplementationOnce(() => {
        mockChrome.runtime.lastError = { message: 'Storage error' };
        return Promise.reject(new Error('Storage error'));
      });

      await expect(getCookieSettings()).rejects.toThrow('Storage error');
    });

    it('should return default settings when not set', async () => {
      const result = await getCookieSettings();
      expect(result).toEqual(defaultSettings);
    });
  });
}); 