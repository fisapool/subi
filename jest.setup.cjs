require('@testing-library/jest-dom');
const { JSDOM } = require('jsdom');

// Set up JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  features: {
    QuerySelector: true
  }
});

// Set up global DOM environment
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.Element = dom.window.Element;
global.HTMLElement = dom.window.HTMLElement;

// Set up basic DOM elements that tests might need
document.body.innerHTML = `
  <div id="status"></div>
  <div id="error-list"></div>
  <div id="button-container"></div>
  <div id="test-results"></div>
  <div id="cookie-consent-banner"></div>
`;

// Mock window methods
global.window.matchMedia = jest.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

global.window.confirm = jest.fn(() => true);

// Mock webextension-polyfill
const mockBrowser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn()
      }
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn()
      }
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    getManifest: jest.fn(() => ({
      manifest_version: 3,
      name: 'Mock Extension',
      version: '1.0.0',
      description: 'Mock Extension for Testing'
    })),
    getURL: jest.fn((path) => `mocked-extension://${path}`),
    id: 'mock-extension-id',
    connect: jest.fn(),
    onConnect: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    sendMessage: jest.fn(),
    get: jest.fn(),
    getCurrent: jest.fn(),
    connect: jest.fn(),
    duplicate: jest.fn(),
    remove: jest.fn(),
    reload: jest.fn(),
    move: jest.fn(),
    onCreated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    }
  },
  cookies: {
    get: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    getAllCookieStores: jest.fn(),
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    }
  }
};

jest.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

// Mock chrome APIs to maintain backward compatibility
global.chrome = {
  storage: mockBrowser.storage,
  tabs: mockBrowser.tabs,
  runtime: mockBrowser.runtime,
  cookies: mockBrowser.cookies
};

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
console.error = jest.fn();
console.warn = jest.fn();
console.log = jest.fn();
