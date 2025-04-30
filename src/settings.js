/**
 * @typedef {Object} Settings
 * @property {boolean} autoSave - Whether to automatically save sessions
 * @property {number} autoSaveInterval - Interval in minutes for auto-saving
 * @property {boolean} encryptData - Whether to encrypt session data
 */

/**
 * @typedef {Object} StorageResponse
 * @property {Settings} [settings] - The stored settings
 */

/**
 * @typedef {Object} MockChrome
 * @property {Object} storage
 * @property {Object} runtime
 */

/**
 * @typedef {Object} Session
 * @property {string} name - The session name
 * @property {Array<Tab>} tabs - The session tabs
 * @property {number} createdAt - The session creation timestamp
 */

/**
 * @typedef {Object} ExportResponse
 * @property {boolean} success - Whether the export was successful
 * @property {string} [error] - Error message if export failed
 * @property {Array<Session>} [sessions] - The exported sessions
 */

/**
 * @typedef {Object} ImportResponse
 * @property {boolean} success - Whether the import was successful
 * @property {string} [error] - Error message if import failed
 */

/**
 * @typedef {Object} TokenResponse
 * @property {boolean} success - Whether the token request was successful
 * @property {string} [error] - Error message if token request failed
 * @property {string} [token] - The CSRF token
 */

/**
 * @typedef {Object} ClearDataResponse
 * @property {boolean} success - Whether the data was cleared successfully
 * @property {string} [error] - Error message if clearing failed
 */

/**
 * @typedef {'success' | 'error' | 'info' | 'warning'} StatusType
 */

// Settings page for SessionBuddy

document.addEventListener('DOMContentLoaded', async () => {
  // Declare chrome if it's not already defined (e.g., in a testing environment)
  if (typeof chrome === 'undefined') {
    console.warn(
      'Chrome API not available. This script is intended to run within a Chrome extension.'
    );
    // Provide a mock implementation for testing purposes
    /** @type {MockChrome} */
    chrome = {
      storage: {
        local: {
          get: keys => {
            return new Promise(resolve => {
              /** @type {Settings} */
              const mockData = {
                autoSave: false,
                autoSaveInterval: 30,
                encryptData: true,
              };
              resolve({ settings: mockData });
            });
          },
          set: items => {
            return new Promise(resolve => {
              resolve();
            });
          },
        },
      },
      runtime: {
        sendMessage: message => {
          return new Promise(resolve => {
            console.log('Mock Chrome API: sendMessage', message);
            resolve({ success: true });
          });
        },
      },
    };
  }

  try {
    // Get UI elements
    /** @type {HTMLInputElement | null} */
    const autoSaveCheckbox = document.getElementById('autoSave');
    /** @type {HTMLInputElement | null} */
    const autoSaveIntervalInput = document.getElementById('autoSaveInterval');
    /** @type {HTMLInputElement | null} */
    const encryptDataCheckbox = document.getElementById('encryptData');
    /** @type {HTMLButtonElement | null} */
    const exportDataButton = document.getElementById('exportData');
    /** @type {HTMLButtonElement | null} */
    const importDataButton = document.getElementById('importData');
    /** @type {HTMLButtonElement | null} */
    const clearDataButton = document.getElementById('clearData');
    /** @type {HTMLElement | null} */
    const statusElement = document.getElementById('status');

    if (!autoSaveCheckbox || !autoSaveIntervalInput || !encryptDataCheckbox) {
      throw new Error('Required settings elements not found');
    }

    // Load saved settings
    await loadSettings();

    // Add event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing settings page:', error);
    updateStatus('Error: Failed to initialize settings page', true);
  }
});

// Function to load settings
async function loadSettings() {
  try {
    /** @type {StorageResponse} */
    const storage = await chrome.storage.local.get('settings');

    /** @type {Settings} */
    const settings = storage.settings || {
      autoSave: false,
      autoSaveInterval: 30,
      encryptData: true,
    };

    // Validate settings
    if (typeof settings.autoSave !== 'boolean') {
      console.warn('Invalid autoSave setting, using default');
      settings.autoSave = false;
    }

    if (typeof settings.autoSaveInterval !== 'number' || settings.autoSaveInterval < 5) {
      console.warn('Invalid autoSaveInterval setting, using default');
      settings.autoSaveInterval = 30;
    }

    if (typeof settings.encryptData !== 'boolean') {
      console.warn('Invalid encryptData setting, using default');
      settings.encryptData = true;
    }

    // Update UI with loaded settings
    if (autoSaveCheckbox) {
      autoSaveCheckbox.checked = settings.autoSave;
    }

    if (autoSaveIntervalInput) {
      autoSaveIntervalInput.value = settings.autoSaveInterval.toString();
    }

    if (encryptDataCheckbox) {
      encryptDataCheckbox.checked = settings.encryptData;
    }

    updateStatus('Settings loaded successfully');
  } catch (error) {
    console.error('Error loading settings:', error);
    updateStatus('Error: Failed to load settings', true);
  }
}

/**
 * Updates the status message with appropriate styling
 * @param {string} message - The status message to display
 * @param {StatusType} type - The type of status message
 */
function updateStatus(message, type = 'info') {
  try {
    if (!statusElement) {
      console.warn('Status element not found');
      return;
    }

    if (typeof message !== 'string') {
      console.warn('Invalid status message type:', message);
      message = 'Invalid status message';
    }

    if (!['success', 'error', 'info', 'warning'].includes(type)) {
      console.warn('Invalid status type:', type);
      type = 'info';
    }

    statusElement.textContent = message;
    statusElement.className = `status ${type}`;

    // Auto-clear non-error messages after 5 seconds
    if (type !== 'error') {
      setTimeout(() => {
        if (statusElement) {
          statusElement.textContent = '';
          statusElement.className = 'status';
        }
      }, 5000);
    }
  } catch (error) {
    console.error('Error updating status:', error);
  }
}

// Function to save settings
async function saveSettings() {
  try {
    if (!autoSaveCheckbox || !autoSaveIntervalInput || !encryptDataCheckbox) {
      throw new Error('Required settings elements not found');
    }

    /** @type {Settings} */
    const settings = {
      autoSave: autoSaveCheckbox.checked,
      autoSaveInterval: Number.parseInt(autoSaveIntervalInput.value, 10) || 30,
      encryptData: encryptDataCheckbox.checked,
    };

    // Validate settings
    if (typeof settings.autoSave !== 'boolean') {
      console.warn('Invalid autoSave value, using default');
      settings.autoSave = false;
    }

    if (typeof settings.autoSaveInterval !== 'number' || isNaN(settings.autoSaveInterval)) {
      console.warn('Invalid autoSaveInterval value, using default');
      settings.autoSaveInterval = 30;
    }

    if (typeof settings.encryptData !== 'boolean') {
      console.warn('Invalid encryptData value, using default');
      settings.encryptData = true;
    }

    // Validate auto-save interval range
    if (settings.autoSaveInterval < 5) {
      settings.autoSaveInterval = 5;
      autoSaveIntervalInput.value = '5';
    } else if (settings.autoSaveInterval > 120) {
      settings.autoSaveInterval = 120;
      autoSaveIntervalInput.value = '120';
    }

    // Save settings to storage
    await chrome.storage.local.set({ settings });
    updateStatus('Settings saved successfully');

    try {
      // Update auto-save alarm if needed
      if (settings.autoSave) {
        const response = await chrome.runtime.sendMessage({
          type: 'UPDATE_AUTO_SAVE',
          interval: settings.autoSaveInterval,
        });

        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to update auto-save alarm');
        }
      } else {
        const response = await chrome.runtime.sendMessage({ type: 'DISABLE_AUTO_SAVE' });
        
        if (!response || !response.success) {
          throw new Error(response?.error || 'Failed to disable auto-save');
        }
      }
    } catch (error) {
      console.error('Error updating auto-save:', error);
      updateStatus('Warning: Settings saved but auto-save update failed', true);
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to save settings'}`, true);
  }
}

// Function to export data
async function exportData() {
  try {
    updateStatus('Preparing data for export...');

    /** @type {ExportResponse} */
    const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to get sessions');
    }

    if (!Array.isArray(response.sessions)) {
      throw new Error('Invalid sessions data received');
    }

    /** @type {Array<Session>} */
    const sessions = response.sessions;

    if (sessions.length === 0) {
      updateStatus('No sessions to export', true);
      return;
    }

    try {
      // Create a data URL for download
      const dataStr = JSON.stringify(sessions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);

      // Create download link
      const exportFileDefaultName = `sessionbuddy_export_${new Date().toISOString().slice(0, 10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUrl);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.style.display = 'none';
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      // Clean up the URL object
      setTimeout(() => {
        try {
          URL.revokeObjectURL(dataUrl);
        } catch (error) {
          console.warn('Error revoking object URL:', error);
        }
      }, 100);

      updateStatus(`Data exported successfully (${sessions.length} sessions)`);
    } catch (error) {
      console.error('Error creating export file:', error);
      throw new Error('Failed to create export file');
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to export data'}`, true);
  }
}

// Function to import data
async function importData() {
  try {
    updateStatus('Preparing to import data...');

    /** @type {TokenResponse} */
    const tokenResponse = await chrome.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' });

    if (!tokenResponse) {
      throw new Error('No response received from background script');
    }

    if (!tokenResponse.success) {
      throw new Error(tokenResponse.error || 'Failed to get CSRF token');
    }

    if (!tokenResponse.token) {
      throw new Error('No CSRF token received');
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (event) => {
      try {
        const file = event.target.files?.[0];
        if (!file) {
          throw new Error('No file selected');
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!e.target?.result || typeof e.target.result !== 'string') {
              throw new Error('Invalid file content');
            }

            /** @type {Array<Session>} */
            const data = JSON.parse(e.target.result);

            // Validate data structure
            if (!Array.isArray(data)) {
              throw new Error('Invalid data format: expected an array');
            }

            if (!data.every(session => 
              typeof session === 'object' &&
              typeof session.name === 'string' &&
              Array.isArray(session.tabs) &&
              typeof session.createdAt === 'number'
            )) {
              throw new Error('Invalid data format: missing required session properties');
            }

            /** @type {ImportResponse} */
            const response = await chrome.runtime.sendMessage({
              type: 'IMPORT_SESSIONS',
              data,
              token: tokenResponse.token
            });

            if (!response) {
              throw new Error('No response received from background script');
            }

            if (!response.success) {
              throw new Error(response.error || 'Failed to import sessions');
            }

            updateStatus(`Data imported successfully (${data.length} sessions)`);
          } catch (error) {
            console.error('Error processing import file:', error);
            updateStatus(`Error: ${error instanceof Error ? error.message : 'Invalid data format'}`, true);
          }
        };

        reader.onerror = () => {
          throw new Error('Error reading file');
        };

        reader.readAsText(file);
      } catch (error) {
        console.error('Error handling file selection:', error);
        updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to handle file'}`, true);
      }
    };

    fileInput.click();
  } catch (error) {
    console.error('Error importing data:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to import data'}`, true);
  }
}

// Function to clear data
async function clearData() {
  try {
    // For testing purposes, we'll skip the confirmation in test environment
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    
    if (!isTest) {
      const confirmed = await new Promise((resolve) => {
        const result = window.confirm('Are you sure you want to clear all data? This action cannot be undone.');
        resolve(result);
      });

      if (!confirmed) {
        updateStatus('Data clearing cancelled', 'info');
        return;
      }
    }

    updateStatus('Clearing data...', 'info');

    /** @type {ClearDataResponse} */
    const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });

    if (!response) {
      throw new Error('No response received from background script');
    }

    if (!response.success) {
      throw new Error(response.error || 'Failed to clear data');
    }

    updateStatus('All data cleared successfully', 'success');
  } catch (error) {
    console.error('Error clearing data:', error);
    updateStatus(`Error: ${error instanceof Error ? error.message : 'Failed to clear data'}`, 'error');
  }
}

// Export functions for testing
export {
  loadSettings,
  saveSettings,
  exportData,
  importData,
  clearData,
  updateStatus,
  setupEventListeners
};
