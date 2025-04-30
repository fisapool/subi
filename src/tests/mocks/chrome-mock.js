// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn(),
    getURL: vi.fn(path => `chrome-extension://mock-id/${path}`)
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    get: vi.fn()
  },
  windows: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    get: vi.fn()
  },
  cookies: {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  },
  webRequest: {
    onBeforeRequest: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    onHeadersReceived: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  identity: {
    getAuthToken: vi.fn(),
    removeCachedAuthToken: vi.fn(),
    launchWebAuthFlow: vi.fn()
  }
};

// Mock browser API (for webextension-polyfill)
global.browser = {
  ...global.chrome,
  runtime: {
    ...global.chrome.runtime,
    getManifest: vi.fn(() => ({
      version: '1.0.0'
    }))
  }
}; 