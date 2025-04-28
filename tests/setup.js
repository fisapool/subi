/**
 * Jest setup file for BytesCookies tests
 * This file sets up the test environment and mocks Chrome APIs
 */

// Set global timeout
jest.setTimeout(120000);

global.chrome = {
  cookies: {
    getAll: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
    create: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    lastError: null,
    getURL: jest.fn(),
    getManifest: jest.fn()
  },
  permissions: {
    request: jest.fn(),
    contains: jest.fn(),
    getAll: jest.fn()
  },
  webRequest: {
    onBeforeRequest: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  }
};

// Mock URL and Blob APIs
global.URL = class URL {
  constructor(url) {
    this.url = url;
    this.protocol = url.startsWith('https:') ? 'https:' : 'http:';
    this.hostname = url.replace(/^https?:\/\//, '').split('/')[0];
  }
  createObjectURL = jest.fn(() => 'blob:mock-url');
  revokeObjectURL = jest.fn();
};

global.Blob = class Blob {
  constructor(parts) {
    this.parts = parts;
  }
  
  get size() {
    return JSON.stringify(this.parts).length;
  }
};

// Mock window object
global.window = {
  utils: {
    withLock: jest.fn((lockKey, operation) => operation()),
    debounce: jest.fn(fn => fn),
    throttle: jest.fn(fn => fn),
    withUIUpdate: jest.fn((element, updates, operation) => operation())
  },
  location: {
    href: 'https://example.com',
    protocol: 'https:',
    hostname: 'example.com'
  }
};

// Mock document object
global.document = {
  createElement: jest.fn(() => ({
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    parentNode: {
      removeChild: jest.fn()
    },
    setAttribute: jest.fn(),
    getAttribute: jest.fn()
  })),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  createTextNode: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock sessionStorage
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((callback) => {
  callback();
  return 123; // Mock timeout ID
});

global.clearTimeout = jest.fn();

// Mock Promise
global.Promise = Promise;

// Mock navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob())
  })
); 