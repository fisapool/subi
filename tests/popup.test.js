import { jest } from '@jest/globals';

// Mock the browser APIs
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(),
    onMessage: {
      addListener: jest.fn().mockReturnValue({})
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: jest.fn().mockResolvedValue()
  }
};

// Mock the module
const mockModule = {
  default: mockBrowser,
  __esModule: true,
};

jest.unstable_mockModule('webextension-polyfill', () => mockModule);

describe('Popup Script', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = `
      <div id="cookie-list"></div>
      <div id="settings-panel"></div>
      <div id="error-message"></div>
      <div id="popup-feedback"></div>
      <div id="auth-section"></div>
      <div id="user-section">
        <div class="user-name"></div>
      </div>
      <div id="protectSessionCheckbox"></div>
      <div id="importCookiesButton"></div>
      <div id="exportCookiesButton"></div>
      <div id="testProtectionBtn"></div>
    `;
    // Reset browser mock to ensure clean state
    Object.keys(mockBrowser).forEach(key => {
      if (typeof mockBrowser[key] === 'object') {
        Object.keys(mockBrowser[key]).forEach(subKey => {
          if (typeof mockBrowser[key][subKey] === 'object') {
            Object.keys(mockBrowser[key][subKey]).forEach(method => {
              if (typeof mockBrowser[key][subKey][method] === 'function') {
                mockBrowser[key][subKey][method].mockClear();
              }
            });
          }
        });
      }
    });
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    document.body.innerHTML = '';
    jest.resetModules();
  });

  describe('Initialization', () => {
    it('should load saved settings on startup', async () => {
      const mockSettings = {
        autoDelete: true,
        whitelist: ['example.com'],
        theme: 'dark'
      };
      mockBrowser.storage.sync.get.mockResolvedValue(mockSettings);
      
      // Import and initialize popup
      const { initializePopup } = await import('../src/popup.js');
      await initializePopup();
      
      expect(mockBrowser.storage.sync.get).toHaveBeenCalled();
    });

    it('should handle missing settings gracefully', async () => {
      mockBrowser.storage.sync.get.mockResolvedValue({});
      
      const { initializePopup } = await import('../src/popup.js');
      await initializePopup();
      
      // Verify default settings are applied
      expect(document.getElementById('settings-panel')).toBeTruthy();
    });
  });

  describe('Cookie Management', () => {
    it('should display cookie list when loaded', async () => {
      const mockCookies = [
        { name: 'session', value: 'abc123', domain: 'example.com' },
        { name: 'preferences', value: 'dark-mode', domain: 'example.com' }
      ];
      
      mockBrowser.runtime.sendMessage.mockResolvedValue({ cookies: mockCookies });
      
      const { loadCookies } = await import('../src/popup.js');
      await loadCookies();
      
      const cookieList = document.getElementById('cookie-list');
      expect(cookieList.children.length).toBe(2);
    });

    it('should handle cookie deletion', async () => {
      const mockCookie = { name: 'test', domain: 'example.com' };
      
      const { deleteCookie } = await import('../src/popup.js');
      await deleteCookie(mockCookie);
      
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'DELETE_COOKIE',
        cookie: mockCookie
      });
    });

    it('should show error message when cookie operations fail', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Failed to delete cookie'));
      
      const { deleteCookie } = await import('../src/popup.js');
      await deleteCookie({ name: 'test', domain: 'example.com' });
      
      const errorMessage = document.getElementById('error-message');
      expect(errorMessage.textContent).toContain('Failed to delete cookie');
    });
  });

  describe('Settings Management', () => {
    it('should save settings when changed', async () => {
      const newSettings = {
        autoDelete: true,
        whitelist: ['example.com']
      };
      
      const { saveSettings } = await import('../src/popup.js');
      await saveSettings(newSettings);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(newSettings);
    });

    it('should validate settings before saving', async () => {
      const invalidSettings = {
        autoDelete: 'not-a-boolean',
        whitelist: 'not-an-array'
      };
      
      const { saveSettings } = await import('../src/popup.js');
      await expect(saveSettings(invalidSettings)).rejects.toThrow();
    });
  });

  describe('UI Interactions', () => {
    it('should update UI when settings change', async () => {
      const { updateUI } = await import('../src/popup.js');
      const mockSettings = { theme: 'dark' };
      
      await updateUI(mockSettings);
      
      expect(document.body.classList.contains('dark-theme')).toBe(true);
    });

    it('should handle theme switching', async () => {
      const { toggleTheme } = await import('../src/popup.js');
      
      // Set up initial settings
      mockBrowser.storage.sync.get.mockResolvedValue({ theme: 'light' });
      
      // First toggle - should switch to dark
      await toggleTheme();
      expect(document.body.classList.contains('dark-theme')).toBe(true);
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ theme: 'dark' });
      
      // Reset mock and set up for second toggle
      mockBrowser.storage.sync.get.mockResolvedValue({ theme: 'dark' });
      
      // Second toggle - should switch back to light
      await toggleTheme();
      expect(document.body.classList.contains('dark-theme')).toBe(false);
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({ theme: 'light' });
    });
  });
}); 