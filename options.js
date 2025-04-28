import authManager from './auth.js';
import syncManager from './sync.js';
import premiumManager from './premium.js';

document.addEventListener('DOMContentLoaded', () => {
  const navigationButtons = {
    cookieSettings: document.getElementById('cookie-settings-tab'),
    productivity: document.getElementById('productivity-tab'),
    scripts: document.getElementById('scripts-tab'),
    activity: document.getElementById('activity-tab'),
    security: document.getElementById('security-tab'),
  };

  const contentSections = {
    cookieSettings: document.getElementById('cookie-settings-content'),
    productivity: document.getElementById('productivity-content'),
    scripts: document.getElementById('scripts-content'),
    activity: document.getElementById('activity-content'),
    security: document.getElementById('security-content'),
  };

  const enableActivityLogCheckbox = document.getElementById('enable-activity-log');
  const clearActivityLogButton = document.getElementById('clear-activity-log');
  const sessionsList = document.getElementById('sessions-list');
  const emptyLogMessage = document.getElementById('empty-log-message');
  const storageUsageDisplay = document.getElementById('storage-usage');
  const clearLogsButton = document.getElementById('clear-logs-button');

  // Cookie Settings elements
  const defaultSessionDurationInput = document.getElementById('default-session-duration');
  const saveCookieSettingsButton = document.getElementById('save-cookie-settings');
  const cookieSettingsFeedback = document.getElementById('cookie-settings-feedback');

  // Productivity elements
  const focusModeWebsitesInput = document.getElementById('focus-mode-websites');
  const focusModeActionsSelect = document.getElementById('focus-mode-actions');
  const meetingModeMutedSitesInput = document.getElementById('meeting-mode-muted-sites');
  const saveProductivitySettingsButton = document.getElementById('save-productivity-settings');
  const productivitySettingsFeedback = document.getElementById('productivity-settings-feedback');

  // Handle optional permissions request
  const requestOptionalPermissionsButton = document.getElementById('request-optional-permissions');
  const permissionsFeedback = document.getElementById('permissions-feedback');
  
  // Check browser compatibility
  checkBrowserCompatibility();
  
  // Check storage usage
  checkStorageUsage();
  
  if (requestOptionalPermissionsButton) {
    requestOptionalPermissionsButton.addEventListener('click', () => {
      chrome.permissions.request({
        permissions: ['tabs', 'history'],
        origins: ['<all_urls>']
      }, (granted) => {
        if (granted) {
          if (permissionsFeedback) {
            permissionsFeedback.textContent = 'Optional permissions granted successfully!';
            permissionsFeedback.style.display = 'block';
            setTimeout(() => {
              permissionsFeedback.style.display = 'none';
            }, 3000);
          }
          
          // Re-check permissions
          checkProductivityPermissions();
        } else {
          if (permissionsFeedback) {
            permissionsFeedback.textContent = 'Optional permissions were not granted. Some features may be limited.';
            permissionsFeedback.style.display = 'block';
            setTimeout(() => {
              permissionsFeedback.style.display = 'none';
            }, 3000);
          }
        }
      });
    });
  }

  // Function to switch active tab and content
  function switchTab(tabName) {
    for (const key in navigationButtons) {
      const button = navigationButtons[key];
      const content = contentSections[key];
      
      if (!button || !content) {
        console.warn(`Missing element for tab: ${key}`);
        continue;
      }

      if (key === tabName) {
        button.classList.add('active');
        content.classList.add('active');
      } else {
        button.classList.remove('active');
        content.classList.remove('active');
      }
    }
  }

  // Add event listeners for navigation buttons
  for (const key in navigationButtons) {
    const button = navigationButtons[key];
    if (button) {
      button.addEventListener('click', () => {
        switchTab(key);
      });
    } else {
      console.warn(`Missing navigation button: ${key}`);
    }
  }

  // Load session logging enabled state and session log
  if (enableActivityLogCheckbox && sessionsList && emptyLogMessage) {
    chrome.storage.local.get(['sessionLoggingEnabled', 'sessionActivityLog'], (result) => {
      if (enableActivityLogCheckbox) {
        enableActivityLogCheckbox.checked = result.sessionLoggingEnabled || false;
      }
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
  }

  // Clear session log
  if (clearActivityLogButton) {
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
  }

  // Render session log entries
  function renderSessionLog(logEntries) {
    if (!sessionsList || !emptyLogMessage) return;
    
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

  // Helper function to validate and format duration
  function validateDuration(duration) {
    duration = parseInt(duration, 10);
    if (isNaN(duration) || duration < 1) {
      return 1;
    }
    if (duration > 1440) { // 24 hours in minutes
      return 1440;
    }
    return duration;
  }

  // Helper function to format duration for display
  function formatDuration(minutes) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  // Load Cookie Settings from storage
  function loadCookieSettings() {
    if (!defaultSessionDurationInput) return;
    
    chrome.storage.local.get(['defaultSessionDuration'], (result) => {
      if (defaultSessionDurationInput) {
        defaultSessionDurationInput.value = result.defaultSessionDuration || 720; // Default to 12 hours
      }
    });
  }

  // Save Cookie Settings to storage
  if (saveCookieSettingsButton && defaultSessionDurationInput && cookieSettingsFeedback) {
    saveCookieSettingsButton.addEventListener('click', () => {
      const defaultSessionDuration = validateDuration(defaultSessionDurationInput.value);

      if (defaultSessionDurationInput) {
        defaultSessionDurationInput.value = defaultSessionDuration;
      }

      chrome.storage.local.set({
        defaultSessionDuration,
      }, () => {
        if (cookieSettingsFeedback) {
          cookieSettingsFeedback.textContent = `Settings saved. Session duration set to ${formatDuration(defaultSessionDuration)}`;
          cookieSettingsFeedback.style.display = 'block';
          setTimeout(() => {
            cookieSettingsFeedback.style.display = 'none';
          }, 3000);
        }
      });
    });

    // Add input validation on blur
    if (defaultSessionDurationInput) {
      defaultSessionDurationInput.addEventListener('blur', () => {
        const duration = validateDuration(defaultSessionDurationInput.value);
        if (duration !== parseInt(defaultSessionDurationInput.value, 10)) {
          defaultSessionDurationInput.value = duration;
          if (cookieSettingsFeedback) {
            cookieSettingsFeedback.textContent = `Session duration adjusted to ${formatDuration(duration)}`;
            cookieSettingsFeedback.style.display = 'block';
            setTimeout(() => {
              cookieSettingsFeedback.style.display = 'none';
            }, 3000);
          }
        }
      });
    }
  }

  // Load Productivity Settings from storage
  function loadProductivitySettings() {
    if (!focusModeWebsitesInput || !meetingModeMutedSitesInput) return;
    
    chrome.storage.local.get(['focusModeWebsites', 'focusModeActions', 'meetingModeMutedSites'], (result) => {
      if (focusModeWebsitesInput) {
        focusModeWebsitesInput.value = result.focusModeWebsites || '';
      }
      if (meetingModeMutedSitesInput) {
        meetingModeMutedSitesInput.value = result.meetingModeMutedSites || '';
      }
    });
  }

  // Save Productivity Settings to storage
  if (saveProductivitySettingsButton && focusModeWebsitesInput && meetingModeMutedSitesInput && productivitySettingsFeedback) {
    saveProductivitySettingsButton.addEventListener('click', () => {
      const focusModeWebsites = focusModeWebsitesInput.value.trim();
      const meetingModeMutedSites = meetingModeMutedSitesInput.value.trim();

      chrome.storage.local.set({
        focusModeWebsites,
        meetingModeMutedSites,
      }, () => {
        if (productivitySettingsFeedback) {
          productivitySettingsFeedback.textContent = 'Productivity settings saved successfully!';
          productivitySettingsFeedback.style.display = 'block';
          setTimeout(() => {
            productivitySettingsFeedback.style.display = 'none';
          }, 3000);
        }
      });
    });
  }

  // Load saved settings
  function loadSettings() {
    chrome.storage.local.get(['sessionLoggingEnabled'], (result) => {
      const sessionLoggingElem = document.getElementById('session-logging');
      if (sessionLoggingElem) {
        sessionLoggingElem.checked = result.sessionLoggingEnabled || false;
      }
    });
  }

  // Save settings
  function saveSettings() {
    const sessionLoggingElem = document.getElementById('session-logging');
    const sessionLoggingEnabled = sessionLoggingElem ? sessionLoggingElem.checked : false;
    
    chrome.storage.local.set({
      sessionLoggingEnabled
    }, () => {
      // Notify background script of changes
      chrome.runtime.sendMessage({
        type: 'setSessionLoggingEnabled',
        enabled: sessionLoggingEnabled
      });
      
      showSaveConfirmation();
    });
  }

  // Add event listeners for the new settings
  const sessionLoggingElem = document.getElementById('session-logging');
  if (sessionLoggingElem) {
    sessionLoggingElem.addEventListener('change', saveSettings);
  }

  // Initial load of settings
  loadCookieSettings();
  loadProductivitySettings();
  loadSettings();
  
  // Check productivity permissions on load
  checkProductivityPermissions();
  
  // Listen for permission required messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'permissionRequired') {
      showFeaturePermissionError(message.feature, message.permission);
    }
  });
  
  // Check productivity permissions
  function checkProductivityPermissions() {
    chrome.runtime.sendMessage({ type: 'checkProductivityPermissions' }, (response) => {
      if (!response) return;
      
      const { hasTabsPermission, hasHistoryPermission } = response;
      
      // If we don't have tabs permission, disable focus mode and meeting mode
      if (!hasTabsPermission) {
        chrome.storage.local.get(['focusModeEnabled', 'meetingModeEnabled'], (result) => {
          if (result.focusModeEnabled || result.meetingModeEnabled) {
            chrome.storage.local.set({
              focusModeEnabled: false,
              meetingModeEnabled: false
            });
            
            // Show permission error
            showFeaturePermissionError('productivity', 'tabs');
          }
        });
      }
      
      // If we don't have history permission, show a warning
      if (!hasHistoryPermission) {
        const historyWarning = document.createElement('div');
        historyWarning.className = 'permission-warning';
        historyWarning.textContent = 'History permission is required for domain suggestions.';
        historyWarning.style.color = '#f57c00';
        historyWarning.style.backgroundColor = '#fff3e0';
        historyWarning.style.padding = '8px';
        historyWarning.style.marginTop = '8px';
        historyWarning.style.borderRadius = '4px';
        historyWarning.style.border = '1px solid #ffe0b2';
        
        // Add warning to the productivity section
        const productivitySection = document.getElementById('productivity-content');
        if (productivitySection && saveProductivitySettingsButton) {
          productivitySection.insertBefore(historyWarning, saveProductivitySettingsButton);
          
          // Remove warning after 10 seconds
          setTimeout(() => {
            if (historyWarning.parentNode) {
              historyWarning.parentNode.removeChild(historyWarning);
            }
          }, 10000);
        }
      }
    });
  }
  
  // Show feature-specific permission error
  function showFeaturePermissionError(feature, permission) {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'feature-permission-error';
    errorContainer.style.color = '#d32f2f';
    errorContainer.style.backgroundColor = '#ffebee';
    errorContainer.style.padding = '12px';
    errorContainer.style.marginTop = '12px';
    errorContainer.style.borderRadius = '4px';
    errorContainer.style.border = '1px solid #ffcdd2';
    
    let featureName = 'Productivity';
    if (feature === 'focusMode') {
      featureName = 'Focus Mode';
    } else if (feature === 'meetingMode') {
      featureName = 'Meeting Mode';
    }
    
    const errorMessage = document.createElement('p');
    errorMessage.textContent = `${featureName} requires the '${permission}' permission to function properly.`;
    errorMessage.style.margin = '0 0 10px 0';
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Grant Permission';
    retryButton.style.backgroundColor = '#4caf50';
    retryButton.style.color = 'white';
    retryButton.style.border = 'none';
    retryButton.style.padding = '8px 16px';
    retryButton.style.borderRadius = '4px';
    retryButton.style.cursor = 'pointer';
    
    retryButton.addEventListener('click', () => {
      errorContainer.remove();
      if (requestOptionalPermissionsButton) {
        requestOptionalPermissionsButton.click();
      }
    });
    
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(retryButton);
    
    // Add error to the appropriate section
    let targetSection;
    if (feature === 'focusMode' || feature === 'meetingMode' || feature === 'productivity') {
      targetSection = document.getElementById('productivity-content');
    } else {
      targetSection = document.getElementById('security-content');
    }
    
    if (targetSection) {
      const firstButton = targetSection.querySelector('button');
      if (firstButton) {
        targetSection.insertBefore(errorContainer, firstButton);
        
        // Remove error after 30 seconds
        setTimeout(() => {
          if (errorContainer.parentNode) {
            errorContainer.parentNode.removeChild(errorContainer);
          }
        }, 30000);
      }
    }
  }

  // Check browser compatibility
  function checkBrowserCompatibility() {
    chrome.storage.local.get('browserInfo', (result) => {
      if (result.browserInfo) {
        const browserInfo = result.browserInfo;
        
        // Create compatibility warning if needed
        if (!browserInfo.isSupported) {
          const compatibilityWarning = document.createElement('div');
          compatibilityWarning.className = 'compatibility-warning';
          compatibilityWarning.innerHTML = `
            <strong>Browser Compatibility Warning:</strong> This extension is optimized for Chrome, Firefox, and Edge. 
            You are using ${browserInfo.name} ${browserInfo.version}, which may have limited functionality.
          `;
          
          // Add to the top of the page
          document.body.insertBefore(compatibilityWarning, document.body.firstChild);
          
          // Disable unsupported features
          if (browserInfo.features && !browserInfo.features.scripting) {
            const scriptingFeatures = document.querySelectorAll('.scripting-feature');
            scriptingFeatures.forEach(feature => {
              feature.classList.add('disabled-feature');
              feature.title = 'This feature is not supported in your browser';
            });
          }
        }
      }
    });
  }
  
  // Check storage usage
  function checkStorageUsage() {
    chrome.storage.local.get(null, (items) => {
      const totalBytes = new Blob([JSON.stringify(items)]).size;
      const maxBytes = 5 * 1024 * 1024; // 5MB limit for chrome.storage.local
      const usagePercent = (totalBytes / maxBytes) * 100;
      
      // Update storage usage display
      if (storageUsageDisplay) {
        storageUsageDisplay.textContent = `Storage Usage: ${formatBytes(totalBytes)} / ${formatBytes(maxBytes)} (${Math.round(usagePercent)}%)`;
        
        // Add warning class if near limit
        if (usagePercent > 80) {
          storageUsageDisplay.classList.add('storage-warning');
        }
      }
      
      // Show warning if near limit
      if (usagePercent > 80) {
        const storageWarning = document.createElement('div');
        storageWarning.className = 'storage-warning-message';
        storageWarning.innerHTML = `
          <strong>Storage Warning:</strong> Your extension storage is at ${Math.round(usagePercent)}% capacity. 
          Consider clearing some logs or settings to free up space.
        `;
        
        // Add to the top of the page
        document.body.insertBefore(storageWarning, document.body.firstChild);
        
        // Remove warning after 10 seconds
        setTimeout(() => {
          if (storageWarning.parentNode) {
            storageWarning.parentNode.removeChild(storageWarning);
          }
        }, 10000);
      }
    });
  }
  
  // Helper function to format bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Clear all logs
  if (clearLogsButton) {
    clearLogsButton.addEventListener('click', clearAllLogs);
  }
  
  function clearAllLogs() {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      chrome.runtime.sendMessage({ type: 'clearAllLogs' }, (response) => {
        if (response && response.success) {
          chrome.storage.local.set({ sessionActivityLog: [] }, () => {
            renderSessionLog([]);
          });
        } else {
          console.error('Failed to clear logs in background script');
        }
      });
    }
  }

  // DOM Elements
  const focusModeEnabled = document.getElementById('focusModeEnabled');
  const meetingModeEnabled = document.getElementById('meetingModeEnabled');

  // Domain list containers
  const focusPinTabs = document.getElementById('focusPinTabs');
  const focusMuteTabs = document.getElementById('focusMuteTabs');
  const focusBlockNotifications = document.getElementById('focusBlockNotifications');
  const meetingMuteDomains = document.getElementById('meetingMuteDomains');

  // Initialize settings from storage
  chrome.storage.local.get([
    'focusModeEnabled',
    'meetingModeEnabled',
    'focusPinTabs',
    'focusMuteTabs',
    'focusBlockNotifications',
    'meetingMuteDomains'
  ], (result) => {
    // Set checkbox states
    focusModeEnabled.checked = result.focusModeEnabled || false;
    meetingModeEnabled.checked = result.meetingModeEnabled || false;

    // Initialize domain lists
    initializeDomainList(focusPinTabs, result.focusPinTabs || []);
    initializeDomainList(focusMuteTabs, result.focusMuteTabs || []);
    initializeDomainList(focusBlockNotifications, result.focusBlockNotifications || []);
    initializeDomainList(meetingMuteDomains, result.meetingMuteDomains || []);
  });

  // Initialize a domain list with existing domains
  function initializeDomainList(container, domains) {
    const list = container.querySelector('.domain-list-items');
    domains.forEach(domain => {
      addDomainToList(list, domain);
    });
  }

  // Add a domain to a list
  function addDomainToList(list, domain) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${domain}</span>
      <button class="remove-domain">Remove</button>
    `;
    
    li.querySelector('.remove-domain').addEventListener('click', () => {
      li.remove();
      saveDomainList(list);
    });
    
    list.appendChild(li);
  }

  // Save domain list to storage
  function saveDomainList(list) {
    const domains = Array.from(list.children).map(li => li.querySelector('span').textContent);
    const containerId = list.closest('.domain-list').id;
    
    chrome.storage.local.set({ [containerId]: domains });
  }

  // Add domain input handlers
  document.querySelectorAll('.domain-input').forEach(input => {
    const addButton = input.querySelector('.add-domain');
    const textInput = input.querySelector('input');
    
    addButton.addEventListener('click', () => {
      const domain = textInput.value.trim();
      if (domain) {
        const list = input.nextElementSibling;
        addDomainToList(list, domain);
        textInput.value = '';
      }
    });
    
    textInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addButton.click();
      }
    });
  });

  // Mode toggle handlers
  focusModeEnabled.addEventListener('change', () => {
    chrome.storage.local.set({ focusModeEnabled: focusModeEnabled.checked });
    chrome.runtime.sendMessage({
      action: 'updateMode',
      mode: 'focus',
      state: focusModeEnabled.checked
    });
  });

  meetingModeEnabled.addEventListener('change', () => {
    chrome.storage.local.set({ meetingModeEnabled: meetingModeEnabled.checked });
    chrome.runtime.sendMessage({
      action: 'updateMode',
      mode: 'meeting',
      state: meetingModeEnabled.checked
    });
  });

  // Activity Log Elements
  const activitySearch = document.getElementById('activity-search');
  const dateFrom = document.getElementById('date-from');
  const dateTo = document.getElementById('date-to');
  const durationFilter = document.getElementById('duration-filter');
  const exportLogsButton = document.getElementById('export-logs');
  const activityChart = document.getElementById('activity-chart');

  // Analytics Elements
  const totalSessions = document.getElementById('total-sessions');
  const totalTime = document.getElementById('total-time');
  const mostActiveDomain = document.getElementById('most-active-domain');
  const avgSession = document.getElementById('avg-session');

  let chart = null;

  // Initialize Chart.js
  function initializeChart() {
    const ctx = activityChart.getContext('2d');
    chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Session Duration (minutes)',
          data: [],
          borderColor: '#4caf50',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  // Filter and search functionality
  function filterLogs(logs) {
    const searchTerm = activitySearch.value.toLowerCase();
    const fromDate = dateFrom.value ? new Date(dateFrom.value).getTime() : 0;
    const toDate = dateTo.value ? new Date(dateTo.value).getTime() : Infinity;
    const duration = durationFilter.value;

    return logs.filter(log => {
      // Search filter
      if (searchTerm && !log.domain.toLowerCase().includes(searchTerm)) {
        return false;
      }

      // Date range filter
      const logDate = log.startTime;
      if (logDate < fromDate || logDate > toDate) {
        return false;
      }

      // Duration filter
      if (duration !== 'all') {
        const durationMs = log.duration;
        switch (duration) {
          case 'short':
            if (durationMs >= 5 * 60 * 1000) return false;
            break;
          case 'medium':
            if (durationMs < 5 * 60 * 1000 || durationMs > 30 * 60 * 1000) return false;
            break;
          case 'long':
            if (durationMs <= 30 * 60 * 1000) return false;
            break;
        }
      }

      return true;
    });
  }

  // Update analytics
  function updateAnalytics(logs) {
    const filteredLogs = filterLogs(logs);
    
    // Total sessions
    totalSessions.textContent = filteredLogs.length;
    
    // Total time
    const totalDuration = filteredLogs.reduce((sum, log) => sum + log.duration, 0);
    const hours = Math.floor(totalDuration / (60 * 60 * 1000));
    const minutes = Math.floor((totalDuration % (60 * 60 * 1000)) / (60 * 1000));
    totalTime.textContent = `${hours}h ${minutes}m`;
    
    // Most active domain
    const domainCounts = {};
    filteredLogs.forEach(log => {
      domainCounts[log.domain] = (domainCounts[log.domain] || 0) + 1;
    });
    const mostActive = Object.entries(domainCounts)
      .sort(([,a], [,b]) => b - a)[0];
    mostActiveDomain.textContent = mostActive ? mostActive[0] : '-';
    
    // Average session
    const avgDuration = filteredLogs.length ? totalDuration / filteredLogs.length : 0;
    const avgMinutes = Math.round(avgDuration / (60 * 1000));
    avgSession.textContent = `${avgMinutes}m`;
    
    // Update chart
    updateChart(filteredLogs);
  }

  // Update chart data
  function updateChart(logs) {
    const sortedLogs = [...logs].sort((a, b) => a.startTime - b.startTime);
    
    chart.data.labels = sortedLogs.map(log => {
      const date = new Date(log.startTime);
      return date.toLocaleDateString();
    });
    
    chart.data.datasets[0].data = sortedLogs.map(log => 
      Math.round(log.duration / (60 * 1000))
    );
    
    chart.update();
  }

  // Export logs
  function exportLogs(logs) {
    const filteredLogs = filterLogs(logs);
    const csv = [
      ['Domain', 'Start Time', 'End Time', 'Duration (minutes)'],
      ...filteredLogs.map(log => [
        log.domain,
        new Date(log.startTime).toLocaleString(),
        new Date(log.endTime).toLocaleString(),
        Math.round(log.duration / (60 * 1000))
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Event listeners
  if (activitySearch) {
    activitySearch.addEventListener('input', () => {
      chrome.storage.local.get(['sessionActivityLog'], (result) => {
        const logs = result.sessionActivityLog || [];
        renderSessionLog(filterLogs(logs));
        updateAnalytics(logs);
      });
    });
  }

  if (dateFrom && dateTo) {
    dateFrom.addEventListener('change', updateFilters);
    dateTo.addEventListener('change', updateFilters);
  }

  if (durationFilter) {
    durationFilter.addEventListener('change', updateFilters);
  }

  if (exportLogsButton) {
    exportLogsButton.addEventListener('click', () => {
      chrome.storage.local.get(['sessionActivityLog'], (result) => {
        const logs = result.sessionActivityLog || [];
        exportLogs(logs);
      });
    });
  }

  function updateFilters() {
    chrome.storage.local.get(['sessionActivityLog'], (result) => {
      const logs = result.sessionActivityLog || [];
      renderSessionLog(filterLogs(logs));
      updateAnalytics(logs);
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    // ... existing initialization code ...
    
    // Initialize Chart.js
    if (activityChart) {
      initializeChart();
    }
    
    // Load initial data
    chrome.storage.local.get(['sessionActivityLog'], (result) => {
      const logs = result.sessionActivityLog || [];
      renderSessionLog(logs);
      updateAnalytics(logs);
    });
  });

  // Script Management
  const scriptNameInput = document.getElementById('script-name');
  const scriptDomainsInput = document.getElementById('script-domains');
  const scriptCodeInput = document.getElementById('script-code');
  const scriptDescriptionInput = document.getElementById('script-description');
  const saveScriptButton = document.getElementById('save-script');
  const scriptsList = document.getElementById('scripts-list');

  // Load scripts from storage
  function loadScripts() {
    chrome.storage.local.get(['customScripts'], (result) => {
      const scripts = result.customScripts || [];
      renderScripts(scripts);
    });
  }

  // Save script to storage
  function saveScript(script) {
    chrome.storage.local.get(['customScripts'], (result) => {
      const scripts = result.customScripts || [];
      const existingIndex = scripts.findIndex(s => s.id === script.id);
      
      if (existingIndex >= 0) {
        scripts[existingIndex] = script;
      } else {
        scripts.push(script);
      }
      
      chrome.storage.local.set({ customScripts: scripts }, () => {
        renderScripts(scripts);
        // Notify background script of script update
        chrome.runtime.sendMessage({ 
          type: 'updateScripts', 
          scripts: scripts 
        });
      });
    });
  }

  // Delete script from storage
  function deleteScript(scriptId) {
    chrome.storage.local.get(['customScripts'], (result) => {
      const scripts = result.customScripts || [];
      const updatedScripts = scripts.filter(s => s.id !== scriptId);
      
      chrome.storage.local.set({ customScripts: updatedScripts }, () => {
        renderScripts(updatedScripts);
        // Notify background script of script update
        chrome.runtime.sendMessage({ 
          type: 'updateScripts', 
          scripts: updatedScripts 
        });
      });
    });
  }

  // Render scripts list
  function renderScripts(scripts) {
    if (!scriptsList) return;
    
    scriptsList.innerHTML = '';
    
    if (scripts.length === 0) {
      scriptsList.innerHTML = '<p class="no-scripts">No scripts added yet.</p>';
      return;
    }
    
    scripts.forEach(script => {
      const scriptElement = document.createElement('div');
      scriptElement.className = 'script-item';
      
      const header = document.createElement('div');
      header.className = 'script-header';
      
      const name = document.createElement('div');
      name.className = 'script-name';
      name.textContent = script.name;
      
      const actions = document.createElement('div');
      actions.className = 'script-actions';
      
      const editButton = document.createElement('button');
      editButton.className = 'edit';
      editButton.textContent = 'Edit';
      editButton.onclick = () => editScript(script);
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete';
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = () => {
        if (confirm('Are you sure you want to delete this script?')) {
          deleteScript(script.id);
        }
      };
      
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
      
      header.appendChild(name);
      header.appendChild(actions);
      
      const domains = document.createElement('div');
      domains.className = 'script-domains';
      domains.textContent = `Domains: ${script.domains.join(', ')}`;
      
      const description = document.createElement('div');
      description.className = 'script-description';
      description.textContent = script.description;
      
      scriptElement.appendChild(header);
      scriptElement.appendChild(domains);
      scriptElement.appendChild(description);
      
      scriptsList.appendChild(scriptElement);
    });
  }

  // Edit script
  function editScript(script) {
    scriptNameInput.value = script.name;
    scriptDomainsInput.value = script.domains.join(', ');
    scriptCodeInput.value = script.code;
    scriptDescriptionInput.value = script.description;
    
    // Scroll to form
    document.querySelector('.script-form').scrollIntoView({ behavior: 'smooth' });
  }

  // Save script button click handler
  if (saveScriptButton) {
    saveScriptButton.addEventListener('click', async () => {
      const name = scriptNameInput.value.trim();
      const domains = scriptDomainsInput.value
        .split(',')
        .map(d => d.trim())
        .filter(d => d);
      const code = scriptCodeInput.value.trim();
      const description = scriptDescriptionInput.value.trim();
      
      // Clear any existing error states
      [scriptNameInput, scriptDomainsInput, scriptCodeInput].forEach(input => {
        input.classList.remove('input-error');
      });
      
      // Validate inputs
      let hasError = false;
      if (!name) {
        scriptNameInput.classList.add('input-error');
        showFeedback('Script name is required', 'error');
        hasError = true;
      }
      if (!domains.length) {
        scriptDomainsInput.classList.add('input-error');
        showFeedback('At least one domain is required', 'error');
        hasError = true;
      }
      if (!code) {
        scriptCodeInput.classList.add('input-error');
        showFeedback('Script code is required', 'error');
        hasError = true;
      }
      
      if (hasError) return;
      
      // Show loading state
      saveScriptButton.classList.add('loading');
      showLoadingFeedback('Saving script...');
      
      try {
        const script = {
          id: Date.now().toString(),
          name,
          domains,
          code,
          description,
          enabled: true
        };
        
        await new Promise((resolve, reject) => {
          saveScript(script, (success) => {
            if (success) resolve();
            else reject(new Error('Failed to save script'));
          });
        });
        
        // Clear form
        scriptNameInput.value = '';
        scriptDomainsInput.value = '';
        scriptCodeInput.value = '';
        scriptDescriptionInput.value = '';
        
        showFeedback('Script saved successfully!', 'success');
      } catch (error) {
        showFeedback('Failed to save script. Please try again.', 'error');
        console.error('Script save error:', error);
      } finally {
        saveScriptButton.classList.remove('loading');
      }
    });
  }

  // Load scripts when page loads
  loadScripts();

  // Feedback Management
  const globalFeedback = document.getElementById('global-feedback');

  function showFeedback(message, type = 'success', duration = 3000) {
    if (!globalFeedback) return;
    
    globalFeedback.textContent = message;
    globalFeedback.className = `feedback-message ${type}`;
    
    if (duration > 0) {
      setTimeout(() => {
        globalFeedback.textContent = '';
        globalFeedback.className = 'feedback-message';
      }, duration);
    }
  }

  function showLoadingFeedback(message) {
    showFeedback(message, 'loading', 0);
  }

  function clearFeedback() {
    if (globalFeedback) {
      globalFeedback.textContent = '';
      globalFeedback.className = 'feedback-message';
    }
  }

  // DOM Elements
  const authSection = document.getElementById('authSection');
  const profileSection = document.getElementById('profileSection');
  const teamSection = document.getElementById('teamSection');
  const syncStatus = document.getElementById('syncStatus');

  // Auth Elements
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
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

  // Team Elements
  const createTeamButton = document.getElementById('createTeamButton');
  const teamList = document.getElementById('teamList');

  // Support Elements
  const supportRequests = document.getElementById('supportRequests');
  const newRequestForm = document.getElementById('newRequestForm');
  const requestDetails = document.getElementById('requestDetails');
  const requestsList = document.getElementById('requestsList');
  const requestSubject = document.getElementById('requestSubject');
  const requestMessage = document.getElementById('requestMessage');
  const submitRequest = document.getElementById('submitRequest');
  const requestStatus = document.getElementById('requestStatus');
  const requestInfo = document.getElementById('requestInfo');
  const requestResponses = document.getElementById('requestResponses');
  const responseMessage = document.getElementById('responseMessage');
  const submitResponse = document.getElementById('submitResponse');
  const closeRequest = document.getElementById('closeRequest');

  let currentRequestId = null;

  // Load support requests
  async function loadSupportRequests() {
    try {
      const response = await fetch('https://api.bytescookies.com/api/support', {
        headers: {
          'Authorization': `Bearer ${authManager.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load support requests');
      }

      const requests = await response.json();
      renderSupportRequests(requests);
    } catch (error) {
      showStatus('Failed to load support requests', 'error');
    }
  }

  // Render support requests
  function renderSupportRequests(requests) {
    requestsList.innerHTML = requests.map(request => `
      <div class="request-item ${request.isPremium ? 'premium' : ''} ${request.priority === 'high' ? 'high-priority' : ''}"
           data-id="${request._id}">
        <div class="request-subject">${request.subject}</div>
        <div class="request-status">Status: ${request.status}</div>
        <div class="request-date">${new Date(request.createdAt).toLocaleDateString()}</div>
      </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.request-item').forEach(item => {
      item.addEventListener('click', () => {
        currentRequestId = item.dataset.id;
        loadRequestDetails(currentRequestId);
      });
    });
  }

  // Load request details
  async function loadRequestDetails(requestId) {
    try {
      const response = await fetch(`https://api.bytescookies.com/api/support/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${authManager.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load request details');
      }

      const request = await response.json();
      renderRequestDetails(request);
    } catch (error) {
      showStatus('Failed to load request details', 'error');
    }
  }

  // Render request details
  function renderRequestDetails(request) {
    requestInfo.innerHTML = `
      <div class="request-header">
        <h5>${request.subject}</h5>
        <div class="request-meta">
          <span class="status">Status: ${request.status}</span>
          <span class="priority">Priority: ${request.priority}</span>
          <span class="date">Created: ${new Date(request.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="request-message">${request.message}</div>
    `;

    requestResponses.innerHTML = request.responses.map(response => `
      <div class="response-item ${response.from === 'support' ? 'support' : ''}">
        <div class="response-meta">
          <span class="from">${response.from === 'support' ? 'Support' : 'You'}</span>
          <span class="date">${new Date(response.timestamp).toLocaleDateString()}</span>
        </div>
        <div class="response-message">${response.message}</div>
      </div>
    `).join('');

    newRequestForm.style.display = 'none';
    requestDetails.style.display = 'block';
  }

  // Handle new request submission
  async function handleNewRequest() {
    try {
      const subject = requestSubject.value.trim();
      const message = requestMessage.value.trim();

      if (!subject || !message) {
        showStatus('Please fill in all fields', 'error');
        return;
      }

      const response = await fetch('https://api.bytescookies.com/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getAuthToken()}`
        },
        body: JSON.stringify({ subject, message })
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      showStatus('Support request submitted successfully', 'success');
      requestSubject.value = '';
      requestMessage.value = '';
      loadSupportRequests();
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  // Handle response submission
  async function handleResponse() {
    try {
      const message = responseMessage.value.trim();

      if (!message) {
        showStatus('Please enter a response', 'error');
        return;
      }

      const response = await fetch(`https://api.bytescookies.com/api/support/${currentRequestId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authManager.getAuthToken()}`
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error('Failed to submit response');
      }

      showStatus('Response sent successfully', 'success');
      responseMessage.value = '';
      loadRequestDetails(currentRequestId);
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  // Show status message
  function showStatus(message, type = 'info') {
    requestStatus.textContent = message;
    requestStatus.className = `status-message ${type}`;
    requestStatus.style.display = 'block';

    setTimeout(() => {
      requestStatus.style.display = 'none';
    }, 3000);
  }

  // Setup support event listeners
  function setupSupportListeners() {
    submitRequest.addEventListener('click', handleNewRequest);
    submitResponse.addEventListener('click', handleResponse);
    closeRequest.addEventListener('click', () => {
      requestDetails.style.display = 'none';
      newRequestForm.style.display = 'block';
      currentRequestId = null;
    });
  }

  // Initialize support features
  async function initSupport() {
    if (authManager.isAuthenticated()) {
      await loadSupportRequests();
      setupSupportListeners();
    }
  }

  // Update UI when auth state changes
  async function updateUI() {
    if (authManager.isAuthenticated()) {
      const user = authManager.getCurrentUser();
      authSection.style.display = 'none';
      profileSection.style.display = 'block';
      teamSection.style.display = 'block';
      
      userName.textContent = user.name;
      userEmail.textContent = user.email;
      
      // Update premium UI
      await premiumManager.updateUI();
      
      // Initialize support
      await initSupport();
      
      // Start sync if authenticated
      syncManager.startSync();
    } else {
      authSection.style.display = 'block';
      profileSection.style.display = 'none';
      teamSection.style.display = 'none';
      
      // Stop sync if not authenticated
      syncManager.stopSync();
    }
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', async () => {
    await init();
    await initPremiumFeatures();
  });

  // Listen for premium status changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.currentUser) {
      premiumManager.updateUI();
    }
  });

  // Initialize premium features
  async function initPremiumFeatures() {
    await premiumManager.updateUI();
    
    // Add click handlers for premium features
    document.querySelectorAll('[data-premium]').forEach(element => {
      element.addEventListener('click', async (event) => {
        const feature = element.dataset.premium;
        await premiumManager.gateFeature(feature, () => {
          // Feature is available, proceed with normal click handling
          handlePremiumFeatureClick(feature, event);
        });
      });
    });

    // Add upgrade button handler
    const upgradeButton = document.getElementById('upgradeButton');
    if (upgradeButton) {
      upgradeButton.addEventListener('click', handleUpgrade);
    }
  }

  // Handle premium feature clicks
  function handlePremiumFeatureClick(feature, event) {
    switch (feature) {
      case 'sessionSnippets':
        // Handle session snippets feature
        break;
      case 'advancedActivityLog':
        // Handle advanced activity log feature
        break;
      case 'customScripts':
        // Handle custom scripts feature
        break;
      // Add more premium features as needed
    }
  }

  // Handle upgrade button click
  async function handleUpgrade() {
    // Open upgrade page or show upgrade modal
    window.open('https://bytescookies.com/upgrade', '_blank');
  }

  // New function to load session cookie settings
  function loadSessionCookieSettings() {
    chrome.storage.local.get('sessionCookieNames', (data) => {
      const sessionCookieNames = data.sessionCookieNames || [];
      const container = document.getElementById('sessionCookieSettings');
      if (container) {
        container.innerHTML = sessionCookieNames.map(name => `<div>${name}</div>`).join('');
      }
    });
  }

  // Call loadSessionCookieSettings when options page is loaded
  document.addEventListener('DOMContentLoaded', () => {
    loadSessionCookieSettings();
  });
});

