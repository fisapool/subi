// Configure Jest timeout globally
jest.setTimeout(120000);

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  })
);

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(callback => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn()
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
};

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe = jest.fn();
  disconnect = jest.fn();
};

// Mock CustomEvent
global.CustomEvent = class CustomEvent extends Event {
  constructor(type, options = {}) {
    super(type);
    this.detail = options.detail || null;
  }
};

// Mock Event
global.Event = class Event {
  constructor(type, options = {}) {
    this.type = type;
    this.bubbles = options.bubbles || false;
    this.cancelable = options.cancelable || false;
  }
  preventDefault = jest.fn();
  stopPropagation = jest.fn();
};

// Mock ErrorEvent
global.ErrorEvent = class ErrorEvent extends Event {
  constructor(type, options = {}) {
    super(type);
    this.error = options.error || null;
    this.message = options.message || '';
  }
};

// Mock console methods to prevent noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock Chrome API - unified and completed
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

// Mock window object
global.window = {
  location: {
    href: 'https://example.com'
  }
};

// Mock document object
document.body.innerHTML = `
  <div id="testProtectionBtn"></div>
  <div id="saveCookiesBtn"></div>
  <div id="restoreCookiesBtn"></div>
  <div id="results"></div>
  <div id="errorMessage"></div>
`; 