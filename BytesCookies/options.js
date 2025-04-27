document.addEventListener('DOMContentLoaded', () => {
  const navigationButtons = {
    cookieSettings: document.getElementById('cookie-settings-tab'),
    productivity: document.getElementById('productivity-tab'),
    scripts: document.getElementById('scripts-tab'),
    activity: document.getElementById('activity-tab'),
  };

  const contentSections = {
    cookieSettings: document.getElementById('cookie-settings-content'),
    productivity: document.getElementById('productivity-content'),
    scripts: document.getElementById('scripts-content'),
    activity: document.getElementById('activity-content'),
  };

  const enableActivityLogCheckbox = document.getElementById('enable-activity-log');
  const clearActivityLogButton = document.getElementById('clear-activity-log');
  const sessionsList = document.getElementById('sessions-list');
  const emptyLogMessage = document.getElementById('empty-log-message');

  // Cookie Settings elements
  const protectedCookiesInput = document.getElementById('protected-cookies-input');
  const defaultSessionDurationInput = document.getElementById('default-session-duration');
  const saveCookieSettingsButton = document.getElementById('save-cookie-settings');
  const cookieSettingsFeedback = document.getElementById('cookie-settings-feedback');

  // Productivity elements
  const focusModeWebsitesInput = document.getElementById('focus-mode-websites');
  const focusModeActionsSelect = document.getElementById('focus-mode-actions');
  const meetingModeMutedSitesInput = document.getElementById('meeting-mode-muted-sites');
  const saveProductivitySettingsButton = document.getElementById('save-productivity-settings');
  const productivitySettingsFeedback = document.getElementById('productivity-settings-feedback');

  // Function to switch active tab and content
  function switchTab(tabName) {
    for (const key in navigationButtons) {
      if (key === tabName) {
        navigationButtons[key].classList.add('active');
        contentSections[key].classList.add('active');
      } else {
        navigationButtons[key].classList.remove('active');
        contentSections[key].classList.remove('active');
      }
    }
  }

  // Add event listeners for navigation buttons
  for (const key in navigationButtons) {
    navigationButtons[key].addEventListener('click', () => {
      switchTab(key);
    });
  }

  // Load session logging enabled state and session log
  chrome.storage.local.get(['sessionLoggingEnabled', 'sessionActivityLog'], (result) => {
    enableActivityLogCheckbox.checked = result.sessionLoggingEnabled || false;
    renderSessionLog(result.sessionActivityLog || []);
  });

  // Save session logging enabled state on change
  enableActivityLogCheckbox.addEventListener('change', () => {
    const enabled = enableActivityLogCheckbox.checked;
    chrome.storage.local.set({ sessionLoggingEnabled: enabled }, () => {
      chrome.runtime.sendMessage({ type: 'setSessionLoggingEnabled', enabled }, (response) => {
        if (!response || !response.success) {
          console.error('Failed to update session logging state in background script');
        }
      });
    });
  });

  // Clear session log
  clearActivityLogButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the session activity log?')) {
      chrome.runtime.sendMessage({ type: 'clearSessionLog' }, (response) => {
        if (response && response.success) {
          chrome.storage.local.set({ sessionActivityLog: [] }, () => {
            renderSessionLog([]);
          });
        } else {
          console.error('Failed to clear session log in background script');
        }
      });
    }
  });

  // Render session log entries
  function renderSessionLog(logEntries) {
    sessionsList.innerHTML = '';
    if (logEntries.length === 0) {
      emptyLogMessage.style.display = 'block';
      return;
    }
    emptyLogMessage.style.display = 'none';

    logEntries.forEach(entry => {
      const li = document.createElement('li');

      const sessionInfoDiv = document.createElement('div');
      sessionInfoDiv.className = 'session-info';

      const faviconImg = document.createElement('img');
      faviconImg.src = entry.faviconUrl || 'favicon.ico';
      faviconImg.alt = 'Website Icon';

      const domainSpan = document.createElement('span');
      domainSpan.className = 'domain';
      domainSpan.textContent = entry.domain || 'Unknown';

      sessionInfoDiv.appendChild(faviconImg);
      sessionInfoDiv.appendChild(domainSpan);

      const sessionDetailsDiv = document.createElement('div');
      sessionDetailsDiv.className = 'session-details';

      const startTimeSpan = document.createElement('span');
      startTimeSpan.className = 'start-time';
      startTimeSpan.textContent = 'Start: ' + formatDateTime(entry.startTime);

      const endTimeSpan = document.createElement('span');
      endTimeSpan.className = 'end-time';
      endTimeSpan.textContent = 'End: ' + formatDateTime(entry.endTime);

      const durationSpan = document.createElement('span');
      durationSpan.className = 'duration';
      durationSpan.textContent = 'Duration: ' + formatDuration(entry.duration);

      sessionDetailsDiv.appendChild(startTimeSpan);
      sessionDetailsDiv.appendChild(endTimeSpan);
      sessionDetailsDiv.appendChild(durationSpan);

      li.appendChild(sessionInfoDiv);
      li.appendChild(sessionDetailsDiv);

      sessionsList.appendChild(li);
    });
  }

  // Helper to format date/time
  function formatDateTime(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  // Helper to format duration in ms to h m s
  function formatDuration(ms) {
    if (!ms) return 'N/A';
    let seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;
    let result = '';
    if (hours > 0) result += hours + 'h ';
    if (minutes > 0) result += minutes + 'm ';
    result += seconds + 's';
    return result;
  }

  // Load Cookie Settings from storage
  function loadCookieSettings() {
    chrome.storage.local.get(['protectedCookies', 'defaultSessionDuration'], (result) => {
      protectedCookiesInput.value = result.protectedCookies || '';
      defaultSessionDurationInput.value = result.defaultSessionDuration || '';
    });
  }

  // Save Cookie Settings to storage
  saveCookieSettingsButton.addEventListener('click', () => {
    const protectedCookies = protectedCookiesInput.value.trim();
    const defaultSessionDuration = parseInt(defaultSessionDurationInput.value, 10);

    if (defaultSessionDuration < 1 || defaultSessionDuration > 1440 || isNaN(defaultSessionDuration)) {
      alert('Please enter a valid session duration between 1 and 1440 minutes.');
      return;
    }

    chrome.storage.local.set({
      protectedCookies,
      defaultSessionDuration,
    }, () => {
      cookieSettingsFeedback.style.display = 'block';
      setTimeout(() => {
        cookieSettingsFeedback.style.display = 'none';
      }, 2000);
    });
  });

  // Load Productivity Settings from storage
  function loadProductivitySettings() {
    chrome.storage.local.get(['focusModeWebsites', 'focusModeActions', 'meetingModeMutedSites'], (result) => {
      focusModeWebsitesInput.value = result.focusModeWebsites || '';
      meetingModeMutedSitesInput.value = result.meetingModeMutedSites || '';

      // Set selected options for focusModeActions
      const actions = result.focusModeActions || [];
      for (let i = 0; i < focusModeActionsSelect.options.length; i++) {
        focusModeActionsSelect.options[i].selected = actions.includes(focusModeActionsSelect.options[i].value);
      }
    });
  }

  // Save Productivity Settings to storage
  saveProductivitySettingsButton.addEventListener('click', () => {
    const focusModeWebsites = focusModeWebsitesInput.value.trim();
    const meetingModeMutedSites = meetingModeMutedSitesInput.value.trim();

    // Get selected focus mode actions
    const selectedActions = [];
    for (let i = 0; i < focusModeActionsSelect.options.length; i++) {
      if (focusModeActionsSelect.options[i].selected) {
        selectedActions.push(focusModeActionsSelect.options[i].value);
      }
    }

    chrome.storage.local.set({
      focusModeWebsites,
      focusModeActions: selectedActions,
      meetingModeMutedSites,
    }, () => {
      productivitySettingsFeedback.style.display = 'block';
      setTimeout(() => {
        productivitySettingsFeedback.style.display = 'none';
      }, 2000);
    });
  });

  // Initial load of settings
  loadCookieSettings();
  loadProductivitySettings();
});
