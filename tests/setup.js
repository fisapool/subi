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

// Mock chrome API
global.chrome = {
    runtime: {
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        sendMessage: vi.fn(),
    },
    tabs: {
        onUpdated: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        query: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(),
        update: vi.fn().mockResolvedValue({}),
    },
    commands: {
        onCommand: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
    cookies: {
        getAll: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(),
            remove: vi.fn().mockResolvedValue(),
        },
    },
};

// Mock webextension-polyfill
global.browser = {
    runtime: {
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        sendMessage: vi.fn(),
    },
    tabs: {
        onUpdated: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
        query: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue(),
        update: vi.fn().mockResolvedValue({}),
    },
    commands: {
        onCommand: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
        },
    },
    cookies: {
        getAll: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue(),
            remove: vi.fn().mockResolvedValue(),
        },
    },
};

// Mock fetch
global.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset storage mock implementation
    chrome.storage.local.get.mockImplementation((key) => Promise.resolve({}));
    chrome.storage.local.set.mockImplementation(() => Promise.resolve());
    chrome.storage.local.remove.mockImplementation(() => Promise.resolve());
    
    // Reset cookies mock implementation
    chrome.cookies.getAll.mockImplementation(() => Promise.resolve([]));
    chrome.cookies.set.mockImplementation(() => Promise.resolve({}));
    chrome.cookies.remove.mockImplementation(() => Promise.resolve({}));
    
    // Reset tabs mock implementation
    chrome.tabs.query.mockImplementation(() => Promise.resolve([]));
    chrome.tabs.create.mockImplementation(() => Promise.resolve({}));
    chrome.tabs.remove.mockImplementation(() => Promise.resolve());
    chrome.tabs.update.mockImplementation(() => Promise.resolve({}));
});

// Mock console methods
global.console = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
}; 