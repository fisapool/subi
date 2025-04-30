// Popup script for FISABytes Sessions

// Global state
let csrfToken = null;
let currentSessions = [];
const isLoading = false;
let statusMessage = 'Ready';

// DOM elements
const sessionListElement = document.getElementById('sessionList');
const statusElement = document.getElementById('status');
const newSessionButton = document.getElementById('newSession');
const settingsButton = document.getElementById('settings');
const warningDialog = document.getElementById('warningDialog');
const warningDialogContent = document.getElementById('warningDialogContent');
const closeWarningDialogButton = document.getElementById('closeWarningDialog');
const cancelImportButton = document.getElementById('cancelImport');
const proceedImportButton = document.getElementById('proceedImport');
const overlay = document.getElementById('overlay');

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
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
    updateStatus(`Error: ${error.message}`, false, true);
  }
});

// Get CSRF token
async function getCsrfToken() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get CSRF token');
    }

    csrfToken = response.token;
    console.log('CSRF token obtained');
    return csrfToken;
  } catch (error) {
    console.error('Error getting CSRF token:', error);
    throw new Error('Failed to initialize security. Please reload the extension.');
  }
}

// Load sessions
async function loadSessions() {
  try {
    updateStatus('Loading sessions...', true);

    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

    if (!response.success) {
      throw new Error(response.error || 'Failed to load sessions');
    }

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
    updateStatus(`Error: ${error.message}`, false, true);
    throw error;
  }
}

// Render the session list
function renderSessionList() {
  if (!sessionListElement) return;

  // Clear the list
  sessionListElement.innerHTML = '';

  if (currentSessions.length === 0) {
    sessionListElement.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        No sessions found. Create a new session to get started.
      </div>
    `;
    return;
  }

  // Sort sessions by creation date (newest first)
  const sortedSessions = [...currentSessions].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  // Create session items
  sortedSessions.forEach(session => {
    const sessionItem = document.createElement('div');
    sessionItem.className = 'session-item';
    sessionItem.dataset.sessionId = session.id;

    const tabCount = session.tabs?.length || 0;
    const createdAt = session.createdAt
      ? new Date(session.createdAt).toLocaleString()
      : 'Unknown date';

    sessionItem.innerHTML = `
      <div class="session-header p-4 flex items-center justify-between cursor-pointer">
        <div>
          <h3 class="session-title">${escapeHtml(session.name)}</h3>
          <p class="session-info">${createdAt} • ${tabCount} tabs</p>
        </div>
        <div class="actions">
          <button class="btn btn-primary restore-session" data-session-id="${
            session.id
          }">Restore</button>
          <button class="btn btn-secondary delete-session" data-session-id="${
            session.id
          }">Delete</button>
        </div>
      </div>
    `;

    sessionListElement.appendChild(sessionItem);
  });

  // Add event listeners to buttons
  document.querySelectorAll('.restore-session').forEach(button => {
    button.addEventListener('click', event => {
      const sessionId = event.target.dataset.sessionId;
      restoreSession(sessionId);
    });
  });

  document.querySelectorAll('.delete-session').forEach(button => {
    button.addEventListener('click', event => {
      const sessionId = event.target.dataset.sessionId;
      deleteSession(sessionId);
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

    // Process tabs in batches to avoid overwhelming the browser
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
              return {
                id: tab.id,
                title: tab.title,
                url: tab.url,
                favicon: tab.favIconUrl,
                cookies: [],
              };
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

            return {
              id: tab.id,
              title: tab.title,
              url: tab.url,
              favicon: tab.favIconUrl,
              cookies,
            };
          } catch (error) {
            console.error(`Error processing tab ${tab.url}:`, error);
            return {
              id: tab.id,
              title: tab.title,
              url: tab.url,
              favicon: tab.favIconUrl,
              cookies: [],
              error: error.message,
            };
          }
        })
      );

      processedTabs.push(...batchResults);

      // Update status to show progress
      updateStatus(`Processing tabs... ${processedTabs.length}/${tabs.length}`, true);
    }

    // Create session object
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

    if (!response.success) {
      throw new Error(response.error || 'Failed to create session');
    }

    // Reload sessions
    await loadSessions();

    updateStatus('Session created successfully');
  } catch (error) {
    console.error('Error creating session:', error);
    updateStatus(`Error: ${error.message}`, false, true);
  }
}

// Restore a session
async function restoreSession(sessionId) {
  try {
    updateStatus(`Restoring session...`, true);

    const response = await chrome.runtime.sendMessage({
      type: 'RESTORE_SESSION',
      sessionId,
      csrfToken,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to restore session');
    }

    // Check for warnings
    if (
      response.cookieResults &&
      response.cookieResults.warnings &&
      response.cookieResults.warnings.length > 0
    ) {
      console.warn('Session restored with warnings:', response.cookieResults.warnings);

      // Show a non-blocking notification
      updateStatus(
        `Session restored with ${response.cookieResults.warnings.length} warnings`,
        false,
        true
      );
    } else {
      updateStatus(`Session restored successfully: ${response.tabsRestored} tabs`);
    }
  } catch (error) {
    console.error('Error restoring session:', error);
    updateStatus(`Error: ${error.message}`, false, true);
  }
}

// Delete a session
async function deleteSession(sessionId) {
  try {
    // Find the session name
    const session = currentSessions.find(s => s.id === sessionId);
    const sessionName = session ? session.name : 'Unknown session';

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${sessionName}"?`)) {
      return;
    }

    updateStatus(`Deleting session...`, true);

    const response = await chrome.runtime.sendMessage({
      type: 'DELETE_SESSION',
      sessionId,
      csrfToken,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete session');
    }

    // Reload sessions
    await loadSessions();

    updateStatus('Session deleted successfully');
  } catch (error) {
    console.error('Error deleting session:', error);
    updateStatus(`Error: ${error.message}`, false, true);
  }
}

// Open settings
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Show warning dialog
function showWarningDialog(warnings, onProceed) {
  if (!warningDialog || !warningDialogContent || !overlay) return;

  // Set the content
  warningDialogContent.innerHTML = '';

  if (Array.isArray(warnings)) {
    warnings.forEach(warning => {
      const warningItem = document.createElement('div');
      warningItem.className = 'warning-item';

      let warningText = '';
      if (typeof warning === 'string') {
        warningText = warning;
      } else if (warning.message) {
        warningText = warning.message;
        if (warning.cookie) {
          warningText += ` (Cookie: ${warning.cookie})`;
        }
      } else if (warning.warnings && warning.cookie) {
        warningText = `Cookie "${warning.cookie}": ${warning.warnings.join(', ')}`;
      }

      warningItem.textContent = warningText;
      warningDialogContent.appendChild(warningItem);
    });
  } else {
    warningDialogContent.textContent = warnings || 'Unknown warning';
  }

  // Set up the proceed button
  if (proceedImportButton && typeof onProceed === 'function') {
    proceedImportButton.onclick = () => {
      onProceed();
      closeWarningDialog();
    };
  }

  // Show the dialog
  overlay.classList.add('visible');
  warningDialog.classList.add('visible');
}

// Close warning dialog
function closeWarningDialog() {
  if (!warningDialog || !overlay) return;

  overlay.classList.remove('visible');
  warningDialog.classList.remove('visible');
}

// Update status message
function updateStatus(message, isLoading = false, isWarning = false) {
  statusMessage = message;

  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isWarning ? 'text-yellow-500' : '';
  }

  if (isLoading !== undefined) {
    this.isLoading = isLoading;
  }
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
