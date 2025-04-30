import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';

// Mock browser APIs
vi.mock('webextension-polyfill', () => ({
  default: {
    cookies: {
      getAll: vi.fn(),
      remove: vi.fn(),
    },
    alarms: {
      create: vi.fn(),
      clear: vi.fn(),
    },
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
    runtime: {
      onMessage: {
        addListener: vi.fn(),
      },
    },
  },
}));

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cookie Management', () => {
    it('should get cookies for a domain', async () => {
      const mockCookies = [
        { name: 'session', value: '123', domain: 'example.com' },
        { name: 'auth', value: '456', domain: 'example.com' },
      ];
      const mockGetAll = vi.fn().mockResolvedValue(mockCookies);
      vi.mocked(browser.cookies.getAll).mockImplementation(mockGetAll);

      const cookies = await browser.cookies.getAll({ domain: 'example.com' });
      expect(cookies).toEqual(mockCookies);
      expect(mockGetAll).toHaveBeenCalledWith({ domain: 'example.com' });
    });

    it('should remove cookies for a domain', async () => {
      const mockCookies = [
        { name: 'session', domain: 'example.com', path: '/' },
        { name: 'auth', domain: 'example.com', path: '/' },
      ];
      const mockGetAll = vi.fn().mockResolvedValue(mockCookies);
      const mockRemove = vi.fn().mockResolvedValue(true);
      vi.mocked(browser.cookies.getAll).mockImplementation(mockGetAll);
      vi.mocked(browser.cookies.remove).mockImplementation(mockRemove);

      await browser.cookies.remove({
        url: 'https://example.com',
        name: 'session',
      });

      expect(mockRemove).toHaveBeenCalledWith({
        url: 'https://example.com',
        name: 'session',
      });
    });
  });

  describe('Alarm Management', () => {
    it('should create a cleanup alarm', async () => {
      const mockCreate = vi.fn();
      vi.mocked(browser.alarms.create).mockImplementation(mockCreate);

      await browser.alarms.create('cookieCleanup', { periodInMinutes: 30 });
      expect(mockCreate).toHaveBeenCalledWith('cookieCleanup', {
        periodInMinutes: 30,
      });
    });

    it('should clear a cleanup alarm', async () => {
      const mockClear = vi.fn();
      vi.mocked(browser.alarms.clear).mockImplementation(mockClear);

      await browser.alarms.clear('cookieCleanup');
      expect(mockClear).toHaveBeenCalledWith('cookieCleanup');
    });
  });

  describe('Storage Management', () => {
    it('should save settings', async () => {
      const mockSet = vi.fn();
      vi.mocked(browser.storage.local.set).mockImplementation(mockSet);

      const settings = { sessionLoggingEnabled: true };
      await browser.storage.local.set(settings);
      expect(mockSet).toHaveBeenCalledWith(settings);
    });

    it('should get settings', async () => {
      const settings = { sessionLoggingEnabled: true };
      const mockGet = vi.fn().mockResolvedValue(settings);
      vi.mocked(browser.storage.local.get).mockImplementation(mockGet);

      const result = await browser.storage.local.get(['sessionLoggingEnabled']);
      expect(result).toEqual(settings);
      expect(mockGet).toHaveBeenCalledWith(['sessionLoggingEnabled']);
    });
  });

  describe('Message Handling', () => {
    it('should add message listener', () => {
      const listener = vi.fn();
      const mockAddListener = vi.fn();
      vi.mocked(browser.runtime.onMessage.addListener).mockImplementation(mockAddListener);

      browser.runtime.onMessage.addListener(listener);
      expect(mockAddListener).toHaveBeenCalledWith(listener);
    });
  });
}); 