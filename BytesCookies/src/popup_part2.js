document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const domainInput = document.getElementById('domain');
  const deleteSessionCookiesButton = document.getElementById('deleteSessionCookiesButton');
  const exportSessionCookiesButton = document.getElementById('exportSessionCookiesButton');
  const importSessionCookiesButton = document.getElementById('importSessionCookiesButton');
  const protectCookiesToggle = document.getElementById('protectCookiesToggle');
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
  chrome.storage.local.get(['protectCookies', 'sessionCookieDuration', 'focusModeEnabled', 'meetingModeEnabled'], (result) => {
    if (result.protectCookies !== undefined) {
      protectCookiesToggle.checked = result.protectCookies;
    }
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

  protectCookiesToggle.addEventListener('change', () => {
    chrome.storage.local.set({ protectCookies: protectCookiesToggle.checked });
  });

  sessionCookieDuration.addEventListener('change', () => {
    let duration = parseInt(sessionCookieDuration.value, 10);
    if (isNaN(duration) || duration < 1) {
      duration = 1;
      sessionCookieDuration.value = duration;
    } else if (duration > 720) {
      duration = 720;
      sessionCookieDuration.value = duration;
    }
    chrome.storage.local.set({ sessionCookieDuration: duration });
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
