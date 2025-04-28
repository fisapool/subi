// Session Manager Module
class SessionManager {
    constructor() {
        this.storageKey = 'sessions';
    }

    async saveSession(sessionName, attachedScripts = []) {
        try {
            // Get all open tabs
            const tabs = await chrome.tabs.query({});
            
            // For each tab, get its cookies and create a session tab object
            const sessionTabs = await Promise.all(tabs.map(async (tab) => {
                const cookies = await chrome.cookies.getAll({ url: tab.url });
                return {
                    url: tab.url,
                    title: tab.title,
                    state: tab.state,
                    cookies: cookies
                };
            }));

            // Create the session object
            const sessionObject = {
                id: `session-${Date.now()}`,
                name: sessionName,
                tabs: sessionTabs,
                scripts: attachedScripts,
                createdAt: new Date().toISOString()
            };

            // Get existing sessions and add the new one
            const { sessions = [] } = await chrome.storage.local.get(this.storageKey);
            const updatedSessions = [...sessions, sessionObject];
            
            // Save to storage
            await chrome.storage.local.set({ [this.storageKey]: updatedSessions });
            
            return sessionObject;
        } catch (error) {
            console.error('Error saving session:', error);
            throw error;
        }
    }

    async restoreSession(sessionId) {
        try {
            // Get the session from storage
            const { sessions = [] } = await chrome.storage.local.get(this.storageKey);
            const session = sessions.find(s => s.id === sessionId);

            if (!session) {
                throw new Error('Session not found');
            }

            // Restore each tab
            for (const tab of session.tabs) {
                // Create the tab
                const newTab = await chrome.tabs.create({ url: tab.url });

                // Restore cookies
                for (const cookie of tab.cookies) {
                    await chrome.cookies.set({
                        url: tab.url,
                        name: cookie.name,
                        value: cookie.value,
                        path: cookie.path,
                        expirationDate: cookie.expirationDate,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        sameSite: cookie.sameSite
                    });
                }

                // Inject scripts if they match the URL
                for (const script of session.scripts) {
                    if (script.matchPatterns.some(pattern => new RegExp(pattern).test(tab.url))) {
                        await chrome.scripting.executeScript({
                            target: { tabId: newTab.id },
                            func: new Function(script.code)
                        });
                    }
                }
            }

            return true;
        } catch (error) {
            console.error('Error restoring session:', error);
            throw error;
        }
    }

    async deleteSession(sessionId) {
        try {
            const { sessions = [] } = await chrome.storage.local.get(this.storageKey);
            const updatedSessions = sessions.filter(s => s.id !== sessionId);
            await chrome.storage.local.set({ [this.storageKey]: updatedSessions });
            return true;
        } catch (error) {
            console.error('Error deleting session:', error);
            throw error;
        }
    }

    async getAllSessions() {
        try {
            const { sessions = [] } = await chrome.storage.local.get(this.storageKey);
            return sessions;
        } catch (error) {
            console.error('Error getting sessions:', error);
            throw error;
        }
    }
}

// Export the SessionManager class
export default SessionManager; 