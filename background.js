// Import webextension-polyfill properly for browser extensions
import browser from 'webextension-polyfill';

// Constants
const SESSION_COOKIE_NAMES = ['sessionid', 'sid', 'PHPSESSID'];
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// State variables
let sessionLoggingEnabled = false;
let activeSessions = new Map(); // key: tabId_domain, value: { domain, startTime, lastActivity }
let browserInfo = null; // Browser compatibility information
let operationLocks = new Map(); // Lock mechanism for concurrent operations

// Initialize the extension with proper error handling
async function initialize() {
  try {
    // Initialize settings from storage
    const result = await browser.storage.local.get(['sessionLoggingEnabled']);
    sessionLoggingEnabled = result.sessionLoggingEnabled || false;

    // Detect browser compatibility
    await detectBrowserCompatibility();

    // Initialize cookie listener
    if (browser.cookies && browser.cookies.onChanged) {
      browser.cookies.onChanged.addListener(handleCookieChange);
    }

    // Set up other event listeners
    browser.runtime.onMessage.addListener(handleMessage);
    browser.tabs.onUpdated.addListener(handleTabUpdate);
    browser.tabs.onRemoved.addListener(handleTabRemove);

    // Load initial settings
    await loadProductivitySettings();
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    // Attempt to recover from initialization failure
    try {
      // Basic initialization without storage
      browser.runtime.onMessage.addListener(handleMessage);
      browser.tabs.onUpdated.addListener(handleTabUpdate);
      browser.tabs.onRemoved.addListener(handleTabRemove);
      console.log('Extension initialized with basic functionality');
    } catch (recoveryError) {
      console.error('Failed to recover from initialization error:', recoveryError);
    }
  }
}

// Initialize immediately - no need for service worker registration in MV3
initialize().catch(error => {
  console.error('Fatal initialization error:', error);
});

// Export functions for use in other parts of the extension
export {
  clearCleanupAlarm,
  deleteCookiesForDomain,
  getActiveTab,
  getCookiesForDomain,
  getSettings,
  handleCookieConsent,
  handleCookieSettings,
  handleMessage,
  handleTabRemove,
  handleTabUpdate,
  initializeAlarms,
  saveSettings,
  scheduleCleanup,
  sendMessageToTab
};

// Remove the exports object and use window object instead
window.clearCleanupAlarm = clearCleanupAlarm;
window.deleteCookiesForDomain = deleteCookiesForDomain;
window.getActiveTab = getActiveTab;
window.getCookiesForDomain = getCookiesForDomain;
window.getSettings = getSettings;
window.handleCookieConsent = handleCookieConsent;
window.handleCookieSettings = handleCookieSettings;
window.handleMessage = handleMessage;
window.handleTabRemove = handleTabRemove;
window.handleTabUpdate = handleTabUpdate;
window.initializeAlarms = initializeAlarms;
window.saveSettings = saveSettings;
window.scheduleCleanup = scheduleCleanup;
window.sendMessageToTab = sendMessageToTab;

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('background.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
        // Initialize the extension after service worker is registered
        initialize().catch(error => {
          console.error('Fatal initialization error:', error);
        });
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
        // Try to initialize anyway
        initialize().catch(initError => {
          console.error('Fatal initialization error:', initError);
        });
      });
  });
} else {
  // If service workers are not supported, just initialize
  console.log('Service workers not supported, initializing directly');
  initialize().catch(error => {
    console.error('Fatal initialization error:', error);
  });
} 