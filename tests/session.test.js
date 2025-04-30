import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createNewSession, restoreSession, deleteSession } from '../src/popup.js';

// Mock chrome API
const mockChrome = {
  runtime: {
    sendMessage: vi.fn()
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn()
  }
};

describe('Session Management', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup DOM mocks
    document.body.innerHTML = `
      <div id="status" class="status"></div>
      <div id="session-list"></div>
      <div id="session-name"></div>
    `;
    
    // Setup chrome API mock
    global.chrome = mockChrome;
  });

  describe('createNewSession', () => {
    it('should create a new session successfully', async () => {
      const mockTabs = [
        { id: 1, url: 'https://example.com', title: 'Example' },
        { id: 2, url: 'https://test.com', title: 'Test' }
      ];

      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback(mockTabs);
      });

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true });
      });

      await createNewSession('Test Session');

      expect(mockChrome.tabs.query).toHaveBeenCalledWith(
        { currentWindow: true },
        expect.any(Function)
      );
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SAVE_SESSION',
          session: expect.objectContaining({
            name: 'Test Session',
            tabs: expect.arrayContaining([
              expect.objectContaining({
                url: 'https://example.com',
                title: 'Example'
              })
            ])
          })
        }),
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('Session saved successfully');
    });

    it('should handle session creation failure', async () => {
      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback([]);
      });

      await createNewSession('Empty Session');

      expect(document.getElementById('status').textContent).toBe('Error: No tabs to save');
    });
  });

  describe('restoreSession', () => {
    it('should restore a session successfully', async () => {
      const mockSession = {
        name: 'Test Session',
        tabs: [
          { url: 'https://example.com', title: 'Example' },
          { url: 'https://test.com', title: 'Test' }
        ]
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.type === 'GET_SESSION') {
          callback({ success: true, session: mockSession });
        } else if (message.type === 'RESTORE_SESSION') {
          callback({ success: true, tabsRestored: 2 });
        }
      });

      await restoreSession('Test Session');

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'GET_SESSION',
          sessionName: 'Test Session'
        }),
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('Session restored successfully (2 tabs)');
    });

    it('should handle session restoration failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Session not found' });
      });

      await restoreSession('Nonexistent Session');

      expect(document.getElementById('status').textContent).toBe('Error: Session not found');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session successfully', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: true });
      });

      // Mock window.confirm
      window.confirm = vi.fn(() => true);

      await deleteSession('Test Session');

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE_SESSION',
          sessionName: 'Test Session'
        }),
        expect.any(Function)
      );
      expect(document.getElementById('status').textContent).toBe('Session deleted successfully');
    });

    it('should handle session deletion failure', async () => {
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        callback({ success: false, error: 'Delete failed' });
      });

      window.confirm = vi.fn(() => true);

      await deleteSession('Test Session');

      expect(document.getElementById('status').textContent).toBe('Error: Delete failed');
    });

    it('should handle user cancellation', async () => {
      window.confirm = vi.fn(() => false);

      await deleteSession('Test Session');

      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(document.getElementById('status').textContent).toBe('Session deletion cancelled');
    });
  });
}); 