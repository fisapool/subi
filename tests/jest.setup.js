import { jest } from '@jest/globals';

// Mock browser APIs
globalThis.browser = {
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue()
    },
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue()
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: jest.fn().mockResolvedValue(),
    onUpdated: {
      addListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn()
    }
  },
  scripting: {
    executeScript: jest.fn().mockResolvedValue()
  },
  runtime: {
    sendMessage: jest.fn().mockResolvedValue(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  cookies: {
    getAll: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue(),
    set: jest.fn().mockResolvedValue(),
    onChanged: {
      addListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn().mockResolvedValue(),
    clear: jest.fn().mockResolvedValue(),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn().mockResolvedValue('mock-token'),
    removeCachedAuthToken: jest.fn().mockResolvedValue()
  },
  notifications: {
    create: jest.fn().mockResolvedValue(),
    clearAll: jest.fn().mockResolvedValue()
  },
  permissions: {
    contains: jest.fn().mockResolvedValue(true)
  }
};

// Mock chrome API (for compatibility)
globalThis.chrome = globalThis.browser;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  clear: jest.fn()
};
globalThis.localStorage = localStorageMock;

// Mock console methods to prevent noise during tests
globalThis.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Mock fetch API
globalThis.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({})
});

// Mock URL and navigator
globalThis.URL = class URL {
  constructor(url) {
    this.url = url;
    this.hostname = url.replace(/^https?:\/\//, '').split('/')[0];
  }
};

globalThis.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Increase timeout for all tests
jest.setTimeout(30000);

// Add custom matchers if needed
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