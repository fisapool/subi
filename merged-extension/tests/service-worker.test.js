const { expect, describe, test, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock crypto API
const mockCrypto = {
  subtle: {
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    generateKey: jest.fn().mockResolvedValue({}),
    importKey: jest.fn().mockResolvedValue({}),
    exportKey: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9]))
  },
  getRandomValues: jest.fn().mockImplementation(arr => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(arr) {
    return String.fromCharCode(...arr);
  }
};

// Mock Chrome API
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  runtime: {
    onInstalled: {
      addListener: jest.fn()
    },
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn()
  }
};

// Mock Web Crypto API
global.crypto = mockCrypto;

global.chrome = mockChrome;

// Helper function to load and evaluate scripts
function loadScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Create a sandbox with our mocked globals
  const sandbox = {
    chrome: mockChrome,
    crypto: mockCrypto,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    module: { exports: {} },
    require: (modulePath) => {
      if (modulePath === './background.js') {
        return loadScript(path.join(__dirname, '../background.js'));
      }
      return {};
    }
  };

  // Create a VM context with our sandbox
  const context = vm.createContext(sandbox);
  
  // Run the script in our context
  vm.runInContext(content, context);
  
  // Return the module.exports object
  return sandbox.module.exports;
}

describe('Service Worker', () => {
  let serviceWorker;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceWorker = loadScript(path.join(__dirname, '../service-worker.js'));
  });

  describe('Initialization', () => {
    test('initialize on install', () => {
      expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    });

    test('initialize message listeners', () => {
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    test('save current session', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com' },
        { id: 2, url: 'https://test.com' }
      ];
      chrome.tabs.query.mockResolvedValueOnce(mockTabs);
      await serviceWorker.saveCurrentSession();
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('restore session', async () => {
      const mockSession = {
        windows: [{
          tabs: [{ url: 'https://example.com' }]
        }]
      };
      chrome.storage.local.get.mockResolvedValueOnce({ currentSession: mockSession });
      await serviceWorker.restoreSession();
      expect(chrome.windows.create).toHaveBeenCalled();
    });

    test('clear session data', async () => {
      await serviceWorker.clearSessionData();
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('handle switch panel message', () => {
      const message = { action: 'switchPanel', panelPath: 'sidepanels/main-sp.html' };
      const sender = { id: 'test-sender' };
      const sendResponse = jest.fn();
      
      serviceWorker.handleMessage(message, sender, sendResponse);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/main-sp.html',
        enabled: true
      });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('handle save session message', async () => {
      const message = { type: 'SAVE_SESSION' };
      const sender = { id: 'test-sender' };
      const sendResponse = jest.fn();
      
      await serviceWorker.handleMessage(message, sender, sendResponse);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SAVE_SESSION' });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('handle load sessions message', async () => {
      const message = { type: 'LOAD_SESSIONS' };
      const sender = { id: 'test-sender' };
      const sendResponse = jest.fn();
      
      await serviceWorker.handleMessage(message, sender, sendResponse);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'LOAD_SESSIONS' });
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('handle unknown message', async () => {
      const message = { type: 'UNKNOWN' };
      const sender = { id: 'test-sender' };
      const sendResponse = jest.fn();
      
      await serviceWorker.handleMessage(message, sender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown action' });
    });
  });

  describe('Sidepanel Navigation', () => {
    test('set panel behavior on initialization', () => {
      expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({ openPanelOnActionClick: true });
    });

    test('handle tab activation for developer site', () => {
      const activeInfo = { tabId: 1 };
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback({ id: tabId, url: 'https://developer.chrome.com' });
      });
      
      chrome.tabs.onActivated.addListener.mock.calls[0][0](activeInfo);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/main-sp.html',
        enabled: true
      });
    });

    test('handle tab activation for github site', () => {
      const activeInfo = { tabId: 1 };
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback({ id: tabId, url: 'https://github.com' });
      });
      
      chrome.tabs.onActivated.addListener.mock.calls[0][0](activeInfo);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/main-sp.html',
        enabled: true
      });
    });

    test('handle tab activation for google site', () => {
      const activeInfo = { tabId: 1 };
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback({ id: tabId, url: 'https://google.com' });
      });
      
      chrome.tabs.onActivated.addListener.mock.calls[0][0](activeInfo);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/main-sp.html',
        enabled: true
      });
    });

    test('handle tab activation for other site', () => {
      const activeInfo = { tabId: 1 };
      chrome.tabs.get.mockImplementation((tabId, callback) => {
        callback({ id: tabId, url: 'https://example.com' });
      });
      
      chrome.tabs.onActivated.addListener.mock.calls[0][0](activeInfo);
      
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/welcome-sp.html',
        enabled: true
      });
    });
  });

  describe('Data Encryption', () => {
    test('encrypt session data', async () => {
      const mockSession = {
        windows: [{
          tabs: [{ url: 'https://example.com' }]
        }]
      };
      await serviceWorker.encryptSessionData(mockSession);
      expect(global.crypto.subtle.encrypt).toHaveBeenCalled();
    });

    test('decrypt session data', async () => {
      const mockEncryptedData = new Uint8Array(32);
      await serviceWorker.decryptSessionData(mockEncryptedData);
      expect(global.crypto.subtle.decrypt).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('handle tab query error', async () => {
      chrome.tabs.query.mockRejectedValueOnce(new Error('Query failed'));
      await serviceWorker.saveCurrentSession();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('handle storage error', async () => {
      chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage failed'));
      const mockSession = {
        windows: [{
          tabs: [{ url: 'https://example.com' }]
        }]
      };
      await serviceWorker.saveSession(mockSession);
      // Verify error handling behavior
    });
  });
}); 