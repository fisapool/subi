const { expect, describe, test, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock Chrome API
const mockChrome = {
  sidePanel: {
    setOptions: jest.fn().mockResolvedValue(undefined),
    setPanelBehavior: jest.fn().mockResolvedValue(undefined)
  },
  runtime: {
    sendMessage: jest.fn().mockImplementation((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined)
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ id: 'new-tab' }),
    update: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockImplementation((tabId, callback) => {
      if (callback) {
        callback({ id: tabId, url: 'https://example.com' });
      }
      return Promise.resolve({ id: tabId, url: 'https://example.com' });
    }),
    onActivated: {
      addListener: jest.fn()
    }
  }
};

// Mock crypto API
global.crypto = {
  getRandomValues: jest.fn(array => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    importKey: jest.fn().mockResolvedValue('mock-key'),
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
  }
};

// Mock TextEncoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
};

// Mock window and document
const mockGetElementById = jest.fn().mockReturnValue({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  style: {},
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  }
});

global.window = {
  location: { href: 'chrome-extension://test/popup.html' },
  chrome: mockChrome
};

global.document = {
  getElementById: mockGetElementById,
  querySelector: jest.fn().mockReturnValue({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }),
  createElement: jest.fn().mockReturnValue({
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    style: {}
  })
};

global.chrome = mockChrome;

// Mock DOM elements
const mockElements = {
  saveButton: { addEventListener: jest.fn() },
  restoreButton: { addEventListener: jest.fn() },
  sessionList: { children: [] },
  statusMessage: { textContent: '', style: { display: '' } },
  loadingSpinner: { style: { display: '' } }
};

// Helper function to load and evaluate scripts
function loadScript(filePath) {
  const scriptContent = require('fs').readFileSync(filePath, 'utf8');
  const sandbox = {
    chrome: mockChrome,
    document: {
      getElementById: jest.fn(id => mockElements[id]),
      createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        style: {}
      }))
    },
    console: console,
    module: { exports: {} }
  };
  
  const context = vm.createContext(sandbox);
  vm.runInContext(scriptContent, context);
  
  return sandbox.module.exports;
}

describe('Background Script Tests', () => {
  let background;

  beforeEach(() => {
    jest.clearAllMocks();
    background = loadScript(path.join(__dirname, '../background.js'));
  });

  test('initialize encryption key', async () => {
    expect(chrome.storage.local.get).toHaveBeenCalledWith('encryptionKey');
  });

  test('validate cookie data', () => {
    const testCookie = {
      name: 'test',
      value: 'value',
      domain: 'example.com'
    };
    const result = background.validateCookieData(testCookie);
    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
  });
});

describe('Settings Tests', () => {
  let settings;

  beforeEach(() => {
    jest.clearAllMocks();
    settings = loadScript(path.join(__dirname, '../settings.js'));
    // Initialize settings
    chrome.runtime.onMessage.addListener.mockImplementation((callback) => {
      callback({ action: 'saveSettings', settings: {} });
    });
  });

  test('handle settings messages', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});

describe('Popup Tests', () => {
  let popup;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetElementById.mockClear();
    mockGetElementById.mockImplementation(id => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn()
      }
    }));
    popup = loadScript(path.join(__dirname, '../popup.js'));
    // Initialize popup
    popup.initializePopup();
  });

  test('initialize popup', () => {
    expect(mockGetElementById).toHaveBeenCalled();
  });
});

describe('Content Script Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadScript(path.join(__dirname, '../content-script.js'));
  });

  test('handle messages', () => {
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });
});

describe('Extension Initialization', () => {
  test('initialize extension on install', () => {
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'install' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ initialized: true });
  });

  test('initialize extension on update', () => {
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'update' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ initialized: true });
  });

  test('do not initialize extension on other events', () => {
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled();
    const listener = chrome.runtime.onInstalled.addListener.mock.calls[0][0];
    listener({ reason: 'other' });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });
});

describe('Message Handling', () => {
  test('handle save session message', async () => {
    const message = { type: 'SAVE_SESSION' };
    const sender = { id: 'test-sender' };
    const sendResponse = jest.fn();
    
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    await listener(message, sender, sendResponse);
    
    expect(chrome.tabs.query).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('handle restore session message', async () => {
    const message = { type: 'RESTORE_SESSION', sessionId: 'test-session' };
    const sender = { id: 'test-sender' };
    const sendResponse = jest.fn();
    
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    await listener(message, sender, sendResponse);
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith('test-session');
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('handle unknown message type', async () => {
    const message = { type: 'UNKNOWN' };
    const sender = { id: 'test-sender' };
    const sendResponse = jest.fn();
    
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    await listener(message, sender, sendResponse);
    
    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unknown message type' });
  });
});

describe('Session Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
  });

  test('save session', async () => {
    const sessionData = {
      id: 'test-session',
      name: 'Test Session',
      tabs: [{ url: 'https://example.com' }]
    };

    chrome.storage.local.get.mockResolvedValueOnce({ sessions: [] });
    chrome.storage.local.set.mockResolvedValueOnce(undefined);

    const result = await background.saveSession(sessionData);
    expect(result.success).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  test('load sessions', async () => {
    const mockSessions = [
      { id: 'session1', name: 'Session 1' },
      { id: 'session2', name: 'Session 2' }
    ];

    chrome.storage.local.get.mockResolvedValueOnce({ sessions: mockSessions });

    const result = await background.loadSessions();
    expect(result.success).toBe(true);
    expect(result.sessions).toEqual(mockSessions);
  });

  test('delete session', async () => {
    const sessionId = 'test-session';
    chrome.storage.local.get.mockResolvedValueOnce({ sessions: [{ id: sessionId }] });
    chrome.storage.local.set.mockResolvedValueOnce(undefined);

    const result = await background.deleteSession(sessionId);
    expect(result.success).toBe(true);
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});

describe('Tab Management', () => {
  test('handle tab activation', () => {
    expect(chrome.tabs.onActivated.addListener).toHaveBeenCalled();
    const listener = chrome.tabs.onActivated.addListener.mock.calls[0][0];
    listener({ tabId: 1 });
    expect(chrome.tabs.get).toHaveBeenCalledWith(1, expect.any(Function));
  });

  test('handle tab update', () => {
    expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
    listener(1, { status: 'complete' }, { id: 1, url: 'https://example.com' });
    expect(chrome.storage.local.get).toHaveBeenCalled();
  });
});

describe('Storage Management', () => {
  test('handle storage change', () => {
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
    const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    listener({ settings: { newValue: { autoSave: true } } });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'settingsUpdated', settings: { autoSave: true } });
  });

  test('handle storage clear', () => {
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
    const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    listener({});
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'storageCleared' });
  });
});

describe('Extension Implementation', () => {
  let background;
  let popup;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup global objects
    global.chrome = mockChrome;
    global.document = {
      getElementById: jest.fn(id => mockElements[id]),
      createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        style: {}
      }))
    };
    
    // Mock successful responses
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    mockChrome.tabs.create.mockResolvedValue({ id: 2 });
    mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
    
    // Load the scripts
    background = loadScript(path.join(__dirname, '../background.js'));
    popup = loadScript(path.join(__dirname, '../popup.js'));
  });

  describe('Settings Management', () => {
    test('save settings', async () => {
      // Get the save button click handler
      const saveHandler = mockElements.saveButton.addEventListener.mock.calls[0][1];
      
      // Call the handler
      await saveHandler();
      
      // Verify Chrome API calls
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'saveSession' },
        expect.any(Function)
      );
    });

    test('load settings', async () => {
      // Mock saved settings
      const mockSettings = {
        settings: {
          autoSave: true,
          saveInterval: 30
        }
      };
      mockChrome.storage.local.get.mockResolvedValueOnce(mockSettings);
      
      // Get the restore button click handler
      const restoreHandler = mockElements.restoreButton.addEventListener.mock.calls[0][1];
      
      // Call the handler
      await restoreHandler();
      
      // Verify Chrome API calls
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'restoreSession' },
        expect.any(Function)
      );
    });
  });

  describe('Popup Management', () => {
    test('save session from popup', async () => {
      // Get the message listener from background
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      // Mock tab data
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example' },
        { id: 2, url: 'https://example2.com', title: 'Example 2' }
      ];
      mockChrome.tabs.query.mockResolvedValueOnce(mockTabs);
      
      // Call the listener
      const response = await messageListener(
        { action: 'saveSession' },
        {},
        jest.fn()
      );
      
      // Verify response
      expect(response).toEqual({ success: true });
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          sessions: expect.objectContaining({
            [expect.any(String)]: expect.objectContaining({
              tabs: mockTabs
            })
          })
        })
      );
    });

    test('restore session from popup', async () => {
      // Get the message listener from background
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      // Mock session data
      const mockSession = {
        id: 'test-session',
        name: 'Test Session',
        tabs: [
          { url: 'https://example.com', title: 'Example' },
          { url: 'https://example2.com', title: 'Example 2' }
        ]
      };
      mockChrome.storage.local.get.mockResolvedValueOnce({
        sessions: { 'test-session': mockSession }
      });
      
      // Call the listener
      const response = await messageListener(
        { action: 'restoreSession', sessionId: 'test-session' },
        {},
        jest.fn()
      );
      
      // Verify response
      expect(response).toEqual({ success: true });
      expect(mockChrome.tabs.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Handling', () => {
    test('handle session saved message', async () => {
      // Get the message listener from popup
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      // Call the listener
      await messageListener(
        { action: 'sessionSaved', success: true },
        {},
        jest.fn()
      );
      
      // Verify UI updates
      expect(mockElements.statusMessage.textContent).toBe('Session saved successfully');
      expect(mockElements.loadingSpinner.style.display).toBe('none');
    });

    test('handle sessions loaded message', async () => {
      // Get the message listener from popup
      const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
      
      // Mock sessions data
      const mockSessions = {
        'session-1': { name: 'Session 1', tabs: [] },
        'session-2': { name: 'Session 2', tabs: [] }
      };
      
      // Call the listener
      await messageListener(
        { action: 'sessionsLoaded', sessions: mockSessions },
        {},
        jest.fn()
      );
      
      // Verify UI updates
      expect(mockElements.sessionList.children.length).toBe(2);
      expect(mockElements.loadingSpinner.style.display).toBe('none');
    });
  });
}); 