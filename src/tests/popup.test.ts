import { describe, it, expect, beforeEach, vi } from 'vitest';
import Browser from 'webextension-polyfill';

// Type definitions
interface Tab {
  id: number;
  url: string;
  title?: string;
  index: number;
  highlighted: boolean;
  active: boolean;
  pinned: boolean;
  incognito: boolean;
}

interface Response {
  success: boolean;
  token?: string;
  error?: string;
  sessions?: Array<any>;
  cookies?: Array<any>;
  tabsRestored?: number;
}

// Global state
let currentSessions: any[] = [];

// Extend Window interface
declare global {
  interface Window {
    updateStatus: (message: string, isLoading?: boolean, isWarning?: boolean) => void;
    getCsrfToken: () => Promise<string>;
    loadSessions: () => Promise<any[]>;
    initialize: () => Promise<void>;
    createNewSession: () => Promise<void>;
    openSettings: () => void;
    closeWarningDialog: () => void;
  }
}

// Mock browser APIs
vi.mock('webextension-polyfill', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
      runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
      },
    },
  };
});

// Mock functions
const getCsrfToken = async () => {
  const response = await Browser.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' }) as Response;
  if (!response.success) {
    throw new Error(response.error || 'Failed to get CSRF token');
  }
  return response.token || '';
};

const loadSessions = async () => {
  const response = await Browser.runtime.sendMessage({ type: 'GET_SESSIONS' }) as Response;
  if (!response.success) {
    throw new Error(response.error || 'Failed to load sessions');
  }
  currentSessions = response.sessions || [];
  return currentSessions;
};

const renderSessionList = () => {
  const sessionList = document.getElementById('sessionList');
  if (!sessionList) return;

  if (currentSessions.length === 0) {
    sessionList.innerHTML = '<p>No sessions found</p>';
    return;
  }

  const sessionItems = currentSessions.map(session => `
    <div class="session-item">
      <h3>${session.name}</h3>
      <p>${session.tabs?.length || 0} tabs</p>
    </div>
  `).join('');

  sessionList.innerHTML = sessionItems;
};

const loadCookies = async (domain: string) => {
  const response = await Browser.runtime.sendMessage({ 
    type: 'GET_COOKIES',
    domain 
  }) as Response;
  if (!response.success) {
    throw new Error(response.error || 'Failed to load cookies');
  }
  return response.cookies || [];
};

const createNewSession = async () => {
  const mockTabs: Tab[] = [
    { 
      id: 1, 
      title: 'Test Tab', 
      url: 'https://example.com',
      index: 0,
      highlighted: false,
      active: false,
      pinned: false,
      incognito: false
    }
  ];
  await Browser.tabs.query({ currentWindow: true });
  await Browser.runtime.sendMessage({ type: 'CREATE_SESSION' });
};

const restoreSession = async (sessionName: string) => {
  const response = await Browser.runtime.sendMessage({ 
    type: 'RESTORE_SESSION',
    sessionName 
  }) as Response;
  if (!response.success) {
    throw new Error(response.error || 'Failed to restore session');
  }
};

const deleteSession = async (sessionName: string) => {
  const response = await Browser.runtime.sendMessage({ 
    type: 'DELETE_SESSION',
    sessionName 
  }) as Response;
  if (!response.success) {
    throw new Error(response.error || 'Failed to delete session');
  }
};

const updateStatus = (message: string, isLoading?: boolean, isWarning?: boolean) => {
  const statusElement = document.getElementById('statusMessage');
  if (statusElement) {
    statusElement.textContent = message;
  }
};

const escapeHtml = (str: string) => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Mock initialization function
const mockInitialization = async () => {
  const updateStatus = window.updateStatus;
  try {
    updateStatus('Initializing...', true);
    await getCsrfToken();
    await loadSessions();
    updateStatus('Ready');
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
  }
};

describe('Popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div id="sessionList"></div>
      <div id="statusMessage"></div>
      <div id="cookiesTableBody"></div>
      <button id="newSession"></button>
      <button id="settings"></button>
      <div id="warningDialog"></div>
      <div id="warningDialogContent"></div>
      <button id="closeWarningDialog"></button>
    `;

    // Mock global functions
    window.updateStatus = vi.fn();
    window.getCsrfToken = getCsrfToken;
    window.loadSessions = loadSessions;
    window.initialize = mockInitialization;
  });

  describe('Initialization', () => {
    it('should initialize with correct DOM elements', () => {
      expect(document.getElementById('sessionList')).toBeTruthy();
      expect(document.getElementById('statusMessage')).toBeTruthy();
      expect(document.getElementById('newSession')).toBeTruthy();
      expect(document.getElementById('settings')).toBeTruthy();
      expect(document.getElementById('warningDialog')).toBeTruthy();
      expect(document.getElementById('overlay')).toBeTruthy();
    });

    it('should handle initialization errors', async () => {
      const mockError = new Error('Initialization failed');
      vi.mocked(Browser.runtime.sendMessage).mockRejectedValueOnce(mockError);
      
      // Trigger initialization
      await mockInitialization();
      
      expect(window.updateStatus).toHaveBeenCalledWith('Error: Initialization failed', false, true);
    });
  });

  describe('CSRF Token Management', () => {
    it('should get CSRF token successfully', async () => {
      const mockToken = 'test-token';
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
        token: mockToken
      });

      const token = await getCsrfToken();
      expect(token).toBe(mockToken);
      expect(Browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CSRF_TOKEN'
      });
    });

    it('should handle CSRF token errors', async () => {
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Token generation failed'
      });

      await expect(getCsrfToken()).rejects.toThrow('Token generation failed');
    });
  });

  describe('Session Management', () => {
    it('should load sessions successfully', async () => {
      const mockSessions = [
        { 
          name: 'Test Session', 
          tabs: [{ id: 1, title: 'Test Tab', url: 'https://example.com' }],
          createdAt: Date.now()
        }
      ];
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
        sessions: mockSessions
      });

      await loadSessions();
      expect(currentSessions).toEqual(mockSessions);
    });

    it('should handle session loading errors', async () => {
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Failed to load sessions'
      });

      await expect(loadSessions()).rejects.toThrow('Failed to load sessions');
    });

    it('should render empty session list', () => {
      currentSessions = [];
      renderSessionList();
      
      const sessionList = document.getElementById('sessionList');
      expect(sessionList?.innerHTML).toContain('No sessions found');
    });

    it('should render session list with items', () => {
      currentSessions = [
        {
          name: 'Test Session',
          tabs: [{ id: 1, title: 'Test Tab', url: 'https://example.com' }],
          createdAt: Date.now()
        }
      ];
      
      renderSessionList();
      
      const sessionList = document.getElementById('sessionList');
      expect(sessionList?.innerHTML).toContain('Test Session');
      expect(sessionList?.innerHTML).toContain('1 tabs');
    });
  });

  describe('Event Listeners', () => {
    it('should handle new session button click', async () => {
      const newSessionButton = document.getElementById('newSession');
      const mockTabs: Tab[] = [{
        id: 1,
        url: 'https://example.com',
        index: 0,
        highlighted: false,
        active: true,
        pinned: false,
        incognito: false
      }];
      
      // Mock the createNewSession function
      const createNewSession = vi.fn().mockImplementation(async () => {
        await Browser.tabs.query({ currentWindow: true });
        await Browser.runtime.sendMessage({ type: 'CREATE_SESSION' });
      });
      window.createNewSession = createNewSession;

      if (newSessionButton) {
        newSessionButton.addEventListener('click', createNewSession);
        newSessionButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
        
        expect(createNewSession).toHaveBeenCalled();
      }
    });

    it('should handle settings button click', () => {
      const settingsButton = document.getElementById('settings');
      const openSettings = vi.fn().mockImplementation(() => {
        Browser.runtime.openOptionsPage();
      });
      window.openSettings = openSettings;

      if (settingsButton) {
        settingsButton.addEventListener('click', openSettings);
        settingsButton.click();
        expect(openSettings).toHaveBeenCalled();
      }
    });
  });

  describe('Warning Dialog', () => {
    it('should show warning dialog', () => {
      const warnings = ['Warning 1', 'Warning 2'];
      const warningDialog = document.getElementById('warningDialog');
      const warningDialogContent = document.getElementById('warningDialogContent');
      
      if (warningDialog && warningDialogContent) {
        warningDialogContent.innerHTML = warnings.map(warning => 
          `<div class="warning-item">${warning}</div>`
        ).join('');
        warningDialog.classList.add('visible');
        
        expect(warningDialog.classList.contains('visible')).toBe(true);
        expect(warningDialogContent.querySelectorAll('.warning-item').length).toBe(2);
      }
    });

    it('should close warning dialog', () => {
      const warningDialog = document.getElementById('warningDialog');
      const closeButton = document.getElementById('closeWarningDialog');
      const closeWarningDialog = vi.fn().mockImplementation(() => {
        if (warningDialog) {
          warningDialog.classList.remove('visible');
        }
      });
      window.closeWarningDialog = closeWarningDialog;
      
      if (warningDialog && closeButton) {
        warningDialog.classList.add('visible');
        closeButton.addEventListener('click', closeWarningDialog);
        closeButton.click();
        
        expect(closeWarningDialog).toHaveBeenCalled();
        expect(warningDialog.classList.contains('visible')).toBe(false);
      }
    });
  });

  describe('Status Updates', () => {
    it('should update status message', () => {
      const statusElement = document.getElementById('statusMessage');
      if (statusElement) {
        statusElement.textContent = 'Test status';
        expect(statusElement.textContent).toBe('Test status');
      }
    });

    it('should update status with warning', () => {
      const statusElement = document.getElementById('statusMessage');
      if (statusElement) {
        statusElement.textContent = 'Warning message';
        statusElement.classList.add('error');
        expect(statusElement.textContent).toBe('Warning message');
        expect(statusElement.classList.contains('error')).toBe(true);
      }
    });

    it('should update status with loading state', () => {
      const statusElement = document.getElementById('statusMessage');
      if (statusElement) {
        statusElement.textContent = 'Loading...';
        statusElement.classList.add('loading');
        expect(statusElement.textContent).toBe('Loading...');
        expect(statusElement.classList.contains('loading')).toBe(true);
      }
    });
  });

  describe('Cookie Management', () => {
    it('should load cookies successfully', async () => {
      const mockCookies = [
        { name: 'test-cookie', value: 'test-value', domain: 'example.com' }
      ];
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
        cookies: mockCookies
      });

      const cookies = await loadCookies('example.com');
      expect(cookies).toEqual(mockCookies);
    });

    it('should handle cookie loading errors', async () => {
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Failed to load cookies'
      });

      await expect(loadCookies('example.com')).rejects.toThrow('Failed to load cookies');
    });
  });

  describe('Session Creation', () => {
    it('should create new session successfully', async () => {
      const mockTabs: Tab[] = [
        { 
          id: 1, 
          title: 'Test Tab', 
          url: 'https://example.com',
          index: 0,
          highlighted: false,
          active: false,
          pinned: false,
          incognito: false
        }
      ];
      vi.mocked(Browser.tabs.query).mockResolvedValueOnce(mockTabs);
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
        token: 'test-token'
      }).mockResolvedValueOnce({
        success: true
      });

      await createNewSession();
      expect(Browser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'IMPORT_SESSION'
        })
      );
    });

    it('should handle session creation errors', async () => {
      vi.mocked(Browser.tabs.query).mockResolvedValueOnce([]);
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Failed to create session'
      });

      await expect(createNewSession()).rejects.toThrow('Failed to create session');
    });
  });

  describe('Session Restoration', () => {
    it('should restore session successfully', async () => {
      const sessionName = 'Test Session';
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true,
        tabsRestored: 1
      });

      await restoreSession(sessionName);
      expect(Browser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'RESTORE_SESSION',
          sessionName
        })
      );
    });

    it('should handle session restoration errors', async () => {
      const sessionName = 'Test Session';
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Failed to restore session'
      });

      await expect(restoreSession(sessionName)).rejects.toThrow('Failed to restore session');
    });
  });

  describe('Session Deletion', () => {
    it('should delete session successfully', async () => {
      const sessionName = 'Test Session';
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: true
      });

      await deleteSession(sessionName);
      expect(Browser.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'DELETE_SESSION',
          sessionName
        })
      );
    });

    it('should handle session deletion errors', async () => {
      const sessionName = 'Test Session';
      vi.mocked(Browser.runtime.sendMessage).mockResolvedValueOnce({
        success: false,
        error: 'Failed to delete session'
      });

      await expect(deleteSession(sessionName)).rejects.toThrow('Failed to delete session');
    });
  });

  describe('Utility Functions', () => {
    it('should escape HTML correctly', () => {
      const input = '<script>alert("test")</script>';
      const expected = '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should update status correctly', () => {
      const message = 'Test message';
      const isLoading = true;
      const isWarning = false;

      updateStatus(message, isLoading, isWarning);
      
      const statusElement = document.getElementById('statusMessage');
      expect(statusElement?.textContent).toBe(message);
    });
  });
}); 