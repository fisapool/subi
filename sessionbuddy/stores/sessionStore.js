import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { CookieManager } from '../CookieManager.js';

export const useSessionStore = defineStore('session', () => {
  // State
  const sessions = ref([]);
  const loading = ref(false);
  const faviconCache = ref(new Map());
  
  // Getters
  const sessionCount = computed(() => sessions.value.length);
  const totalTabs = computed(() => {
    return sessions.value.reduce((total, session) => total + session.data.length, 0);
  });
  
  // Cookie manager instance
  const cookieManager = new CookieManager();
  
  // Actions
  const loadSessions = async () => {
    loading.value = true;
    try {
      const result = await chrome.storage.local.get('sessions');
      sessions.value = result.sessions || [];
      
      // Initialize cookie manager if needed
      await cookieManager.initialize();
      
      return sessions.value;
    } catch (error) {
      console.error('Error loading sessions:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  const createNewSession = async () => {
    loading.value = true;
    try {
      // Get current tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });
      
      // Get cookies for each tab
      const sessionData = await Promise.all(tabs.map(async (tab) => {
        try {
          const hostname = new URL(tab.url).hostname;
          const cookies = await cookieManager.exportCookies(hostname);
          
          // Get favicon
          const favicon = await fetchFavicon(tab.url);
          
          return {
            url: tab.url,
            title: tab.title,
            favicon,
            cookies
          };
        } catch (error) {
          console.error('Error exporting cookies for tab:', tab.url, error);
          // Return tab data without cookies if export fails
          return {
            url: tab.url,
            title: tab.title,
            favicon: null,
            cookies: null
          };
        }
      }));

      // Save session
      const newSession = {
        id: Date.now(),
        name: `Session ${new Date().toLocaleString()}`,
        data: sessionData,
        createdAt: Date.now()
      };

      const updatedSessions = [...sessions.value, newSession];
      await chrome.storage.local.set({ sessions: updatedSessions });
      sessions.value = updatedSessions;
      
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  const restoreSession = async (sessionId) => {
    loading.value = true;
    try {
      const session = sessions.value.find(s => s.id === sessionId);
      if (!session) {
        throw new Error(`Session with ID ${sessionId} not found`);
      }
      
      // Create a new window for the session
      const window = await chrome.windows.create({});
      
      // Create tabs for each URL in the session
      const tabPromises = session.data.map(async (tabData) => {
        try {
          // Create the tab
          const tab = await chrome.tabs.create({
            windowId: window.id,
            url: tabData.url,
            active: false
          });
          
          // Set cookies for the tab if available
          if (tabData.cookies && tabData.cookies.length > 0) {
            const hostname = new URL(tabData.url).hostname;
            await cookieManager.setCookies(tabData.cookies, hostname);
          }
          
          return tab;
        } catch (error) {
          console.error('Error restoring tab:', tabData.url, error);
          return null;
        }
      });
      
      await Promise.all(tabPromises);
      
      // Activate the first tab
      if (session.data.length > 0) {
        const firstTab = await chrome.tabs.query({ windowId: window.id, index: 0 });
        if (firstTab.length > 0) {
          await chrome.tabs.update(firstTab[0].id, { active: true });
        }
      }
      
      return window;
    } catch (error) {
      console.error('Error restoring session:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  const restoreTab = async (tabData) => {
    loading.value = true;
    try {
      // Create a new tab
      const tab = await chrome.tabs.create({
        url: tabData.url,
        active: true
      });
      
      // Set cookies for the tab if available
      if (tabData.cookies && tabData.cookies.length > 0) {
        const hostname = new URL(tabData.url).hostname;
        await cookieManager.setCookies(tabData.cookies, hostname);
      }
      
      return tab;
    } catch (error) {
      console.error('Error restoring tab:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  const deleteSession = async (sessionId) => {
    loading.value = true;
    try {
      const updatedSessions = sessions.value.filter(s => s.id !== sessionId);
      await chrome.storage.local.set({ sessions: updatedSessions });
      sessions.value = updatedSessions;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };
  
  const fetchFavicon = async (url) => {
    // Check if favicon is already in cache
    if (faviconCache.value.has(url)) {
      return faviconCache.value.get(url);
    }
    
    try {
      // Try to get favicon from Google's favicon service
      const hostname = new URL(url).hostname;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
      
      // Test if the favicon exists
      const response = await fetch(faviconUrl, { method: 'HEAD' });
      if (response.ok) {
        faviconCache.value.set(url, faviconUrl);
        return faviconUrl;
      }
      
      // Fallback to default favicon path
      const defaultFavicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
      faviconCache.value.set(url, defaultFavicon);
      return defaultFavicon;
    } catch (error) {
      console.error('Error fetching favicon:', error);
      return null;
    }
  };
  
  return {
    // State
    sessions,
    loading,
    
    // Getters
    sessionCount,
    totalTabs,
    
    // Actions
    loadSessions,
    createNewSession,
    restoreSession,
    restoreTab,
    deleteSession,
    fetchFavicon
  };
}); 