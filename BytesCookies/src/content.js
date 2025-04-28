// Content script for handling messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'switchToProductivityTab') {
    // Handle switching to productivity tab
    // You can add specific logic here if needed
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async responses
}); 