// Popup script for FISABytes Sessions

/**
 * @typedef {Object} Cookie
 * @property {string} name - The name of the cookie
 * @property {string} value - The value of the cookie
 * @property {string} domain - The domain of the cookie
 */

/**
 * @typedef {Object} CookieIdentifier
 * @property {string} name - The name of the cookie
 * @property {string} domain - The domain of the cookie
 */

/**
 * @typedef {Object} Tab
 * @property {number} id - The tab ID
 * @property {string} title - The tab title
 * @property {string} url - The tab URL
 * @property {string} [favicon] - The tab favicon URL
 * @property {Array<Cookie>} [cookies] - The tab's cookies
 * @property {string} [error] - Error message if processing failed
 */

/**
 * @typedef {Object} Session
 * @property {string} name - The session name
 * @property {Array<Tab>} tabs - The session tabs
 * @property {number} createdAt - The session creation timestamp
 */

// Global state
/** @type {string | null} */
let csrfToken = null;
/** @type {Array<Session>} */
let currentSessions = [];
/** @type {boolean} */
let isLoadingState = false;
/** @type {string} */
let statusMessage = 'Ready';

// DOM elements
/** @type {HTMLElement | null} */
const sessionListElement = document.getElementById('sessionList');
/** @type {HTMLElement | null} */
const statusElement = document.getElementById('statusMessage');
/** @type {HTMLElement | null} */
const cookiesTableBody = document.getElementById('cookiesTableBody');
/** @type {HTMLElement | null} */
const newSessionButton = document.getElementById('newSession');
/** @type {HTMLElement | null} */
const settingsButton = document.getElementById('settings');
/** @type {HTMLElement | null} */
const warningDialog = document.getElementById('warningDialog');
/** @type {HTMLElement | null} */
const warningDialogContent = document.getElementById('warningDialogContent');
/** @type {HTMLElement | null} */
const closeWarningDialogButton = document.getElementById('closeWarningDialog');
/** @type {HTMLElement | null} */
const cancelImportButton = document.getElementById('cancelImport');
/** @type {HTMLElement | null} */
const proceedImportButton = document.getElementById('proceedImport');
/** @type {HTMLElement | null} */
const overlay = document.getElementById('overlay');

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Set initial loading state
    updateStatus('Initializing...', true);

    // Get CSRF token
    await getCsrfToken();

    // Load sessions with sync status update
    updateStatus('Syncing sessions...', true);
    await loadSessions();
    updateStatus('Sessions synced');

    // Add event listeners
    setupEventListeners();

    // Update status
    updateStatus('Ready');
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
  }
});

// Get CSRF token
async function getCsrfToken() {
  try {
    updateStatus('Getting CSRF token...', true);

    const response = await chrome.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to get CSRF token');
    }

    csrfToken = response.token;
    return csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Load sessions
async function loadSessions() {
  try {
    updateStatus('Loading sessions...', true);

    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to load sessions');
    }

    /** @type {Array<Session>} */
    currentSessions = response.sessions || [];
    renderSessionList();

    if (response.warning) {
      console.warn(response.warning);
      updateStatus(response.warning, false, true);
    } else {
      updateStatus(`Loaded ${currentSessions.length} sessions`);
    }

    return currentSessions;
  } catch (error) {
    console.error('Error loading sessions:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Render the session list
function renderSessionList() {
  if (!sessionListElement) {
    console.warn('Session list element not found');
    return;
  }

  // Clear the list
  sessionListElement.innerHTML = '';

  if (currentSessions.length === 0) {
    sessionListElement.innerHTML = `
      <tr><td colspan="4" class="text-center py-8 text-gray-500">
        No sessions found. Create a new session to get started.
      </td></tr>
    `;
    return;
  }

  // Sort sessions by creation date (newest first)
  const sortedSessions = [...currentSessions].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  // Create session rows
  sortedSessions.forEach(/** @type {Session} */ session => {
    const tabCount = session.tabs?.length || 0;
    const createdAt = session.createdAt
      ? new Date(session.createdAt).toLocaleString()
      : 'Unknown date';

    const row = document.createElement('tr');
    row.dataset.sessionId = session.name;

    row.innerHTML = `
      <td>${escapeHtml(session.name)}</td>
      <td>${createdAt}</td>
      <td>${tabCount}</td>
      <td>
        <button class="btn btn-primary restore-session" data-session-name="${session.name}">Restore</button>
        <button class="btn btn-secondary delete-session" data-session-name="${session.name}">Delete</button>
      </td>
    `;

    sessionListElement.appendChild(row);
  });

  // Add event listeners to buttons
  document.querySelectorAll('.restore-session').forEach(button => {
    button.addEventListener('click', event => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset) {
        const sessionName = target.dataset.sessionName;
        if (sessionName) {
          restoreSession(sessionName);
        }
      }
    });
  });

  document.querySelectorAll('.delete-session').forEach(button => {
    button.addEventListener('click', event => {
      const target = event.target;
      if (target instanceof HTMLElement && target.dataset) {
        const sessionName = target.dataset.sessionName;
        if (sessionName) {
          deleteSession(sessionName);
        }
      }
    });
  });
}

// Setup event listeners
function setupEventListeners() {
  // New session button
  if (newSessionButton) {
    newSessionButton.addEventListener('click', createNewSession);
  }

  // Settings button
  if (settingsButton) {
    settingsButton.addEventListener('click', openSettings);
  }

  // Warning dialog close button
  if (closeWarningDialogButton) {
    closeWarningDialogButton.addEventListener('click', closeWarningDialog);
  }

  // Cancel import button
  if (cancelImportButton) {
    cancelImportButton.addEventListener('click', closeWarningDialog);
  }

  // Proceed import button
  if (proceedImportButton) {
    proceedImportButton.addEventListener('click', () => {
      // This will be set up dynamically when needed
    });
  }

  // Overlay click
  if (overlay) {
    overlay.addEventListener('click', closeWarningDialog);
  }
}

// Create a new session
async function createNewSession() {
  try {
    updateStatus('Creating new session...', true);

    // Get all tabs in the current window
    const tabs = await chrome.tabs.query({ currentWindow: true });

    if (!tabs || !Array.isArray(tabs)) {
      throw new Error('Failed to get current tabs');
    }

    // Process tabs in batches to avoid overwhelming the browser
    /** @type {Array<Tab>} */
    const processedTabs = [];
    const batchSize = 5;

    for (let i = 0; i < tabs.length; i += batchSize) {
      const batch = tabs.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async tab => {
          try {
            // Skip chrome:// and other restricted URLs
            if (
              !tab.url ||
              tab.url.startsWith('chrome://') ||
              tab.url.startsWith('chrome-extension://')
            ) {
              /** @type {Tab} */
              const processedTab = {
                id: tab.id || 0,
                title: tab.title || 'Untitled',
                url: tab.url || '',
                favicon: tab.favIconUrl,
                cookies: [],
              };
              return processedTab;
            }

            // Get cookies for the tab
            let cookies = [];
            try {
              const domain = new URL(tab.url).hostname;
              const response = await chrome.runtime.sendMessage({
                type: 'EXPORT_SESSION_IN_FORMAT',
                sessionId: 'current',
                csrfToken,
                domain,
              });

              if (response.success && response.sessionData && response.sessionData.cookies) {
                cookies = response.sessionData.cookies;
              }
            } catch (error) {
              console.warn(`Failed to get cookies for ${tab.url}:`, error);
            }

            /** @type {Tab} */
            const processedTab = {
              id: tab.id || 0,
              title: tab.title || 'Untitled',
              url: tab.url || '',
              favicon: tab.favIconUrl,
              cookies,
            };
            return processedTab;
          } catch (error) {
            console.error(`Error processing tab ${tab.url}:`, error);
            /** @type {Tab} */
            const processedTab = {
              id: tab.id || 0,
              title: tab.title || 'Untitled',
              url: tab.url || '',
              favicon: tab.favIconUrl,
              cookies: [],
              error: error instanceof Error ? error.message : 'Unknown error',
            };
            return processedTab;
          }
        })
      );

      processedTabs.push(...batchResults);

      // Update status to show progress
      updateStatus(`Processing tabs... ${processedTabs.length}/${tabs.length}`, true);
    }

    // Create session object
    /** @type {Session} */
    const session = {
      name: `Session ${new Date().toLocaleString()}`,
      tabs: processedTabs,
      createdAt: Date.now(),
    };

    // Import the session
    const response = await chrome.runtime.sendMessage({
      type: 'IMPORT_SESSION',
      sessionData: session,
      csrfToken,
    });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to create session');
    }

    // Reload sessions
    await loadSessions();

    updateStatus('Session created successfully');
  } catch (error) {
    console.error('Error creating session:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
  }
}

// Restore a session
/**
 * @param {string} sessionName - The name of the session to restore
 */
async function restoreSession(sessionName) {
  try {
    updateStatus(`Restoring session...`, true);

    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_SESSION',
      sessionName,
      csrfToken,
    });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to restore session');
    }

    // Check for warnings
    if (response.cookieResults?.warnings?.length > 0) {
      console.warn('Session restored with warnings:', response.cookieResults.warnings);
      updateStatus(
        `Session restored with ${response.cookieResults.warnings.length} warnings`,
        false,
        true
      );
    } else {
      updateStatus(`Session restored successfully: ${response.tabsRestored || 0} tabs`);
    }
  } catch (error) {
    console.error('Error restoring session:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
  }
}

// Delete a session
/**
 * @param {string} sessionName - The name of the session to delete
 */
async function deleteSession(sessionName) {
  try {
    // Find the session
    /** @type {Session | undefined} */
    const session = currentSessions.find(s => s.name === sessionName);
    const displayName = session ? session.name : 'Unknown session';

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${displayName}"?`)) {
      return;
    }

    updateStatus(`Deleting session...`, true);

    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_SESSION',
      sessionName,
      csrfToken,
    });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete session');
    }

    // Reload sessions
    await loadSessions();

    updateStatus('Session deleted successfully');
  } catch (error) {
    console.error('Error deleting session:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
  }
}

// Open settings
function openSettings() {
  try {
    chrome.runtime.openOptionsPage();
  } catch (error) {
    console.error('Error opening settings:', error);
    updateStatus('Error: Failed to open settings', false, true);
  }
}

// Show warning dialog
/**
 * @param {Array<string>} warnings - Array of warning messages
 * @param {Function} onProceed - Callback function to execute when proceeding
 */
function showWarningDialog(warnings, onProceed) {
  try {
    if (!warningDialog || !warningDialogContent || !overlay) {
      console.warn('Warning dialog elements not found');
      return;
    }

    // Set the content
    warningDialogContent.innerHTML = '';

    if (Array.isArray(warnings)) {
      warnings.forEach(warning => {
        if (typeof warning !== 'string') {
          console.warn('Invalid warning message type:', warning);
          return;
        }
        const warningItem = document.createElement('div');
        warningItem.className = 'warning-item';
        warningItem.textContent = warning;
        warningDialogContent.appendChild(warningItem);
      });
    } else if (typeof warnings === 'string') {
      warningDialogContent.textContent = warnings;
    } else {
      warningDialogContent.textContent = 'Unknown warning';
      console.warn('Invalid warnings parameter type:', warnings);
    }

    // Set up the proceed button
    if (proceedImportButton) {
      if (typeof onProceed === 'function') {
        proceedImportButton.onclick = () => {
          try {
            onProceed();
          } catch (error) {
            console.error('Error in proceed callback:', error);
          }
          closeWarningDialog();
        };
      } else {
        console.warn('Invalid onProceed callback type:', onProceed);
      }
    }

    // Show the dialog
    overlay.classList.add('visible');
    warningDialog.classList.add('visible');
  } catch (error) {
    console.error('Error showing warning dialog:', error);
    updateStatus('Error: Failed to show warning dialog', false, true);
  }
}

// Close warning dialog
function closeWarningDialog() {
  try {
    if (!warningDialog || !overlay) {
      console.warn('Warning dialog elements not found');
      return;
    }

    overlay.classList.remove('visible');
    warningDialog.classList.remove('visible');
  } catch (error) {
    console.error('Error closing warning dialog:', error);
    updateStatus('Error: Failed to close warning dialog', false, true);
  }
}

// Update status message
/**
 * @param {string} message - The status message to display
 * @param {boolean} [isLoading=false] - Whether the operation is in progress
 * @param {boolean} [isWarning=false] - Whether the message is a warning
 */
function updateStatus(message, isLoading = false, isWarning = false) {
  try {
    if (typeof message !== 'string') {
      console.warn('Invalid status message type:', message);
      message = 'Invalid status message';
    }

    statusMessage = message;

    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = isWarning ? 'status-message error' : 'status-message info';
    }

    if (typeof isLoading === 'boolean') {
      isLoadingState = isLoading;
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

/**
 * Helper function to escape HTML
 * @param {string} unsafe - The string to escape
 * @returns {string} The escaped string
 */
function escapeHtml(unsafe) {
  try {
    if (typeof unsafe !== 'string') {
      console.warn('Invalid input type for escapeHtml:', unsafe);
      return '';
    }

    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  } catch (error) {
    console.error('Error escaping HTML:', error);
    return '';
  }
}

// Export functions for testing
export {
  getCsrfToken,
  loadSessions,
  renderSessionList,
  createNewSession,
  restoreSession,
  deleteSession,
  openSettings,
  showWarningDialog,
  closeWarningDialog,
  updateStatus,
  escapeHtml,
  initializePopup,
  loadCookies,
  deleteCookie,
  saveSettings,
  updateUI,
  toggleTheme,
  openCookieManagementPopup
};

// Initialize popup
async function initializePopup() {
  try {
    // Set initial loading state
    updateStatus('Initializing...', true);

    // Get CSRF token
    await getCsrfToken();

    // Load sessions
    await loadSessions();

    // Add event listeners
    setupEventListeners();

    // Update status
    updateStatus('Ready');
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Load cookies
async function loadCookies() {
  try {
    updateStatus('Loading cookies...', true);
    const response = await chrome.runtime.sendMessage({ type: 'GET_COOKIES' });
    
    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to load cookies');
    }

    if (!cookiesTableBody) {
      console.warn('Cookies table body element not found');
      return;
    }

    cookiesTableBody.innerHTML = '';

    if (!response.cookies || !Array.isArray(response.cookies)) {
      throw new Error('Invalid cookies data received');
    }

    /** @type {Array<Cookie>} */
    const cookies = response.cookies;

    if (cookies.length === 0) {
      cookiesTableBody.innerHTML = `
        <tr><td colspan="4" class="text-center py-8 text-gray-500">
          No cookies found.
        </td></tr>
      `;
      return;
    }

    cookies.forEach(/** @type {Cookie} */ cookie => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${escapeHtml(cookie.name)}</td>
        <td>${escapeHtml(cookie.value)}</td>
        <td>${escapeHtml(cookie.domain)}</td>
        <td>
          <button class="btn btn-secondary edit-cookie" data-cookie-name="${escapeHtml(cookie.name)}" data-cookie-domain="${escapeHtml(cookie.domain)}">Edit</button>
          <button class="btn btn-danger delete-cookie" data-cookie-name="${escapeHtml(cookie.name)}" data-cookie-domain="${escapeHtml(cookie.domain)}">Delete</button>
        </td>
      `;
      cookiesTableBody.appendChild(row);
    });

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.edit-cookie').forEach(button => {
      button.addEventListener('click', event => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset) {
          const name = target.dataset.cookieName;
          const domain = target.dataset.cookieDomain;
          if (name && domain) {
            openCookieManagementPopup(name, domain);
          }
        }
      });
    });

    document.querySelectorAll('.delete-cookie').forEach(button => {
      button.addEventListener('click', event => {
        const target = event.target;
        if (target instanceof HTMLElement && target.dataset) {
          const name = target.dataset.cookieName;
          const domain = target.dataset.cookieDomain;
          if (name && domain) {
            /** @type {CookieIdentifier} */
            const cookieIdentifier = { name, domain };
            deleteCookie(cookieIdentifier);
          }
        }
      });
    });

    updateStatus(`Loaded ${cookies.length} cookies`);
    return cookies;
  } catch (error) {
    console.error('Error loading cookies:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Delete cookie
async function deleteCookie(/** @type {CookieIdentifier} */ cookieIdentifier) {
  try {
    updateStatus('Deleting cookie...', true);
    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_COOKIE',
      cookie: {
        name: cookieIdentifier.name,
        domain: cookieIdentifier.domain
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete cookie');
    }

    await loadCookies();
    updateStatus('Cookie deleted successfully');
  } catch (error) {
    console.error('Error deleting cookie:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Save settings
async function saveSettings(/** @type {Record<string, any>} */ settings) {
  try {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }

    updateStatus('Saving settings...', true);
    const response = await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to save settings');
    }

    await updateUI(settings);
    updateStatus('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, false, true);
    throw error;
  }
}

// Update UI
async function updateUI(/** @type {Record<string, any>} */ settings) {
  try {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings object');
    }

    // Update theme
    if (settings.theme) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(`${settings.theme}-theme`);
    }

    // Update other UI elements based on settings
    // Add more UI updates as needed
  } catch (error) {
    console.error('Error updating UI:', error);
    throw error;
  }
}

// Toggle theme
async function toggleTheme() {
  try {
    const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    await saveSettings({ theme: newTheme });
  } catch (error) {
    console.error('Error toggling theme:', error);
    throw error;
  }
}

/**
 * Opens the cookie management popup for a specific cookie
 * @param {string} name - The name of the cookie
 * @param {string} domain - The domain of the cookie
 */
function openCookieManagementPopup(name, domain) {
  // Implementation for opening cookie management popup
  console.log('Opening cookie management popup for:', { name, domain });
  // TODO: Implement cookie management popup functionality
}
