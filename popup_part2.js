// Add Test Protection button to the UI
function addTestProtectionButton() {
  const button = document.createElement('button');
  button.textContent = 'Test Protection';
  button.className = 'test-protection-button';
  button.addEventListener('click', testCookieProtection);
  
  // Add tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = 'Verify that your session cookies are being properly protected';
  button.appendChild(tooltip);
  
  document.body.appendChild(button);
}

// Add help button to the UI
function addHelpButton() {
  const helpButton = document.createElement('button');
  helpButton.textContent = '?';
  helpButton.className = 'help-button';
  helpButton.title = 'Get Help';
  helpButton.addEventListener('click', openHelpPage);
  document.body.appendChild(helpButton);
}

// Open help page
function openHelpPage() {
  chrome.tabs.create({ url: 'https://github.com/fisapool/BytesCookies#readme' });
}

// Add tooltips to existing elements
function addTooltips() {
  // Add tooltip to Save Session Cookies button
  const saveButton = document.getElementById('save-session-cookies');
  if (saveButton) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = 'Save your current session cookies for later restoration';
    saveButton.appendChild(tooltip);
  }
  
  // Add tooltip to Restore Session Cookies button
  const restoreButton = document.getElementById('restore-session-cookies');
  if (restoreButton) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = 'Restore your previously saved session cookies';
    restoreButton.appendChild(tooltip);
  }
}

// Test cookie protection
async function testCookieProtection() {
  const button = document.getElementById('test-protection-button');
  if (!button) return;
  
  // Set button to loading state
  setButtonLoading(button, true);
  
  try {
    // Use the withLock utility to prevent concurrent operations
    const results = await window.utils.withLock('test_cookie_protection', async () => {
      return await chrome.runtime.sendMessage({ type: 'testCookieProtection' });
    });
    
    displayTestResults(results);
    showStatusMessage('Protection test completed successfully', 'success');
  } catch (error) {
    console.error('Error testing cookie protection:', error);
    showStatusMessage('Failed to test protection: ' + error.message, 'error');
  } finally {
    // Reset button state
    setButtonLoading(button, false);
  }
}

// Display test results
function displayTestResults(results) {
  // Clear any existing results
  const existingResults = document.querySelector('.results-list');
  if (existingResults) {
    existingResults.remove();
  }
  
  const resultsList = document.createElement('ul');
  resultsList.className = 'results-list';
  
  // Add each result to the list
  results.forEach(result => {
    const listItem = document.createElement('li');
    listItem.textContent = result;
    resultsList.appendChild(listItem);
  });
  
  // Add the results list after the button
  const buttonContainer = document.querySelector('.button-container');
  buttonContainer.after(resultsList);
  
  // Remove results after 10 seconds
  setTimeout(() => {
    if (resultsList.parentNode) {
      resultsList.parentNode.removeChild(resultsList);
    }
  }, 10000);
}

// Set button loading state
function setButtonLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.innerHTML = '<span class="spinner"></span> Testing...';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || 'Test Protection';
  }
}

// Show status message
function showStatusMessage(message, type = 'info') {
  const statusMessage = document.getElementById('statusMessage');
  if (!statusMessage) return;
  
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Show error message with details
function showErrorMessage(message, details = null) {
  const errorDisplay = document.getElementById('errorDisplay');
  const errorList = document.getElementById('errorList');
  const dismissError = document.getElementById('dismissError');
  
  if (!errorDisplay || !errorList || !dismissError) return;
  
  // Clear previous errors
  errorList.innerHTML = '';
  
  // Add main error message
  const mainError = document.createElement('div');
  mainError.className = 'error-message';
  mainError.textContent = message;
  errorList.appendChild(mainError);
  
  // Add details if provided
  if (details) {
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'error-details';
    detailsContainer.style.display = 'none';
    
    const detailsContent = document.createElement('div');
    detailsContent.className = 'details-content';
    
    if (Array.isArray(details)) {
      const detailsList = document.createElement('ul');
      details.forEach(detail => {
        const detailItem = document.createElement('li');
        detailItem.textContent = detail;
        detailsList.appendChild(detailItem);
      });
      detailsContent.appendChild(detailsList);
    } else {
      detailsContent.textContent = details;
    }
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'toggle-details';
    toggleButton.textContent = 'Show Details';
    toggleButton.addEventListener('click', () => {
      const isHidden = detailsContainer.style.display === 'none';
      detailsContainer.style.display = isHidden ? 'block' : 'none';
      toggleButton.textContent = isHidden ? 'Hide Details' : 'Show Details';
    });
    
    detailsContainer.appendChild(toggleButton);
    detailsContainer.appendChild(detailsContent);
    errorList.appendChild(detailsContainer);
  }
  
  // Show error display
  errorDisplay.style.display = 'block';
  
  // Dismiss error
  dismissError.onclick = () => {
    errorDisplay.style.display = 'none';
  };
}

// Check browser compatibility
function checkBrowserCompatibility() {
  const browserInfo = {
    name: 'Unknown',
    version: 'Unknown',
    isSupported: true
  };
  
  // Detect browser
  const userAgent = navigator.userAgent;
  if (userAgent.indexOf('Chrome') > -1) {
    browserInfo.name = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.indexOf('Firefox') > -1) {
    browserInfo.name = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.indexOf('Safari') > -1) {
    browserInfo.name = 'Safari';
    const match = userAgent.match(/Version\/(\d+)/);
    if (match) browserInfo.version = match[1];
  } else if (userAgent.indexOf('Edge') > -1) {
    browserInfo.name = 'Edge';
    const match = userAgent.match(/Edge\/(\d+)/);
    if (match) browserInfo.version = match[1];
  }
  
  // Check if browser is supported
  browserInfo.isSupported = ['Chrome', 'Firefox', 'Edge'].includes(browserInfo.name);
  
  return browserInfo;
}

// Check storage usage
async function checkStorageUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      const totalBytes = new Blob([JSON.stringify(items)]).size;
      const maxBytes = 5 * 1024 * 1024; // 5MB limit for chrome.storage.local
      const usagePercent = (totalBytes / maxBytes) * 100;
      
      resolve({
        used: totalBytes,
        total: maxBytes,
        percent: usagePercent,
        isNearLimit: usagePercent > 80
      });
    });
  });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  // Check browser compatibility
  const browserInfo = checkBrowserCompatibility();
  if (!browserInfo.isSupported) {
    const compatibilityMessage = document.createElement('div');
    compatibilityMessage.className = 'status-message warning';
    compatibilityMessage.textContent = `This extension is optimized for Chrome, Firefox, and Edge. You are using ${browserInfo.name} ${browserInfo.version}, which may have limited functionality.`;
    compatibilityMessage.style.display = 'block';
    document.body.insertBefore(compatibilityMessage, document.body.firstChild);
  }
  
  // Check storage usage
  const storageUsage = await checkStorageUsage();
  if (storageUsage.isNearLimit) {
    const storageWarning = document.createElement('div');
    storageWarning.className = 'status-message warning';
    storageWarning.textContent = `Storage usage is at ${Math.round(storageUsage.percent)}%. Consider clearing logs in the options page.`;
    storageWarning.style.display = 'block';
    document.body.insertBefore(storageWarning, document.body.firstChild);
  }
  
  // Add Test Protection button
  addTestProtectionButton();
  
  // Add Help button
  addHelpButton();
  
  // Add tooltips to existing elements
  addTooltips();
  
  // Add event listener for the test protection button
  const testProtectionButton = document.getElementById('test-protection-button');
  if (testProtectionButton) {
    testProtectionButton.addEventListener('click', function() {
      // Get the current tab
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
          showErrorMessage('No active tab found. Please make sure you have a valid tab open.');
          return;
        }
        
        const currentTab = tabs[0];
        
        // Set button to loading state
        setButtonLoading(this, true);
        
        // Use withLock to prevent concurrent operations
        window.utils.withLock('test_protection_content_script', async () => {
          try {
            // Send a message to the content script to test protection
            const response = await new Promise((resolve, reject) => {
              chrome.tabs.sendMessage(currentTab.id, {action: "testProtection"}, function(response) {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(response);
                }
              });
            });
            
            // Reset button state
            setButtonLoading(testProtectionButton, false);
            
            if (response && response.success) {
              // Display the results
              const resultsList = document.createElement('ul');
              resultsList.className = 'results-list';
              
              // Add each result to the list
              response.results.forEach(result => {
                const listItem = document.createElement('li');
                listItem.textContent = result;
                resultsList.appendChild(listItem);
              });
              
              // Clear any existing results and add the new ones
              const existingResults = document.querySelector('.results-list');
              if (existingResults) {
                existingResults.remove();
              }
              
              // Add the results list after the button
              const buttonContainer = document.querySelector('.button-container');
              buttonContainer.after(resultsList);
              
              // Show success message
              showStatusMessage('Protection test completed successfully', 'success');
            } else {
              showErrorMessage('Failed to test protection', response ? response.error : 'No response received');
            }
          } catch (error) {
            // Reset button state
            setButtonLoading(testProtectionButton, false);
            showErrorMessage('Failed to test protection', error.message);
          }
        });
      });
    });
  }
  
  // Add event listeners for other buttons
  const saveSessionCookiesButton = document.getElementById('saveSessionCookiesButton');
  const restoreSessionCookiesButton = document.getElementById('restoreSessionCookiesButton');
  
  if (saveSessionCookiesButton) {
    saveSessionCookiesButton.addEventListener('click', function() {
      setButtonLoading(this, true);
      
      // Use withLock to prevent concurrent operations
      window.utils.withLock('save_session_cookies', async () => {
        try {
          // Add your save cookies logic here
          await new Promise(resolve => setTimeout(resolve, 1000));
          showStatusMessage('Cookies saved successfully', 'success');
        } catch (error) {
          showErrorMessage('Failed to save cookies', error.message);
        } finally {
          setButtonLoading(this, false);
        }
      });
    });
  }
  
  if (restoreSessionCookiesButton) {
    restoreSessionCookiesButton.addEventListener('click', function() {
      setButtonLoading(this, true);
      
      // Use withLock to prevent concurrent operations
      window.utils.withLock('restore_session_cookies', async () => {
        try {
          // Add your restore cookies logic here
          await new Promise(resolve => setTimeout(resolve, 1000));
          showStatusMessage('Cookies restored successfully', 'success');
        } catch (error) {
          showErrorMessage('Failed to restore cookies', error.message);
        } finally {
          setButtonLoading(this, false);
        }
      });
    });
  }
});

module.exports = {
  testCookieProtection,
  checkBrowserCompatibility,
  checkStorageUsage,
  addTestProtectionButton,
  addHelpButton,
  openHelpPage,
  addTooltips,
  displayTestResults,
  setButtonLoading,
  showStatusMessage,
  showErrorMessage
}; 