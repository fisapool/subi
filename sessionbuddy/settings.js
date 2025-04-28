// Settings page for SessionBuddy

document.addEventListener('DOMContentLoaded', () => {
    // Get UI elements
    const autoSaveCheckbox = document.getElementById('autoSave');
    const autoSaveIntervalInput = document.getElementById('autoSaveInterval');
    const encryptDataCheckbox = document.getElementById('encryptData');
    const exportDataButton = document.getElementById('exportData');
    const importDataButton = document.getElementById('importData');
    const clearDataButton = document.getElementById('clearData');
    const statusElement = document.getElementById('status');
    
    // Load current settings
    loadSettings();
    
    // Add event listeners
    autoSaveCheckbox.addEventListener('change', saveSettings);
    autoSaveIntervalInput.addEventListener('change', saveSettings);
    encryptDataCheckbox.addEventListener('change', saveSettings);
    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', importData);
    clearDataButton.addEventListener('click', clearData);
    
    // Function to load settings
    async function loadSettings() {
        try {
            const storage = await chrome.storage.local.get('settings');
            const settings = storage.settings || {
                autoSave: false,
                autoSaveInterval: 30,
                encryptData: true
            };
            
            // Update UI with loaded settings
            autoSaveCheckbox.checked = settings.autoSave;
            autoSaveIntervalInput.value = settings.autoSaveInterval;
            encryptDataCheckbox.checked = settings.encryptData;
        } catch (error) {
            showStatus('Error loading settings: ' + error.message, 'error');
        }
    }
    
    // Function to save settings
    async function saveSettings() {
        try {
            const settings = {
                autoSave: autoSaveCheckbox.checked,
                autoSaveInterval: parseInt(autoSaveIntervalInput.value, 10),
                encryptData: encryptDataCheckbox.checked
            };
            
            await chrome.storage.local.set({ settings });
            showStatus('Settings saved successfully', 'success');
        } catch (error) {
            showStatus('Error saving settings: ' + error.message, 'error');
        }
    }
    
    // Function to export data
    async function exportData() {
        try {
            const storage = await chrome.storage.local.get('sessions');
            const sessions = storage.sessions || [];
            
            // Create a data URL for download
            const dataStr = JSON.stringify(sessions, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            // Create download link
            const exportFileDefaultName = 'sessionbuddy_export_' + new Date().toISOString().slice(0, 10) + '.json';
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            showStatus('Data exported successfully', 'success');
        } catch (error) {
            showStatus('Error exporting data: ' + error.message, 'error');
        }
    }
    
    // Function to import data
    function importData() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            try {
                const file = event.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        
                        // Validate imported data
                        if (!Array.isArray(importedData)) {
                            throw new Error('Invalid data format');
                        }
                        
                        // Get current sessions
                        const storage = await chrome.storage.local.get('sessions');
                        const currentSessions = storage.sessions || [];
                        
                        // Merge imported sessions with current sessions
                        const mergedSessions = [...currentSessions, ...importedData];
                        
                        // Save merged sessions
                        await chrome.storage.local.set({ sessions: mergedSessions });
                        
                        showStatus('Data imported successfully', 'success');
                    } catch (error) {
                        showStatus('Error parsing imported data: ' + error.message, 'error');
                    }
                };
                
                reader.readAsText(file);
            } catch (error) {
                showStatus('Error importing data: ' + error.message, 'error');
            }
        });
        
        // Trigger file selection dialog
        fileInput.click();
    }
    
    // Function to clear data
    async function clearData() {
        if (confirm('Are you sure you want to clear all sessions? This action cannot be undone.')) {
            try {
                await chrome.storage.local.set({ sessions: [] });
                showStatus('All sessions cleared successfully', 'success');
            } catch (error) {
                showStatus('Error clearing data: ' + error.message, 'error');
            }
        }
    }
    
    // Function to show status messages
    function showStatus(message, type) {
        statusElement.textContent = message;
        statusElement.className = 'status ' + type;
        
        // Hide status after 3 seconds
        setTimeout(() => {
            statusElement.className = 'status';
        }, 3000);
    }
}); 