import { describe, it, expect, vi, beforeEach } from 'vitest';
import { browser } from 'webextension-polyfill';
import {
  getCsrfToken,
  loadSessions,
  renderSessionList,
  loadCookies,
  createNewSession,
  restoreSession,
  deleteSession,
  openSettings,
  showWarningDialog,
  closeWarningDialog,
  updateStatus,
  escapeHtml
} from '../src/popup';

describe('Popup Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="sessionList"></div>
      <div id="status"></div>
      <div id="warningDialog" style="display: none;">
        <div class="warning-message"></div>
        <button id="proceedButton">Proceed</button>
        <button id="cancelButton">Cancel</button>
      </div>
    `;
  });

  describe('getCsrfToken', () => {
    it('should get CSRF token from cookies', async () => {
      browser.cookies.get.mockResolvedValueOnce({ value: 'test-token' });

      const token = await getCsrfToken();

      expect(token).toBe('test-token');
      expect(browser.cookies.get).toHaveBeenCalledWith({
        name: 'csrftoken',
        url: 'https://example.com'
      });
    });

    it('should return null if token not found', async () => {
      browser.cookies.get.mockResolvedValueOnce(null);

      const token = await getCsrfToken();

      expect(token).toBeNull();
    });
  });

  describe('loadSessions', () => {
    it('should load sessions from storage', async () => {
      browser.storage.local.get.mockResolvedValueOnce({
        sessions: [{ name: 'test-session', tabs: [] }]
      });

      const sessions = await loadSessions();

      expect(sessions).toEqual([{ name: 'test-session', tabs: [] }]);
      expect(browser.storage.local.get).toHaveBeenCalledWith('sessions');
    });

    it('should return empty array if no sessions', async () => {
      browser.storage.local.get.mockResolvedValueOnce({});

      const sessions = await loadSessions();

      expect(sessions).toEqual([]);
    });
  });

  describe('renderSessionList', () => {
    it('should render sessions in the list', () => {
      const sessions = [
        { name: 'session1', tabs: [] },
        { name: 'session2', tabs: [] }
      ];

      renderSessionList(sessions);

      const sessionList = document.getElementById('sessionList');
      expect(sessionList.children.length).toBe(2);
      expect(sessionList.textContent).toContain('session1');
      expect(sessionList.textContent).toContain('session2');
    });

    it('should show empty message if no sessions', () => {
      renderSessionList([]);

      const sessionList = document.getElementById('sessionList');
      expect(sessionList.textContent).toContain('No sessions saved');
    });
  });

  describe('loadCookies', () => {
    it('should load cookies for a domain', async () => {
      browser.cookies.getAll.mockResolvedValueOnce([
        { name: 'cookie1', domain: 'example.com' }
      ]);

      const cookies = await loadCookies('example.com');

      expect(cookies).toEqual([{ name: 'cookie1', domain: 'example.com' }]);
      expect(browser.cookies.getAll).toHaveBeenCalledWith({
        domain: 'example.com'
      });
    });

    it('should return empty array if no cookies', async () => {
      browser.cookies.getAll.mockResolvedValueOnce([]);

      const cookies = await loadCookies('example.com');

      expect(cookies).toEqual([]);
    });
  });

  describe('createNewSession', () => {
    it('should create a new session', async () => {
      browser.tabs.query.mockResolvedValueOnce([
        { id: 1, title: 'Tab 1', url: 'https://example.com' }
      ]);

      const session = await createNewSession('test-session');

      expect(session).toEqual({
        name: 'test-session',
        tabs: [{ id: 1, title: 'Tab 1', url: 'https://example.com' }]
      });
      expect(browser.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
    });
  });

  describe('restoreSession', () => {
    it('should restore a session', async () => {
      browser.storage.local.get.mockResolvedValueOnce({
        sessions: [{ name: 'test-session', tabs: [] }]
      });

      await restoreSession('test-session');

      expect(browser.storage.local.get).toHaveBeenCalledWith('sessions');
      expect(browser.tabs.create).toHaveBeenCalled();
    });

    it('should handle non-existent session', async () => {
      browser.storage.local.get.mockResolvedValueOnce({ sessions: [] });

      await restoreSession('non-existent');

      expect(updateStatus).toHaveBeenCalledWith('Session not found', false);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      browser.storage.local.get.mockResolvedValueOnce({
        sessions: [{ name: 'test-session', tabs: [] }]
      });

      await deleteSession('test-session');

      expect(browser.storage.local.set).toHaveBeenCalled();
      expect(updateStatus).toHaveBeenCalledWith('Session deleted', true);
    });

    it('should handle non-existent session', async () => {
      browser.storage.local.get.mockResolvedValueOnce({ sessions: [] });

      await deleteSession('non-existent');

      expect(updateStatus).toHaveBeenCalledWith('Session not found', false);
    });
  });

  describe('Utility Functions', () => {
    it('should open settings page', () => {
      openSettings();
      expect(browser.runtime.openOptionsPage).toHaveBeenCalled();
    });

    it('should show warning dialog', () => {
      showWarningDialog('Test warning');
      const dialog = document.getElementById('warningDialog');
      expect(dialog.style.display).toBe('block');
      expect(dialog.querySelector('.warning-message').textContent).toBe('Test warning');
    });

    it('should close warning dialog', () => {
      closeWarningDialog();
      const dialog = document.getElementById('warningDialog');
      expect(dialog.style.display).toBe('none');
    });

    it('should update status', () => {
      updateStatus('Test status', true);
      const status = document.getElementById('status');
      expect(status.textContent).toBe('Test status');
      expect(status.classList.contains('loading')).toBe(true);
    });

    it('should escape HTML', () => {
      const result = escapeHtml('<script>alert("test")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;');
    });
  });
}); 