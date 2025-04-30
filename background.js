// Authentication state management
let authState = {
    isAuthenticated: false,
    user: null,
    token: null
};

// Initialize authentication state from storage
chrome.storage.local.get(['authState'], (result) => {
    if (result.authState) {
        authState = result.authState;
        updateExtensionState();
    }
});

// Listen for authentication messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'AUTH_STATE_CHANGE') {
        authState = request.authState;
        chrome.storage.local.set({ authState });
        updateExtensionState();
        sendResponse({ success: true });
    } else if (request.type === 'GET_AUTH_STATE') {
        sendResponse({ authState });
    }
});

// Update extension state based on authentication
function updateExtensionState() {
    if (authState.isAuthenticated) {
        chrome.action.setPopup({ popup: 'popup.html' });
    } else {
        chrome.action.setPopup({ popup: 'auth.html' });
    }
}

// Session management
let currentSession = {
    id: null,
    name: null,
    tabs: []
};

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        updateCurrentSession(tab);
    }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
    currentSession.tabs = currentSession.tabs.filter(tab => tab.id !== tabId);
    saveCurrentSession();
});

// Update current session
function updateCurrentSession(tab) {
    if (!currentSession.id) {
        currentSession.id = Date.now().toString();
        currentSession.name = 'Current Session';
    }

    const existingTab = currentSession.tabs.find(t => t.id === tab.id);
    if (existingTab) {
        existingTab.url = tab.url;
        existingTab.title = tab.title;
    } else {
        currentSession.tabs.push({
            id: tab.id,
            url: tab.url,
            title: tab.title
        });
    }

    saveCurrentSession();
}

// Save current session to storage
function saveCurrentSession() {
    chrome.storage.local.set({ currentSession });
}

// Load current session from storage
chrome.storage.local.get(['currentSession'], (result) => {
    if (result.currentSession) {
        currentSession = result.currentSession;
    }
});

// Cookie management
chrome.cookies.onChanged.addListener((changeInfo) => {
    if (changeInfo.removed) {
        // Cookie was removed
        handleCookieRemoval(changeInfo.cookie);
    } else {
        // Cookie was added or modified
        handleCookieChange(changeInfo.cookie);
    }
});

function handleCookieRemoval(cookie) {
    // TODO: Implement cookie removal handling
    console.log('Cookie removed:', cookie);
}

function handleCookieChange(cookie) {
    // TODO: Implement cookie change handling
    console.log('Cookie changed:', cookie);
}

// Export functions for use in other scripts
window.background = {
    getAuthState: () => authState,
    getCurrentSession: () => currentSession,
    saveSession: (session) => {
        chrome.storage.local.get(['sessions'], (result) => {
            const sessions = result.sessions || [];
            sessions.push(session);
            chrome.storage.local.set({ sessions });
        });
    },
    getSessions: () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['sessions'], (result) => {
                resolve(result.sessions || []);
            });
        });
    }
}; 