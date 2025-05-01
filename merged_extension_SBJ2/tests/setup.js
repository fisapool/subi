import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    runScripts: 'dangerously',
    resources: 'usable'
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;

// Create mock functions
const mockStorage = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn()
};

const mockCookies = {
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
};

const mockRuntime = {
    sendMessage: vi.fn(),
    onMessage: {
        addListener: vi.fn(),
        removeListener: vi.fn()
    }
};

const mockTabs = {
    onUpdated: {
        addListener: vi.fn()
    },
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn()
};

const mockCommands = {
    onCommand: {
        addListener: vi.fn()
    }
};

// Mock browser APIs
global.chrome = {
    runtime: mockRuntime,
    storage: {
        local: mockStorage
    },
    cookies: mockCookies,
    tabs: mockTabs,
    commands: mockCommands
};

// Mock webextension-polyfill
global.browser = {
    runtime: mockRuntime,
    storage: {
        local: mockStorage
    },
    cookies: mockCookies,
    tabs: mockTabs,
    commands: mockCommands
};

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
global.console = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
}; 