import { vi } from 'vitest';

// Mock browser API
const mockCookies = {
  'example.com': [
    { name: 'cookie1', domain: 'example.com' }
  ]
};

const mockSettings = {
  autoDelete: true
};

const browser = {
  storage: {
    local: {
      get: vi.fn().mockImplementation((key) => {
        if (key === 'mockError') {
          return Promise.reject(new Error('Storage error'));
        }
        return Promise.resolve(mockSettings);
      }),
      set: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined)
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue()
    },
    onChanged: {
      addListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: vi.fn().mockImplementation((tabId, message) => {
      if (tabId === 'error') {
        return Promise.reject(new Error('Message failed'));
      }
      return Promise.resolve();
    }),
    onUpdated: {
      addListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn()
    }
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue()
  },
  runtime: {
    onMessage: {
      addListener: vi.fn()
    },
    sendMessage: vi.fn().mockResolvedValue({})
  },
  cookies: {
    getAll: vi.fn().mockImplementation(({ domain }) => {
      return Promise.resolve(mockCookies[domain] || []);
    }),
    remove: vi.fn().mockImplementation(({ domain, name }) => {
      if (domain === 'error.com') {
        return Promise.reject(new Error('Deletion failed'));
      }
      return Promise.resolve();
    }),
    set: vi.fn().mockResolvedValue(),
    onChanged: {
      addListener: vi.fn()
    }
  },
  alarms: {
    create: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    onAlarm: {
      addListener: vi.fn()
    }
  },
  identity: {
    getRedirectURL: vi.fn().mockReturnValue('https://example.com/redirect')
  },
  notifications: {
    create: vi.fn().mockResolvedValue('notification-id'),
    clear: vi.fn().mockResolvedValue(undefined)
  },
  permissions: {
    request: vi.fn().mockResolvedValue(true)
  }
};

// Function to clear all mocks
export function clearMocks() {
  vi.clearAllMocks();
}

// Export both named and default exports
export { browser };
export default browser; 