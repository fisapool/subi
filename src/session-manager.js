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
    this.operationLocks = new Map();
  }

  /**
   * Get cookies for a domain.
   * @param {string} domain
   * @returns {Promise<Cookie[]>}
   */
  async getSessionCookies(domain) {
    const lockKey = `get_cookies_${domain}`;
    if (this.operationLocks.has(lockKey)) {
      return this.operationLocks.get(lockKey);
    }

    const promise = (async () => {
      try {
        return await this.browser.cookies.getAll({ domain });
      } catch (error) {
        console.error('Error getting cookies:', error);
        return [];
      }
    })();

    this.operationLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * Save a session.
   * @param {string} sessionName
   * @param {string} domain
   * @returns {Promise<boolean>}
   */
  async saveSession(sessionName, domain) {
    const lockKey = `save_session_${sessionName}`;
    if (this.operationLocks.has(lockKey)) {
      return this.operationLocks.get(lockKey);
    }

    const promise = (async () => {
      if (this.firebaseSessionManager) {
        return true;
      }

      try {
        const cookies = await this.getSessionCookies(domain);
        const sessionData = {
          cookies,
          timestamp: Date.now(),
          domain,
        };

        await this.browser.storage.local.set({
          [`session_${sessionName}`]: sessionData,
        });

        return true;
      } catch (error) {
        console.error('Error saving session:', error);
        return false;
      }
    })();

    this.operationLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * Load a session.
   * @param {string} sessionName
   * @returns {Promise<boolean>}
   */
  async loadSession(sessionName) {
    const lockKey = `load_session_${sessionName}`;
    if (this.operationLocks.has(lockKey)) {
      return this.operationLocks.get(lockKey);
    }

    const promise = (async () => {
      if (this.firebaseSessionManager) {
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
        const removePromises = existingCookies.map((/** @type {Cookie} */ cookie) =>
          this.browser.cookies.remove({
            url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
            name: cookie.name,
          })
        );
        await Promise.all(removePromises);

        // Set new cookies
        const setPromises = session.cookies.map(cookie =>
          this.browser.cookies.set({
            url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate,
          })
        );
        await Promise.all(setPromises);

        return true;
      } catch (error) {
        console.error('Error loading session:', error);
        return false;
      }
    })();

    this.operationLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * Delete a session.
   * @param {string} sessionName
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionName) {
    const lockKey = `delete_session_${sessionName}`;
    if (this.operationLocks.has(lockKey)) {
      return this.operationLocks.get(lockKey);
    }

    const promise = (async () => {
      if (this.firebaseSessionManager) {
        return true;
      }

      try {
        await this.browser.storage.local.remove(`session_${sessionName}`);
        return true;
      } catch (error) {
        console.error('Error deleting session:', error);
        return false;
      }
    })();

    this.operationLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.operationLocks.delete(lockKey);
    }
  }

  /**
   * List all sessions.
   * @returns {Promise<Array<{name: string, domain: string, timestamp: number}>>}
   */
  async listSessions() {
    const lockKey = 'list_sessions';
    if (this.operationLocks.has(lockKey)) {
      return this.operationLocks.get(lockKey);
    }

    const promise = (async () => {
      if (this.firebaseSessionManager) {
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
    })();

    this.operationLocks.set(lockKey, promise);
    try {
      return await promise;
    } finally {
      this.operationLocks.delete(lockKey);
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
