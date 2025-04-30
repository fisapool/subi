// Sidepanel utility functions
const sidepanelUtils = {
  // Switch to a different panel
  switchPanel: (panelPath) => {
    chrome.runtime.sendMessage(
      { action: 'switchPanel', panelPath },
      (response) => {
        if (!response || !response.success) {
          console.error('Failed to switch panel');
        }
      }
    );
  },
  
  // Save the current session
  saveCurrentSession: () => {
    chrome.runtime.sendMessage(
      { action: 'saveSession' },
      (response) => {
        if (!response || !response.success) {
          console.error('Failed to save session');
        } else {
          // Show success message
          const status = document.getElementById('status');
          if (status) {
            status.textContent = 'Session saved successfully!';
            setTimeout(() => {
              status.textContent = 'Ready';
            }, 3000);
          }
        }
      }
    );
  },
  
  // Load all saved sessions
  loadSessions: () => {
    chrome.runtime.sendMessage(
      { action: 'loadSessions' },
      (response) => {
        if (!response || !response.success) {
          console.error('Failed to load sessions');
          // Show error in UI
          const status = document.getElementById('status');
          if (status) {
            status.textContent = 'Failed to load sessions';
          }
        }
      }
    );
  },
  
  // Create a new session
  createNewSession: () => {
    // This would typically open a dialog or prompt for session name
    const sessionName = prompt('Enter a name for your new session:');
    if (sessionName) {
      chrome.runtime.sendMessage(
        { action: 'createNewSession', name: sessionName },
        (response) => {
          if (!response || !response.success) {
            console.error('Failed to create new session');
          } else {
            // Refresh the session list
            sidepanelUtils.loadSessions();
          }
        }
      );
    }
  },
  
  // Restore a session
  restoreSession: (sessionId) => {
    chrome.runtime.sendMessage(
      { action: 'restoreSession', sessionId },
      (response) => {
        if (!response || !response.success) {
          console.error('Failed to restore session');
        } else {
          // Show success message
          const status = document.getElementById('status');
          if (status) {
            status.textContent = 'Session restored successfully!';
            setTimeout(() => {
              status.textContent = 'Ready';
            }, 3000);
          }
        }
      }
    );
  },
  
  // Delete a session
  deleteSession: (sessionId) => {
    if (confirm('Are you sure you want to delete this session?')) {
      chrome.runtime.sendMessage(
        { action: 'deleteSession', sessionId },
        (response) => {
          if (!response || !response.success) {
            console.error('Failed to delete session');
          } else {
            // Refresh the session list
            sidepanelUtils.loadSessions();
          }
        }
      );
    }
  }
};

// Export the utilities for use in the sidepanel HTML files
window.sidepanelUtils = sidepanelUtils; 