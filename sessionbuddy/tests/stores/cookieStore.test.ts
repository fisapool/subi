import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCookieStore } from '@/stores/cookieStore';
import type { Cookie, CookieStore } from '@/types/cookie';

// Mock chrome.storage.local
vi.mock('chrome', () => ({
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn()
    }
  }
}));

describe('Cookie Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should create a new store', async () => {
    const store = useCookieStore();
    const newStore = await store.createStore('Test Store');

    expect(newStore.name).toBe('Test Store');
    expect(newStore.cookies).toHaveLength(0);
    expect(store.currentStoreId).toBe(newStore.id);
    expect(store.stores).toHaveLength(1);
  });

  it('should not create a store when max stores is reached', async () => {
    const store = useCookieStore();
    store.options.maxStores = 1;

    await store.createStore('Store 1');
    await expect(store.createStore('Store 2')).rejects.toThrow('Maximum number of stores reached');
  });

  it('should add cookies to a store', async () => {
    const store = useCookieStore();
    const newStore = await store.createStore('Test Store');

    const cookies: Cookie[] = [
      {
        name: 'test',
        value: 'value',
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'strict'
      }
    ];

    await store.addCookies(newStore.id, cookies);

    const updatedStore = store.stores.find(s => s.id === newStore.id);
    expect(updatedStore?.cookies).toHaveLength(1);
    expect(updatedStore?.cookies[0].name).toBe('test');
  });

  it('should delete a store', async () => {
    const store = useCookieStore();
    const newStore = await store.createStore('Test Store');

    await store.deleteStore(newStore.id);

    expect(store.stores).toHaveLength(0);
    expect(store.currentStoreId).toBeNull();
  });

  it('should update options', async () => {
    const store = useCookieStore();
    const newOptions = {
      maxStores: 5,
      autoSave: false
    };

    await store.updateOptions(newOptions);

    expect(store.options.maxStores).toBe(5);
    expect(store.options.autoSave).toBe(false);
  });

  it('should load from storage', async () => {
    const store = useCookieStore();
    const mockData = {
      cookieStores: [{
        id: '1',
        name: 'Loaded Store',
        cookies: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }],
      currentStoreId: '1',
      options: {
        maxStores: 5,
        autoSave: true,
        backupInterval: 3600000
      }
    };

    vi.mocked(chrome.storage.local.get).mockResolvedValue(mockData);

    await store.loadFromStorage();

    expect(store.stores).toHaveLength(1);
    expect(store.currentStoreId).toBe('1');
    expect(store.options.maxStores).toBe(5);
  });
}); 