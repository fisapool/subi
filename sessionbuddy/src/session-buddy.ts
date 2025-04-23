// Extend Window interface to include our custom properties
declare global {
    interface Window {
        initializeDashboard?: () => void;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if Chrome APIs are available
    const isChromeAvailable = typeof chrome !== 'undefined' && 
                            typeof chrome.runtime !== 'undefined' &&
                            typeof chrome.runtime.sendMessage !== 'undefined';

    if (!isChromeAvailable) {
        console.error('Chrome APIs not available. Make sure this is running in a Chrome extension context.');
        return;
    }

    // Initialize dashboard UI
    if (window.initializeDashboard) {
        window.initializeDashboard();
    }
    
    // Add event listener for the new session button
    const newSessionBtn = document.getElementById('newSessionBtn');
    if (newSessionBtn) {
        newSessionBtn.addEventListener('click', function() {
            // Open the popup to create a new session
            chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                    return;
                }
            });
        });
    }
});

// Make this file a module
export {}; 