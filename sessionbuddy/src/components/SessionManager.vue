<template>
  <div class="session-manager">
    <h1>Session Buddy</h1>
    <div v-if="!isExtensionContext" class="error-state">
      <p>This extension must be loaded in Chrome. Please load it through chrome://extensions</p>
    </div>
    <div v-else class="session-list">
      <div v-if="sessions.length === 0" class="empty-state">
        <p>No saved sessions yet.</p>
        <button @click="saveCurrentSession" class="btn btn-primary">Save Current Session</button>
      </div>
      <div v-else v-for="session in sessions" :key="session.id" class="session-item">
        <div class="session-title">{{ session.name }}</div>
        <div class="session-info">{{ session.tabs.length }} tabs, saved {{ formatDate(session.createdAt) }}</div>
        <div class="actions">
          <button @click="restoreSession(session.id)" class="btn btn-primary">Restore</button>
          <button @click="deleteSession(session.id)" class="btn btn-secondary">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import { useSessionStore } from '@/stores/sessionStore';
import { storeToRefs } from 'pinia';

export default defineComponent({
  name: 'SessionManager',
  props: {
    onSessionRestored: {
      type: Function,
      default: () => {}
    },
    onTabRestored: {
      type: Function,
      default: () => {}
    }
  },
  setup(props) {
    const sessionStore = useSessionStore();
    const { sessions, isExtensionContext } = storeToRefs(sessionStore);

    onMounted(async () => {
      await sessionStore.initialize();
    });

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };

    const saveCurrentSession = async () => {
      try {
        const session = await sessionStore.saveCurrentSession();
        props.onSessionRestored(session.id);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    };

    const restoreSession = async (sessionId: string) => {
      try {
        await sessionStore.restoreSession(sessionId);
        props.onSessionRestored(sessionId);
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    };

    const deleteSession = async (sessionId: string) => {
      try {
        await sessionStore.deleteSession(sessionId);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    };

    return {
      sessions,
      isExtensionContext,
      formatDate,
      saveCurrentSession,
      restoreSession,
      deleteSession
    };
  }
});
</script>

<style scoped>
.session-manager {
  padding: 16px;
  max-width: 400px;
  margin: 0 auto;
}

h1 {
  font-size: 20px;
  margin-bottom: 16px;
}

.session-list {
  max-height: 400px;
  overflow-y: auto;
}

.session-item {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.session-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.session-info {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #2196F3;
  color: white;
}

.btn-secondary {
  background: #E0E0E0;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #666;
}

.error-state {
  text-align: center;
  padding: 24px;
  color: #d32f2f;
  background: #ffebee;
  border-radius: 8px;
  margin-bottom: 16px;
}
</style> 