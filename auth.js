// Authentication and user management functionality
class AuthManager {
  constructor() {
    this.API_BASE_URL = 'https://api.bytescookies.com'; // Replace with your actual API endpoint
    this.currentUser = null;
    this.authToken = null;
    this.syncManager = null;
  }

  // Initialize auth state
  async init() {
    try {
      // Get token from chrome.storage.local
      const { authToken, currentUser } = await chrome.storage.local.get(['authToken', 'currentUser']);
      this.authToken = authToken;
      this.currentUser = currentUser;

      // Initialize sync manager if authenticated
      if (this.isAuthenticated()) {
        this.syncManager = await import('./sync.js');
        await this.syncManager.default.init();
      }

      // Listen for storage changes
      chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
    } catch (error) {
      console.error('Auth initialization error:', error);
    }
  }

  async handleStorageChange(changes, namespace) {
    if (namespace === 'local') {
      if (changes.authToken) {
        this.authToken = changes.authToken.newValue;
      }
      if (changes.currentUser) {
        this.currentUser = changes.currentUser.newValue;
      }
    }
  }

  // Register a new user
  async register(email, password, name) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      await this.handleAuthSuccess(data);
      return data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // Login existing user
  async login(email, password) {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      await this.handleAuthSuccess(data);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.authToken) {
        await fetch(`${this.API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearAuthState();
    }
  }

  // Handle successful authentication
  async handleAuthSuccess(data) {
    const { token, user } = data;
    
    // Store in chrome.storage.local
    await chrome.storage.local.set({
      authToken: token,
      currentUser: user
    });

    this.authToken = token;
    this.currentUser = user;

    // Initialize sync if not already initialized
    if (!this.syncManager) {
      this.syncManager = await import('./sync.js');
      await this.syncManager.default.init();
    }

    // Trigger initial sync
    await this.syncManager.default.sync();
  }

  // Clear authentication state
  async clearAuthState() {
    // Clear from chrome.storage.local
    await chrome.storage.local.remove(['authToken', 'currentUser']);
    
    this.authToken = null;
    this.currentUser = null;
    this.syncManager = null;
  }

  // Validate current token
  async validateToken() {
    if (!this.authToken) return false;

    try {
      const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        await this.clearAuthState();
        return false;
      }

      const data = await response.json();
      this.currentUser = data.user;
      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      await this.clearAuthState();
      return false;
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.authToken && !!this.currentUser;
  }

  getAuthToken() {
    return this.authToken;
  }
}

// Export singleton instance
const authManager = new AuthManager();
export default authManager; 