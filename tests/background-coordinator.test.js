import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';

describe('ExtensionCoordinator', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new ExtensionCoordinator();
    vi.clearAllMocks();
  });

  describe('Session Management', () => {
    it('should save session', async () => {
      const sessionData = {
        tabs: [
          { id: 1, url: 'https://example.com', title: 'Example' }
        ]
      };

      chrome.storage.local.set.mockResolvedValueOnce();

      const result = await coordinator.handleSaveSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    it('should reject invalid session data', async () => {
      const invalidData = { tabs: 'not an array' };
      
      const result = await coordinator.handleSaveSession(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session data: missing or invalid tabs array');
    });

    it('should load session', async () => {
      const sessionId = '123456789';
      const sessionData = {
        tabs: [
          { id: 1, url: 'https://example.com', title: 'Example' }
        ]
      };

      chrome.storage.local.get.mockResolvedValueOnce({ [sessionId]: sessionData });
      chrome.tabs.create.mockResolvedValueOnce({});

      const result = await coordinator.handleLoadSession(sessionId);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(sessionData);
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    it('should handle missing session', async () => {
      const sessionId = '123456789';
      
      chrome.storage.local.get.mockResolvedValueOnce({});

      const result = await coordinator.handleLoadSession(sessionId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });

  describe('Cookie Management', () => {
    it('should export cookies', async () => {
      const domain = 'example.com';
      const cookies = [
        { name: 'test', value: 'value', domain: 'example.com' }
      ];

      chrome.cookies.getAll.mockResolvedValueOnce(cookies);

      const result = await coordinator.handleExportCookies(domain);
      
      expect(result.success).toBe(true);
      expect(result.cookies).toEqual(cookies);
    });

    it('should handle invalid domain for cookie export', async () => {
      const result = await coordinator.handleExportCookies('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid domain name');
    });

    it('should import cookies', async () => {
      const cookies = [
        { name: 'test', value: 'value', domain: 'example.com' }
      ];

      chrome.cookies.set.mockResolvedValueOnce({});

      const result = await coordinator.handleImportCookies(cookies);
      
      expect(result.success).toBe(true);
      expect(chrome.cookies.set).toHaveBeenCalledTimes(cookies.length);
    });

    it('should handle invalid cookies during import', async () => {
      const invalidCookies = [
        { value: 'value' } // Missing name and domain
      ];

      const result = await coordinator.handleImportCookies(invalidCookies);
      
      expect(result.success).toBe(false);
      expect(result.warnings).toBeDefined();
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('Message Handling', () => {
    it('should handle invalid messages', async () => {
      const invalidMessage = null;
      
      const result = await new Promise(resolve => {
        coordinator.handleMessage(invalidMessage, {}, resolve);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid message: must be an object');
    });

    it('should handle missing action', async () => {
      const message = {};
      
      const result = await new Promise(resolve => {
        coordinator.handleMessage(message, {}, resolve);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid message: missing or invalid action');
    });

    it('should handle unknown actions', async () => {
      const message = { action: 'UNKNOWN_ACTION' };
      
      const result = await new Promise(resolve => {
        coordinator.handleMessage(message, {}, resolve);
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action');
    });
  });
});