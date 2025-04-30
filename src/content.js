chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'testProtection') {
    // Perform the protection test
    const results = testProtection();

    // Send the results back to the popup
    sendResponse({ success: true, results: results });
  } else if (request.type === 'UPDATE_COOKIES') {
    try {
      updateCookieUI(request.cookies);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error updating cookie UI:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep the message channel open for the asynchronous response
});

export function testProtection() {
  const results = [];

  // Test 1: Check if the extension is active
  results.push('Extension is active and running.');

  // Test 2: Check if the content script is loaded
  results.push('Content script is loaded and functioning.');

  // Test 3: Check if the protection is enabled
  const protectionEnabled = localStorage.getItem('protectionEnabled') === 'true';
  results.push(`Protection is ${protectionEnabled ? 'enabled' : 'disabled'}.`);

  // Test 4: Check if the extension can access the DOM
  try {
    const body = document.body;
    results.push('Extension can access the DOM.');
  } catch (error) {
    results.push('Extension cannot access the DOM: ' + error.message);
  }

  // Test 5: Check if the extension can modify the DOM
  try {
    const testElement = document.createElement('div');
    testElement.style.display = 'none';
    document.body.appendChild(testElement);
    document.body.removeChild(testElement);
    results.push('Extension can modify the DOM.');
  } catch (error) {
    results.push('Extension cannot modify the DOM: ' + error.message);
  }

  return results;
}

export function initializeContent() {
  return new Promise(resolve => {
    injectUIElements();

    // Set up message listener for communication with background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'testProtection') {
        const results = testProtection();
        sendResponse({ success: true, results });
      } else if (request.type === 'UPDATE_COOKIES') {
        try {
          updateCookieUI(request.cookies);
          sendResponse({ success: true });
        } catch (error) {
          console.error('Error updating cookie UI:', error);
          sendResponse({ success: false, error: error.message });
        }
      }
      return true; // Keep the message channel open for async response
    });

    // Monitor cookie changes
    if (chrome.cookies && chrome.cookies.onChanged) {
      chrome.cookies.onChanged.addListener(handleCookieChange);
    }

    resolve();
  });
}

function injectUIElements() {
  try {
    const container = document.createElement('div');
    container.id = 'cookie-manager-container';
    document.body.appendChild(container);
  } catch (error) {
    displayError('Failed to inject UI elements: ' + error.message);
  }
}

function createCookieList(cookies) {
  try {
    const container = document.createElement('div');
    container.id = 'cookie-list';
    cookies.forEach(cookie => {
      const item = document.createElement('div');
      item.className = 'cookie-item';
      item.textContent = `${cookie.name}: ${cookie.value}`;
      container.appendChild(item);
    });
    document.body.appendChild(container);
  } catch (error) {
    displayError('Failed to create cookie list: ' + error.message);
  }
}

function updateCookieUI(cookies) {
  try {
    let container = document.getElementById('cookie-list');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cookie-list';
      document.body.appendChild(container);
    }
    container.innerHTML = '';
    cookies.forEach(cookie => {
      const item = document.createElement('div');
      item.className = 'cookie-item';
      item.textContent = `${cookie.name}: ${cookie.value}`;
      container.appendChild(item);
    });
  } catch (error) {
    displayError('Failed to update cookie UI: ' + error.message);
  }
}

function handleCookieChange(changeInfo) {
  try {
    const container = document.createElement('div');
    container.id = 'cookie-change-notification';
    container.textContent = `Cookie ${changeInfo.cookie.name} was ${changeInfo.removed ? 'removed' : 'changed'}`;
    document.body.appendChild(container);
  } catch (error) {
    displayError('Failed to handle cookie change: ' + error.message);
  }
}

export function handleCookieConsent() {
  return new Promise(resolve => {
    // Implementation for handling cookie consent in content script
    console.log('Content script: Cookie consent handled');

    // Find and interact with cookie consent elements
    const consentElements = findCookieConsentElements();
    if (consentElements.length > 0) {
      consentElements.forEach(element => {
        element.addEventListener('click', () => {
          console.log('Cookie consent element clicked');
        });
      });
    }

    resolve(true);
  });
}

export function handleCookieSettings() {
  return new Promise(resolve => {
    // Implementation for handling cookie settings in content script
    console.log('Content script: Cookie settings handled');

    // Find and interact with cookie settings elements
    const settingsElements = findCookieSettingsElements();
    if (settingsElements.length > 0) {
      settingsElements.forEach(element => {
        element.addEventListener('click', () => {
          console.log('Cookie settings element clicked');
        });
      });
    }

    resolve(true);
  });
}

// Helper functions
function findCookieConsentElements() {
  // Find common cookie consent elements
  const selectors = [
    'button[id*="cookie"][id*="consent"]',
    'button[id*="cookie"][id*="accept"]',
    'button[id*="cookie"][id*="agree"]',
    'button[id*="gdpr"][id*="consent"]',
    'button[id*="gdpr"][id*="accept"]',
    'button[id*="gdpr"][id*="agree"]',
    'button[id*="privacy"][id*="consent"]',
    'button[id*="privacy"][id*="accept"]',
    'button[id*="privacy"][id*="agree"]',
  ];

  return document.querySelectorAll(selectors.join(', '));
}

function findCookieSettingsElements() {
  // Find common cookie settings elements
  const selectors = [
    'button[id*="cookie"][id*="settings"]',
    'button[id*="cookie"][id*="preferences"]',
    'button[id*="gdpr"][id*="settings"]',
    'button[id*="gdpr"][id*="preferences"]',
    'button[id*="privacy"][id*="settings"]',
    'button[id*="privacy"][id*="preferences"]',
  ];

  return document.querySelectorAll(selectors.join(', '));
}

function displayResults(results) {
  const resultsElement = document.getElementById('results');
  if (resultsElement) {
    resultsElement.innerHTML = results.map(result => `<div>${result}</div>`).join('');
  }
}

function displayError(message) {
  const errorElement = document.getElementById('errorMessage') || document.getElementById('error-message');
  if (errorElement) {
    errorElement.innerHTML = `<div class="error">${message}</div>`;
  } else {
    // If no error element exists, create one
    const newErrorElement = document.createElement('div');
    newErrorElement.id = 'error-message';
    newErrorElement.className = 'error';
    newErrorElement.textContent = message;
    document.body.appendChild(newErrorElement);
  }
}
