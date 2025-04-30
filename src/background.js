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

// Function definitions
async function clearCleanupAlarm() {
  try {
    await browser.alarms.clear('cookieCleanup');
    console.log('Cookie cleanup alarm cleared');
  } catch (error) {
    console.error('Failed to clear cleanup alarm:', error);
  }
}

async function deleteCookiesForDomain(domain) {
  try {
    const cookies = await browser.cookies.getAll({ domain });
    for (const cookie of cookies) {
      await browser.cookies.remove({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
        name: cookie.name,
      });
    }
    console.log(`Cookies deleted for domain: ${domain}`);
  } catch (error) {
    console.error(`Failed to delete cookies for domain ${domain}:`, error);
  }
}

async function getActiveTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  } catch (error) {
    console.error('Failed to get active tab:', error);
    return null;
  }
}

async function getCookiesForDomain(domain) {
  try {
    return await browser.cookies.getAll({ domain });
  } catch (error) {
    console.error(`Failed to get cookies for domain ${domain}:`, error);
    return [];
  }
}

async function getSettings() {
  try {
    return await browser.storage.local.get(['sessionLoggingEnabled']);
  } catch (error) {
    console.error('Failed to get settings:', error);
    return { sessionLoggingEnabled: false };
  }
}

function handleCookieConsent() {
  // Implement cookie consent handling logic
  console.log('Cookie consent handled');
}

function handleCookieSettings() {
  // Implement cookie settings handling logic
  console.log('Cookie settings handled');
}

function handleMessage(message, sender) {
  // Implement message handling logic
  console.log('Message received:', message);
}

function handleTabRemove(tabId) {
  // Implement tab removal logic
  console.log('Tab removed:', tabId);
}

function handleTabUpdate(tabId, changeInfo, tab) {
  // Implement tab update logic
  console.log('Tab updated:', tabId);
}

async function initializeAlarms() {
  try {
    await browser.alarms.create('cookieCleanup', { periodInMinutes: 30 });
    console.log('Cookie cleanup alarm initialized');
  } catch (error) {
    console.error('Failed to initialize alarms:', error);
  }
}

async function saveSettings(settings) {
  try {
    await browser.storage.local.set(settings);
    console.log('Settings saved');
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function scheduleCleanup() {
  try {
    await initializeAlarms();
    console.log('Cleanup scheduled');
  } catch (error) {
    console.error('Failed to schedule cleanup:', error);
  }
}

async function sendMessageToTab(tabId, message) {
  try {
    await browser.tabs.sendMessage(tabId, message);
    console.log('Message sent to tab:', tabId);
  } catch (error) {
    console.error(`Failed to send message to tab ${tabId}:`, error);
  }
}

// Initialize the extension with proper error handling
async function initialize() {
  try {
    // Initialize settings from storage
    const result = await browser.storage.local.get(['sessionLoggingEnabled']);
    sessionLoggingEnabled = result.sessionLoggingEnabled || false;

    // Set up event listeners
    browser.runtime.onMessage.addListener(handleMessage);
    browser.tabs.onUpdated.addListener(handleTabUpdate);
    browser.tabs.onRemoved.addListener(handleTabRemove);

    // Initialize alarms
    await initializeAlarms();
    console.log('Extension initialized successfully');
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Initialize immediately
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
  sendMessageToTab,
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
    navigator.serviceWorker
      .register('background.js')
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
