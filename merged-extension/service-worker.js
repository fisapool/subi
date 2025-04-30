// Import the original background.js functionality
const background = require('./background.js');

// Sidepanel functionality
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// Handle sidepanel navigation
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    // Default to welcome panel
    let panelPath = 'sidepanels/welcome-sp.html';
    
    // Check if we're on a specific site that should trigger the main panel
    if (tab.url && (
        tab.url.includes('developer.chrome.com') || 
        tab.url.includes('github.com') ||
        tab.url.includes('google.com')
      )) {
      panelPath = 'sidepanels/main-sp.html';
    }
    
    // Set the panel options
    chrome.sidePanel.setOptions({
      path: panelPath,
      enabled: true
    });
  });
});

// Listen for messages from the sidepanels
function handleMessage(message, sender, sendResponse) {
  if (message.action === 'switchPanel') {
    chrome.sidePanel.setOptions({
      path: message.panelPath,
      enabled: true
    });
    sendResponse({ success: true });
  }
  
  // Handle session management actions
  if (message.action === 'saveSession') {
    // Call the original save session functionality
    // This will be handled by the imported background.js
    background.saveSession();
    sendResponse({ success: true });
  }
  
  if (message.action === 'loadSessions') {
    // Call the original load sessions functionality
    // This will be handled by the imported background.js
    background.loadSessions();
    sendResponse({ success: true });
  }
  
  return true; // Keep the message channel open for async responses
}

chrome.runtime.onMessage.addListener(handleMessage);

// Export all functions for testing
module.exports = {
  handleMessage,
  saveCurrentSession: background.saveSession,
  restoreSession: background.restoreSession,
  clearSessionData: background.clearSessionData,
  encryptSessionData: background.encryptSessionData,
  decryptSessionData: background.decryptSessionData,
  saveSession: background.saveSession
}; 