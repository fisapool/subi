import { vi } from 'vitest';

const createStorageArea = () => ({
  get: vi.fn().mockResolvedValue({}),
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  onChanged: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
    hasListeners: vi.fn().mockReturnValue(false)
  }
});

const mockBrowser = {
  storage: {
    local: createStorageArea(),
    sync: createStorageArea(),
    managed: createStorageArea(),
    session: createStorageArea()
  },

  runtime: {
    sendMessage: vi.fn().mockResolvedValue({}),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    },
    getManifest: vi.fn(() => ({
      manifest_version: 3,
      name: 'Mock Extension',
      version: '1.0.0',
      description: 'Mock Extension for Testing'
    })),
    getURL: vi.fn((path: string) => `mocked-extension://${path}`),
    id: 'mock-extension-id',
    connect: vi.fn(),
    onConnect: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    },
    onInstalled: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    }
  },

  tabs: {
    query: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue({}),
    sendMessage: vi.fn().mockResolvedValue({}),
    get: vi.fn().mockResolvedValue({ id: 1 }),
    getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
    connect: vi.fn(),
    duplicate: vi.fn().mockResolvedValue({ id: 2 }),
    remove: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    move: vi.fn().mockResolvedValue([{ id: 1 }]),
    onCreated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    },
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    }
  },

  cookies: {
    get: vi.fn().mockResolvedValue({
      name: 'test-cookie',
      value: 'test-value',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      expirationDate: Date.now() + 86400000
    }),
    getAll: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockResolvedValue({
      name: 'test-cookie',
      value: 'test-value',
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      expirationDate: Date.now() + 86400000
    }),
    remove: vi.fn().mockResolvedValue({}),
    getAllCookieStores: vi.fn().mockResolvedValue([{ id: '1', tabIds: [1] }]),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn(),
      hasListeners: vi.fn().mockReturnValue(false)
    }
  },

  identity: {
    getAuthToken: vi.fn().mockResolvedValue('mock-token'),
    removeCachedAuthToken: vi.fn().mockResolvedValue(undefined),
    launchWebAuthFlow: vi.fn().mockResolvedValue('mock-auth-code')
  }
};

export default mockBrowser;
