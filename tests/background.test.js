import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'webextension-polyfill';
import { handleMessage, handleAlarm, handleInstall } from '../src/background';

describe('Background Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMessage', () => {
    it('should handle SAVE_SESSION message', async () => {
      const message = { type: 'SAVE_SESSION', data: { name: 'test-session' } };
      const sender = { tab: { id: 1 } };

      await handleMessage(message, sender);

      expect(browser.storage.local.set).toHaveBeenCalled();
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SESSION_SAVED',
        success: true
      });
    });

    it('should handle RESTORE_SESSION message', async () => {
      const message = { type: 'RESTORE_SESSION', data: { name: 'test-session' } };
      const sender = { tab: { id: 1 } };

      browser.storage.local.get.mockResolvedValueOnce({
        sessions: [{ name: 'test-session', tabs: [] }]
      });

      await handleMessage(message, sender);

      expect(browser.storage.local.get).toHaveBeenCalled();
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SESSION_RESTORED',
        success: true
      });
    });

    it('should handle DELETE_SESSION message', async () => {
      const message = { type: 'DELETE_SESSION', data: { name: 'test-session' } };
      const sender = { tab: { id: 1 } };

      await handleMessage(message, sender);

      expect(browser.storage.local.set).toHaveBeenCalled();
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'SESSION_DELETED',
        success: true
      });
    });
  });

  describe('handleAlarm', () => {
    it('should handle auto-save alarm', async () => {
      const alarm = { name: 'auto-save' };
      
      browser.storage.sync.get.mockResolvedValueOnce({
        autoSave: true,
        autoSaveInterval: 30
      });

      await handleAlarm(alarm);

      expect(browser.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('handleInstall', () => {
    it('should set up initial settings on install', async () => {
      await handleInstall();

      expect(browser.storage.sync.set).toHaveBeenCalledWith({
        autoSave: false,
        autoSaveInterval: 30
      });
    });
  });
}); 