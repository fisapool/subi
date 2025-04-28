export function initializePopup() {
  return new Promise((resolve) => {
    // Set up event listeners for popup buttons
    const testProtectionBtn = document.getElementById('testProtectionBtn');
    const saveCookiesBtn = document.getElementById('saveCookiesBtn');
    const restoreCookiesBtn = document.getElementById('restoreCookiesBtn');
    
    if (testProtectionBtn) {
      testProtectionBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'testProtection' }, (response) => {
              if (response && response.success) {
                displayResults(response.results);
              } else {
                displayError('Failed to test protection');
              }
            });
          }
        });
      });
    }
    
    if (saveCookiesBtn) {
      saveCookiesBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs.length > 0) {
            const url = new URL(tabs[0].url);
            chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
              // Save cookies to storage
              chrome.storage.local.set({ savedCookies: cookies }, () => {
                displayResults(['Cookies saved successfully']);
              });
            });
          }
        });
      });
    }
    
    if (restoreCookiesBtn) {
      restoreCookiesBtn.addEventListener('click', () => {
        chrome.storage.local.get(['savedCookies'], (result) => {
          if (result.savedCookies && result.savedCookies.length > 0) {
            // Restore cookies
            result.savedCookies.forEach(cookie => {
              chrome.cookies.set({
                url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                expirationDate: cookie.expirationDate
              });
            });
            displayResults(['Cookies restored successfully']);
          } else {
            displayError('No saved cookies found');
          }
        });
      });
    }
    
    // Load initial settings
    loadSettings();
    
    resolve();
  });
}

export function handleCookieConsent() {
  return new Promise((resolve) => {
    // Implementation for handling cookie consent in popup
    console.log('Popup: Cookie consent handled');
    
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Send message to content script to handle cookie consent
        chrome.tabs.sendMessage(tabs[0].id, { action: 'handleCookieConsent' }, (response) => {
          if (response && response.success) {
            displayResults(['Cookie consent handled successfully']);
          } else {
            displayError('Failed to handle cookie consent');
          }
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

export function handleCookieSettings() {
  return new Promise((resolve) => {
    // Implementation for handling cookie settings in popup
    console.log('Popup: Cookie settings handled');
    
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Send message to content script to handle cookie settings
        chrome.tabs.sendMessage(tabs[0].id, { action: 'handleCookieSettings' }, (response) => {
          if (response && response.success) {
            displayResults(['Cookie settings handled successfully']);
          } else {
            displayError('Failed to handle cookie settings');
          }
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  });
}

// Helper functions
function loadSettings() {
  chrome.storage.local.get(['sessionLoggingEnabled', 'focusModeEnabled', 'meetingModeEnabled'], (result) => {
    // Update UI based on settings
    updatePopupUI(result);
  });
}

// Renamed to avoid duplicate declaration
function updatePopupUI(settings) {
  // Update UI elements based on settings
  const sessionLoggingCheckbox = document.getElementById('sessionLoggingEnabled');
  const focusModeCheckbox = document.getElementById('focusModeEnabled');
  const meetingModeCheckbox = document.getElementById('meetingModeEnabled');
  
  if (sessionLoggingCheckbox) {
    sessionLoggingCheckbox.checked = settings.sessionLoggingEnabled || false;
  }
  
  if (focusModeCheckbox) {
    focusModeCheckbox.checked = settings.focusModeEnabled || false;
  }
  
  if (meetingModeCheckbox) {
    meetingModeCheckbox.checked = settings.meetingModeEnabled || false;
  }
}

function displayResults(results) {
  const resultsElement = document.getElementById('results');
  if (resultsElement) {
    resultsElement.innerHTML = results.map(result => `<div>${result}</div>`).join('');
  }
}

function displayError(message) {
  const errorElement = document.getElementById('errorMessage');
  if (errorElement) {
    errorElement.innerHTML = `<div class="error">${message}</div>`;
  }
} 