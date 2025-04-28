import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './assets/main.css';

// Create the Vue application
const app = createApp(App);

// Use Pinia for state management
const pinia = createPinia();
app.use(pinia);

// Mount the application
app.mount('#app'); 