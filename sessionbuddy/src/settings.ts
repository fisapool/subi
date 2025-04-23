// Settings page functionality
document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const autoSaveCheckbox = document.getElementById('autoSave') as HTMLInputElement;
  const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
  const encryptDataCheckbox = document.getElementById('encryptData') as HTMLInputElement;
  const exportDataButton = document.getElementById('exportData') as HTMLButtonElement;
  const importDataButton = document.getElementById('importData') as HTMLButtonElement;
  const clearDataButton = document.getElementById('clearData') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLDivElement;

  // Load saved settings
  chrome.storage.sync.get(
    {
      autoSave: false,
      autoSaveInterval: 30,
      encryptData: false
    },
    (items) => {
      autoSaveCheckbox.checked = items.autoSave;
      autoSaveIntervalInput.value = items.autoSaveInterval.toString();
      encryptDataCheckbox.checked = items.encryptData;
    }
  );

  // Save settings when changed
  autoSaveCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ autoSave: autoSaveCheckbox.checked });
    showStatus('Settings saved', 'success');
  });

  autoSaveIntervalInput.addEventListener('change', () => {
    const value = parseInt(autoSaveIntervalInput.value);
    if (value >= 5 && value <= 120) {
      chrome.storage.sync.set({ autoSaveInterval: value });
      showStatus('Settings saved', 'success');
    } else {
      autoSaveIntervalInput.value = '30';
      showStatus('Interval must be between 5 and 120 minutes', 'error');
    }
  });

  encryptDataCheckbox.addEventListener('change', () => {
    chrome.storage.sync.set({ encryptData: encryptDataCheckbox.checked });
    showStatus('Settings saved', 'success');
  });

  // Export data
  exportDataButton.addEventListener('click', () => {
    chrome.storage.local.get(null, (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-buddy-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('Data exported successfully', 'success');
    });
  });

  // Import data
  importDataButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            chrome.storage.local.set(data, () => {
              showStatus('Data imported successfully', 'success');
            });
          } catch (error) {
            showStatus('Error importing data: Invalid file format', 'error');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  });

  // Clear data
  clearDataButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all session data? This cannot be undone.')) {
      chrome.storage.local.clear(() => {
        showStatus('All data cleared', 'success');
      });
    }
  });

  // Helper function to show status messages
  function showStatus(message: string, type: 'success' | 'error') {
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    setTimeout(() => {
      statusElement.className = 'status';
    }, 3000);
  }
}); 