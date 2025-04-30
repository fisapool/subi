import { vi } from 'vitest';

// Mock Chrome API types
interface ChromeMock {
  runtime: {
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
      removeListener: (callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void) => void;
    };
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    getURL: (path: string) => string;
  };
  storage: {
    local: {
      get: (keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    sync: {
      get: (keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    onChanged: {
      addListener: (callback: (changes: { [key: string]: any }, areaName: string) => void) => void;
      removeListener: (callback: (changes: { [key: string]: any }, areaName: string) => void) => void;
    };
  };
  tabs: {
    query: (queryInfo: object, callback: (tabs: any[]) => void) => void;
    create: (createProperties: object, callback?: (tab: any) => void) => void;
    update: (tabId: number, updateProperties: object, callback?: (tab: any) => void) => void;
    remove: (tabIds: number | number[], callback?: () => void) => void;
    get: (tabId: number, callback: (tab: any) => void) => void;
  };
  windows: {
    create: (createData: object, callback?: (window: any) => void) => void;
    update: (windowId: number, updateInfo: object, callback?: (window: any) => void) => void;
    remove: (windowId: number, callback?: () => void) => void;
    get: (windowId: number, getInfo: object, callback: (window: any) => void) => void;
  };
  cookies: {
    get: (details: object, callback: (cookie: any) => void) => void;
    getAll: (details: object, callback: (cookies: any[]) => void) => void;
    set: (details: object, callback?: (cookie: any) => void) => void;
    remove: (details: object, callback?: (details: any) => void) => void;
  };
  webRequest: {
    onBeforeRequest: {
      addListener: (callback: (details: any) => void, filter: object, extraInfoSpec?: string[]) => void;
      removeListener: (callback: (details: any) => void) => void;
    };
    onHeadersReceived: {
      addListener: (callback: (details: any) => void, filter: object, extraInfoSpec?: string[]) => void;
      removeListener: (callback: (details: any) => void) => void;
    };
  };
  identity: {
    getAuthToken: (details: object, callback: (token: string) => void) => void;
    removeCachedAuthToken: (details: object, callback?: () => void) => void;
    launchWebAuthFlow: (details: object, callback: (responseUrl: string) => void) => void;
  };
}

// Create the mock
const chromeMock: ChromeMock = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    sendMessage: vi.fn(),
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`)
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

// Assign to global
global.chrome = chromeMock;

// Mock browser API (for webextension-polyfill)
global.browser = {
  ...chromeMock,
  runtime: {
    ...chromeMock.runtime,
    getManifest: vi.fn(() => ({
      version: '1.0.0'
    }))
  }
}; 