import { createApp } from 'vue';
import SessionManager from './components/SessionManager.vue';

// Initialize Vue app for popup
console.log('Initializing Vue app...');
const app = createApp(SessionManager, {
    onSessionRestored: (sessionId: string) => {
        console.log(`Session ${sessionId} restored`);
    },
    onTabRestored: (tab: any) => {
        console.log(`Tab ${tab.title} restored`);
    }
});

// Mount the app
app.mount('#app');
console.log('Vue app mounted'); 