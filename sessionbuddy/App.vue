<template>
  <div class="app-container">
    <SessionManager 
      @session-restored="handleSessionRestored"
      @tab-restored="handleTabRestored"
    />
  </div>
</template>

<script setup>
import SessionManager from './components/SessionManager.vue';

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
</style> 