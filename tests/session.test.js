import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionCoordinator } from '../background-coordinator.js';

describe('Session Management', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new ExtensionCoordinator();
    vi.clearAllMocks();
  });

  describe('createNewSession', () => {
    it('should create a new session successfully', async () => {
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

    it('should handle session creation failure', async () => {
      const sessionData = {
        tabs: [
          { id: 1, url: 'https://example.com', title: 'Example' }
        ]
      };

      chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage error'));

      const result = await coordinator.handleSaveSession(sessionData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('restoreSession', () => {
    it('should restore a session successfully', async () => {
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

    it('should handle session restoration failure', async () => {
      const sessionId = '123456789';

      chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage error'));

      const result = await coordinator.handleLoadSession(sessionId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session successfully', async () => {
      const sessionId = '123456789';

      chrome.storage.local.remove.mockResolvedValueOnce();

      const result = await coordinator.handleDeleteSession(sessionId);
      
      expect(result.success).toBe(true);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(sessionId);
    });

    it('should handle session deletion failure', async () => {
      const sessionId = '123456789';

      chrome.storage.local.remove.mockRejectedValueOnce(new Error('Storage error'));

      const result = await coordinator.handleDeleteSession(sessionId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage error');
    });

    it('should handle user cancellation', async () => {
      const sessionId = '123456789';

      chrome.storage.local.remove.mockRejectedValueOnce(new Error('User cancelled'));

      const result = await coordinator.handleDeleteSession(sessionId);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
    });
  });
}); 