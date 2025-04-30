// Handle authentication and redirection
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_STATUS') {
    handleAuthStatus(request.isAuthenticated);
  }
});

function handleAuthStatus(isAuthenticated) {
  if (isAuthenticated) {
    // User is authenticated, redirect to main dashboard
    window.location.replace('main.html');
  } else {
    // User needs to authenticate, redirect to login
    window.location.replace('session-buddy.html');
  }
}

// Check initial auth status
chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, response => {
  if (response && response.isAuthenticated !== undefined) {
    handleAuthStatus(response.isAuthenticated);
  }
});
