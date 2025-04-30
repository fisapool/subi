// Authentication and user management functionality
class AuthManager {
  constructor() {
    this.API_BASE_URL = 'https://api.bytescookies.com'; // Replace with your actual API endpoint
    this.currentUser = null;
    this.authToken = null;
    this.syncManager = null;
    this.tokenRefreshPromise = null;
    this.TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Bind methods
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
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
        const syncModule = await import('./sync.js');
        this.syncManager = syncModule.default;
        await this.syncManager.init();
      }

      // Listen for storage changes
      chrome.storage.onChanged.addListener(this.handleStorageChange);
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
    const MAX_RETRIES = 3;
    let retryCount = 0;

    while (retryCount < MAX_RETRIES) {
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
          if (response.status === 429) {
            // Rate limited, wait and retry
            const retryAfter = response.headers.get('Retry-After') || 60;
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            retryCount++;
            continue;
          }
          throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        await this.handleAuthSuccess(data);
        return data;
      } catch (error) {
        await this.handleRequestError(error);
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          throw new Error('Maximum login attempts reached. Please try again later.');
        }
      }
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
      const syncModule = await import('./sync.js');
      this.syncManager = syncModule.default;
      await this.syncManager.init();
    }

    // Trigger initial sync
    await this.syncManager.sync();
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
      // Check if token is about to expire
      const tokenData = this.parseJwt(this.authToken);
      if (tokenData && tokenData.exp) {
        const expiryTime = tokenData.exp * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        
        if (currentTime + this.TOKEN_EXPIRY_BUFFER >= expiryTime) {
          // Token is about to expire, refresh it
          await this.refreshToken();
          return true;
        }
      }

      const response = await fetch(`${this.API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try to refresh
          return await this.refreshToken();
        }
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

  // Token refresh implementation
  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async () => {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        await this.handleAuthSuccess(data);
        return true;
      } catch (error) {
        console.error('Token refresh error:', error);
        await this.clearAuthState();
        return false;
      } finally {
        this.tokenRefreshPromise = null;
      }
    })();

    return this.tokenRefreshPromise;
  }

  // JWT parsing utility
  parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWT parsing error:', error);
      return null;
    }
  }

  // Enhanced error handling for network requests
  async handleRequestError(error) {
    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
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