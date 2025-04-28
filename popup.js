// Import session snippets module
import { saveCurrentSession, restoreSession, getSavedSessions, deleteSession } from './session-snippets.js';
import authManager from './auth.js';
import syncManager from './sync.js';

export function initializePopup() {
  return new Promise((resolve) => {
    // Set up event listeners for popup buttons
    const testProtectionBtn = document.getElementById('testProtectionBtn');
    const saveCookiesBtn = document.getElementById('saveCookiesBtn');
    const restoreCookiesBtn = document.getElementById('restoreCookiesBtn');
    
    if (testProtectionBtn) {
      testProtectionBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'testProtection' }, (response) => {
              if (response && response.success) {
                displayResults(response.results);
              } else {
                displayError('Failed to test protection');
              }
            });
          }
        });
      });
    }
    
    if (saveCookiesBtn) {
      saveCookiesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            const url = new URL(tabs[0].url);
            chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
              // Encrypt cookies before saving
              const encryptedCookies = encryptCookies(cookies);
              chrome.storage.local.set({ savedCookies: encryptedCookies }, () => {
                displayResults(['Cookies saved successfully']);
              });
            });
          }
        });
      });
    }
    
    if (restoreCookiesBtn) {
      restoreCookiesBtn.addEventListener('click', () => {
        chrome.storage.local.get(['savedCookies'], (result) => {
          if (result.savedCookies && result.savedCookies.length > 0) {
            // Restore cookies
            result.savedCookies.forEach(cookie => {
              chrome.cookies.set({
                url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                expirationDate: cookie.expirationDate
              });
            });
            displayResults(['Cookies restored successfully']);
          } else {
            displayError('No saved cookies found');
          }
        });
      });
    }
    
    // Load initial settings
    loadSettings();
    
    resolve();
  });
}

export function handleCookieConsent() {
  return new Promise((resolve) => {
    // Implementation for handling cookie consent in popup
    console.log('Popup: Cookie consent handled');
    
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Send message to content script to handle cookie consent
        chrome.tabs.sendMessage(tabs[0].id, { action: 'handleCookieConsent' }, (response) => {
          if (response && response.success) {
            displayResults(['Cookie consent handled successfully']);
          } else {
            displayError('Failed to handle cookie consent');
          }
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

export function handleCookieSettings() {
  return new Promise((resolve) => {
    // Implementation for handling cookie settings in popup
    console.log('Popup: Cookie settings handled');
    
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Send message to content script to handle cookie settings
        chrome.tabs.sendMessage(tabs[0].id, { action: 'handleCookieSettings' }, (response) => {
          if (response && response.success) {
            displayResults(['Cookie settings handled successfully']);
          } else {
            displayError('Failed to handle cookie settings');
          }
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

// Helper functions
function loadSettings() {
  chrome.storage.local.get(['sessionLoggingEnabled', 'focusModeEnabled', 'meetingModeEnabled'], (result) => {
    // Update UI based on settings
    updatePopupUI(result);
  });
}

// Renamed to avoid duplicate declaration
function updatePopupUI(settings) {
  // Update UI elements based on settings
  const sessionLoggingCheckbox = document.getElementById('sessionLoggingEnabled');
  const focusModeCheckbox = document.getElementById('focusModeEnabled');
  const meetingModeCheckbox = document.getElementById('meetingModeEnabled');
  
  if (sessionLoggingCheckbox) {
    sessionLoggingCheckbox.checked = settings.sessionLoggingEnabled || false;
  }
  
  if (focusModeCheckbox) {
    focusModeCheckbox.checked = settings.focusModeEnabled || false;
  }
  
  if (meetingModeCheckbox) {
    meetingModeCheckbox.checked = settings.meetingModeEnabled || false;
  }
}

function displayResults(results) {
  const resultsElement = document.getElementById('results');
  if (resultsElement) {
    resultsElement.innerHTML = results.map(result => `<div>${result}</div>`).join('');
  }
}

function displayError(message) {
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.innerHTML = `<div class="error">${message}</div>`;
  }
}

// Session Snippets UI Elements
const newSessionNameInput = document.getElementById('newSessionName');
const saveCurrentSessionButton = document.getElementById('saveCurrentSession');
const savedSessionsList = document.getElementById('savedSessionsList');

// Load saved sessions
async function loadSavedSessions() {
  try {
    const sessions = await getSavedSessions();
    savedSessionsList.innerHTML = '';
    
    if (sessions.length === 0) {
      savedSessionsList.innerHTML = '<div class="session-item">No saved sessions</div>';
      return;
    }
    
    sessions.forEach(session => {
      const sessionElement = document.createElement('div');
      sessionElement.className = 'session-item';
      
      const date = new Date(session.createdAt);
      const formattedDate = date.toLocaleString();
      
      sessionElement.innerHTML = `
        <div class="session-info">
          <div class="session-name">${session.name}</div>
          <div class="session-date">${formattedDate} (${session.tabs.length} tabs)</div>
        </div>
        <div class="session-actions">
          <button class="restore-session" data-name="${session.name}">Restore</button>
          <button class="delete-session" data-name="${session.name}">Delete</button>
        </div>
      `;
      
      savedSessionsList.appendChild(sessionElement);
    });
    
    // Add event listeners for restore and delete buttons
    document.querySelectorAll('.restore-session').forEach(button => {
      button.addEventListener('click', async () => {
        const sessionName = button.dataset.name;
        const sessions = await getSavedSessions();
        const session = sessions.find(s => s.name === sessionName);
        if (session) {
          try {
            showLoading('Restoring session...');
            await restoreSession(session);
            showSuccess('Session restored successfully!');
          } catch (error) {
            showError('Failed to restore session', error);
          } finally {
            hideLoading();
          }
        }
      });
    });
    
    document.querySelectorAll('.delete-session').forEach(button => {
      button.addEventListener('click', async () => {
        const sessionName = button.dataset.name;
        try {
          await deleteSession(sessionName);
          await loadSavedSessions(); // Refresh the list
          showSuccess('Session deleted successfully!');
        } catch (error) {
          showError('Failed to delete session', error);
        }
      });
    });
  } catch (error) {
    showError('Failed to load saved sessions', error);
  }
}

// Save current session
saveCurrentSessionButton.addEventListener('click', async () => {
  const sessionName = newSessionNameInput.value.trim();
  if (!sessionName) {
    showError('Please enter a session name');
    return;
  }
  
  try {
    showLoading('Saving current session...');
    await saveCurrentSession(sessionName);
    newSessionNameInput.value = '';
    await loadSavedSessions(); // Refresh the list
    showSuccess('Session saved successfully!');
  } catch (error) {
    showError('Failed to save session', error);
  } finally {
    hideLoading();
  }
});

// Load saved sessions when popup opens
document.addEventListener('DOMContentLoaded', loadSavedSessions);

// Focus/Meeting Mode functionality
function initializeModeControls() {
  const focusModeButton = document.getElementById('toggle-focus-mode');
  const meetingModeButton = document.getElementById('toggle-meeting-mode');
  const modeStatus = document.getElementById('mode-status');

  // Load initial mode states
  chrome.storage.local.get(['focusMode', 'meetingMode'], (result) => {
    updateModeUI(result.focusMode || false, result.meetingMode || false);
  });

  // Focus Mode toggle
  focusModeButton.addEventListener('click', async () => {
    const currentState = await toggleMode('focusMode');
    updateModeUI(currentState, null);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'updateMode',
      mode: 'focusMode',
      state: currentState
    });
  });

  // Meeting Mode toggle
  meetingModeButton.addEventListener('click', async () => {
    const currentState = await toggleMode('meetingMode');
    updateModeUI(null, currentState);
    
    // Send message to background script
    chrome.runtime.sendMessage({
      action: 'updateMode',
      mode: 'meetingMode',
      state: currentState
    });
  });

  // Function to toggle mode state
  async function toggleMode(mode) {
    return new Promise((resolve) => {
      chrome.storage.local.get([mode], (result) => {
        const currentState = result[mode] || false;
        const newState = !currentState;
        chrome.storage.local.set({ [mode]: newState }, () => {
          resolve(newState);
        });
      });
    });
  }

  // Function to update UI based on mode states
  function updateModeUI(focusState, meetingState) {
    // Update Focus Mode UI
    if (focusState !== null) {
      const focusButton = document.getElementById('toggle-focus-mode');
      const focusStatus = focusButton.querySelector('.mode-status');
      focusButton.classList.toggle('active', focusState);
      focusStatus.textContent = focusState ? 'On' : 'Off';
    }

    // Update Meeting Mode UI
    if (meetingState !== null) {
      const meetingButton = document.getElementById('toggle-meeting-mode');
      const meetingStatus = meetingButton.querySelector('.mode-status');
      meetingButton.classList.toggle('active', meetingState);
      meetingStatus.textContent = meetingState ? 'On' : 'Off';
    }

    // Update status indicator
    if (focusState || meetingState) {
      modeStatus.textContent = getModeStatusText(focusState, meetingState);
      modeStatus.className = 'mode-status-indicator ' + 
        (focusState ? 'focus-active' : '') + 
        (meetingState ? 'meeting-active' : '');
    } else {
      modeStatus.textContent = '';
      modeStatus.className = 'mode-status-indicator';
    }
  }

  // Helper function to get status text
  function getModeStatusText(focusState, meetingState) {
    if (focusState && meetingState) return 'Focus Mode & Meeting Mode Active';
    if (focusState) return 'Focus Mode Active';
    if (meetingState) return 'Meeting Mode Active';
    return '';
  }
}

// Initialize mode controls when popup loads
document.addEventListener('DOMContentLoaded', () => {
  initializeModeControls();
  // ... existing initialization code ...
});

// Feedback Management
const popupFeedback = document.getElementById('popup-feedback');

function showFeedback(message, type = 'success', duration = 3000) {
  if (!popupFeedback) return;
  
  popupFeedback.textContent = message;
  popupFeedback.className = `feedback-message ${type}`;
  
  if (duration > 0) {
    setTimeout(() => {
      popupFeedback.textContent = '';
      popupFeedback.className = 'feedback-message';
    }, duration);
  }
}

function showLoadingFeedback(message) {
  showFeedback(message, 'loading', 0);
}

// Update cookie protection toggle
if (cookieProtectionToggle) {
  cookieProtectionToggle.addEventListener('change', () => {
    const enabled = cookieProtectionToggle.checked;
    cookieProtectionToggle.classList.add('loading');
    showLoadingFeedback(enabled ? 'Enabling cookie protection...' : 'Disabling cookie protection...');
    
    chrome.storage.local.set({ cookieProtectionEnabled: enabled }, () => {
      chrome.runtime.sendMessage({ 
        type: 'setCookieProtectionEnabled', 
        enabled 
      }, (response) => {
        cookieProtectionToggle.classList.remove('loading');
        if (response && response.success) {
          showFeedback(
            enabled ? 'Cookie protection enabled' : 'Cookie protection disabled',
            'success'
          );
        } else {
          showFeedback('Failed to update cookie protection. Please try again.', 'error');
          cookieProtectionToggle.checked = !enabled; // Revert toggle
        }
      });
    });
  });
}

// Update import/export buttons
if (importCookiesButton) {
  importCookiesButton.addEventListener('click', () => {
    showLoadingFeedback('Importing cookies...');
    // ... existing import logic ...
  });
}

if (exportCookiesButton) {
  exportCookiesButton.addEventListener('click', () => {
    showLoadingFeedback('Exporting cookies...');
    // ... existing export logic ...
  });
}

// Update test protection button
if (testProtectionButton) {
  testProtectionButton.addEventListener('click', () => {
    testProtectionButton.classList.add('loading');
    showLoadingFeedback('Testing cookie protection...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.runtime.sendMessage({ 
          type: 'testCookieProtection', 
          tabId: tabs[0].id 
        }, (response) => {
          testProtectionButton.classList.remove('loading');
          if (response && response.success) {
            showFeedback('Cookie protection test completed successfully!', 'success');
          } else {
            showFeedback('Cookie protection test failed. Please try again.', 'error');
          }
        });
      }
    });
  });
}

// DOM Elements
const authSection = document.getElementById('authSection');
const profileSection = document.getElementById('profileSection');
const syncStatus = document.getElementById('syncStatus');

// Auth Elements
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const logoutButton = document.getElementById('logoutButton');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');

// Initialize
async function init() {
  await authManager.init();
  updateUI();
  setupEventListeners();
}

// Update UI based on auth state
function updateUI() {
  if (authManager.isAuthenticated()) {
    const user = authManager.getCurrentUser();
    authSection.style.display = 'none';
    profileSection.style.display = 'block';
    
    userName.textContent = user.name;
    userEmail.textContent = user.email;
    
    // Start sync if authenticated
    syncManager.startSync();
  } else {
    authSection.style.display = 'block';
    profileSection.style.display = 'none';
    
    // Stop sync if not authenticated
    syncManager.stopSync();
  }
}

// Setup event listeners
function setupEventListeners() {
  // Auth events
  loginButton.addEventListener('click', handleLogin);
  registerButton.addEventListener('click', handleRegister);
  logoutButton.addEventListener('click', handleLogout);

  // Listen for sync events
  chrome.storage.onChanged.addListener(handleStorageChange);
}

// Handle login
async function handleLogin() {
  try {
    loginError.textContent = '';
    const email = loginEmail.value;
    const password = loginPassword.value;

    await authManager.login(email, password);
    updateUI();
    showSyncStatus('Login successful', 'success');
  } catch (error) {
    loginError.textContent = error.message;
    showSyncStatus(error.message, 'error');
  }
}

// Handle register
async function handleRegister() {
  try {
    registerError.textContent = '';
    const name = registerName.value;
    const email = registerEmail.value;
    const password = registerPassword.value;

    await authManager.register(email, password, name);
    updateUI();
    showSyncStatus('Registration successful', 'success');
  } catch (error) {
    registerError.textContent = error.message;
    showSyncStatus(error.message, 'error');
  }
}

// Handle logout
async function handleLogout() {
  try {
    await authManager.logout();
    updateUI();
    showSyncStatus('Logged out successfully', 'info');
  } catch (error) {
    showSyncStatus(error.message, 'error');
  }
}

// Handle storage changes
function handleStorageChange(changes, namespace) {
  if (namespace === 'local') {
    if (changes.syncStatus) {
      const { status, message } = changes.syncStatus.newValue;
      showSyncStatus(message, status);
    }
  }
}

// Show sync status
function showSyncStatus(message, status = 'info') {
  syncStatus.textContent = message;
  syncStatus.className = `sync-status ${status}`;
  syncStatus.style.display = 'block';

  setTimeout(() => {
    syncStatus.style.display = 'none';
  }, 3000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

// New function to encrypt cookies before export
function encryptCookies(cookies) {
  // Simple encryption for demonstration purposes
  return cookies.map(cookie => ({
    ...cookie,
    value: btoa(cookie.value)
  }));
}

// Update saveCookiesBtn click handler to encrypt cookies before saving
if (saveCookiesBtn) {
  saveCookiesBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const url = new URL(tabs[0].url);
        chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
          // Encrypt cookies before saving
          const encryptedCookies = encryptCookies(cookies);
          chrome.storage.local.set({ savedCookies: encryptedCookies }, () => {
            displayResults(['Cookies saved successfully']);
          });
        });
      }
    });
  });
} 