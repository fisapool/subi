import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This setup file is used by Jest to configure the test environment
export default {
  // Set up the test environment
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Configure Jest to use the Puppeteer environment
  testEnvironment: 'jest-puppeteer',
  
  // Specify the path to your extension
  extensionPath: path.join(__dirname, '..', 'dist'),
  
  // Configure test timeouts
  testTimeout: 30000,
  
  // Configure which files to test
  testMatch: ['**/tests/**/*.test.js'],
  
  // Configure coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
};

// Set up global fetch
globalThis.fetch = jest.fn();

// Set up Headers
globalThis.Headers = class Headers {
  constructor(init) {
    this.headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.headers.set(key.toLowerCase(), value);
      });
    }
  }

  get(name) {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name, value) {
    this.headers.set(name.toLowerCase(), value);
  }
};

// Set up chrome API
globalThis.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  }
};

// Set up browser API
globalThis.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn()
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn()
    }
  }
};

// Set up crypto API
globalThis.crypto = {
  getRandomValues: function(buffer) {
    return buffer.map(() => Math.floor(Math.random() * 256));
  }
}; 