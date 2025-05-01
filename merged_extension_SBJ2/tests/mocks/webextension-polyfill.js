export const browser = {
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn()
        }
    },
    storage: {
        local: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
            clear: vi.fn()
        }
    },
    cookies: {
        getAll: vi.fn(),
        set: vi.fn(),
        remove: vi.fn()
    }
};

export default browser; 