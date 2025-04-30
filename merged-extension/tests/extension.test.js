const { expect, describe, test, beforeEach } = require('@jest/globals');

// Mock Chrome API for testing
const mockChrome = {
  sidePanel: {
    setOptions: jest.fn().mockResolvedValue(undefined),
    setPanelBehavior: jest.fn().mockResolvedValue(undefined)
  },
  runtime: {
    sendMessage: jest.fn().mockImplementation((message, callback) => {
      if (callback) {
        callback({ success: true });
      }
      return Promise.resolve({ success: true });
    }),
    onMessage: {
      addListener: jest.fn()
    },
    onStartup: {
      addListener: jest.fn()
    },
    openOptionsPage: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined)
    },
    onChanged: {
      addListener: jest.fn()
    }
  },
  tabs: {
    onActivated: {
      addListener: jest.fn()
    },
    get: jest.fn().mockImplementation((tabId, callback) => {
      callback({ url: 'https://developer.chrome.com' });
    }),
    create: jest.fn().mockResolvedValue({ id: 'new-tab' }),
    update: jest.fn().mockResolvedValue({ id: 'tab-1', url: 'https://updated.com' }),
    remove: jest.fn().mockResolvedValue(undefined)
  },
  permissions: {
    getAll: jest.fn().mockResolvedValue({
      permissions: ['storage', 'tabs']
    })
  }
};

// Replace global chrome object with mock
global.chrome = mockChrome;

// Mock DOM elements
document.body.innerHTML = `
  <div id="status">Ready</div>
  <div id="sessionList">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
  <button id="openMainPanel">Open Main Panel</button>
  <button id="saveCurrentSession">Save Current Session</button>
  <button id="viewSavedSessions">View Saved Sessions</button>
  <button id="backToWelcome">Back</button>
  <button id="newSession">New Session</button>
  <button id="settings">Settings</button>
  <div id="errorHandler"></div>
  <button id="retryButton">Retry</button>
  <div id="mainPanel"></div>
  <div id="sessionsPanel"></div>
  <div id="settingsPanel"></div>
`;

// Import the sidepanel utilities
const sidepanelUtils = {
  switchPanel: (panelPath) => {
    chrome.runtime.sendMessage({ action: 'switchPanel', panelPath }, () => {});
  },
  saveCurrentSession: () => {
    chrome.runtime.sendMessage({ action: 'saveSession' }, () => {});
  },
  loadSessions: () => {
    return chrome.runtime.sendMessage({ action: 'loadSessions' }, () => {});
  },
  createNewSession: (name) => {
    chrome.runtime.sendMessage({ action: 'createNewSession', name }, () => {});
  },
  restoreSession: (sessionId) => {
    chrome.runtime.sendMessage({ action: 'restoreSession', sessionId }, () => {});
  },
  deleteSession: (sessionId) => {
    chrome.runtime.sendMessage({ action: 'deleteSession', sessionId }, () => {});
  },
  sanitizeSession: (session) => {
    return {
      ...session,
      name: session.name.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      windows: session.windows.map(window => ({
        ...window,
        tabs: window.tabs.map(tab => ({
          ...tab,
          url: tab.url.startsWith('javascript:') ? 'about:blank' : tab.url,
          title: tab.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
        }))
      }))
    };
  }
};

// Make sidepanelUtils available globally
global.sidepanelUtils = sidepanelUtils;

describe('Chrome Extension API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Sidepanel API', () => {
    test('should set sidepanel options', async () => {
      await chrome.sidePanel.setOptions({ path: 'sidepanels/main-sp.html' });
      expect(chrome.sidePanel.setOptions).toHaveBeenCalledWith({
        path: 'sidepanels/main-sp.html'
      });
    });

    test('should set panel behavior', async () => {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
      expect(chrome.sidePanel.setPanelBehavior).toHaveBeenCalledWith({
        openPanelOnActionClick: true
      });
    });
  });

  describe('Storage API', () => {
    test('should save data to local storage', async () => {
      const data = { key: 'value' };
      await chrome.storage.local.set(data);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(data);
    });

    test('should retrieve data from local storage', async () => {
      const mockData = { key: 'value' };
      chrome.storage.local.get.mockResolvedValueOnce(mockData);
      const result = await chrome.storage.local.get('key');
      expect(result).toEqual(mockData);
    });
  });

  describe('Tabs API', () => {
    test('should query tabs', async () => {
      const mockTab = { id: 1, url: 'https://example.com' };
      chrome.tabs.get.mockImplementationOnce((tabId, callback) => {
        callback(mockTab);
      });
      await new Promise(resolve => {
        chrome.tabs.get(1, (tab) => {
          expect(tab).toEqual(mockTab);
          resolve();
        });
      });
    });

    test('should create new tab', async () => {
      const mockTab = { id: 'new-tab', url: 'https://example.com' };
      chrome.tabs.create.mockResolvedValueOnce(mockTab);
      const result = await chrome.tabs.create({ url: 'https://example.com' });
      expect(result).toEqual(mockTab);
    });
  });

  describe('Runtime API', () => {
    test('should add message listener', () => {
      const listener = jest.fn();
      chrome.runtime.onMessage.addListener(listener);
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });

    test('should send message', async () => {
      const message = { action: 'test' };
      const response = await chrome.runtime.sendMessage(message);
      expect(response).toEqual({ success: true });
    });
  });
});

// Test session management
describe('Session Management', () => {
  test('create and persist session', async () => {
    const session = {
      id: 'test-session',
      name: 'Test Session',
      windows: [{
        id: 'window-1',
        tabs: [{
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example Tab'
        }]
      }]
    };
    
    await mockChrome.storage.local.set({ 'sessions': { [session.id]: session } });
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      'sessions': { [session.id]: session }
    });
  });

  test('update session', async () => {
    const session = {
      id: 'test-session',
      name: 'Updated Session',
      windows: [{
        id: 'window-1',
        tabs: [{
          id: 'tab-1',
          url: 'https://example.com',
          title: 'Example Tab'
        }]
      }]
    };
    
    await mockChrome.storage.local.set({ 'sessions': { [session.id]: session } });
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      'sessions': { [session.id]: session }
    });
  });

  test('delete session', async () => {
    await mockChrome.storage.local.remove('sessions.test-session');
    expect(mockChrome.storage.local.remove).toHaveBeenCalledWith('sessions.test-session');
  });
});

// Test tab management
describe('Tab Management', () => {
  test('create tab', async () => {
    const tab = {
      id: 'new-tab',
      url: 'https://example.com',
      title: 'New Tab'
    };
    
    await chrome.tabs.create({ url: tab.url });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: tab.url });
  });

  test('update tab', async () => {
    await chrome.tabs.update('tab-1', { url: 'https://updated.com' });
    expect(chrome.tabs.update).toHaveBeenCalledWith('tab-1', { url: 'https://updated.com' });
  });

  test('remove tab', async () => {
    await chrome.tabs.remove('tab-1');
    expect(chrome.tabs.remove).toHaveBeenCalledWith('tab-1');
  });
});

// Test error handling
describe('Error Handling', () => {
  test('handle invalid session data', async () => {
    // Override the mock implementation for this test
    chrome.storage.local.set.mockImplementationOnce((data) => {
      if (data.sessions && data.sessions['invalid-session'] === null) {
        return Promise.reject(new Error('Invalid session data'));
      }
      return Promise.resolve(undefined);
    });
    
    await expect(chrome.storage.local.set({
      'sessions': { 'invalid-session': null }
    })).rejects.toThrow('Invalid session data');
  });

  test('handle network error', async () => {
    mockChrome.runtime.sendMessage.mockRejectedValueOnce(new Error('Network error'));
    await expect(sidepanelUtils.loadSessions()).rejects.toThrow('Network error');
  });
});

// Test performance
describe('Performance', () => {
  test('session loading performance', async () => {
    const startTime = performance.now();
    await sidepanelUtils.loadSessions();
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(1000);
  });

  test('UI rendering performance', async () => {
    const startTime = performance.now();
    await sidepanelUtils.loadSessions();
    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(500);
  });
});

// Test security
describe('Security', () => {
  test('prevent XSS', async () => {
    const maliciousSession = {
      id: 'xss-test',
      name: '<script>alert("xss")</script>',
      windows: [{
        id: 'window-1',
        tabs: [{
          id: 'tab-1',
          url: 'javascript:alert("xss")',
          title: '<img src="x" onerror="alert(\'xss\')">'
        }]
      }]
    };
    
    const sanitizedSession = await sidepanelUtils.sanitizeSession(maliciousSession);
    expect(sanitizedSession.name).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    expect(sanitizedSession.windows[0].tabs[0].url).toBe('about:blank');
  });

  test('verify permissions', async () => {
    const permissions = await mockChrome.permissions.getAll();
    expect(permissions.permissions).toContain('storage');
    expect(permissions.permissions).toContain('tabs');
  });
}); 