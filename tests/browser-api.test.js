import { describe, it, expect, beforeEach, vi } from 'vitest';
import mockBrowser from './__mocks__/webextension-polyfill';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Browser API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Storage API', () => {
    it('should mock storage.local methods', async () => {
      const testData = { key: 'value' };
      
      mockBrowser.storage.local.get.mockResolvedValue(testData);
      
      const result = await mockBrowser.storage.local.get('key');
      expect(result).toEqual(testData);
      expect(mockBrowser.storage.local.get).toHaveBeenCalledWith('key');
    });

    it('should mock storage.sync methods', async () => {
      const testData = { setting: true };
      
      mockBrowser.storage.sync.set.mockResolvedValue(undefined);
      
      await mockBrowser.storage.sync.set(testData);
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(testData);
    });
  });

  describe('Runtime API', () => {
    it('should mock runtime.sendMessage', async () => {
      const message = { type: 'TEST' };
      const response = { success: true };
      
      mockBrowser.runtime.sendMessage.mockResolvedValue(response);
      
      const result = await mockBrowser.runtime.sendMessage(message);
      expect(result).toEqual(response);
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should mock runtime.onMessage listeners', () => {
      const listener = vi.fn();
      
      mockBrowser.runtime.onMessage.addListener(listener);
      expect(mockBrowser.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
      
      mockBrowser.runtime.onMessage.removeListener(listener);
      expect(mockBrowser.runtime.onMessage.removeListener).toHaveBeenCalledWith(listener);
    });
  });

  describe('Tabs API', () => {
    it('should mock tabs.query', async () => {
      const mockTab = {
        id: 1,
        url: 'https://example.com',
        index: 0,
        highlighted: false,
        active: true,
        pinned: false,
        incognito: false,
        windowId: 1,
        title: 'Example',
        lastAccessed: Date.now()
      };
      
      mockBrowser.tabs.query.mockResolvedValue([mockTab]);
      
      const result = await mockBrowser.tabs.query({ active: true });
      expect(result).toEqual([mockTab]);
      expect(mockBrowser.tabs.query).toHaveBeenCalledWith({ active: true });
    });

    it('should mock tabs.create', async () => {
      const mockTab = {
        id: 1,
        url: 'https://example.com',
        index: 0,
        highlighted: false,
        active: true,
        pinned: false,
        incognito: false,
        windowId: 1
      };

      mockBrowser.tabs.create.mockResolvedValue(mockTab);

      const result = await mockBrowser.tabs.create({ url: 'https://example.com' });
      expect(result).toEqual(mockTab);
      expect(mockBrowser.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com' });
    });
  });

  describe('Cookies API', () => {
    it('should mock cookies.getAll', async () => {
      const mockCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        hostOnly: true,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        session: true,
        expirationDate: Date.now() / 1000,
        storeId: '0',
        firstPartyDomain: ''
      };
      
      mockBrowser.cookies.getAll.mockResolvedValue([mockCookie]);
      
      const result = await mockBrowser.cookies.getAll({ domain: 'example.com' });
      expect(result).toEqual([mockCookie]);
      expect(mockBrowser.cookies.getAll).toHaveBeenCalledWith({ domain: 'example.com' });
    });

    it('should mock cookies.set', async () => {
      const mockCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        hostOnly: true,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        session: true,
        expirationDate: Date.now() / 1000,
        storeId: '0',
        firstPartyDomain: ''
      };

      mockBrowser.cookies.set.mockResolvedValue(mockCookie);

      const result = await mockBrowser.cookies.set({
        url: 'https://example.com',
        name: 'test',
        value: 'value'
      });
      expect(result).toEqual(mockCookie);
      expect(mockBrowser.cookies.set).toHaveBeenCalledWith({
        url: 'https://example.com',
        name: 'test',
        value: 'value'
      });
    });
  });
}); 