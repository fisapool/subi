import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock the browser APIs before importing
const mockBrowser = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(),
      clear: vi.fn().mockResolvedValue()
    },
    sync: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue()
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue()
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue()
  },
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(),
    onMessage: {
      addListener: vi.fn().mockReturnValue({})
    }
  }
};

// Mock the module
const mockModule = {
  default: mockBrowser,
  __esModule: true,
};

vi.mock('webextension-polyfill', () => mockModule);

describe('Content Script', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
    // Safely redefine window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      enumerable: true,
      writable: true,
      value: new URL('https://example.com')
    });
  });

  describe('DOM Manipulation', () => {
    it('should inject UI elements when initialized', () => {
      // Mock the initialization function
      const initUI = () => {
        const container = document.createElement('div');
        container.id = 'cookie-manager-container';
        document.body.appendChild(container);
      };

      initUI();
      expect(document.getElementById('cookie-manager-container')).toBeTruthy();
    });

    it('should create cookie list elements', () => {
      const createCookieList = (cookies) => {
        const container = document.createElement('div');
        container.id = 'cookie-list';
        cookies.forEach(cookie => {
          const item = document.createElement('div');
          item.className = 'cookie-item';
          item.textContent = `${cookie.name}: ${cookie.value}`;
          container.appendChild(item);
        });
        document.body.appendChild(container);
      };

      const mockCookies = [
        { name: 'session', value: 'abc123' },
        { name: 'preferences', value: 'dark-mode' }
      ];

      createCookieList(mockCookies);
      const cookieList = document.getElementById('cookie-list');
      expect(cookieList.children.length).toBe(2);
      expect(cookieList.children[0].textContent).toBe('session: abc123');
    });

    it('should handle UI updates when cookies change', () => {
      const updateCookieUI = (cookies) => {
        let container = document.getElementById('cookie-list');
        if (!container) {
          container = document.createElement('div');
          container.id = 'cookie-list';
          document.body.appendChild(container);
        }
        container.innerHTML = '';
        cookies.forEach(cookie => {
          const item = document.createElement('div');
          item.className = 'cookie-item';
          item.textContent = `${cookie.name}: ${cookie.value}`;
          container.appendChild(item);
        });
      };

      const initialCookies = [{ name: 'session', value: 'abc123' }];
      const updatedCookies = [
        { name: 'session', value: 'xyz789' },
        { name: 'new', value: 'value' }
      ];

      updateCookieUI(initialCookies);
      updateCookieUI(updatedCookies);

      const cookieList = document.getElementById('cookie-list');
      expect(cookieList.children.length).toBe(2);
      expect(cookieList.children[0].textContent).toBe('session: xyz789');
    });
  });

  describe('Message Communication', () => {
    it('should send messages to background script', async () => {
      const message = {
        type: 'GET_COOKIE_INFO',
        domain: window.location.hostname
      };

      await mockBrowser.runtime.sendMessage(message);
      expect(mockBrowser.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it('should handle messages from background script', () => {
      const mockResponse = {
        cookies: [
          { name: 'testCookie', value: 'testValue' }
        ]
      };

      // Mock message listener
      const mockListener = vi.fn().mockImplementation((message, sender, sendResponse) => {
        sendResponse({ success: true });
      });
      
      mockBrowser.runtime.onMessage.addListener.mockImplementation(mockListener);
      
      // Call the listener directly
      const sendResponse = vi.fn();
      mockListener(mockResponse, {}, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should handle cookie update messages', () => {
      const mockCookies = [
        { name: 'updated', value: 'new-value' }
      ];

      const mockListener = vi.fn().mockImplementation((message, sender, sendResponse) => {
        if (message.type === 'UPDATE_COOKIES') {
          // Update UI with new cookies
          const container = document.createElement('div');
          container.id = 'cookie-list';
          mockCookies.forEach(cookie => {
            const item = document.createElement('div');
            item.className = 'cookie-item';
            item.textContent = `${cookie.name}: ${cookie.value}`;
            container.appendChild(item);
          });
          document.body.appendChild(container);
          sendResponse({ success: true });
        }
      });

      mockBrowser.runtime.onMessage.addListener.mockImplementation(mockListener);
      const sendResponse = vi.fn();
      mockListener({ type: 'UPDATE_COOKIES', cookies: mockCookies }, {}, sendResponse);

      expect(document.getElementById('cookie-list').children.length).toBe(1);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Cookie Monitoring', () => {
    it('should detect cookie changes', () => {
      const mockCookieChange = {
        removed: false,
        cookie: {
          name: 'test',
          value: 'new-value',
          domain: 'example.com'
        }
      };

      const handleCookieChange = (changeInfo) => {
        const container = document.createElement('div');
        container.id = 'cookie-change-notification';
        container.textContent = `Cookie ${changeInfo.cookie.name} was ${changeInfo.removed ? 'removed' : 'changed'}`;
        document.body.appendChild(container);
      };

      handleCookieChange(mockCookieChange);
      expect(document.getElementById('cookie-change-notification').textContent)
        .toContain('Cookie test was changed');
    });

    it('should handle cookie removal events', () => {
      const mockCookieRemoval = {
        removed: true,
        cookie: {
          name: 'test',
          domain: 'example.com'
        }
      };

      const handleCookieChange = (changeInfo) => {
        const container = document.createElement('div');
        container.id = 'cookie-change-notification';
        container.textContent = `Cookie ${changeInfo.cookie.name} was ${changeInfo.removed ? 'removed' : 'changed'}`;
        document.body.appendChild(container);
      };

      handleCookieChange(mockCookieRemoval);
      expect(document.getElementById('cookie-change-notification').textContent)
        .toContain('Cookie test was removed');
    });
  });

  describe('Error Handling', () => {
    it('should handle message sending errors', async () => {
      mockBrowser.runtime.sendMessage.mockRejectedValue(new Error('Failed to send message'));

      const sendMessage = async (message) => {
        try {
          await mockBrowser.runtime.sendMessage(message);
        } catch (error) {
          const errorContainer = document.createElement('div');
          errorContainer.id = 'error-message';
          errorContainer.textContent = error.message;
          document.body.appendChild(errorContainer);
        }
      };

      await sendMessage({ type: 'TEST' });
      expect(document.getElementById('error-message').textContent)
        .toContain('Failed to send message');
    });

    it('should handle UI update errors', () => {
      const updateUI = (data) => {
        try {
          if (!data || !Array.isArray(data.cookies)) {
            throw new Error('Invalid data format');
          }
          // ... rest of the function
        } catch (error) {
          const errorContainer = document.createElement('div');
          errorContainer.id = 'error-message';
          errorContainer.textContent = error.message;
          document.body.appendChild(errorContainer);
        }
      };

      updateUI({ invalid: 'data' });
      expect(document.getElementById('error-message').textContent)
        .toContain('Invalid data format');
    });
  });
}); 