import { vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This setup file is used by Vitest to configure the test environment
export default {
  // Set up the test environment
  setupFiles: ['./vitest.setup.js'],
  
  // Configure Vitest to use the Puppeteer environment
  testEnvironment: 'jsdom',
  
  // Specify the path to your extension
  extensionPath: path.join(__dirname, '..', 'dist'),
  
  // Configure test timeouts
  testTimeout: 30000,
  
  // Configure which files to test
  testMatch: ['**/tests/**/*.test.js'],
  
  // Configure coverage settings
  coverage: {
    enabled: true,
    reporter: ['text', 'json', 'html'],
    reportsDirectory: 'coverage',
    include: [
      'src/**/*.js',
      '!src/**/*.test.js',
    ],
  },
};

// Set up service worker context
globalThis.self = {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn()
  },
  cookies: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn()
    }
  }
};

// Mock webextension-polyfill
vi.mock('webextension-polyfill', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    browser: {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn()
        }
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn()
        },
        sync: {
          get: vi.fn(),
          set: vi.fn()
        }
      },
      cookies: {
        getAll: vi.fn(),
        remove: vi.fn()
      },
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn()
      },
      alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        onAlarm: {
          addListener: vi.fn()
        }
      },
      identity: {
        getAuthToken: vi.fn(),
        launchWebAuthFlow: vi.fn()
      }
    }
  };
});

// Mock window.confirm
global.window = {
  confirm: vi.fn()
};

// Mock document for DOM operations
global.document = {
  addEventListener: vi.fn(),
  getElementById: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  createElement: vi.fn(),
  body: {
    appendChild: vi.fn()
  }
};

// Mock window
global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}; 