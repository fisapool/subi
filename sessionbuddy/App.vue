<template>
  <div class="app-container">
    <Suspense>
      <template #default>
        <SessionManager 
          @session-restored="handleSessionRestored"
          @tab-restored="handleTabRestored"
        />
      </template>
      <template #fallback>
        <div class="loading">Loading...</div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { defineAsyncComponent } from 'vue';

// Lazy load the SessionManager component
const SessionManager = defineAsyncComponent(() => 
  import('./components/SessionManager.vue')
);

const handleSessionRestored = (sessionId) => {
  console.log(`Session ${sessionId} restored`);
};

const handleTabRestored = (tab) => {
  console.log(`Tab ${tab.title} restored`);
};
</script>

<style>
.app-container {
  width: 100%;
  height: 100vh;
  background-color: #f5f5f5;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #666;
}
</style> 