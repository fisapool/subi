class SessionManager {
    constructor() {
        this.browser = typeof browser !== 'undefined' ? browser : chrome;
    }

    async getSessionCookies(domain) {
        try {
            return await this.browser.cookies.getAll({ domain });
        } catch (error) {
            console.error('Error getting cookies:', error);
            return [];
        }
    }

    async saveSession(sessionName, domain) {
        try {
            const cookies = await this.getSessionCookies(domain);
            await this.browser.storage.local.set({
                [`session_${sessionName}`]: {
                    cookies,
                    timestamp: Date.now(),
                    domain
                }
            });
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            return false;
        }
    }

    async loadSession(sessionName) {
        try {
            const data = await this.browser.storage.local.get(`session_${sessionName}`);
            const session = data[`session_${sessionName}`];
            
            if (!session) {
                throw new Error('Session not found');
            }

            // Clear existing cookies for the domain
            const existingCookies = await this.getSessionCookies(session.domain);
            for (const cookie of existingCookies) {
                await this.browser.cookies.remove({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                });
            }

            // Set new cookies
            for (const cookie of session.cookies) {
                await this.browser.cookies.set({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite,
                    expirationDate: cookie.expirationDate
                });
            }
            return true;
        } catch (error) {
            console.error('Error loading session:', error);
            return false;
        }
    }

    async deleteSession(sessionName) {
        try {
            await this.browser.storage.local.remove(`session_${sessionName}`);
            return true;
        } catch (error) {
            console.error('Error deleting session:', error);
            return false;
        }
    }

    async listSessions() {
        try {
            const data = await this.browser.storage.local.get(null);
            return Object.entries(data)
                .filter(([key]) => key.startsWith('session_'))
                .map(([key, value]) => ({
                    name: key.replace('session_', ''),
                    domain: value.domain,
                    timestamp: value.timestamp
                }));
        } catch (error) {
            console.error('Error listing sessions:', error);
            return [];
        }
    }
}

export default SessionManager; 