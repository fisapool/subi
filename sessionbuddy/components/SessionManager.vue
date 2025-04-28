<template>
  <div class="session-manager">
    <div class="header flex items-center justify-between mb-5 pb-3 border-b border-gray-200">
      <h1 class="text-xl font-bold text-gray-800">Session Manager</h1>
      <button 
        @click="createNewSession" 
        class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        New Session
      </button>
    </div>
    
    <div class="session-list max-h-[500px] overflow-y-auto">
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
      
      <div v-else-if="sessions.length === 0" class="text-center py-8 text-gray-500">
        No sessions found. Create a new session to get started.
      </div>
      
      <div v-else>
        <div 
          v-for="session in sessions" 
          :key="session.id" 
          class="session-item bg-white rounded-lg shadow-sm mb-3 overflow-hidden"
        >
          <div 
            class="session-header p-4 flex items-center justify-between cursor-pointer"
            @click="toggleSession(session.id)"
          >
            <div>
              <h3 class="font-semibold text-gray-800">{{ session.name }}</h3>
              <p class="text-sm text-gray-500">
                {{ formatDate(session.createdAt) }} • {{ session.data.length }} tabs
              </p>
            </div>
            <div class="flex items-center">
              <span class="text-gray-400 mr-2">
                {{ isExpanded(session.id) ? '▼' : '▶' }}
              </span>
              <button 
                @click.stop="restoreSession(session.id)"
                class="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors mr-2"
              >
                Restore
              </button>
              <button 
                @click.stop="deleteSession(session.id)"
                class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div 
            v-if="isExpanded(session.id)" 
            class="session-content border-t border-gray-100 p-4"
          >
            <div class="tabs-list space-y-2">
              <div 
                v-for="(tab, index) in session.data" 
                :key="index"
                class="tab-item flex items-start p-2 hover:bg-gray-50 rounded-md"
              >
                <div class="favicon-container mr-3 mt-1">
                  <img 
                    v-if="tab.favicon" 
                    :src="tab.favicon" 
                    class="w-4 h-4" 
                    alt=""
                    @error="handleFaviconError($event, tab)"
                  />
                  <div v-else class="w-4 h-4 bg-gray-200 rounded-sm"></div>
                </div>
                <div class="tab-details flex-1 min-w-0">
                  <div class="tab-title font-medium text-gray-800 truncate">{{ tab.title }}</div>
                  <div class="tab-url text-sm text-gray-500 truncate">{{ tab.url }}</div>
                </div>
                <div class="tab-actions ml-2">
                  <button 
                    @click.stop="restoreTab(tab)"
                    class="text-blue-500 hover:text-blue-700"
                    title="Restore this tab"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="status-bar fixed bottom-0 left-0 right-0 p-3 bg-white border-t border-gray-200 flex justify-between items-center">
      <span class="text-sm text-gray-600">{{ status }}</span>
      <button 
        @click="openSettings" 
        class="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 transition-colors"
      >
        Settings
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSessionStore } from '../stores/sessionStore';
import { storeToRefs } from 'pinia';

// Props and emits
const emit = defineEmits(['session-restored', 'tab-restored']);

// Store
const sessionStore = useSessionStore();
const { sessions, loading } = storeToRefs(sessionStore);

// Local state
const expandedSessions = ref(new Set());
const status = ref('Ready');

// Computed
const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => b.createdAt - a.createdAt);
});

// Methods
const isExpanded = (sessionId) => {
  return expandedSessions.value.has(sessionId);
};

const toggleSession = (sessionId) => {
  if (expandedSessions.value.has(sessionId)) {
    expandedSessions.value.delete(sessionId);
  } else {
    expandedSessions.value.add(sessionId);
  }
};

const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString();
};

const createNewSession = async () => {
  status.value = 'Creating new session...';
  try {
    await sessionStore.createNewSession();
    status.value = 'Session created successfully';
  } catch (error) {
    status.value = 'Error creating session';
    console.error('Error creating session:', error);
  }
};

const restoreSession = async (sessionId) => {
  status.value = 'Restoring session...';
  try {
    await sessionStore.restoreSession(sessionId);
    emit('session-restored', sessionId);
    status.value = 'Session restored successfully';
  } catch (error) {
    status.value = 'Error restoring session';
    console.error('Error restoring session:', error);
  }
};

const restoreTab = async (tab) => {
  status.value = 'Restoring tab...';
  try {
    await sessionStore.restoreTab(tab);
    emit('tab-restored', tab);
    status.value = 'Tab restored successfully';
  } catch (error) {
    status.value = 'Error restoring tab';
    console.error('Error restoring tab:', error);
  }
};

const deleteSession = async (sessionId) => {
  if (!confirm('Are you sure you want to delete this session?')) return;
  
  status.value = 'Deleting session...';
  try {
    await sessionStore.deleteSession(sessionId);
    status.value = 'Session deleted successfully';
  } catch (error) {
    status.value = 'Error deleting session';
    console.error('Error deleting session:', error);
  }
};

const handleFaviconError = (event, tab) => {
  // Remove the broken image
  event.target.style.display = 'none';
  
  // Try to fetch the favicon if not already in the store
  if (!tab.favicon) {
    sessionStore.fetchFavicon(tab.url);
  }
};

const openSettings = () => {
  chrome.runtime.openOptionsPage();
};

// Lifecycle hooks
onMounted(async () => {
  status.value = 'Loading sessions...';
  try {
    await sessionStore.loadSessions();
    status.value = 'Ready';
  } catch (error) {
    status.value = 'Error loading sessions';
    console.error('Error loading sessions:', error);
  }
});
</script>

<style scoped>
.session-manager {
  width: 100%;
  min-height: 500px;
  position: relative;
  padding-bottom: 50px; /* Space for status bar */
}

/* Custom scrollbar for session list */
.session-list::-webkit-scrollbar {
  width: 6px;
}

.session-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.session-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.session-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 