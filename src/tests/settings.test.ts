import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import type { Settings } from '../types';
import mockBrowser from './__mocks__/webextension-polyfill';
import { loadSettings, saveSettings, exportData, importData, clearData } from '../settings.js';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

describe('Settings', () => {
  let statusElement: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = `
      <input type="checkbox" id="autoSave" />
      <input type="number" id="autoSaveInterval" value="30" />
      <input type="checkbox" id="encryptData" />
      <button id="exportData">Export</button>
      <button id="importData">Import</button>
      <button id="clearData">Clear</button>
      <div id="status"></div>
    `;

    statusElement = document.getElementById('status') as HTMLElement;

    // Mock storage.local.get response
    vi.mocked(mockBrowser.storage.local.get).mockResolvedValue({
      settings: {
        autoSave: false,
        autoSaveInterval: 30,
        encryptData: true,
      },
    });

    // Mock other browser APIs
    vi.mocked(mockBrowser.storage.local.set).mockResolvedValue(undefined);
    vi.mocked(mockBrowser.runtime.sendMessage).mockResolvedValue({ success: true });

    // Mock window.URL
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Settings Management', () => {
    it('should load default settings when storage is empty', async () => {
      vi.mocked(mockBrowser.storage.local.get).mockResolvedValueOnce({});

      await loadSettings();

      const autoSaveCheckbox = document.getElementById('autoSave') as HTMLInputElement;
      const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
      const encryptDataCheckbox = document.getElementById('encryptData') as HTMLInputElement;

      expect(autoSaveCheckbox.checked).toBe(false);
      expect(autoSaveIntervalInput.value).toBe('30');
      expect(encryptDataCheckbox.checked).toBe(true);
    });

    it('should save settings and update auto-save alarm', async () => {
      const settings: Settings = {
        autoSave: true,
        autoSaveInterval: 45,
        encryptData: false,
      };

      const autoSaveCheckbox = document.getElementById('autoSave') as HTMLInputElement;
      const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
      const encryptDataCheckbox = document.getElementById('encryptData') as HTMLInputElement;

      autoSaveCheckbox.checked = settings.autoSave;
      autoSaveIntervalInput.value = settings.autoSaveInterval.toString();
      encryptDataCheckbox.checked = settings.encryptData;

      await saveSettings(settings);

      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({ settings });
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'UPDATE_AUTO_SAVE',
        interval: settings.autoSaveInterval,
      });
    });
  });

  describe('Data Export/Import', () => {
    it('should handle export errors', async () => {
      vi.mocked(mockBrowser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Export failed'
      });

      const blob = await exportData();
      expect(blob).toBeInstanceOf(Blob);
    });

    it('should handle invalid data during import', async () => {
      const mockFile = new File(['invalid json'], 'test.json', { type: 'application/json' });
      const blob = new Blob([JSON.stringify(mockFile)], { type: 'application/json' });
      
      await expect(importData(blob)).rejects.toThrow('Invalid data format');
    });
  });

  describe('Data Management', () => {
    it('should handle clear data with confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      process.env.NODE_ENV = 'test';
      
      await clearData();

      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CLEAR_ALL_DATA'
      });
      expect(statusElement.textContent).toContain('All data cleared successfully');
    });

    it('should not clear data without confirmation', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      process.env.NODE_ENV = 'test';
      
      await clearData();

      expect(mockBrowser.runtime.sendMessage).not.toHaveBeenCalled();
      expect(statusElement.textContent).toContain('Data clearing cancelled');
    });
  });
});
