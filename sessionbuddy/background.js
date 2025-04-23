// Background script for Session Buddy

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle session management
  if (request.type === 'GET_SESSIONS') {
    chrome.storage.local.get('sessions', (data) => {
      sendResponse({ sessions: data.sessions || [] });
    });
    return true; // Required for async response
  }
  
  // Handle session restoration
  if (request.type === 'RESTORE_SESSION') {
    restoreSession(request.sessionId);
    return true;
  }
  
  // Handle opening popup
  if (request.type === 'OPEN_POPUP') {
    chrome.action.openPopup();
    return true;
  }
  
  // Handle authentication check
  if (request.type === 'CHECK_AUTH') {
    // For now, we'll assume the user is always authenticated
    // In a real implementation, you would check for authentication tokens, etc.
    sendResponse({ isAuthenticated: true });
    return true;
  }
});

// Function to restore a session
async function restoreSession(sessionId) {
  try {
    // Get the session data
    const data = await chrome.storage.local.get('sessions');
    const sessions = data.sessions || [];
    const session = sessions.find(s => s.id === parseInt(sessionId, 10));
    
    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }
    
    // Create new tabs for each URL in the session
    for (const tabData of session.data) {
      if (tabData.url) {
        await chrome.tabs.create({ url: tabData.url });
      }
    }
    
    // Import cookies for each domain
    for (const tabData of session.data) {
      if (tabData.cookies && tabData.cookies.cookies) {
        const hostname = new URL(tabData.url).hostname;
        await importCookies(tabData.cookies.cookies, hostname);
      }
    }
  } catch (error) {
    console.error('Error restoring session:', error);
  }
}

// Function to import cookies
async function importCookies(cookies, domain) {
  for (const cookie of cookies) {
    try {
      await chrome.cookies.set({
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
    } catch (error) {
      console.error('Error setting cookie:', error);
    }
  }
} 