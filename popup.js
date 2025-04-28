document.addEventListener('DOMContentLoaded', () => {
    const saveButton = document.getElementById('saveSession');
    const restoreButton = document.getElementById('restoreSession');
    const statusDiv = document.getElementById('status');

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }

    saveButton.addEventListener('click', async () => {
        try {
            // Get all tabs
            const tabs = await chrome.tabs.query({});
            
            // Capture form data for each tab
            for (let tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_FORMS' });
                } catch (error) {
                    console.error(`Error capturing forms for tab ${tab.id}:`, error);
                }
            }

            // Save session
            await chrome.runtime.sendMessage({ type: 'CAPTURE_SESSION' });
            showStatus('Session saved successfully!');
        } catch (error) {
            console.error('Error saving session:', error);
            showStatus('Error saving session', true);
        }
    });

    restoreButton.addEventListener('click', async () => {
        try {
            // Restore session
            await chrome.runtime.sendMessage({ type: 'RESTORE_SESSION' });
            
            // Wait for tabs to load
            setTimeout(async () => {
                const tabs = await chrome.tabs.query({});
                for (let tab of tabs) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, { type: 'RESTORE_FORMS' });
                    } catch (error) {
                        console.error(`Error restoring forms for tab ${tab.id}:`, error);
                    }
                }
            }, 1000);

            showStatus('Session restored successfully!');
        } catch (error) {
            console.error('Error restoring session:', error);
            showStatus('Error restoring session', true);
        }
    });
}); 