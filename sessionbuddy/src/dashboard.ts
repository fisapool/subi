// Dashboard initialization and functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize session management
    chrome.runtime.sendMessage({ type: 'GET_SESSIONS' }, (response) => {
        if (response && response.sessions) {
            updateSessionList(response.sessions);
        }
    });

    // Listen for session updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'SESSIONS_UPDATED') {
            updateSessionList(request.sessions);
        }
    });

    // Add event listener for the new session button
    document.getElementById('newSessionBtn')?.addEventListener('click', function() {
        // Open the popup to create a new session
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });

    // Use event delegation for session restore buttons
    document.getElementById('session-list')?.addEventListener('click', function(event) {
        const restoreButton = (event.target as HTMLElement).closest('.restore-button') as HTMLElement;
        if (restoreButton) {
            const sessionId = restoreButton.dataset.sessionId;
            if (sessionId) {
                restoreSession(sessionId);
            }
        }
    });
});

function updateSessionList(sessions: any[]) {
    const sessionList = document.getElementById('session-list');
    if (!sessionList) return;

    sessionList.innerHTML = sessions.map(session => `
        <div class="session-item" data-session-id="${session.id}">
            <h3>${session.name}</h3>
            <p>${session.tabs ? session.tabs.length : 0} tabs</p>
            <button class="restore-button" data-session-id="${session.id}">Restore</button>
        </div>
    `).join('');
}

function restoreSession(sessionId: string) {
    chrome.runtime.sendMessage({ 
        type: 'RESTORE_SESSION', 
        sessionId: sessionId 
    });
}

// Export functions for potential use in other modules
export { updateSessionList, restoreSession }; 