// Import webextension-polyfill properly for browser extensions
import browser from 'webextension-polyfill';
import { auth } from './firebaseAuth.js';
import dataManager from './data-manager.js';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirestore } from "firebase/firestore";

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

// Listen for authentication state changes
auth.onAuthStateChanged(async (user) => {
    try {
        if (user) {
            // User is signed in, get the ID token
            const idToken = await user.getIdToken();
            // Store the token in Chrome storage
            await browser.storage.local.set({ idToken: idToken });
            console.log('User is signed in, token stored.');

            // Check if user document exists
            const db = getFirestore(auth.app);
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('userId', '==', user.uid));
            const querySnapshot = await getDocs(userQuery);
            if (querySnapshot.empty) {
                // No user document found, create it
                await dataManager.createUser(user.uid);
                console.log('User document created.');
            } else {
                console.log('User document already exists.');
            }

        } else {
            // User is signed out, clear Chrome storage
            await browser.storage.local.clear();
            console.log('User is signed out, storage cleared.');
        }
    } catch (error) {
        console.error('Error handling authentication state change:', error);
    }
});

browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        for (let key in changes) {
            console.log(`Storage key "${key}" in namespace "${area}" changed.`, changes[key]);
        }
    }
  } catch (error) {
    console.error('Error handling authentication state change:', error);
  }
});

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
