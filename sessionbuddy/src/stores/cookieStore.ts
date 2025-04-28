import { defineStore } from 'pinia';
import type { Cookie, CookieStore, CookieManagerOptions, CookieManagerState } from '@/types/cookie';

export const useCookieStore = defineStore('cookie', {
  state: (): CookieManagerState => ({
    stores: [],
    currentStoreId: null,
    options: {
      maxStores: 10,
      autoSave: true,
      backupInterval: 3600000 // 1 hour
    }
  }),

  getters: {
    currentStore: (state): CookieStore | null => {
      return state.stores.find(store => store.id === state.currentStoreId) || null;
    },
    
    storeCount: (state): number => state.stores.length,
    
    canCreateStore: (state): boolean => {
      return state.stores.length < (state.options.maxStores || Infinity);
    }
  },

  actions: {
    async createStore(name: string): Promise<CookieStore> {
      if (!this.canCreateStore) {
        throw new Error('Maximum number of stores reached');
      }

      const newStore: CookieStore = {
        id: crypto.randomUUID(),
        name,
        cookies: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.stores.push(newStore);
      this.currentStoreId = newStore.id;
      
      if (this.options.autoSave) {
        await this.saveToStorage();
      }

      return newStore;
    },

    async addCookies(storeId: string, cookies: Cookie[]): Promise<void> {
      const store = this.stores.find(s => s.id === storeId);
      if (!store) {
        throw new Error('Store not found');
      }

      store.cookies.push(...cookies);
      store.updatedAt = Date.now();

      if (this.options.autoSave) {
        await this.saveToStorage();
      }
    },

    async deleteStore(storeId: string): Promise<void> {
      const index = this.stores.findIndex(s => s.id === storeId);
      if (index === -1) {
        throw new Error('Store not found');
      }

      this.stores.splice(index, 1);
      
      if (this.currentStoreId === storeId) {
        this.currentStoreId = this.stores[0]?.id || null;
      }

      if (this.options.autoSave) {
        await this.saveToStorage();
      }
    },

    async updateOptions(options: Partial<CookieManagerOptions>): Promise<void> {
      this.options = { ...this.options, ...options };
      if (this.options.autoSave) {
        await this.saveToStorage();
      }
    },

    async saveToStorage(): Promise<void> {
      try {
        await chrome.storage.local.set({
          cookieStores: this.stores,
          currentStoreId: this.currentStoreId,
          options: this.options
        });
      } catch (error) {
        console.error('Failed to save to storage:', error);
        throw error;
      }
    },

    async loadFromStorage(): Promise<void> {
      try {
        const data = await chrome.storage.local.get(['cookieStores', 'currentStoreId', 'options']);
        if (data.cookieStores) {
          this.stores = data.cookieStores;
        }
        if (data.currentStoreId) {
          this.currentStoreId = data.currentStoreId;
        }
        if (data.options) {
          this.options = { ...this.options, ...data.options };
        }
      } catch (error) {
        console.error('Failed to load from storage:', error);
        throw error;
      }
    }
  }
}); 