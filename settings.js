document.addEventListener('DOMContentLoaded', function() {
    // Theme Management
    const lightModeBtn = document.getElementById('lightModeBtn');
    const darkModeBtn = document.getElementById('darkModeBtn');
    
    // Load saved theme
    chrome.storage.sync.get('theme', function(data) {
        const theme = data.theme || 'light';
        document.body.setAttribute('data-theme', theme);
        updateThemeButtons(theme);
    });

    // Theme button handlers
    lightModeBtn.addEventListener('click', () => setTheme('light'));
    darkModeBtn.addEventListener('click', () => setTheme('dark'));

    function setTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        chrome.storage.sync.set({ theme: theme });
        updateThemeButtons(theme);
    }

    function updateThemeButtons(theme) {
        lightModeBtn.style.fontWeight = theme === 'light' ? 'bold' : 'normal';
        darkModeBtn.style.fontWeight = theme === 'dark' ? 'bold' : 'normal';
    }

    // Navigation
    const backButton = document.getElementById('backButton');
    backButton.addEventListener('click', () => {
        window.location.href = 'popup.html';
    });

    // Load and save settings
    const settingsConfig = {
        autoSave: { default: false },
        autoSaveInterval: { default: 30 },
        startupRestore: { default: false },
        encryptData: { default: true },
        clearOnExit: { default: false },
        notifyChanges: { default: true },
        autoBackup: { default: true }
    };

    // Load saved settings
    chrome.storage.sync.get(Object.keys(settingsConfig), function(data) {
        Object.keys(settingsConfig).forEach(setting => {
            const element = document.getElementById(setting);
            if (element) {
                const value = data[setting] ?? settingsConfig[setting].default;
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
                
                // Add change listener
                element.addEventListener('change', function() {
                    const newValue = element.type === 'checkbox' ? element.checked : element.value;
                    saveSettings({ [setting]: newValue });
                });
            }
        });
    });

    function saveSettings(settings) {
        chrome.storage.sync.set(settings, function() {
            showStatus('Settings saved successfully!', 'success');
        });
    }

    // Data Management
    const exportData = document.getElementById('exportData');
    const importData = document.getElementById('importData');
    const clearData = document.getElementById('clearData');

    exportData.addEventListener('click', function() {
        chrome.storage.sync.get(null, function(data) {
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cookie-manager-backup.json';
            a.click();
            URL.revokeObjectURL(url);
            showStatus('Data exported successfully!', 'success');
        });
    });

    importData.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    chrome.storage.sync.set(data, function() {
                        showStatus('Data imported successfully!', 'success');
                        // Reload settings to reflect imported data
                        window.location.reload();
                    });
                } catch (error) {
                    showStatus('Error importing data: Invalid file format', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    });

    clearData.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all saved sessions? This action cannot be undone.')) {
            chrome.storage.sync.clear(function() {
                showStatus('All data cleared successfully!', 'success');
                // Reload settings to reflect cleared data
                window.location.reload();
            });
        }
    });

    // Status message handling
    function showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status ' + type;
        
        // Clear the message after 3 seconds
        setTimeout(() => {
            status.className = 'status';
            status.textContent = '';
        }, 3000);
    }

    // Help and Support buttons
    document.getElementById('helpBtn').addEventListener('click', function() {
        window.open('https://github.com/yourusername/cookie-manager/wiki', '_blank');
    });

    document.getElementById('supportBtn').addEventListener('click', function() {
        window.open('https://github.com/yourusername/cookie-manager/issues', '_blank');
    });
});
