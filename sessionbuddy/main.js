import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/tailwind.css';

// Create Vue app with performance optimizations
const app = createApp(App);

// Configure Vue performance options
app.config.performance = true;
app.config.unwrapInjectedRef = true;

// Use Pinia for state management with persistence
const pinia = createPinia();
app.use(pinia);

// Mount the app
app.mount('#app'); 