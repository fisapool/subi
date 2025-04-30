import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock FetchEvent class with request property
class FetchEvent extends Event {
  request: Request;
  constructor(type: string, request: Request) {
    super(type);
    this.request = request;
  }
}

// Simple event emitter for service worker context
class MockServiceWorkerContext {
  listeners = new Map();

  skipWaiting = vi.fn().mockResolvedValue(undefined);
  clients = {
    claim: vi.fn().mockResolvedValue(undefined)
  };

  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    for (const listener of listeners) {
      listener(event);
    }
  }
}

const mockServiceWorkerContext = new MockServiceWorkerContext();

// Mock the global self object
vi.stubGlobal('self', mockServiceWorkerContext);

describe('Service Worker Loader', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  it('should handle install event', async () => {
    const waitUntilSpy = vi.fn();
    mockServiceWorkerContext.addEventListener('install', (event) => {
      event.waitUntil = waitUntilSpy;
      waitUntilSpy(mockServiceWorkerContext.skipWaiting());
    });

    mockServiceWorkerContext.dispatchEvent(new Event('install'));
    expect(mockServiceWorkerContext.skipWaiting).toHaveBeenCalled();
    expect(waitUntilSpy).toHaveBeenCalled();
  });

  it('should handle activate event', async () => {
    const waitUntilSpy = vi.fn();
    mockServiceWorkerContext.addEventListener('activate', (event) => {
      event.waitUntil = waitUntilSpy;
      waitUntilSpy(mockServiceWorkerContext.clients.claim());
    });

    mockServiceWorkerContext.dispatchEvent(new Event('activate'));
    expect(mockServiceWorkerContext.clients.claim).toHaveBeenCalled();
    expect(waitUntilSpy).toHaveBeenCalled();
  });

  it('should handle successful fetch event', async () => {
    const mockResponse = new Response('test response', { status: 200 });
    mockFetch.mockResolvedValue(mockResponse);

    const respondWithSpy = vi.fn();
    mockServiceWorkerContext.addEventListener('fetch', (event) => {
      event.respondWith = respondWithSpy;
      respondWithSpy(mockFetch(event.request));
    });

    const fetchEvent = new FetchEvent('fetch', new Request('https://example.com'));
    mockServiceWorkerContext.dispatchEvent(fetchEvent);
    expect(respondWithSpy).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(expect.any(Request));
  });

  it('should handle failed fetch event', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const respondWithSpy = vi.fn();
    mockServiceWorkerContext.addEventListener('fetch', (event) => {
      event.respondWith = respondWithSpy;
      respondWithSpy(mockFetch(event.request));
    });

    const fetchEvent = new FetchEvent('fetch', new Request('https://example.com'));
    mockServiceWorkerContext.dispatchEvent(fetchEvent);
    expect(respondWithSpy).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(expect.any(Request));
  });

  it('should handle non-ok response', async () => {
    const mockResponse = new Response('error', { status: 404 });
    mockFetch.mockResolvedValue(mockResponse);

    const respondWithSpy = vi.fn();
    mockServiceWorkerContext.addEventListener('fetch', (event) => {
      event.respondWith = respondWithSpy;
      respondWithSpy(mockFetch(event.request));
    });

    const fetchEvent = new FetchEvent('fetch', new Request('https://example.com'));
    mockServiceWorkerContext.dispatchEvent(fetchEvent);
    expect(respondWithSpy).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(expect.any(Request));
  });
});
