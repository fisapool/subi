require('@testing-library/jest-dom');

// Mock browser APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  cookies: {
    get: jest.fn(),
    getAll: jest.fn(),
    set: jest.fn(),
    remove: jest.fn()
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
console.error = jest.fn();
console.warn = jest.fn();
console.log = jest.fn(); 