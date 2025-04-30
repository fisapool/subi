import { vi } from 'vitest';
import type { Browser } from 'webextension-polyfill';

// Create a properly typed mock browser object
const mockBrowser = {
  storage: {
    local: {
      get: vi.fn<(keys?: string | Record<string, unknown> | string[] | null | undefined) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
      set: vi.fn<(items: Record<string, unknown>) => Promise<void>>().mockResolvedValue(undefined),
      clear: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
      remove: vi.fn<(keys: string | string[]) => Promise<void>>().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn<(keys?: string | Record<string, unknown> | string[] | null | undefined) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
      set: vi.fn<(items: Record<string, unknown>) => Promise<void>>().mockResolvedValue(undefined),
      clear: vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn<(queryInfo: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>>().mockResolvedValue([{ id: 1, url: 'https://example.com' }]),
    sendMessage: vi.fn<(tabId: number, message: unknown) => Promise<unknown>>().mockResolvedValue(undefined),
    create: vi.fn<(createProperties: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({ id: 1 }),
    update: vi.fn<(tabId: number, updateProperties: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
    remove: vi.fn<(tabIds: number | number[]) => Promise<void>>().mockResolvedValue(undefined),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  scripting: {
    executeScript: vi.fn<(details: Record<string, unknown>) => Promise<Array<unknown>>>().mockResolvedValue([])
  },
  runtime: {
    sendMessage: vi.fn<(message: unknown) => Promise<unknown>>().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    },
    getURL: vi.fn<(path: string) => string>().mockImplementation((path) => `chrome-extension://mock-id/${path}`),
    getManifest: vi.fn<() => Record<string, unknown>>().mockReturnValue({
      manifest_version: 3,
      version: '1.0.0'
    })
  },
  cookies: {
    getAll: vi.fn<(details: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>>().mockResolvedValue([]),
    remove: vi.fn<(details: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
    set: vi.fn<(details: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({
      name: '',
      value: '',
      domain: '',
      hostOnly: false,
      path: '/',
      secure: false,
      httpOnly: false,
      sameSite: 'no_restriction',
      session: false,
      expirationDate: 0,
      storeId: '',
      firstPartyDomain: ''
    }),
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  alarms: {
    create: vi.fn<(alarmInfo: Record<string, unknown>) => Promise<void>>().mockResolvedValue(undefined),
    clear: vi.fn<(name: string) => Promise<void>>().mockResolvedValue(undefined),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn()
    }
  },
  identity: {
    getAuthToken: vi.fn<(details: Record<string, unknown>) => Promise<string>>().mockResolvedValue('mock-token'),
    removeCachedAuthToken: vi.fn<(details: Record<string, unknown>) => Promise<void>>().mockResolvedValue(undefined),
    launchWebAuthFlow: vi.fn<(details: Record<string, unknown>) => Promise<string>>().mockResolvedValue('https://example.com/callback#token=123')
  },
  windows: {
    create: vi.fn<(createData: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({ id: 1 }),
    update: vi.fn<(windowId: number, updateInfo: Record<string, unknown>) => Promise<Record<string, unknown>>>().mockResolvedValue({}),
    remove: vi.fn<(windowId: number) => Promise<void>>().mockResolvedValue(undefined),
    get: vi.fn<(windowId: number) => Promise<Record<string, unknown>>>().mockResolvedValue({ id: 1 })
  }
} as unknown as Browser;

// Function to clear all mocks
export function clearMocks() {
  vi.clearAllMocks();
}

// Export both the mock browser and a default export
export { mockBrowser };
export default mockBrowser;
