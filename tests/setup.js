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

// Set up basic DOM elements that tests might need
document.body.innerHTML = `
  <div id="status"></div>
  <div id="error-list"></div>
  <div id="button-container"></div>
  <div id="test-results"></div>
  <div id="cookie-consent-banner"></div>
  <input type="checkbox" id="auto-save-enabled" />
  <input type="text" id="auto-save-interval" value="30" />
  <input type="checkbox" id="encrypt-data" />
`;

// Mock window methods
global.window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

global.window.confirm = vi.fn(() => true);

// Mock Firebase
vi.mock('firebase/app', () => ({
    default: {
        initializeApp: vi.fn(),
        auth: vi.fn()
    }
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ docs: [] })
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: vi.fn()
}));

// Enhanced chrome API mock
const chromeMock = {
    runtime: {
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
            hasListener: vi.fn()
        },
        sendMessage: vi.fn().mockResolvedValue({}),
        getManifest: vi.fn(() => ({
            manifest_version: 3,
            name: 'Mock Extension',
            version: '1.0.0'
        }))
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
        getCurrent: vi.fn().mockResolvedValue({ id: 1 })
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
        getAllCookieStores: vi.fn().mockResolvedValue([])
    },
    storage: {
        local: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue({}),
            remove: vi.fn().mockResolvedValue({}),
            clear: vi.fn().mockResolvedValue({}),
            onChanged: {
                addListener: vi.fn(),
                removeListener: vi.fn()
            }
        },
        sync: {
            get: vi.fn().mockResolvedValue({}),
            set: vi.fn().mockResolvedValue({}),
            remove: vi.fn().mockResolvedValue({}),
            clear: vi.fn().mockResolvedValue({})
        }
    }
};

// Set up chrome and browser globals
global.chrome = chromeMock;
global.browser = chromeMock;

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({}),
    text: vi.fn().mockResolvedValue('')
});

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
