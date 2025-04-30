import { jest } from '@jest/globals';

// Mock the browser APIs
const mockBrowser = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    }
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(),
    onMessage: {
      addListener: jest.fn().mockReturnValue({})
    }
  },
  identity: {
    getRedirectURL: jest.fn().mockReturnValue('https://example.com/redirect'),
    launchWebAuthFlow: jest.fn().mockResolvedValue('https://example.com/callback#token=123')
  }
};

// Mock chrome global
global.chrome = mockBrowser;

// Mock the module
const mockModule = {
  default: mockBrowser,
  __esModule: true,
};

jest.unstable_mockModule('webextension-polyfill', () => mockModule);

describe('Options Page', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = `
      <form id="settings-form">
        <input type="checkbox" id="auto-delete" name="autoDelete">
        <input type="text" id="whitelist" name="whitelist">
        <button type="submit" id="save-settings">Save</button>
      </form>
      <div id="status-message"></div>
      <div id="premium-section">
        <button id="upgrade-premium">Upgrade to Premium</button>
      </div>
    `;
  });

  describe('Settings Management', () => {
    it('should load saved settings on page load', async () => {
      const mockSettings = {
        autoDelete: true,
        whitelist: ['example.com', 'test.com']
      };
      mockBrowser.storage.sync.get.mockResolvedValueOnce(mockSettings);
      
      const { loadSettings } = await import('../src/options.js');
      await loadSettings();
      
      expect(document.getElementById('auto-delete').checked).toBe(true);
      expect(document.getElementById('whitelist').value).toBe('example.com,test.com');
      expect(mockBrowser.storage.sync.get).toHaveBeenCalledWith(['autoDelete', 'whitelist']);
    });

    it('should save settings when form is submitted', async () => {
      const { initializeOptionsPage } = await import('../src/options.js');
      await initializeOptionsPage();
      
      // Simulate form submission
      const form = document.getElementById('settings-form');
      const event = new Event('submit');
      form.dispatchEvent(event);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalled();
    });

    it('should validate whitelist format', async () => {
      const { validateWhitelist } = await import('../src/options.js');
      
      // Valid format
      expect(validateWhitelist('example.com,test.com')).toBe(true);
      
      // Invalid format
      expect(validateWhitelist('invalid domain')).toBe(false);
    });
  });

  describe('Premium Features', () => {
    it('should handle premium upgrade flow', async () => {
      const { initializePremiumFeatures } = await import('../src/options.js');
      await initializePremiumFeatures();
      
      const upgradeButton = document.getElementById('upgrade-premium');
      await upgradeButton.click();
      
      expect(mockBrowser.identity.launchWebAuthFlow).toHaveBeenCalled();
    });

    it('should handle premium authentication callback', async () => {
      const { handleAuthCallback } = await import('../src/options.js');
      const mockToken = 'premium-token-123';
      
      await handleAuthCallback(mockToken);
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith({
        premiumToken: mockToken,
        isPremium: true
      });
    });

    it('should show error message when premium upgrade fails', async () => {
      mockBrowser.identity.launchWebAuthFlow.mockRejectedValue(new Error('Auth failed'));
      
      const { initializePremiumFeatures } = await import('../src/options.js');
      await initializePremiumFeatures();
      
      const upgradeButton = document.getElementById('upgrade-premium');
      await upgradeButton.click();
      
      // Wait for the error message to appear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const statusMessage = document.getElementById('status-message');
      expect(statusMessage.textContent).toContain('Failed to upgrade');
    });
  });

  describe('Data Management', () => {
    it('should handle data export', async () => {
      const mockData = {
        settings: { autoDelete: true },
        cookies: [{ name: 'test', domain: 'example.com' }]
      };
      mockBrowser.storage.sync.get.mockResolvedValue(mockData);
      
      const { exportData } = await import('../src/options.js');
      const exportedData = await exportData();
      
      expect(exportedData).toBe(JSON.stringify(mockData, null, 2));
    });

    it('should handle data import', async () => {
      const mockData = {
        settings: { autoDelete: true },
        cookies: [{ name: 'test', domain: 'example.com' }]
      };
      
      const { importData } = await import('../src/options.js');
      await importData(JSON.stringify(mockData));
      
      expect(mockBrowser.storage.sync.set).toHaveBeenCalledWith(mockData);
    });

    it('should validate imported data format', async () => {
      const { importData } = await import('../src/options.js');
      
      // Invalid JSON
      await expect(importData('invalid json')).rejects.toThrow();
      
      // Missing required fields
      await expect(importData('{}')).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const error = new Error('Storage error');
      mockBrowser.storage.sync.get.mockRejectedValueOnce(error);
      
      const { loadSettings } = await import('../src/options.js');
      await loadSettings();
      
      // Wait for the error message to appear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const statusMessage = document.getElementById('status-message');
      expect(statusMessage.textContent).toContain('Failed to load settings');
    });

    it('should handle network errors during premium upgrade', async () => {
      const error = new Error('Network error');
      mockBrowser.identity.launchWebAuthFlow.mockRejectedValueOnce(error);
      
      const { initializePremiumFeatures } = await import('../src/options.js');
      await initializePremiumFeatures();
      
      const upgradeButton = document.getElementById('upgrade-premium');
      await upgradeButton.click();
      
      // Wait for the error message to appear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const statusMessage = document.getElementById('status-message');
      expect(statusMessage.textContent).toContain('Network error');
    });
  });
}); 