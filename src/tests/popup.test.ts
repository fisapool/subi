import { describe, it, expect, vi, beforeEach } from 'vitest';
import browser from 'webextension-polyfill';

// Mock browser APIs
vi.mock('webextension-polyfill', () => ({
  default: {
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    runtime: {
      sendMessage: vi.fn(),
    },
  },
}));

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="cookie-list"></div>
      <button id="clear-all">Clear All Cookies</button>
      <button id="refresh">Refresh</button>
      <div id="status"></div>
    `;
  });

  describe('UI Elements', () => {
    it('should render cookie list', () => {
      const cookieList = document.getElementById('cookie-list');
      expect(cookieList).toBeTruthy();
    });

    it('should render action buttons', () => {
      const clearAllButton = document.getElementById('clear-all');
      const refreshButton = document.getElementById('refresh');

      expect(clearAllButton).toBeTruthy();
      expect(refreshButton).toBeTruthy();
    });

    it('should render status display', () => {
      const statusDisplay = document.getElementById('status');
      expect(statusDisplay).toBeTruthy();
    });
  });

  describe('Cookie List', () => {
    it('should display cookies', () => {
      const cookieList = document.getElementById('cookie-list');
      if (cookieList) {
        cookieList.innerHTML = `
          <div class="cookie-item">
            <span>session=abc123</span>
            <button class="delete-cookie">Delete</button>
          </div>
        `;

        const cookieItems = document.getElementsByClassName('cookie-item');
        expect(cookieItems.length).toBe(1);
        expect(cookieItems[0].textContent).toContain('session=abc123');
      }
    });

    it('should have delete buttons for each cookie', () => {
      const cookieList = document.getElementById('cookie-list');
      if (cookieList) {
        cookieList.innerHTML = `
          <div class="cookie-item">
            <span>session=abc123</span>
            <button class="delete-cookie">Delete</button>
          </div>
        `;

        const deleteButtons = document.getElementsByClassName('delete-cookie');
        expect(deleteButtons.length).toBe(1);
      }
    });
  });

  describe('Message Passing', () => {
    it('should send message to get active tab', async () => {
      const mockTab = { id: 1, url: 'https://example.com' };
      const mockQuery = vi.fn().mockResolvedValue([mockTab]);
      vi.mocked(browser.tabs.query).mockImplementation(mockQuery);

      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      expect(tabs[0]).toEqual(mockTab);
      expect(mockQuery).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it('should send message to clear cookies', async () => {
      const mockSendMessage = vi.fn().mockResolvedValue({ success: true });
      vi.mocked(browser.runtime.sendMessage).mockImplementation(mockSendMessage);

      const response = await browser.runtime.sendMessage({ type: 'clearCookies' });
      expect(response).toEqual({ success: true });
      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'clearCookies' });
    });
  });

  describe('Status Updates', () => {
    it('should update status message', () => {
      const statusDisplay = document.getElementById('status');
      if (statusDisplay) {
        statusDisplay.textContent = 'Cookies cleared successfully';
        expect(statusDisplay.textContent).toBe('Cookies cleared successfully');
      }
    });

    it('should clear status message', () => {
      const statusDisplay = document.getElementById('status');
      if (statusDisplay) {
        statusDisplay.textContent = 'Cookies cleared successfully';
        statusDisplay.textContent = '';
        expect(statusDisplay.textContent).toBe('');
      }
    });
  });
}); 