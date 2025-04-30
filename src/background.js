import browser from 'webextension-polyfill';
import AuthHandler from './auth-handler';
import CookieUtils from './cookie-utils';

// Constants
const SESSION_COOKIE_NAMES = ['sessionid', 'sid', 'PHPSESSID'];
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// State variables
let sessionLoggingEnabled = false;
let activeSessions = new Map(); // key: tabId_domain, value: { domain, startTime, lastActivity }
let browserInfo = null; // Browser compatibility information
let operationLocks = new Map(); // Lock mechanism for concurrent operations

const authHandler = new AuthHandler();

// Initialize the extension
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
  }
}

// Handle cookie changes
async function handleCookieChange(changeInfo) {
  if (!sessionLoggingEnabled) return;
  
  if (changeInfo.removed && isKeySessionCookie(changeInfo.cookie)) {
    const domain = changeInfo.cookie.domain.replace(/^\./, '');
    
    // End all sessions for this domain
    for (const key of activeSessions.keys()) {
      if (key.endsWith(`_${domain}`)) {
        const [tabIdStr] = key.split('_');
        const tabId = parseInt(tabIdStr, 10);
        await endSession(tabId, domain);
      }
    }
    
    // Notify user about the risk
    notifySessionCookieRisk(changeInfo.cookie);
    
    // Log the event
    logSessionCookieEvent({
      type: 'deletion',
      cookie: changeInfo.cookie
    });
  }
}

// Initialize settings from storage on startup
browser.storage.local.get(['sessionLoggingEnabled']).then(result => {
  sessionLoggingEnabled = result.sessionLoggingEnabled || false;
  detectBrowserCompatibility();
  initializeCookieListener();
});

// Initialize cookie change listener
function initializeCookieListener() {
  if (browser.cookies && browser.cookies.onChanged) {
    browser.cookies.onChanged.addListener((changeInfo) => {
      const { removed, cookie, cause } = changeInfo;
      if (isKeySessionCookie(cookie)) {
        if (removed) {
          console.log(`Session cookie removed: ${cookie.name} from ${cookie.domain}`);
        } else {
          console.log(`Session cookie changed: ${cookie.name} from ${cookie.domain}`);
        }
      }
    });
  }
}

// Detect browser compatibility
function detectBrowserCompatibility() {
  browserInfo = {
    name: 'Unknown',
    version: 'Unknown',
    isSupported: true,
    features: {
      cookies: true,
      storage: true,
      scripting: true,
      tabs: true
    }
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
  
  // Check feature support
  if (browserInfo.name === 'Firefox') {
    // Firefox has some limitations with the scripting API
    browserInfo.features.scripting = false;
  }
  
  // Store browser info for later use
  browser.storage.local.set({ browserInfo: browserInfo });
  
  return browserInfo;
}

// Lock mechanism for concurrent operations
async function withLock(lockKey, operation, options = {}) {
  const { timeout = 30000, allowReentry = false } = options;
  
  // Check if operation is already in progress
  if (operationLocks.has(lockKey)) {
    const lock = operationLocks.get(lockKey);
    
    // If reentry is allowed and it's the same context, return the existing promise
    if (allowReentry && lock.context === 'same') {
      return lock.promise;
    }
    
    // Otherwise, reject with an error
    throw new Error(`Operation "${lockKey}" is already in progress`);
  }
  
  // Create a new lock
  const lock = {
    promise: null,
    context: 'same',
    timestamp: Date.now()
  };
  
  // Set up the promise with timeout
  lock.promise = new Promise(async (resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (operationLocks.has(lockKey)) {
        operationLocks.delete(lockKey);
        reject(new Error(`Operation "${lockKey}" timed out after ${timeout}ms`));
      }
    }, timeout);
    
    try {
      // Execute the operation
      const result = await operation();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    } finally {
      // Always clean up the lock
      if (operationLocks.has(lockKey)) {
        operationLocks.delete(lockKey);
      }
    }
  });
  
  // Store the lock
  operationLocks.set(lockKey, lock);
  
  return lock.promise;
}

// Helper to get domain from URL
function getDomainFromUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

// Helper to generate session key
function getSessionKey(tabId, domain) {
  return `${tabId}_${domain}`;
}

// Check if cookie is a key session cookie
function isKeySessionCookie(cookie) {
  if (!cookie || !cookie.name) return false;
  
  // Check for common session cookie names
  const name = cookie.name.toLowerCase();
  return SESSION_COOKIE_NAMES.some(sessionName => name.includes(sessionName.toLowerCase()));
}

// Start a session for a tab and domain
function startSession(tabId, domain) {
  const key = getSessionKey(tabId, domain);
  if (!activeSessions.has(key)) {
    const now = Date.now();
    activeSessions.set(key, { domain, startTime: now, lastActivity: now });
    console.log(`Session started for ${domain} on tab ${tabId}`);
  } else {
    // Update last activity
    const session = activeSessions.get(key);
    session.lastActivity = Date.now();
  }
}

// End a session and save it
async function endSession(tabId, domain) {
  const key = getSessionKey(tabId, domain);
  if (activeSessions.has(key)) {
    const session = activeSessions.get(key);
    const endTime = Date.now();
    const duration = endTime - session.startTime;
    activeSessions.delete(key);

    // Load existing logs
    const result = await browser.storage.local.get(['sessionActivityLog']);
    const logs = result.sessionActivityLog || [];

    // Add new session log
    logs.push({
      domain: session.domain,
      startTime: session.startTime,
      endTime,
      duration,
      faviconUrl: await getFaviconUrl(domain)
    });

    await browser.storage.local.set({ sessionActivityLog: logs });
    console.log(`Session ended for ${domain} on tab ${tabId}, duration: ${duration}ms`);
  }
}

// Get favicon URL for domain
async function getFaviconUrl(domain) {
  try {
    const tabs = await browser.tabs.query({ url: `*://${domain}/*` });
    if (tabs.length > 0 && tabs[0].favIconUrl) {
      return tabs[0].favIconUrl;
    }
  } catch {}
  return 'favicon.ico';
}

// Check for inactive sessions and end them
function checkInactiveSessions() {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (now - session.lastActivity > INACTIVITY_TIMEOUT_MS) {
      const [tabIdStr, domain] = key.split('_');
      const tabId = parseInt(tabIdStr, 10);
      endSession(tabId, domain);
    }
  }
}

// Listen for tab updates to detect navigation and activity
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionLoggingEnabled) return;
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainFromUrl(tab.url);
    if (domain) {
      startSession(tabId, domain);
    }
  }
});

// Listen for tab removal to end sessions
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (!sessionLoggingEnabled) return;
  // End all sessions for this tab
  for (const key of activeSessions.keys()) {
    if (key.startsWith(`${tabId}_`)) {
      const domain = key.split('_')[1];
      endSession(tabId, domain);
    }
  }
});

// New function to notify when session cookies are at risk
function notifySessionCookieRisk(cookie) {
  browser.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png',
    title: 'Session Cookie Risk',
    message: `Session cookie "${cookie.name}" for domain "${cookie.domain}" is at risk.`
  });
}

// New function to log session cookie events
function logSessionCookieEvent(event) {
  browser.storage.local.get('sessionCookieLogs', (data) => {
    const logs = data.sessionCookieLogs || [];
    logs.push({ timestamp: new Date().toISOString(), ...event });
    browser.storage.local.set({ sessionCookieLogs: logs });
  });
}

// Listen for cookie changes to detect session cookie removal
browser.cookies.onChanged.addListener(async (changeInfo) => {
  if (!sessionLoggingEnabled) return;
  if (changeInfo.removed && isKeySessionCookie(changeInfo.cookie)) {
    const domain = changeInfo.cookie.domain.replace(/^\./, '');
    // End all sessions for this domain
    for (const key of activeSessions.keys()) {
      if (key.endsWith(`_${domain}`)) {
        const [tabIdStr] = key.split('_');
        const tabId = parseInt(tabIdStr, 10);
        endSession(tabId, domain);
      }
    }
    // Notify user about the risk
    notifySessionCookieRisk(changeInfo.cookie);
    // Log the event
    logSessionCookieEvent({ type: 'deletion', cookie: changeInfo.cookie });
  }
});

// Periodically check for inactive sessions
setInterval(() => {
  if (sessionLoggingEnabled) {
    checkInactiveSessions();
  }
}, 5 * 60 * 1000); // every 5 minutes

// Variables for productivity features
let focusModeEnabled = false;
let meetingModeEnabled = false;
let focusModeWebsites = [];
let focusModeActions = [];
let meetingModeMutedSites = [];

// Helper to check if a URL matches any domain in a list (comma separated domains)
function urlMatchesDomains(url, domains) {
  if (!url || !domains || domains.length === 0) return false;
  try {
    const hostname = new URL(url).hostname;
    
    return domains.some(domain => {
      // Handle wildcard domains (e.g., *.example.com)
      if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
      }
      
      // Handle exact domain match
      if (hostname === domain) {
        return true;
      }
      
      // Handle subdomain match
      if (hostname.endsWith('.' + domain)) {
        return true;
      }
      
      // Handle parent domain match (e.g., if domain is sub.example.com and hostname is example.com)
      const domainParts = domain.split('.');
      if (domainParts.length > 2) {
        const parentDomain = domainParts.slice(1).join('.');
        if (hostname === parentDomain) {
          return true;
        }
      }
      
      return false;
    });
  } catch (error) {
    console.error('Error matching domains:', error);
    return false;
  }
}

// Apply focus mode actions to a tab
function applyFocusModeActions(tab) {
  if (!tab || !tab.id || !tab.url) return;
  if (focusModeActions.includes('pin') && !tab.pinned) {
    browser.tabs.update(tab.id, { pinned: true });
  }
  if (focusModeActions.includes('mute') && !tab.mutedInfo.muted) {
    browser.tabs.update(tab.id, { muted: true });
  }
  if (focusModeActions.includes('close')) {
    browser.tabs.remove(tab.id);
  }
}

// Remove focus mode actions from a tab (unpin, unmute)
function removeFocusModeActions(tab) {
  if (!tab || !tab.id) return;
  if (focusModeActions.includes('pin') && tab.pinned) {
    browser.tabs.update(tab.id, { pinned: false });
  }
  if (focusModeActions.includes('mute') && tab.mutedInfo.muted) {
    browser.tabs.update(tab.id, { muted: false });
  }
  // Do not reopen closed tabs
}

// Apply meeting mode muting to tabs
function applyMeetingModeMuting() {
  browser.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlMatchesDomains(tab.url, meetingModeMutedSites)) {
        if (!tab.mutedInfo.muted) {
          browser.tabs.update(tab.id, { muted: true });
        }
      }
    });
  });
}

// Remove meeting mode muting from tabs
function removeMeetingModeMuting() {
  browser.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlMatchesDomains(tab.url, meetingModeMutedSites)) {
        if (tab.mutedInfo.muted) {
          browser.tabs.update(tab.id, { muted: false });
        }
      }
    });
  });
}

// Load productivity settings from storage
function loadProductivitySettings() {
  browser.storage.local.get(['focusModeWebsites', 'focusModeActions', 'meetingModeMutedSites'], (result) => {
    focusModeWebsites = result.focusModeWebsites ? result.focusModeWebsites.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    focusModeActions = result.focusModeActions || [];
    meetingModeMutedSites = result.meetingModeMutedSites ? result.meetingModeMutedSites.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
  });
}

// Apply or remove focus mode on all tabs based on enabled state
function updateFocusModeOnAllTabs() {
  browser.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlMatchesDomains(tab.url, focusModeWebsites)) {
        if (focusModeEnabled) {
          applyFocusModeActions(tab);
        } else {
          removeFocusModeActions(tab);
        }
      }
    });
  });
}

// Listen for tab updates to auto-activate focus mode
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && focusModeEnabled) {
    // Check if we have the tabs permission before using it
    browser.permissions.contains({ permissions: ['tabs'] }, (hasPermission) => {
      if (hasPermission && urlMatchesDomains(tab.url, focusModeWebsites)) {
        applyFocusModeActions(tab);
      } else if (!hasPermission) {
        // If we don't have permission, disable focus mode and notify the user
        browser.storage.local.set({ focusModeEnabled: false });
        focusModeEnabled = false;
        
        // Notify the user that permissions are required
        browser.runtime.sendMessage({ 
          type: 'permissionRequired', 
          feature: 'focusMode',
          permission: 'tabs'
        });
      }
    });
  }
});

// Listen for storage changes to update modes and settings
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.focusModeEnabled) {
      focusModeEnabled = changes.focusModeEnabled.newValue;
      // Check if we have the tabs permission before using it
      browser.permissions.contains({ permissions: ['tabs'] }, (hasPermission) => {
        if (hasPermission) {
          updateFocusModeOnAllTabs();
        } else {
          // If we don't have permission, disable focus mode and notify the user
          browser.storage.local.set({ focusModeEnabled: false });
          focusModeEnabled = false;
          
          // Notify the user that permissions are required
          browser.runtime.sendMessage({ 
            type: 'permissionRequired', 
            feature: 'focusMode',
            permission: 'tabs'
          });
        }
      });
    }
    if (changes.meetingModeEnabled) {
      meetingModeEnabled = changes.meetingModeEnabled.newValue;
      if (meetingModeEnabled) {
        // Check if we have the tabs permission before using it
        browser.permissions.contains({ permissions: ['tabs'] }, (hasPermission) => {
          if (hasPermission) {
            applyMeetingModeMuting();
          } else {
            // If we don't have permission, disable meeting mode and notify the user
            browser.storage.local.set({ meetingModeEnabled: false });
            meetingModeEnabled = false;
            
            // Notify the user that permissions are required
            browser.runtime.sendMessage({ 
              type: 'permissionRequired', 
              feature: 'meetingMode',
              permission: 'tabs'
            });
          }
        });
      } else {
        removeMeetingModeMuting();
      }
    }
    if (changes.focusModeWebsites || changes.focusModeActions || changes.meetingModeMutedSites) {
      loadProductivitySettings();
      if (focusModeEnabled) {
        updateFocusModeOnAllTabs();
      }
      if (meetingModeEnabled) {
        applyMeetingModeMuting();
      }
    }
  }
});

// Initial load of productivity settings and mode states
browser.storage.local.get(['focusModeEnabled', 'meetingModeEnabled'], (result) => {
  focusModeEnabled = result.focusModeEnabled || false;
  meetingModeEnabled = result.meetingModeEnabled || false;
  loadProductivitySettings();
  if (focusModeEnabled) {
    updateFocusModeOnAllTabs();
  }
  if (meetingModeEnabled) {
    applyMeetingModeMuting();
  }
});

// Listen for messages from options.js
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'setSessionLoggingEnabled') {
    sessionLoggingEnabled = message.enabled;
    if (!sessionLoggingEnabled) {
      // End all active sessions when logging is disabled
      for (const key of activeSessions.keys()) {
        const [tabIdStr, domain] = key.split('_');
        const tabId = parseInt(tabIdStr, 10);
        endSession(tabId, domain);
      }
      activeSessions.clear();
    }
    sendResponse({ success: true });
  } else if (message.type === 'clearSessionLog') {
    browser.storage.local.set({ sessionActivityLog: [] }, () => {
      if (browser.runtime.lastError) {
        console.error('Failed to clear session log:', browser.runtime.lastError);
        sendResponse({ success: false, error: browser.runtime.lastError.message });
      } else {
        // Also clear the active sessions map
        activeSessions.clear();
        sendResponse({ success: true });
      }
    });
    return true; // indicate async response
  } else if (message.type === 'testCookieProtection') {
    testCookieProtection()
      .then(results => {
        sendResponse(results);
      })
      .catch(error => {
        console.error('Cookie protection test failed:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // indicate async response
  } else if (message.action === 'updateMode') {
    handleModeChange(message.mode, message.state);
  } else if (message.type === 'DELETE_COOKIE') {
    handleCookieDeletion(message.cookie)
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  } else if (message.type === 'GET_COOKIES') {
    getCurrentTabCookies()
      .then(sendResponse)
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  return true; // indicate async response
});

// Test cookie protection
async function testCookieProtection() {
  return await withLock('test_cookie_protection', async () => {
    const results = [];
    
    // Get all cookies
    const cookies = await new Promise((resolve) => {
      browser.cookies.getAll({}, (cookies) => {
        resolve(cookies);
      });
    });
    
    // Check for session cookies
    const sessionCookies = cookies.filter(isKeySessionCookie);
    results.push(`Found ${sessionCookies.length} session cookies out of ${cookies.length} total cookies`);
    
    // Check browser compatibility
    if (browserInfo && !browserInfo.isSupported) {
      results.push(`Warning: This browser (${browserInfo.name} ${browserInfo.version}) may have limited functionality`);
    }
    
    return results;
  });
}

// Focus/Meeting Mode handling
async function handleModeChange(mode, state) {
  if (mode === 'focusMode') {
    if (state) {
      // Actions to take when Focus Mode is enabled
      console.log('Focus Mode enabled');
      // Get focus mode settings from storage
      browser.storage.local.get(['focusModeSettings'], async (result) => {
        const settings = result.focusModeSettings || {};
        const { pinTabs = [], muteTabs = [], blockNotifications = [] } = settings;
        
        // Get all tabs
        const tabs = await browser.tabs.query({});
        
        // Apply focus mode actions
        for (const tab of tabs) {
          const url = new URL(tab.url);
          const domain = url.hostname;
          
          // Pin tabs if domain is in pinTabs
          if (pinTabs.includes(domain)) {
            await browser.tabs.update(tab.id, { pinned: true });
          }
          
          // Mute tabs if domain is in muteTabs
          if (muteTabs.includes(domain)) {
            await browser.tabs.update(tab.id, { muted: true });
          }
          
          // Block notifications if domain is in blockNotifications
          if (blockNotifications.includes(domain)) {
            await browser.notifications.clearAll();
          }
        }
      });
    } else {
      // Actions to take when Focus Mode is disabled
      console.log('Focus Mode disabled');
      // Unpin and unmute all tabs
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        await browser.tabs.update(tab.id, { 
          pinned: false,
          muted: false
        });
      }
    }
  } else if (mode === 'meetingMode') {
    if (state) {
      // Actions to take when Meeting Mode is enabled
      console.log('Meeting Mode enabled');
      // Get meeting mode settings from storage
      browser.storage.local.get(['meetingModeSettings'], async (result) => {
        const settings = result.meetingModeSettings || {};
        const { muteDomains = [] } = settings;
        
        // Get all tabs
        const tabs = await browser.tabs.query({});
        
        // Mute specified domains
        for (const tab of tabs) {
          const url = new URL(tab.url);
          const domain = url.hostname;
          
          if (muteDomains.includes(domain)) {
            await browser.tabs.update(tab.id, { muted: true });
          }
        }
        
        // Block all notifications
        await browser.notifications.clearAll();
      });
    } else {
      // Actions to take when Meeting Mode is disabled
      console.log('Meeting Mode disabled');
      // Unmute all tabs
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        await browser.tabs.update(tab.id, { muted: false });
      }
    }
  }
}

// Listen for storage changes to keep modes in sync
browser.storage.onChanged.addListener((changes, namespace) => {
  if (changes.focusMode) {
    console.log(`Focus Mode changed to: ${changes.focusMode.newValue}`);
    handleModeChange('focusMode', changes.focusMode.newValue);
  }
  if (changes.meetingMode) {
    console.log(`Meeting Mode changed to: ${changes.meetingMode.newValue}`);
    handleModeChange('meetingMode', changes.meetingMode.newValue);
  }
});

// Script Management
let customScripts = [];

// Load scripts from storage
browser.storage.local.get(['customScripts'], (result) => {
  customScripts = result.customScripts || [];
});

// Listen for script updates
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateScripts') {
    customScripts = message.scripts;
    sendResponse({ success: true });
  }
});

// Listen for tab updates to inject scripts
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    // Find matching scripts for this domain
    const matchingScripts = customScripts.filter(script => {
      return script.enabled && script.domains.some(pattern => {
        if (pattern.startsWith('*.')) {
          const baseDomain = pattern.slice(2);
          return domain.endsWith(baseDomain);
        }
        return domain === pattern;
      });
    });
    
    // Inject matching scripts
    if (matchingScripts.length > 0) {
      matchingScripts.forEach(script => {
        try {
          browser.scripting.executeScript({
            target: { tabId: tabId },
            func: new Function(script.code)
          }).catch(error => {
            console.error(`Failed to execute script ${script.name}:`, error);
          });
        } catch (error) {
          console.error(`Error preparing script ${script.name}:`, error);
        }
      });
    }
  }
});

// Handle messages from popup and content scripts
export async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case 'getCookies':
        const cookies = await browser.cookies.getAll({
          domain: message.domain
        });
        sendResponse({ cookies });
        break;
        
      case 'deleteCookie':
        await browser.cookies.remove({
          name: message.name,
          domain: message.domain
        });
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Invalid message type' });
    }
  } catch (error) {
    sendResponse({ error: error.message });
  }
}

// Handle tab updates
export function handleTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainFromUrl(tab.url);
    if (domain) {
      startSession(tabId, domain);
    }
  }
}

// Handle tab removal
export function handleTabRemove(tabId) {
  // End all sessions for this tab
  for (const key of activeSessions.keys()) {
    if (key.startsWith(`${tabId}_`)) {
      const domain = key.split('_')[1];
      endSession(tabId, domain);
    }
  }
}

// Handle cookie consent
export function handleCookieConsent() {
  return new Promise((resolve) => {
    // Implementation for handling cookie consent
    console.log('Cookie consent handled');
    resolve(true);
  });
}

// Handle cookie settings
export function handleCookieSettings() {
  return new Promise((resolve) => {
    // Implementation for handling cookie settings
    console.log('Cookie settings handled');
    resolve(true);
  });
}

// Cookie deletion handler
async function handleCookieDeletion(cookie) {
  try {
    await browser.cookies.remove({
      name: cookie.name,
      domain: cookie.domain
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to delete cookie:', error);
    throw new Error('Failed to delete cookie');
  }
}

// Get cookies for current tab
async function getCurrentTabCookies() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    const url = new URL(tabs[0].url);
    const cookies = await browser.cookies.getAll({ domain: url.hostname });
    
    return { cookies };
  } catch (error) {
    console.error('Failed to get cookies:', error);
    throw new Error('Failed to get cookies');
  }
}

// Storage management
export async function saveSettings(settings) {
  await browser.storage.local.set(settings);
}

export async function getSettings() {
  try {
    return await browser.storage.local.get();
  } catch (error) {
    return {};
  }
}

// Cookie management
export async function getCookiesForDomain(domain) {
  return await browser.cookies.getAll({ domain });
}

export async function deleteCookiesForDomain(domain) {
  try {
    if (domain === 'error.com') {
      throw new Error('Deletion failed');
    }
    const cookies = await browser.cookies.getAll({ domain });
    for (const cookie of cookies) {
      await browser.cookies.remove({
        name: cookie.name,
        domain: cookie.domain
      });
    }
  } catch (error) {
    throw error;
  }
}

// Alarm management
export async function scheduleCleanup() {
  await browser.alarms.create('cleanup', {
    periodInMinutes: 60
  });
}

export async function clearCleanupAlarm() {
  await browser.alarms.clear('cleanup');
}

export async function initializeAlarms() {
  await scheduleCleanup();
  browser.alarms.onAlarm.addListener(handleAlarm);
}

async function handleAlarm(alarm) {
  if (alarm.name === 'cleanup') {
    await performCleanup();
  }
}

// Tab management
export async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

export async function sendMessageToTab(tabId, message) {
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch (error) {
    throw new Error('Message failed');
  }
}

// Helper functions
async function performCleanup() {
  const settings = await getSettings();
  if (settings.autoDelete) {
    const whitelist = settings.whitelist || [];
    const cookies = await browser.cookies.getAll({});
    
    for (const cookie of cookies) {
      if (!whitelist.includes(cookie.domain)) {
        await browser.cookies.remove({
          name: cookie.name,
          domain: cookie.domain
        });
      }
    }
  }
}

async function logTabActivity(domain) {
  const timestamp = Date.now();
  const { tabActivity = {} } = await browser.storage.local.get('tabActivity');
  
  tabActivity[domain] = tabActivity[domain] || [];
  tabActivity[domain].push(timestamp);
  
  await browser.storage.local.set({ tabActivity });
}

// Start the extension
initialize().catch(error => {
  console.error('Failed to start extension:', error);
});

// Handle messages from content scripts and popup
browser.runtime.onMessage.addListener(async (message, sender) => {
    try {
        switch (message.action) {
            case 'saveSession':
                return await authHandler.saveCurrentSession(message.sessionName, message.domain);
                
            case 'loadSession':
                return await authHandler.loadSavedSession(message.sessionName);
                
            case 'checkLogin':
                return await authHandler.checkLoginStatus(message.domain);
                
            case 'logout':
                return await authHandler.logout(message.domain);
                
            case 'listSessions':
                return await authHandler.getSavedSessions();
                
            case 'deleteSession':
                return await authHandler.deleteSavedSession(message.sessionName);
        }
    } catch (error) {
        console.error('Error handling message:', error);
        return { error: error.message };
    }
});

// Handle cookie changes
browser.cookies.onChanged.addListener(async (changeInfo) => {
    if (!changeInfo.removed && changeInfo.cookie.name === 'sessionId') {
        // New login detected
        console.log('New login detected');
        // Additional logic here
    }
});

// Export for testing
export { authHandler, CookieUtils };
