require('@testing-library/jest-dom');

// Mock TextEncoder and TextDecoder
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock DOM elements
const mockElements = {
  saveButton: {
    addEventListener: jest.fn(),
    click: jest.fn(),
    disabled: false,
    style: { display: 'none' }
  },
  restoreButton: {
    addEventListener: jest.fn(),
    click: jest.fn(),
    disabled: false,
    style: { display: 'none' }
  },
  sessionList: {
    innerHTML: '',
    children: [],
    appendChild: jest.fn(),
    style: { display: 'none' }
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
  getElementById: jest.fn((id) => mockElements[id]),
  addEventListener: jest.fn((event, handler) => {
    if (event === 'DOMContentLoaded') {
      handler();
    }
  }),
  createElement: jest.fn(() => ({
    appendChild: jest.fn(),
    setAttribute: jest.fn(),
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn()
    }
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  createTextNode: jest.fn(),
  createComment: jest.fn(),
  createDocumentFragment: jest.fn(() => ({
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }))
};

// Mock window
global.window = {
  location: {
    href: 'https://example.com'
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  crypto: {
    subtle: {
      importKey: jest.fn().mockResolvedValue('mock-key'),
      encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
      decrypt: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6]))
    }
  }
};

// Mock Chrome API
const mockStorage = {
  sessions: {},
  settings: {
    autoSave: true,
    darkMode: false
  }
};

global.chrome = {
  runtime: {
    onInstalled: {
      addListener: jest.fn((callback) => callback({ reason: 'install' }))
    },
    onMessage: {
      addListener: jest.fn((callback) => {
        callback({ type: 'test' }, { id: 'sender' }, () => {});
      })
    },
    onStartup: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn().mockImplementation((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
      return Promise.resolve({ success: true });
    })
  },
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage[keys] });
        }
        const result = {};
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
        return Promise.resolve(result);
      }),
      set: jest.fn().mockImplementation((data) => {
        Object.assign(mockStorage, data);
        return Promise.resolve();
      }),
      clear: jest.fn().mockResolvedValue({}),
      onChanged: {
        addListener: jest.fn((callback) => {
          callback({ settings: { newValue: mockStorage.settings } });
        })
      }
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([
      { id: 1, url: 'https://example.com' }
    ]),
    create: jest.fn().mockResolvedValue({ id: 'new-tab' }),
    onActivated: {
      addListener: jest.fn((callback) => {
        callback({ tabId: 1 });
      })
    },
    onUpdated: {
      addListener: jest.fn((callback) => {
        callback(1, { status: 'complete' }, { url: 'https://example.com' });
      })
    },
    get: jest.fn().mockResolvedValue({
      id: 1,
      url: 'https://example.com'
    })
  },
  sidePanel: {
    setPanelBehavior: jest.fn().mockResolvedValue({}),
    setOptions: jest.fn().mockResolvedValue({}),
    getOptions: jest.fn().mockResolvedValue({})
  }
};

// Mock console
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Mock window methods
global.prompt = jest.fn();
global.confirm = jest.fn();
global.alert = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn().mockReturnValue(0)
};

// Mock crypto API
global.crypto = {
  subtle: {
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    generateKey: jest.fn().mockResolvedValue('test-key'),
    importKey: jest.fn().mockResolvedValue('test-key')
  },
  getRandomValues: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
};

// Mock background script
global.background = {
  saveSession: jest.fn().mockResolvedValue({ success: true }),
  loadSessions: jest.fn().mockResolvedValue({ 
    success: true, 
    sessions: [
      { id: 'session1', name: 'Session 1' },
      { id: 'session2', name: 'Session 2' }
    ]
  }),
  deleteSession: jest.fn().mockResolvedValue({ success: true }),
  checkRateLimit: jest.fn().mockResolvedValue(true),
  encryptSessionData: jest.fn().mockResolvedValue({ 
    success: true, 
    encrypted: new Uint8Array([1, 2, 3]) 
  }),
  decryptSessionData: jest.fn().mockResolvedValue({ 
    success: true, 
    decrypted: { id: 'test', data: 'test' } 
  }),
  initializeEncryptionKey: jest.fn().mockResolvedValue({ success: true }),
  validateCookieData: jest.fn().mockReturnValue({ isValid: true }),
  generateCSRFToken: jest.fn().mockReturnValue('test-token'),
  validateCSRFToken: jest.fn().mockReturnValue(true),
  restoreSession: jest.fn().mockResolvedValue({ success: true })
};

// Mock chrome.sidePanel
if (!chrome.sidePanel) {
  chrome.sidePanel = {
    setPanelBehavior: jest.fn().mockResolvedValue(undefined)
  };
}

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(arr) {
    return String.fromCharCode(...arr);
  }
};

// Mock chrome.runtime event listeners
chrome.runtime.onInstalled = {
  addListener: jest.fn()
};

chrome.runtime.onMessage = {
  addListener: jest.fn()
};

// Mock chrome.tabs event listeners
chrome.tabs.onActivated = {
  addListener: jest.fn()
};

chrome.tabs.onUpdated = {
  addListener: jest.fn()
};

// Mock chrome.storage event listeners
chrome.storage.onChanged = {
  addListener: jest.fn()
}; 