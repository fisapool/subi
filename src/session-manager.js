import FirebaseSessionManager from './firebaseSessionManager';

/**
 * @typedef {Object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {string} domain
 * @property {string} path
 * @property {boolean} secure
 * @property {boolean} httpOnly
 * @property {string} sameSite
 * @property {number} [expirationDate]
 */

/**
 * SessionManager class manages browser sessions and optionally syncs with Firebase.
 */
class SessionManager {
  /**
   * @param {string|null} userId - The user ID for Firebase session sync.
   */
  /**
   * @param {string|null} userId - The user ID for Firebase session sync.
   * @param {typeof browser | typeof chrome | null} browserInstance - Optional browser instance for dependency injection.
   */
  constructor(userId = null, browserInstance = null) {
    /** @type {typeof chrome | typeof browser | any} */
    this.browser = browserInstance || (typeof browser !== 'undefined' ? browser : chrome);
    if (userId) {
      this.firebaseSessionManager = new FirebaseSessionManager(userId);
    } else {
      this.firebaseSessionManager = null;
    }
  }

  /**
   * Get cookies for a domain.
   * @param {string} domain
   * @returns {Promise<Cookie[]>}
   */
  async getSessionCookies(domain) {
    try {
      return await this.browser.cookies.getAll({ domain });
    } catch (error) {
      console.error('Error getting cookies:', error);
      return [];
    }
  }

  /**
   * Save a session.
   * @param {string} sessionName
   * @param {string} domain
   * @returns {Promise<boolean>}
   */
  async saveSession(sessionName, domain) {
    if (this.firebaseSessionManager) {
      // Firebase session sync handles session saving
      return true;
    }
    try {
      const cookies = await this.getSessionCookies(domain);
      await this.browser.storage.local.set({
        [`session_${sessionName}`]: {
          cookies,
          timestamp: Date.now(),
          domain,
        },
      });
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  /**
   * Load a session.
   * @param {string} sessionName
   * @returns {Promise<boolean>}
   */
  async loadSession(sessionName) {
    if (this.firebaseSessionManager) {
      // Firebase session sync handles session loading
      return true;
    }
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
          name: cookie.name,
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
          expirationDate: cookie.expirationDate,
        });
      }
      return true;
    } catch (error) {
      console.error('Error loading session:', error);
      return false;
    }
  }

  /**
   * Delete a session.
   * @param {string} sessionName
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionName) {
    if (this.firebaseSessionManager) {
      // Firebase session sync handles session deletion
      return true;
    }
    try {
      await this.browser.storage.local.remove(`session_${sessionName}`);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * List all sessions.
   * @returns {Promise<Array<{name: string, domain: string, timestamp: number}>>}
   */
  async listSessions() {
    if (this.firebaseSessionManager) {
      // Firebase session sync handles session listing
      return [];
    }
    try {
      const data = await this.browser.storage.local.get(null);
      return Object.entries(data)
        .filter(([key]) => key.startsWith('session_'))
        .map(([key, value]) => ({
          name: key.replace('session_', ''),
          domain: value.domain,
          timestamp: value.timestamp,
        }));
    } catch (error) {
      console.error('Error listing sessions:', error);
      return [];
    }
  }

  /**
   * Cleanup resources.
   */
  cleanup() {
    if (this.firebaseSessionManager) {
      this.firebaseSessionManager.cleanup();
    }
  }
}

export default SessionManager;
