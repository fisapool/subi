import { vi } from 'vitest';

/**
 * Creates a mock cookie object
 * @param {Object} overrides - Properties to override in the default cookie object
 * @returns {Object} A mock cookie object
 */
export const createMockCookie = (overrides = {}) => ({
    name: 'test-cookie',
    value: 'test-value',
    domain: 'example.com',
    path: '/',
    secure: true,
    httpOnly: false,
    sameSite: 'lax',
    ...overrides
});

/**
 * Creates a mock browser storage object
 * @param {Object} initialData - Initial data to store
 * @returns {Object} A mock storage object
 */
export const createMockStorage = (initialData = {}) => {
    const storage = { ...initialData };
    
    return {
        get: vi.fn().mockImplementation((keys) => {
            if (!keys) return Promise.resolve(storage);
            if (typeof keys === 'string') return Promise.resolve({ [keys]: storage[keys] });
            return Promise.resolve(Object.fromEntries(
                Object.entries(storage).filter(([key]) => keys.includes(key))
            ));
        }),
        set: vi.fn().mockImplementation((data) => {
            Object.assign(storage, data);
            return Promise.resolve();
        }),
        remove: vi.fn().mockImplementation((keys) => {
            if (typeof keys === 'string') {
                delete storage[keys];
            } else {
                keys.forEach(key => delete storage[key]);
            }
            return Promise.resolve();
        }),
        clear: vi.fn().mockImplementation(() => {
            Object.keys(storage).forEach(key => delete storage[key]);
            return Promise.resolve();
        })
    };
};

/**
 * Creates a mock message handler
 * @returns {Object} A mock message handler object
 */
export const createMockMessageHandler = () => ({
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn(),
    hasListeners: vi.fn()
});

/**
 * Resets all mocks and clears any stored data
 */
export const resetTestEnvironment = () => {
    vi.clearAllMocks();
    vi.resetModules();
}; 