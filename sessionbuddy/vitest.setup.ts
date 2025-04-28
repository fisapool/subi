import { vi } from 'vitest';

// Mock Chrome API
(globalThis as any).chrome = {
  storage: {
    local: {
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({}),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
}; 