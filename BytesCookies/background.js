const SESSION_COOKIE_NAMES = ['sessionid', 'sid', 'PHPSESSID'];

let sessionLoggingEnabled = false;
let activeSessions = new Map(); // key: tabId_domain, value: { domain, startTime, lastActivity }
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Initialize sessionLoggingEnabled from storage on startup
chrome.storage.local.get(['sessionLoggingEnabled'], (result) => {
  sessionLoggingEnabled = result.sessionLoggingEnabled || false;
});

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
  const name = cookie.name.toLowerCase();
  return SESSION_COOKIE_NAMES.some(keyName => name.includes(keyName.toLowerCase()));
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
    const result = await chrome.storage.local.get(['sessionActivityLog']);
    const logs = result.sessionActivityLog || [];

    // Add new session log
    logs.push({
      domain: session.domain,
      startTime: session.startTime,
      endTime,
      duration,
      faviconUrl: await getFaviconUrl(domain)
    });

    await chrome.storage.local.set({ sessionActivityLog: logs });
    console.log(`Session ended for ${domain} on tab ${tabId}, duration: ${duration}ms`);
  }
}

// Get favicon URL for domain
async function getFaviconUrl(domain) {
  try {
    const tabs = await chrome.tabs.query({ url: `*://${domain}/*` });
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
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!sessionLoggingEnabled) return;
  if (changeInfo.status === 'complete' && tab.url) {
    const domain = getDomainFromUrl(tab.url);
    if (domain) {
      startSession(tabId, domain);
    }
  }
});

// Listen for tab removal to end sessions
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (!sessionLoggingEnabled) return;
  // End all sessions for this tab
  for (const key of activeSessions.keys()) {
    if (key.startsWith(`${tabId}_`)) {
      const domain = key.split('_')[1];
      endSession(tabId, domain);
    }
  }
});

// Listen for cookie changes to detect session cookie removal
chrome.cookies.onChanged.addListener(async (changeInfo) => {
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
    return domains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

// Apply focus mode actions to a tab
function applyFocusModeActions(tab) {
  if (!tab || !tab.id || !tab.url) return;
  if (focusModeActions.includes('pin') && !tab.pinned) {
    chrome.tabs.update(tab.id, { pinned: true });
  }
  if (focusModeActions.includes('mute') && !tab.mutedInfo.muted) {
    chrome.tabs.update(tab.id, { muted: true });
  }
  if (focusModeActions.includes('close')) {
    chrome.tabs.remove(tab.id);
  }
}

// Remove focus mode actions from a tab (unpin, unmute)
function removeFocusModeActions(tab) {
  if (!tab || !tab.id) return;
  if (focusModeActions.includes('pin') && tab.pinned) {
    chrome.tabs.update(tab.id, { pinned: false });
  }
  if (focusModeActions.includes('mute') && tab.mutedInfo.muted) {
    chrome.tabs.update(tab.id, { muted: false });
  }
  // Do not reopen closed tabs
}

// Apply meeting mode muting to tabs
function applyMeetingModeMuting() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlMatchesDomains(tab.url, meetingModeMutedSites)) {
        if (!tab.mutedInfo.muted) {
          chrome.tabs.update(tab.id, { muted: true });
        }
      }
    });
  });
}

// Remove meeting mode muting from tabs
function removeMeetingModeMuting() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (urlMatchesDomains(tab.url, meetingModeMutedSites)) {
        if (tab.mutedInfo.muted) {
          chrome.tabs.update(tab.id, { muted: false });
        }
      }
    });
  });
}

// Load productivity settings from storage
function loadProductivitySettings() {
  chrome.storage.local.get(['focusModeWebsites', 'focusModeActions', 'meetingModeMutedSites'], (result) => {
    focusModeWebsites = result.focusModeWebsites ? result.focusModeWebsites.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    focusModeActions = result.focusModeActions || [];
    meetingModeMutedSites = result.meetingModeMutedSites ? result.meetingModeMutedSites.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
  });
}

// Apply or remove focus mode on all tabs based on enabled state
function updateFocusModeOnAllTabs() {
  chrome.tabs.query({}, (tabs) => {
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
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && focusModeEnabled) {
    if (urlMatchesDomains(tab.url, focusModeWebsites)) {
      applyFocusModeActions(tab);
    }
  }
});

// Listen for storage changes to update modes and settings
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.focusModeEnabled) {
      focusModeEnabled = changes.focusModeEnabled.newValue;
      updateFocusModeOnAllTabs();
    }
    if (changes.meetingModeEnabled) {
      meetingModeEnabled = changes.meetingModeEnabled.newValue;
      if (meetingModeEnabled) {
        applyMeetingModeMuting();
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
chrome.storage.local.get(['focusModeEnabled', 'meetingModeEnabled'], (result) => {
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    chrome.storage.local.set({ sessionActivityLog: [] }, () => {
      sendResponse({ success: true });
    });
    return true; // indicate async response
  }
});
