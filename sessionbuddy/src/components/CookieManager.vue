<template>
  <div class="cookie-manager">
    <div class="header">
      <h1>Cookie Manager</h1>
      <button 
        @click="createNewStore" 
        :disabled="!canCreateStore"
        class="btn btn-primary"
      >
        Create New Store
      </button>
    </div>

    <div class="stores-list" v-if="stores.length">
      <div 
        v-for="store in stores" 
        :key="store.id"
        :class="['store-item', { active: store.id === currentStoreId }]"
        @click="selectStore(store.id)"
      >
        <h3>{{ store.name }}</h3>
        <p>{{ store.cookies.length }} cookies</p>
        <button 
          @click.stop="deleteStore(store.id)"
          class="btn btn-danger"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>No cookie stores yet. Create one to get started!</p>
    </div>

    <div v-if="currentStore" class="current-store">
      <h2>{{ currentStore.name }}</h2>
      <div class="cookies-list">
        <div 
          v-for="cookie in currentStore.cookies" 
          :key="`${cookie.domain}-${cookie.name}`"
          class="cookie-item"
        >
          <div class="cookie-info">
            <h4>{{ cookie.name }}</h4>
            <p class="domain">{{ cookie.domain }}</p>
            <p class="details">
              <span :class="{ secure: cookie.secure }">Secure</span>
              <span :class="{ httpOnly: cookie.httpOnly }">HttpOnly</span>
              <span class="same-site">{{ cookie.sameSite }}</span>
            </p>
          </div>
          <div class="cookie-actions">
            <button 
              @click="removeCookie(cookie)"
              class="btn btn-danger"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useCookieStore } from '@/stores/cookieStore';
import { removeCookie as removeCookieUtil } from '@/utils/cookieUtils';
import type { Cookie } from '@/types/cookie';
import { dialogService } from '@/utils/dialogService';
import { notificationService } from '@/utils/notificationService';

export default defineComponent({
  name: 'CookieManager',
  
  setup() {
    const store = useCookieStore();

    const stores = computed(() => store.stores);
    const currentStoreId = computed(() => store.currentStoreId);
    const currentStore = computed(() => store.currentStore);
    const canCreateStore = computed(() => store.canCreateStore);

    const createNewStore = async () => {
      const name = dialogService.prompt('Enter store name:');
      if (!name) {
        notificationService.error('Store name is required!');
        return;
      }
      const trimmedName = name.trim();
      if (trimmedName === '') {
        notificationService.error('Store name cannot be empty!');
        return;
      }
      // Check for duplicate store names
      if (stores.value.some(store => store.name === trimmedName)) {
        notificationService.error(`Store name "${trimmedName}" already exists!`);
        return;
      }
      try {
        await store.createStore(trimmedName);
        notificationService.success(`Store "${trimmedName}" created successfully!`);
      } catch (error: any) {
        notificationService.error('Failed to create store due to server error!');
      }
    };

    const selectStore = (storeId: string) => {
      store.currentStoreId = storeId;
      // Check if the selected store has any cookies
      const selectedStore = stores.value.find(s => s.id === storeId);
      if (selectedStore && selectedStore.cookies.length === 0) {
        notificationService.error('No cookies in this store.');
      }
    };

    const deleteStore = async (storeId: string) => {
      if (dialogService.confirm('Are you sure you want to delete this store?')) {
        try {
          await store.deleteStore(storeId);
          notificationService.success('Store deleted successfully!');
        } catch (error: any) {
          notificationService.error(`Failed to delete store: ${error.message}`);
        }
      }
    };

    const removeCookie = async (cookie: Cookie) => {
      if (dialogService.confirm('Are you sure you want to remove this cookie?')) {
        try {
          await removeCookieUtil(cookie);
          // Refresh the current store's cookies
          if (currentStore.value) {
            const updatedCookies = currentStore.value.cookies.filter(
              c => c.name !== cookie.name || c.domain !== cookie.domain
            );
            await store.addCookies(currentStore.value.id, updatedCookies);
            notificationService.success('Cookie removed successfully!');
          }
        } catch (error: any) {
          notificationService.error(`Failed to remove cookie: ${error.message}`);
        }
      }
    };

    // Check for maximum store limit on component mount
    if (stores.value.length >= 10 && !canCreateStore.value) {
      notificationService.error('Cannot create more than 10 stores.');
    }

    return {
      stores,
      currentStoreId,
      currentStore,
      canCreateStore,
      createNewStore,
      selectStore,
      deleteStore,
      removeCookie
    };
  }
});
</script>

<style scoped>
.cookie-manager {
  padding: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.stores-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.store-item {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.store-item:hover {
  border-color: #999;
}

.store-item.active {
  border-color: #4CAF50;
  background-color: #f0f9f0;
}

.cookie-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.cookie-info h4 {
  margin: 0;
  color: #333;
}

.domain {
  color: #666;
  font-size: 0.9em;
  margin: 0.25rem 0;
}

.details span {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  margin-right: 0.5rem;
  border-radius: 3px;
  font-size: 0.8em;
}

.secure {
  background-color: #e3f2fd;
  color: #1976d2;
}

.httpOnly {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.same-site {
  background-color: #e8f5e9;
  color: #388e3c;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover {
  background-color: #da190b;
}

.btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
}
</style> 