import { defineStore } from 'pinia';

interface Tab {
  id: number;
  title: string;
  url: string;
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
          chrome.tabs.query({}, (tabs) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(tabs.map(tab => ({
                id: tab.id || 0,
                title: tab.title || '',
                url: tab.url || ''
              })));
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
        for (const tab of session.tabs) {
          if (tab.url) {
            await new Promise<void>((resolve, reject) => {
              chrome.tabs.create({ url: tab.url }, (newTab) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve();
                }
              });
            });
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