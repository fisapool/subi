document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const domainInput = document.getElementById('domain');
  const deleteSessionCookiesButton = document.getElementById('deleteSessionCookiesButton');
  const exportSessionCookiesButton = document.getElementById('exportSessionCookiesButton');
  const importSessionCookiesButton = document.getElementById('importSessionCookiesButton');
  const sessionCookieDuration = document.getElementById('sessionCookieDuration');
  const statusMessage = document.getElementById('statusMessage');

  // Productivity toggles
  const toggleFocusMode = document.getElementById('toggleFocusMode');
  const configFocusMode = document.getElementById('configFocusMode');
  const toggleMeetingMode = document.getElementById('toggleMeetingMode');

  // Options page button
  const openOptionsPageButton = document.getElementById('openOptionsPage');
  if (openOptionsPageButton) {
    openOptionsPageButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Show/hide Configure button for Focus Mode based on toggle state
  function updateConfigButtonVisibility() {
    if (toggleFocusMode.checked) {
      configFocusMode.style.display = 'inline-block';
    } else {
      configFocusMode.style.display = 'none';
    }
  }

  toggleFocusMode.addEventListener('change', () => {
    chrome.storage.local.set({ focusModeEnabled: toggleFocusMode.checked });
    updateConfigButtonVisibility();
    showStatus(`Focus Mode ${toggleFocusMode.checked ? 'enabled' : 'disabled'}`);
  });

  configFocusMode.addEventListener('click', () => {
    showStatus('Focus Mode configuration panel coming soon!');
  });

  toggleMeetingMode.addEventListener('change', () => {
    chrome.storage.local.set({ meetingModeEnabled: toggleMeetingMode.checked });
    showStatus(`Meeting Mode ${toggleMeetingMode.checked ? 'enabled' : 'disabled'}`);
  });

  // Load saved settings
  chrome.storage.local.get(['sessionCookieDuration', 'focusModeEnabled', 'meetingModeEnabled'], (result) => {
    if (result.sessionCookieDuration !== undefined) {
      sessionCookieDuration.value = result.sessionCookieDuration;
    } else {
      sessionCookieDuration.value = 720; // default 720 minutes (12 hours)
      chrome.storage.local.set({ sessionCookieDuration: 720 });
    }
    if (result.focusModeEnabled !== undefined) {
      toggleFocusMode.checked = result.focusModeEnabled;
    }
    if (result.meetingModeEnabled !== undefined) {
      toggleMeetingMode.checked = result.meetingModeEnabled;
    }
    updateConfigButtonVisibility();
  });

  // Helper to show status message
  function showStatus(message, isError = false) {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.style.display = 'block';
      statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }
