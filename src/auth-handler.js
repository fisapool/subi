import SessionManager from './session-manager';

class AuthHandler {
    constructor() {
        this.sessionManager = new SessionManager();
    }

    async checkLoginStatus(domain) {
        try {
            const cookies = await this.sessionManager.getSessionCookies(domain);
            const authCookie = cookies.find(cookie => 
                cookie.name === 'sessionId' || 
                cookie.name === 'auth' || 
                cookie.name.toLowerCase().includes('session')
            );
            return !!authCookie;
        } catch (error) {
            console.error('Error checking login status:', error);
            return false;
        }
    }

    async logout(domain) {
        try {
            const cookies = await this.sessionManager.getSessionCookies(domain);
            for (const cookie of cookies) {
                await browser.cookies.remove({
                    url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                    name: cookie.name
                });
            }
            return true;
        } catch (error) {
            console.error('Error during logout:', error);
            return false;
        }
    }

    async saveCurrentSession(sessionName, domain) {
        return await this.sessionManager.saveSession(sessionName, domain);
    }

    async loadSavedSession(sessionName) {
        return await this.sessionManager.loadSession(sessionName);
    }

    async deleteSavedSession(sessionName) {
        return await this.sessionManager.deleteSession(sessionName);
    }

    async getSavedSessions() {
        return await this.sessionManager.listSessions();
    }
}

export default AuthHandler; 