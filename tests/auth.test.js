import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authenticateUser, registerUser, resetPassword } from '../src/auth.js';

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn()
  },
  storage: {
    local: {
      set: vi.fn()
    }
  }
};

describe('Authentication', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup DOM mocks
    document.body.innerHTML = `
      <div id="login-form">
        <input id="login-email" value="test@example.com">
        <input id="login-password" value="password123">
        <input id="remember-me" type="checkbox">
      </div>
      <div id="register-form">
        <input id="register-email" value="new@example.com">
        <input id="register-password" value="newpassword123">
        <input id="register-confirm-password" value="newpassword123">
        <input id="terms-agreement" type="checkbox" checked>
      </div>
      <div id="forgot-password-form">
        <input id="reset-email" value="reset@example.com">
      </div>
    `;
    
    // Setup chrome API mock
    global.chrome = mockChrome;
  });

  describe('authenticateUser', () => {
    it('should authenticate user successfully', async () => {
      const mockResponse = {
        success: true,
        user: {
          email: 'test@example.com',
          name: 'Test User'
        },
        token: 'test-token'
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await authenticateUser('test@example.com', 'password123', true);

      expect(result).toEqual(mockResponse);
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          authState: expect.objectContaining({
            isAuthenticated: true,
            user: mockResponse.user,
            token: mockResponse.token
          })
        })
      );
    });

    it('should handle authentication failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid credentials'
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await authenticateUser('test@example.com', 'wrongpassword', false);

      expect(result).toEqual(mockResponse);
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('registerUser', () => {
    it('should register user successfully', async () => {
      const mockResponse = {
        success: true,
        user: {
          email: 'new@example.com',
          name: 'New User'
        }
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await registerUser('new@example.com', 'newpassword123');

      expect(result).toEqual(mockResponse);
    });

    it('should handle registration failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Email already exists'
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await registerUser('existing@example.com', 'password123');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('resetPassword', () => {
    it('should send password reset email successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Password reset email sent'
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await resetPassword('reset@example.com');

      expect(result).toEqual(mockResponse);
    });

    it('should handle password reset failure', async () => {
      const mockResponse = {
        success: false,
        error: 'Email not found'
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback(mockResponse);
      });

      const result = await resetPassword('nonexistent@example.com');

      expect(result).toEqual(mockResponse);
    });
  });
}); 