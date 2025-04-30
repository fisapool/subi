const { expect, describe, test, beforeEach } = require('@jest/globals');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock crypto API
const mockCrypto = {
  subtle: {
    importKey: jest.fn().mockResolvedValue('mock-key'),
    encrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    generateKey: jest.fn().mockResolvedValue({ key: 'mock-key' }),
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
global.TextEncoder = jest.fn().mockImplementation(() => ({
  encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3]))
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
  decode: jest.fn().mockReturnValue('decoded-text')
}));

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
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn()
  }
};

// Mock window and document
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
    crypto: global.crypto,
    TextEncoder: global.TextEncoder,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    module: { exports: {} },
    ENCRYPTION_KEY: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
  };

  // Create a VM context with our sandbox
  const context = vm.createContext(sandbox);
  
  // Run the script in our context
  vm.runInContext(content, context);
  
  // Return the module.exports object
  return sandbox.module.exports;
}

describe('Background Script', () => {
  let background;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup global objects
    global.chrome = mockChrome;
    global.crypto = mockCrypto;
    
    // Mock successful responses
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    mockChrome.tabs.query.mockResolvedValue([{ id: 1, url: 'https://example.com' }]);
    mockChrome.tabs.create.mockResolvedValue({ id: 1 });
    mockChrome.tabs.update.mockResolvedValue({ id: 1 });
    mockChrome.tabs.remove.mockResolvedValue(undefined);
    
    background = loadScript(path.join(__dirname, '../background.js'));
  });

  describe('Encryption', () => {
    test('initialize encryption key', async () => {
      // Mock storage response
      chrome.storage.local.get.mockResolvedValueOnce({ encryptionKey: [1, 2, 3, 4, 5] });
      
      // Call initializeEncryptionKey directly
      const result = await background.initializeEncryptionKey();
      
      // Verify storage was accessed
      expect(chrome.storage.local.get).toHaveBeenCalledWith('encryptionKey');
      expect(result).toBe(true);
    });

    test('encrypt session data', async () => {
      const sessionData = { id: 'test-session', tabs: [] };
      const result = await background.encryptSessionData(sessionData);
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
    });

    test('decrypt session data', async () => {
      const encryptedData = { encrypted: new Uint8Array([1, 2, 3]), iv: new Uint8Array([4, 5, 6]) };
      const result = await background.decryptSessionData(encryptedData);
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalled();
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.id).toBe('decoded-text');
    });
  });

  describe('Cookie Management', () => {
    test('validate cookie data', () => {
      // Mock cookie data
      const testCookie = {
        name: 'test',
        value: 'value',
        domain: 'example.com'
      };
      
      // Call validateCookieData directly
      const result = background.validateCookieData(testCookie);
      
      // Verify validation was performed
      expect(result).toBeDefined();
      expect(result.isValid).toBe(true);
    });

    test('validate cookie data with missing fields', () => {
      // Mock cookie data with missing fields
      const testCookie = {
        name: 'test'
      };
      
      // Call validateCookieData directly
      const result = background.validateCookieData(testCookie);
      
      // Verify validation was performed
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required cookie fields: value, domain');
    });

    test('validate cookie data with suspicious content', () => {
      // Mock cookie data with suspicious content
      const testCookie = {
        name: 'test',
        value: '<script>alert("xss")</script>',
        domain: 'example.com'
      };
      
      // Call validateCookieData directly
      const result = background.validateCookieData(testCookie);
      
      // Verify validation was performed
      expect(result.warnings).toContain('Cookie value contains potentially suspicious content');
    });
  });

  describe('Rate Limiting', () => {
    test('check rate limit for new sender', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Call checkRateLimit directly
      const result = background.checkRateLimit(sender);
      
      // Verify rate limiting was performed
      expect(result).toBe(true);
    });

    test('check rate limit for existing sender within limits', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Make requests up to the limit
      for (let i = 0; i < 50; i++) {
        background.checkRateLimit(sender);
      }
      
      // Call checkRateLimit directly
      const result = background.checkRateLimit(sender);
      
      // Verify rate limiting was performed
      expect(result).toBe(true);
    });

    test('check rate limit for existing sender exceeding limits', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Make requests exceeding the limit
      for (let i = 0; i < 150; i++) {
        background.checkRateLimit(sender);
      }
      
      // Call checkRateLimit directly
      const result = background.checkRateLimit(sender);
      
      // Verify rate limiting was performed
      expect(result).toBe(false);
    });

    test('rate limit reset after window', async () => {
      const sender = { id: 'test-sender' };
      
      // First request should succeed
      const result1 = await background.checkRateLimit(sender);
      expect(result1).toBe(true);
      
      // Second request should fail
      const result2 = await background.checkRateLimit(sender);
      expect(result2).toBe(false);
      
      // Wait for rate limit window to reset
      jest.advanceTimersByTime(60000);
      
      // Third request should succeed
      const result3 = await background.checkRateLimit(sender);
      expect(result3).toBe(true);
    });
  });

  describe('CSRF Protection', () => {
    test('generate CSRF token', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Call generateCSRFToken directly
      const token = background.generateCSRFToken(sender);
      
      // Verify token was generated
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    test('validate valid CSRF token', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Generate a token
      const token = background.generateCSRFToken(sender);
      
      // Call validateCSRFToken directly
      const result = background.validateCSRFToken(token, sender);
      
      // Verify validation was performed
      expect(result).toBe(true);
    });

    test('reject invalid CSRF token', () => {
      // Mock sender
      const sender = { id: 'test-sender' };
      
      // Call validateCSRFToken directly with invalid token
      const result = background.validateCSRFToken('invalid-token', sender);
      
      // Verify validation was performed
      expect(result).toBe(false);
    });

    test('reject CSRF token for different sender', () => {
      // Mock senders
      const sender1 = { id: 'test-sender-1' };
      const sender2 = { id: 'test-sender-2' };
      
      // Generate a token for sender1
      const token = background.generateCSRFToken(sender1);
      
      // Call validateCSRFToken directly with different sender
      const result = background.validateCSRFToken(token, sender2);
      
      // Verify validation was performed
      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    test('save session with valid data', async () => {
      const sessionData = {
        id: 'test-session',
        tabs: [{ url: 'https://example.com' }]
      };
      
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: {} });
      mockChrome.storage.local.set.mockResolvedValueOnce(undefined);
      
      const result = await background.saveSession(sessionData);
      
      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('save session with no tabs', async () => {
      // Mock empty tabs
      mockChrome.tabs.query.mockResolvedValueOnce([]);
      
      // Call saveSession directly
      const result = await background.saveSession();
      
      // Verify session was not saved
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('restore session with valid data', async () => {
      const sessionData = {
        id: 'test-session',
        tabs: [{ url: 'https://example.com' }]
      };
      
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: { 'test-session': sessionData } });
      mockChrome.tabs.create.mockResolvedValueOnce({ id: 1 });
      
      const result = await background.restoreSession('test-session');
      
      expect(result.success).toBe(true);
      expect(mockChrome.tabs.create).toHaveBeenCalled();
    });

    test('restore non-existent session', async () => {
      // Mock empty storage
      mockChrome.storage.local.get.mockResolvedValueOnce({});
      
      // Call restoreSession directly
      const result = await background.restoreSession('non-existent');
      
      // Verify session was not restored
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });

    test('delete existing session', async () => {
      // Mock storage response
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: { 'test-session': {} } });
      
      // Call deleteSession directly
      const result = await background.deleteSession('test-session');
      
      // Verify session was deleted
      expect(result.success).toBe(true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });

    test('delete non-existent session', async () => {
      // Mock storage response
      mockChrome.storage.local.get.mockResolvedValueOnce({ sessions: {} });
      
      // Call deleteSession directly
      const result = await background.deleteSession('non-existent');
      
      // Verify session was not deleted
      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found');
    });
  });
}); 