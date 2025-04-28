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
});
