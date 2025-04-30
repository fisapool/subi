const { expect, describe, test, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock DOM elements
const mockElements = {
  saveButton: {
    addEventListener: jest.fn(),
    click: jest.fn(),
    disabled: false
  },
  restoreButton: {
    addEventListener: jest.fn(),
    click: jest.fn(),
    disabled: false
  },
  sessionList: {
    innerHTML: '',
    children: [],
    appendChild: jest.fn()
  },
  statusMessage: {
    textContent: '',
    style: { display: 'none' }
  },
  loadingSpinner: {
    style: { display: 'none' }
  }
};

// Mock document
global.document = {
  getElementById: jest.fn(id => mockElements[id]),
  createElement: jest.fn(tag => ({
    tagName: tag,
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    style: {},
    textContent: ''
  }))
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
    sendMessage: jest.fn()
  }
};

// Mock window
global.window = {
  location: { href: 'chrome-extension://test/popup.html' },
  chrome: mockChrome
};

global.chrome = mockChrome;

// Helper function to load and evaluate scripts
function loadScript(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Create a sandbox with our mocked globals
  const sandbox = {
    window: global.window,
    chrome: mockChrome,
    document: global.document,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    module: { exports: {} }
  };

  // Create a VM context with our sandbox
  const context = vm.createContext(sandbox);
  
  // Run the script in our context
  vm.runInContext(content, context);
  
  // Return the module.exports object
  return sandbox.module.exports;
}

describe('Popup Script', () => {
  let popup;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup global objects
    global.chrome = mockChrome;
    
    // Mock successful responses
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    
    // Load the script
    popup = loadScript(path.join(__dirname, '../popup.js'));
  });

  describe('Initialization', () => {
    test('initialize popup elements', () => {
      expect(document.getElementById).toHaveBeenCalledWith('saveButton');
      expect(document.getElementById).toHaveBeenCalledWith('restoreButton');
      expect(document.getElementById).toHaveBeenCalledWith('sessionList');
      expect(document.getElementById).toHaveBeenCalledWith('statusMessage');
      expect(document.getElementById).toHaveBeenCalledWith('loadingSpinner');
    });

    test('load saved settings', async () => {
      const mockSettings = { theme: 'dark' };
      mockChrome.storage.local.get.mockResolvedValueOnce(mockSettings);
      
      await popup.loadSettings();
      
      expect(mockChrome.storage.local.get).toHaveBeenCalledWith(['settings'], expect.any(Function));
    });
  });

  describe('Event Handling', () => {
    test('handle save button click', async () => {
      const mockSessions = [{ id: 'test-session', name: 'Test Session' }];
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: mockSessions });
      
      // Simulate button click
      const clickHandler = mockElements.saveButton.addEventListener.mock.calls[0][1];
      await clickHandler();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'saveSession' });
      expect(mockElements.statusMessage.textContent).toBe('Session saved successfully!');
    });

    test('handle restore button click', async () => {
      const mockSessions = [{ id: 'test-session', name: 'Test Session' }];
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: mockSessions });
      
      // Simulate button click
      const clickHandler = mockElements.restoreButton.addEventListener.mock.calls[0][1];
      await clickHandler();
      
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'restoreSession' });
      expect(mockElements.statusMessage.textContent).toBe('Session restored successfully!');
    });
  });

  describe('UI Updates', () => {
    test('display session list', async () => {
      const mockSessions = [
        { id: 'session1', name: 'Session 1' },
        { id: 'session2', name: 'Session 2' }
      ];
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: mockSessions });
      
      await popup.displaySessionList();
      
      expect(mockElements.sessionList.children.length).toBe(2);
      expect(mockElements.sessionList.innerHTML).toContain('Session 1');
      expect(mockElements.sessionList.innerHTML).toContain('Session 2');
    });

    test('show loading state', () => {
      popup.showLoading(true);
      
      expect(mockElements.loadingSpinner.style.display).toBe('block');
      expect(mockElements.saveButton.disabled).toBe(true);
      expect(mockElements.restoreButton.disabled).toBe(true);
    });

    test('hide loading state', () => {
      popup.showLoading(false);
      
      expect(mockElements.loadingSpinner.style.display).toBe('none');
      expect(mockElements.saveButton.disabled).toBe(false);
      expect(mockElements.restoreButton.disabled).toBe(false);
    });

    test('show status message', () => {
      const message = 'Test message';
      popup.showStatus(message);
      
      expect(mockElements.statusMessage.textContent).toBe(message);
      expect(mockElements.statusMessage.style.display).toBe('block');
    });
  });
}); 