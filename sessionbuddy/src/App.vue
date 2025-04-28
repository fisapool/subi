<template>
  <div class="app">
    <header class="app-header">
      <h1>Session Buddy</h1>
      <p>Manage your browser sessions and cookies</p>
    </header>
    
    <main class="app-content">
      <CookieManager />
    </main>
    
    <footer class="app-footer">
      <p>&copy; {{ new Date().getFullYear() }} Session Buddy</p>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CookieManager from './components/CookieManager.vue';

export default defineComponent({
  name: 'App',
  components: {
    CookieManager
  }
});
</script>

<style>
.app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.app-header {
  text-align: center;
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.app-header h1 {
  margin: 0;
  color: #333;
}

.app-header p {
  margin: 0.5rem 0 0;
  color: #666;
}

.app-content {
  min-height: 70vh;
}

.app-footer {
  text-align: center;
  margin-top: 2rem;
  padding: 1rem;
  color: #666;
  font-size: 0.9rem;
}
</style> 