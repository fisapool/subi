import { defineStore } from 'pinia';

// Define a simplified cookie interface
interface SimplifiedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none' | 'unspecified';
  expirationDate?: number;
  storeId?: string;
  hostOnly?: boolean;
  session?: boolean;
}

interface Tab {
  id: number;
  title: string;
  url: string;
  cookies: SimplifiedCookie[];
}

interface Session {
  id: string;
  name: string;
  tabs: Tab[];
  createdAt: Date;
}

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  isExtensionContext: boolean;
}

export const useSessionStore = defineStore('session', {
  state: (): SessionState => ({
    sessions: [],
    currentSessionId: null,
    isExtensionContext: false
  }),

  getters: {
    currentSession: (state): Session | null => {
      return state.sessions.find(session => session.id === state.currentSessionId) || null;
    },
    
    sessionCount: (state): number => state.sessions.length,
    
    isChromeAvailable: (): boolean => {
      return typeof chrome !== 'undefined' && 
             typeof chrome.storage !== 'undefined' && 
             typeof chrome.storage.local !== 'undefined' &&
             typeof chrome.tabs !== 'undefined' &&
             typeof chrome.runtime !== 'undefined' &&
             typeof chrome.runtime.id !== 'undefined';
    }
  },

  actions: {
    async initialize() {
      this.isExtensionContext = this.isChromeAvailable;
      if (!this.isExtensionContext) {
        console.warn('Not running in Chrome extension context');
        return;
      }
      await this.loadFromStorage();
    },

    async loadFromStorage(): Promise<void> {
      if (!this.isChromeAvailable) {
        console.warn('Chrome storage.local is not available');
        return;
      }

      try {
        const data = await new Promise<any>((resolve, reject) => {
          chrome.storage.local.get(['sessions', 'currentSessionId'], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        });

        if (data.sessions) {
          this.sessions = data.sessions.map((session: any) => ({
            ...session,
            createdAt: new Date(session.createdAt)
          }));
        }
        if (data.currentSessionId) {
          this.currentSessionId = data.currentSessionId;
        }
      } catch (error) {
        console.error('Failed to load sessions from storage:', error);
        throw error;
      }
    },

    async saveToStorage(): Promise<void> {
      if (!this.isChromeAvailable) {
        console.warn('Chrome storage.local is not available');
        return;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({
            sessions: this.sessions,
            currentSessionId: this.currentSessionId
          }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('Failed to save sessions to storage:', error);
        throw error;
      }
    },

    async saveCurrentSession(name?: string): Promise<Session> {
      if (!this.isChromeAvailable) {
        throw new Error('Chrome APIs not available');
      }

      try {
        const tabs = await new Promise<Tab[]>((resolve, reject) => {
          chrome.tabs.query({}, async (tabs) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              const tabsWithCookies = await Promise.all(tabs.map(async tab => {
                if (!tab.url) return null;
                try {
                  const url = new URL(tab.url);
                  // Get cookies for the domain
                  const cookies = await chrome.cookies.getAll({ domain: url.hostname });
                  
                  // Filter out unnecessary fields and ensure proper format
                  const simplifiedCookies: SimplifiedCookie[] = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite as 'strict' | 'lax' | 'none' | 'unspecified',
                    expirationDate: cookie.expirationDate,
                    storeId: cookie.storeId,
                    hostOnly: cookie.hostOnly,
                    session: cookie.session
                  }));
                  
                  const tabData: Tab = {
                    id: tab.id || 0,
                    title: tab.title || '',
                    url: tab.url || '',
                    cookies: simplifiedCookies
                  };
                  
                  return tabData;
                } catch (error) {
                  console.error(`Error getting cookies for ${tab.url}:`, error);
                  const tabData: Tab = {
                    id: tab.id || 0,
                    title: tab.title || '',
                    url: tab.url || '',
                    cookies: []
                  };
                  return tabData;
                }
              }));
              
              // Filter out null values and ensure type safety
              const validTabs = tabsWithCookies.filter((tab): tab is Tab => tab !== null);
              resolve(validTabs);
            }
          });
        });

        const newSession: Session = {
          id: crypto.randomUUID(),
          name: name || `Session ${this.sessions.length + 1}`,
          tabs,
          createdAt: new Date()
        };

        this.sessions.push(newSession);
        this.currentSessionId = newSession.id;
        await this.saveToStorage();

        return newSession;
      } catch (error) {
        console.error('Failed to save current session:', error);
        throw error;
      }
    },

    async restoreSession(sessionId: string): Promise<void> {
      if (!this.isChromeAvailable) {
        throw new Error('Chrome APIs not available');
      }

      const session = this.sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      try {
        // First restore all cookies
        for (const tab of session.tabs) {
          if (tab.cookies && tab.cookies.length > 0) {
            for (const cookie of tab.cookies) {
              try {
                // Construct URL based on cookie's secure flag
                const protocol = cookie.secure ? 'https' : 'http';
                const url = `${protocol}://${cookie.domain}${cookie.path}`;
                
                // Handle 'unspecified' sameSite value
                const sameSite = cookie.sameSite === 'unspecified' ? 'lax' : cookie.sameSite;
                
                // Set cookie with original attributes
                await chrome.cookies.set({
                  url,
                  name: cookie.name,
                  value: cookie.value,
                  domain: cookie.domain,
                  path: cookie.path,
                  secure: cookie.secure,
                  httpOnly: cookie.httpOnly,
                  sameSite: sameSite,
                  expirationDate: cookie.expirationDate
                });
              } catch (error) {
                console.error(`Failed to restore cookie for ${tab.url}:`, error);
              }
            }
          }
        }

        // Then open tabs
        for (const tab of session.tabs) {
          if (tab.url) {
            await chrome.tabs.create({ url: tab.url });
          }
        }

        this.currentSessionId = sessionId;
        await this.saveToStorage();
      } catch (error) {
        console.error('Failed to restore session:', error);
        throw error;
      }
    },

    async deleteSession(sessionId: string): Promise<void> {
      if (!this.isChromeAvailable) {
        throw new Error('Chrome APIs not available');
      }

      const index = this.sessions.findIndex(s => s.id === sessionId);
      if (index === -1) {
        throw new Error('Session not found');
      }

      this.sessions.splice(index, 1);
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = this.sessions[0]?.id || null;
      }

      await this.saveToStorage();
    }
  }
}); 