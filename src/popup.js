// Import dependencies
import authManager from './auth.js';
import * as syncManager from './sync.js';
import browser from 'webextension-polyfill';
import AuthHandler from './auth-handler';

// DOM Elements
const cookieProtectionToggle = document.getElementById('protectSessionCheckbox');
const importCookiesButton = document.getElementById('importCookiesButton');
const exportCookiesButton = document.getElementById('exportCookiesButton');
const testProtectionButton = document.getElementById('testProtectionBtn');
const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const popupFeedback = document.getElementById('popup-feedback');
const sessionList = document.getElementById('sessionList');
const saveSessionBtn = document.getElementById('saveSession');
const sessionNameInput = document.getElementById('sessionName');
const domainInput = document.getElementById('domain');
const statusMessage = document.getElementById('statusMessage');

// Initialize popup
export async function initializePopup() {
  try {
    const settings = await loadSettings();
    await updateUI(settings);
    await loadCookies();
    setupEventListeners();
  } catch (error) {
    showError('Failed to initialize popup: ' + error.message);
  }
}

// Load settings
async function loadSettings() {
  const settings = await browser.storage.sync.get(['autoDelete', 'whitelist', 'theme']);
  return settings || {};
}

// Load cookies
export async function loadCookies() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'GET_COOKIES' });
    displayCookies(response.cookies);
  } catch (error) {
    showError('Failed to load cookies: ' + error.message);
  }
}

// Display cookies in the UI
function displayCookies(cookies) {
  const cookieList = document.getElementById('cookie-list');
  if (!cookieList) return;
  
  cookieList.innerHTML = '';
  cookies.forEach(cookie => {
    const item = createCookieElement(cookie);
    cookieList.appendChild(item);
  });
}

// Create cookie list item
function createCookieElement(cookie) {
  const item = document.createElement('div');
  item.className = 'cookie-item';
  item.innerHTML = `
    <span>${cookie.name}</span>
    <span>${cookie.domain}</span>
    <button class="delete-btn">Delete</button>
  `;
  
  item.querySelector('.delete-btn').addEventListener('click', () => {
    deleteCookie(cookie);
  });
  
  return item;
}

// Delete cookie
export async function deleteCookie(cookie) {
  try {
    await browser.runtime.sendMessage({
      type: 'DELETE_COOKIE',
      cookie
    });
    
    await loadCookies(); // Refresh the list
  } catch (error) {
    showError('Failed to delete cookie: ' + error.message);
  }
}

// Save settings
export async function saveSettings(settings) {
  if (!validateSettings(settings)) {
    throw new Error('Invalid settings format');
  }
  
  await browser.storage.sync.set(settings);
  await updateUI(settings);
}

// Validate settings
function validateSettings(settings) {
  if (!settings || typeof settings !== 'object') return false;
  
  // Validate theme if present
  if (settings.theme && !['light', 'dark'].includes(settings.theme)) return false;
  
  // Validate autoDelete if present
  if ('autoDelete' in settings && typeof settings.autoDelete !== 'boolean') return false;
  
  // Validate whitelist if present
  if ('whitelist' in settings && !Array.isArray(settings.whitelist)) return false;
  
  return true;
}

// Update UI
export async function updateUI(settings = {}) {
  // Update theme
  const theme = settings.theme || 'light';
  document.body.classList.toggle('dark-theme', theme === 'dark');
  
  // Update settings panel
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) {
    settingsPanel.innerHTML = `
      <label>
        <input type="checkbox" id="auto-delete" ${settings.autoDelete ? 'checked' : ''}>
        Auto-delete cookies
      </label>
      <div>
        <label>Whitelist:</label>
        <input type="text" id="whitelist" value="${settings.whitelist?.join(',') || ''}">
      </div>
      <button id="theme-toggle">Toggle Theme</button>
    `;
  }

  // Update auth state
  if (authManager.isAuthenticated()) {
    const user = authManager.getCurrentUser();
    authSection.style.display = 'none';
    userSection.style.display = 'block';
    userSection.querySelector('.user-name').textContent = user.name;
  } else {
    authSection.style.display = 'block';
    userSection.style.display = 'none';
  }
}

// Toggle theme
export async function toggleTheme() {
  const settings = await loadSettings();
  const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
  
  await saveSettings({
    ...settings,
    theme: newTheme
  });
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  document.body.addEventListener('click', async (e) => {
    if (e.target.id === 'theme-toggle') {
      await toggleTheme();
    }
  });
  
  // Settings form
  const settingsPanel = document.getElementById('settings-panel');
  if (settingsPanel) {
    settingsPanel.addEventListener('change', async (e) => {
      const settings = await loadSettings();
      
      if (e.target.id === 'auto-delete') {
        settings.autoDelete = e.target.checked;
      } else if (e.target.id === 'whitelist') {
        settings.whitelist = e.target.value.split(',').map(domain => domain.trim());
      }
      
      await saveSettings(settings);
    });
  }

  // Cookie protection toggle
  if (cookieProtectionToggle) {
    cookieProtectionToggle.addEventListener('change', () => {
      const enabled = cookieProtectionToggle.checked;
      cookieProtectionToggle.classList.add('loading');
      showLoadingFeedback(enabled ? 'Enabling cookie protection...' : 'Disabling cookie protection...');
      
      browser.storage.local.set({ cookieProtectionEnabled: enabled }, () => {
        browser.runtime.sendMessage({ 
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
}

// Error and feedback handling
function showError(message) {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
      errorElement.style.display = 'none';
    }, 3000);
  }
}

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

// Initialize when loaded
document.addEventListener('DOMContentLoaded', initializePopup);

const authHandler = new AuthHandler();

// Load saved sessions
async function loadSessions() {
    try {
        const sessions = await authHandler.getSavedSessions();
        sessionList.innerHTML = '';
        
        sessions.forEach(session => {
            const sessionElement = document.createElement('div');
            sessionElement.className = 'session-item';
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = session.name;
            
            const domainSpan = document.createElement('span');
            domainSpan.textContent = session.domain;
            
            const timestampSpan = document.createElement('span');
            timestampSpan.textContent = new Date(session.timestamp).toLocaleString();
            
            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Load';
            loadBtn.onclick = () => loadSession(session.name);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = () => deleteSession(session.name);
            
            sessionElement.appendChild(nameSpan);
            sessionElement.appendChild(domainSpan);
            sessionElement.appendChild(timestampSpan);
            sessionElement.appendChild(loadBtn);
            sessionElement.appendChild(deleteBtn);
            
            sessionList.appendChild(sessionElement);
        });
    } catch (error) {
        showStatus('Error loading sessions: ' + error.message, 'error');
    }
}

// Save current session
async function saveSession() {
    const sessionName = sessionNameInput.value.trim();
    const domain = domainInput.value.trim();
    
    if (!sessionName || !domain) {
        showStatus('Please enter both session name and domain', 'error');
        return;
    }
    
    try {
        const success = await authHandler.saveCurrentSession(sessionName, domain);
        if (success) {
            showStatus('Session saved successfully', 'success');
            loadSessions();
            sessionNameInput.value = '';
        } else {
            showStatus('Failed to save session', 'error');
        }
    } catch (error) {
        showStatus('Error saving session: ' + error.message, 'error');
    }
}

// Load a saved session
async function loadSession(sessionName) {
    try {
        const success = await authHandler.loadSavedSession(sessionName);
        if (success) {
            showStatus('Session loaded successfully', 'success');
        } else {
            showStatus('Failed to load session', 'error');
        }
    } catch (error) {
        showStatus('Error loading session: ' + error.message, 'error');
    }
}

// Delete a saved session
async function deleteSession(sessionName) {
    try {
        const success = await authHandler.deleteSavedSession(sessionName);
        if (success) {
            showStatus('Session deleted successfully', 'success');
            loadSessions();
        } else {
            showStatus('Failed to delete session', 'error');
        }
    } catch (error) {
        showStatus('Error deleting session: ' + error.message, 'error');
    }
}

// Show status message
function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }, 3000);
}

// Event listeners
saveSessionBtn.addEventListener('click', saveSession);

// Initial load
document.addEventListener('DOMContentLoaded', loadSessions); 