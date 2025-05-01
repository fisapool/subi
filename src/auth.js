import Browser from 'webextension-polyfill';

/**
 * Authenticate a user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {boolean} rememberMe - Whether to remember the user
 * @returns {Promise<Object>} Authentication result
 */
export async function authenticateUser(email, password, rememberMe) {
  try {
    const response = await Browser.runtime.sendMessage({
      type: 'AUTHENTICATE',
      email,
      password,
      rememberMe
    });
    return response;
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      message: 'Authentication failed: ' + error.message
    };
  }
}

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} Registration result
 */
export async function registerUser(email, password) {
  try {
    const response = await Browser.runtime.sendMessage({
      type: 'REGISTER',
      email,
      password
    });
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Registration failed: ' + error.message
    };
  }
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @returns {Promise<Object>} Password reset result
 */
export async function resetPassword(email) {
  try {
    const response = await Browser.runtime.sendMessage({
      type: 'RESET_PASSWORD',
      email
    });
    return response;
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Password reset failed: ' + error.message
    };
  }
}

// Utility functions
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Remove any existing error message
    const existingError = element.nextElementSibling;
    if (existingError && existingError.classList.contains('error-message')) {
        existingError.remove();
    }

    // Create and append error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    element.parentNode.insertBefore(errorElement, element.nextSibling);

    // Add error class to input
    element.classList.add('error');
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Remove any existing success message
    const existingSuccess = element.nextElementSibling;
    if (existingSuccess && existingSuccess.classList.contains('success-message')) {
        existingSuccess.remove();
    }

    // Create and append success message
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    element.parentNode.insertBefore(successElement, element.nextSibling);

    // Add success class to input
    element.classList.add('success');
}

// Authentication and user management functionality
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordLink = document.getElementById('forgot-password');
    const backToLoginBtn = document.getElementById('back-to-login');

    // Import AuthHandler and firebaseAuthManager
    const authHandler = new window.AuthHandler();

    // Form validation and submission
    const loginButton = document.getElementById('login-button');
    const registerButton = document.getElementById('register-button');
    const resetPasswordButton = document.getElementById('reset-password-button');

    // Login form submission
    loginButton.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        if (!validateEmail(email)) {
            showError('login-email', 'Please enter a valid email address');
            return;
        }

        if (!password) {
            showError('login-password', 'Please enter your password');
            return;
        }

        try {
            const response = await window.firebaseAuthManager.signIn(email, password, rememberMe);
            if (response.success) {
                // Redirect to main application
                window.location.href = 'popup.html';
            } else {
                showError('login-form', response.message || 'Login failed');
            }
        } catch (error) {
            showError('login-form', 'An error occurred during login');
        }
    });

    // Registration form submission
    registerButton.addEventListener('click', async () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const termsAgreed = document.getElementById('terms-agreement').checked;

        if (!validateEmail(email)) {
            showError('register-email', 'Please enter a valid email address');
            return;
        }

        if (password.length < 8) {
            showError('register-password', 'Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('register-confirm-password', 'Passwords do not match');
            return;
        }

        if (!termsAgreed) {
            showError('terms-agreement', 'Please agree to the terms and conditions');
            return;
        }

        try {
            const response = await window.firebaseAuthManager.register(email, password);
            if (response.success) {
                // Redirect to main application
                window.location.href = 'popup.html';
            } else {
                showError('register-form', response.message || 'Registration failed');
            }
        } catch (error) {
            showError('register-form', 'An error occurred during registration');
        }
    });

    // Password reset form submission
    resetPasswordButton.addEventListener('click', async () => {
        const email = document.getElementById('reset-email').value;

        if (!validateEmail(email)) {
            showError('reset-email', 'Please enter a valid email address');
            return;
        }

        try {
            const response = await window.firebaseAuthManager.resetPassword(email);
            if (response.success) {
                showSuccess('reset-email', 'Password reset instructions sent to your email');
            } else {
                showError('reset-email', response.message || 'Password reset failed');
            }
        } catch (error) {
            showError('reset-email', 'An error occurred while processing your request');
        }
    });
});

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
      const { authToken, currentUser } = await chrome.storage.local.get([
        'authToken',
        'currentUser',
      ]);
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
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
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
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
            Authorization: `Bearer ${this.authToken}`,
          },
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
      currentUser: user,
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
          Authorization: `Bearer ${this.authToken}`,
        },
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
            Authorization: `Bearer ${this.authToken}`,
          },
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
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
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
