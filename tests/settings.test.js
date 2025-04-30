import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSettings, saveSettings, exportData, importData, clearData } from '../src/settings.js';

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn()
  }
};

// Mock DOM elements
const mockDOM = {
  statusElement: {
    textContent: '',
    className: ''
  }
};

describe('Settings Management', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup DOM mocks
    document.body.innerHTML = `
      <div id="status" class="status"></div>
      <div id="auto-save-enabled"></div>
      <div id="auto-save-interval"></div>
      <div id="export-button"></div>
      <div id="import-button"></div>
      <div id="clear-data-button"></div>
    `;
    
    // Setup chrome API mock
    global.chrome = mockChrome;
  });

  describe('loadSettings', () => {
    it('should load settings successfully', async () => {
      const mockSettings = {
        autoSaveEnabled: true,
        autoSaveInterval: 30
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ settings: mockSettings });
      });

      await loadSettings();

      expect(document.getElementById('auto-save-enabled').checked).toBe(true);
      expect(document.getElementById('auto-save-interval').value).toBe('30');
      expect(document.getElementById('status').textContent).toBe('Settings loaded successfully');
    });

    it('should handle missing settings', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      await loadSettings();

      expect(document.getElementById('auto-save-enabled').checked).toBe(false);
      expect(document.getElementById('auto-save-interval').value).toBe('15');
      expect(document.getElementById('status').textContent).toBe('Settings loaded successfully');
    });
  });

  describe('saveSettings', () => {
    it('should save settings successfully', async () => {
      document.getElementById('auto-save-enabled').checked = true;
      document.getElementById('auto-save-interval').value = '30';

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await saveSettings();

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            autoSaveEnabled: true,
            autoSaveInterval: 30
          })
        }),
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('Settings saved successfully');
    });

    it('should handle invalid interval value', async () => {
      document.getElementById('auto-save-interval').value = 'invalid';

      await saveSettings();

      expect(document.getElementById('status').textContent).toBe('Error: Invalid auto-save interval');
    });
  });

  describe('exportData', () => {
    it('should export data successfully', async () => {
      const mockSessions = [
        { name: 'Session 1', tabs: [] },
        { name: 'Session 2', tabs: [] }
      ];

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SESSIONS') {
          callback({ success: true, sessions: mockSessions });
        }
      });

      await exportData();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'GET_SESSIONS' },
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('Data exported successfully');
    });

    it('should handle export failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Export failed' });
      });

      await exportData();

      expect(document.getElementById('status').textContent).toBe('Error: Export failed');
    });
  });

  describe('importData', () => {
    it('should import data successfully', async () => {
      const mockToken = 'test-token';
      const mockData = [
        { name: 'Session 1', tabs: [] },
        { name: 'Session 2', tabs: [] }
      ];

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_CSRF_TOKEN') {
          callback({ success: true, token: mockToken });
        } else if (message.type === 'IMPORT_SESSIONS') {
          callback({ success: true });
        }
      });

      // Mock FileReader
      const mockFile = new Blob([JSON.stringify(mockData)], { type: 'application/json' });
      const mockEvent = {
        target: {
          files: [mockFile]
        }
      };

      await importData();
      const fileInput = document.querySelector('input[type="file"]');
      fileInput.onchange(mockEvent);

      expect(document.getElementById('status').textContent).toBe('Data imported successfully (2 sessions)');
    });

    it('should handle import failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Import failed' });
      });

      await importData();

      expect(document.getElementById('status').textContent).toBe('Error: Import failed');
    });
  });

  describe('clearData', () => {
    it('should clear data successfully', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true });
      });

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      await clearData();

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { type: 'CLEAR_ALL_DATA' },
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('All data cleared successfully');
    });

    it('should handle clear data failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Clear failed' });
      });

      window.confirm = vi.fn(() => true);

      await clearData();

      expect(document.getElementById('status').textContent).toBe('Error: Clear failed');
    });

    it('should handle user cancellation', async () => {
      window.confirm = vi.fn(() => false);

      await clearData();

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(document.getElementById('status').textContent).toBe('Data clearing cancelled');
    });
  });
}); 