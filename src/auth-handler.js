import firebaseAuthManager from './firebaseAuth';
import SessionManager from './session-manager';

/**
 * @typedef {Object} Cookie
 * @property {string} name - Cookie name
 * @property {string} value - Cookie value
 * @property {string} domain - Cookie domain
 * @property {string} path - Cookie path
 * @property {boolean} secure - Whether cookie is secure
 * @property {boolean} httpOnly - Whether cookie is HTTP only
 * @property {number} expirationDate - Cookie expiration date
 */

class AuthHandler {
  constructor() {
    /** @type {SessionManager | null} */
    this.sessionManager = null;
    this.initialize();
  }

  async initialize() {
    try {
      const user = await firebaseAuthManager.getCurrentUser();
      if (user) {
        this.sessionManager = new SessionManager(user.uid);
      } else {
        this.sessionManager = new SessionManager();
      }
    } catch (error) {
      console.error('Failed to initialize AuthHandler:', error);
      this.sessionManager = new SessionManager();
    }
  }

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>} Whether user is logged in
   */
  async checkLoginStatus() {
    if (!this.sessionManager) {
      await this.initialize();
    }
    return firebaseAuthManager.isAuthenticated();
  }

  /**
   * Log out the current user
   * @returns {Promise<void>}
   */
  async logout() {
    if (!this.sessionManager) {
      await this.initialize();
    }
    await Promise.all([
      firebaseAuthManager.logout(),
      this.sessionManager?.deleteSession('current') ?? Promise.resolve()
    ]);
  }

  /**
   * Save current session
   * @param {string} sessionName - Name of the session to save
   * @param {string} domain - Domain to save session for
   * @returns {Promise<boolean>} Whether save was successful
   */
  async saveCurrentSession(sessionName, domain) {
    if (!this.sessionManager) {
      await this.initialize();
    }
    return this.sessionManager?.saveSession(sessionName, domain) ?? false;
  }

  /**
   * Load a saved session
   * @param {string} sessionName - Name of the session to load
   * @returns {Promise<boolean>} Whether load was successful
   */
  async loadSavedSession(sessionName) {
    if (!this.sessionManager) {
      await this.initialize();
    }
    return this.sessionManager?.loadSession(sessionName) ?? false;
  }

  /**
   * Delete a saved session
   * @param {string} sessionName - Name of the session to delete
   * @returns {Promise<boolean>} Whether delete was successful
   */
  async deleteSavedSession(sessionName) {
    if (!this.sessionManager) {
      await this.initialize();
    }
    return this.sessionManager?.deleteSession(sessionName) ?? false;
  }

  /**
   * Get all saved sessions
   * @returns {Promise<Array<{name: string, domain: string, timestamp: number}>>} List of saved sessions
   */
  async getSavedSessions() {
    if (!this.sessionManager) {
      await this.initialize();
    }
    return this.sessionManager?.listSessions() ?? [];
  }
}

// Export a singleton instance
export const authHandler = new AuthHandler();
