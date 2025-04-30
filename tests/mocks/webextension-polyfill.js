import { jest } from '@jest/globals';

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
      get: jest.fn().mockImplementation((key) => {
        if (key === 'mockError') {
          return Promise.reject(new Error('Storage error'));
        }
        return Promise.resolve(mockSettings);
      }),
      set: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
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
    query: jest.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: jest.fn().mockImplementation((tabId, message) => {
      if (tabId === 'error') {
        return Promise.reject(new Error('Message failed'));
      }
      return Promise.resolve();
    }),
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
    onMessage: {
      addListener: jest.fn()
    },
    sendMessage: jest.fn().mockResolvedValue({})
  },
  cookies: {
    getAll: jest.fn().mockImplementation(({ domain }) => {
      return Promise.resolve(mockCookies[domain] || []);
    }),
    remove: jest.fn().mockImplementation(({ domain, name }) => {
      if (domain === 'error.com') {
        return Promise.reject(new Error('Deletion failed'));
      }
      return Promise.resolve();
    }),
    set: jest.fn().mockResolvedValue(),
    onChanged: {
      addListener: jest.fn()
    }
  },
  alarms: {
    create: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    onAlarm: {
      addListener: jest.fn()
    }
  },
  identity: {
    getRedirectURL: jest.fn().mockReturnValue('https://example.com/redirect')
  },
  notifications: {
    create: jest.fn().mockResolvedValue('notification-id'),
    clear: jest.fn().mockResolvedValue(undefined)
  },
  permissions: {
    request: jest.fn().mockResolvedValue(true)
  }
};

// Function to clear all mocks
export function clearMocks() {
  jest.clearAllMocks();
}

export default browser; 