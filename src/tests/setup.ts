import { vi } from 'vitest';
import { JSDOM } from 'jsdom';
import mockBrowser from './mocks/webextension-polyfill';
import type { Browser } from 'webextension-polyfill';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Mock browser APIs
vi.mock('webextension-polyfill', () => ({
  default: mockBrowser
}));

// Mock browser extension APIs
global.browser = mockBrowser as unknown as typeof browser;
global.chrome = mockBrowser as unknown as typeof chrome;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn()
} as unknown as Storage;
global.localStorage = localStorageMock;

// Mock console methods
const consoleMock = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  assert: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  countReset: vi.fn(),
  dir: vi.fn(),
  dirxml: vi.fn(),
  group: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
  table: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  timeLog: vi.fn(),
  trace: vi.fn()
} as unknown as Console;
global.console = consoleMock;

// Mock fetch API
global.fetch = vi.fn();

// Mock Headers
class MockHeaders implements Headers {
  private headers: Map<string, string>;

  constructor(init?: HeadersInit) {
    this.headers = new Map();
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this.headers.set(key.toLowerCase(), value);
        });
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
  }

  append(name: string, value: string): void {
    const current = this.headers.get(name.toLowerCase());
    if (current) {
      this.headers.set(name.toLowerCase(), `${current}, ${value}`);
    } else {
      this.headers.set(name.toLowerCase(), value);
    }
  }

  delete(name: string): void {
    this.headers.delete(name.toLowerCase());
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  getSetCookie(): string[] {
    return Array.from(this.headers.entries())
      .filter(([key]) => key.toLowerCase() === 'set-cookie')
      .map(([, value]) => value);
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  forEach(callbackfn: (value: string, key: string, parent: Headers) => void, thisArg?: any): void {
    this.headers.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.headers.entries();
  }

  entries(): IterableIterator<[string, string]> {
    return this.headers.entries();
  }

  keys(): IterableIterator<string> {
    return this.headers.keys();
  }

  values(): IterableIterator<string> {
    return this.headers.values();
  }
}

global.Headers = MockHeaders as unknown as typeof Headers;

// Mock crypto API
global.crypto = {
  getRandomValues: function(buffer: ArrayBufferView): ArrayBufferView {
    const view = new Uint8Array(buffer.buffer);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }
    return buffer;
  }
} as unknown as Crypto;

// Set up global objects
global.navigator = dom.window.navigator;
global.self = dom.window as unknown as Window & typeof globalThis;

// Mock global functions
global.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
} as unknown as Storage;

global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn().mockImplementation(id => clearTimeout(id));

// Mock performance
const mockPerformance = {
  now: vi.fn().mockReturnValue(0),
  timeOrigin: Date.now(),
  timing: {
    navigationStart: 0,
  },
  memory: {
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0,
  },
  getEntries: vi.fn().mockReturnValue([]),
  getEntriesByName: vi.fn().mockReturnValue([]),
  getEntriesByType: vi.fn().mockReturnValue([]),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  clearResourceTimings: vi.fn(),
} as unknown as Performance;

global.performance = mockPerformance; 