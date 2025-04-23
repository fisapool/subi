import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCookieStore } from '../cookieStore';

describe('cookieStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Reset chrome storage mock before each test
    vi.clearAllMocks();
  });

  it('creates a new store', async () => {
    const store = useCookieStore();
    const storeName = 'Test Store';
    
    await store.createStore(storeName);
    
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(store.stores).toHaveLength(1);
    expect(store.stores[0].name).toBe(storeName);
  });

  it('deletes a store', async () => {
    const store = useCookieStore();
    
    // First create a store
    await store.createStore('Test Store');
    const storeId = store.stores[0].id;
    
    // Then delete it
    await store.deleteStore(storeId);
    
    expect(chrome.storage.local.set).toHaveBeenCalled();
    expect(store.stores).toHaveLength(0);
  });

  it('loads stores from chrome storage', async () => {
    const mockStores = [{
      id: '1',
      name: 'Test Store',
      cookies: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }];
    
    // Mock chrome storage get to return our test data
    (chrome.storage.local.get as any).mockResolvedValueOnce({
      cookieStores: mockStores,
      currentStoreId: '1',
      options: {
        maxStores: 10,
        autoSave: true,
        backupInterval: 3600000
      }
    });
    
    const store = useCookieStore();
    await store.loadFromStorage();
    
    expect(store.stores).toEqual(mockStores);
    expect(store.currentStoreId).toBe('1');
  });
}); 