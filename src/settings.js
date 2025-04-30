// Settings page for SessionBuddy

document.addEventListener('DOMContentLoaded', () => {
  // Declare chrome if it's not already defined (e.g., in a testing environment)
  if (typeof chrome === 'undefined') {
    console.warn(
      'Chrome API not available.  This script is intended to run within a Chrome extension.'
    );
    // Provide a mock implementation for testing purposes.  This will prevent errors, but the extension won't actually work.
    chrome = {
      storage: {
        local: {
          get: keys => {
            return new Promise(resolve => {
              const mockData = {
                settings: { autoSave: false, autoSaveInterval: 30, encryptData: true },
              };
              resolve(mockData);
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

  // Get UI elements
  const autoSaveCheckbox = document.getElementById('autoSave');
  const autoSaveIntervalInput = document.getElementById('autoSaveInterval');
  const encryptDataCheckbox = document.getElementById('encryptData');
  const exportDataButton = document.getElementById('exportData');
  const importDataButton = document.getElementById('importData');
  const clearDataButton = document.getElementById('clearData');
  const statusElement = document.getElementById('status');

  // Load current settings
  loadSettings();

  // Add event listeners
  autoSaveCheckbox?.addEventListener('change', saveSettings);
  autoSaveIntervalInput?.addEventListener('change', saveSettings);
  encryptDataCheckbox?.addEventListener('change', saveSettings);
  exportDataButton?.addEventListener('click', exportData);
  importDataButton?.addEventListener('click', importData);
  clearDataButton?.addEventListener('click', clearData);

  // Function to load settings
  async function loadSettings() {
    try {
      const storage = await chrome.storage.local.get('settings');
      const settings = storage.settings || {
        autoSave: false,
        autoSaveInterval: 30,
        encryptData: true,
      };

      // Update UI with loaded settings
      if (autoSaveCheckbox) autoSaveCheckbox.checked = settings.autoSave;
      if (autoSaveIntervalInput) autoSaveIntervalInput.value = settings.autoSaveInterval;
      if (encryptDataCheckbox) encryptDataCheckbox.checked = settings.encryptData;
    } catch (error) {
      showStatus('Error loading settings: ' + error.message, 'error');
    }
  }

  // Function to save settings
  async function saveSettings() {
    try {
      if (!autoSaveCheckbox || !autoSaveIntervalInput || !encryptDataCheckbox) {
        throw new Error('UI elements not found');
      }

      const settings = {
        autoSave: autoSaveCheckbox.checked,
        autoSaveInterval: Number.parseInt(autoSaveIntervalInput.value, 10) || 30,
        encryptData: encryptDataCheckbox.checked,
      };

      // Validate settings
      if (settings.autoSaveInterval < 5) {
        settings.autoSaveInterval = 5;
        autoSaveIntervalInput.value = '5';
      } else if (settings.autoSaveInterval > 120) {
        settings.autoSaveInterval = 120;
        autoSaveIntervalInput.value = '120';
      }

      await chrome.storage.local.set({ settings });
      showStatus('Settings saved successfully', 'success');

      // Update auto-save alarm if needed
      if (settings.autoSave) {
        await chrome.runtime.sendMessage({
          type: 'UPDATE_AUTO_SAVE',
          interval: settings.autoSaveInterval,
        });
      } else {
        await chrome.runtime.sendMessage({ type: 'DISABLE_AUTO_SAVE' });
      }
    } catch (error) {
      showStatus('Error saving settings: ' + error.message, 'error');
    }
  }

  // Function to export data
  async function exportData() {
    try {
      showStatus('Preparing data for export...', 'info');

      const response = await chrome.runtime.sendMessage({ type: 'GET_SESSIONS' });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get sessions');
      }

      const sessions = response.sessions || [];

      // Create a data URL for download
      const dataStr = JSON.stringify(sessions, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(dataBlob);

      // Create download link
      const exportFileDefaultName =
        'sessionbuddy_export_' + new Date().toISOString().slice(0, 10) + '.json';
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUrl);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.style.display = 'none';
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);

      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(dataUrl);
      }, 100);

      showStatus(`Data exported successfully (${sessions.length} sessions)`, 'success');
    } catch (error) {
      console.error('Error exporting data:', error);
      showStatus('Error exporting data: ' + error.message, 'error');
    }
  }

  // Function to import data
  async function importData() {
    const statusElement = document.getElementById('status');
    try {
      const tokenResponse = await chrome.runtime.sendMessage({ type: 'GET_CSRF_TOKEN' });
      if (!tokenResponse.success) {
        statusElement.textContent = 'Error getting CSRF token';
        return;
      }

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data) || !data.every(session => session.id && session.name && Array.isArray(session.tabs))) {
              statusElement.textContent = 'Invalid data format';
              return;
            }
            const response = await chrome.runtime.sendMessage({
              type: 'IMPORT_SESSIONS',
              data,
              token: tokenResponse.token
            });
            statusElement.textContent = response.success ? 'Data imported successfully' : 'Error importing data';
          } catch (error) {
            statusElement.textContent = 'Invalid data format';
          }
        };
        reader.readAsText(file);
      };
      fileInput.click();
    } catch (error) {
      statusElement.textContent = 'Error importing data';
    }
  }

  // Function to clear data
  async function clearData() {
    // For testing purposes, we'll skip the confirmation in test environment
    const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
    if (!isTest && !window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CLEAR_ALL_DATA' });
      document.getElementById('status').textContent = response.success ? 'Data cleared successfully' : 'Error clearing data';
    } catch (error) {
      document.getElementById('status').textContent = 'Error clearing data';
    }
  }

  // Function to show status messages
  function showStatus(message, type) {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = 'status ' + type;

    // Hide status after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusElement.className = 'status';
      }, 5000);
    }
  }
});
