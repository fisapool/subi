// Content script for SessionBuddy
// This script runs in the context of web pages

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPageInfo') {
    // Return information about the current page
    sendResponse({
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    });
  }
  return true; // Keep the message channel open for async responses
});

// Notify the extension when the page is fully loaded
window.addEventListener('load', () => {
  chrome.runtime.sendMessage({
    action: 'pageLoaded',
    data: {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    }
  });
}); 