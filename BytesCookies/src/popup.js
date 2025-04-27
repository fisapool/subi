window.cookieUtils = {
  exportCookies: async function(tab) {
    if (!tab || !tab.url) {
      throw new Error('Invalid tab or URL');
    }
    const url = new URL(tab.url);
    return new Promise((resolve, reject) => {
      chrome.cookies.getAll({ domain: url.hostname }, (cookies) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(cookies);
      });
    });
  },

  importCookies: async function(cookies, tab) {
    if (!Array.isArray(cookies)) {
      throw new Error('Cookies must be an array');
    }
    if (!tab || !tab.url) {
      throw new Error('Invalid tab or URL');
    }
    let imported = 0;
    let failed = 0;

    const url = new URL(tab.url);
    const setCookiePromises = cookies.map(cookie => {
      return new Promise((resolve) => {
        const domain = cookie.domain ? cookie.domain.replace(/^\./, '') : url.hostname;
        const cookieDetails = {
          url: url.protocol + '//' + domain,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          expirationDate: cookie.expirationDate
        };
        chrome.cookies.set(cookieDetails, (result) => {
          if (chrome.runtime.lastError || !result) {
            failed++;
          } else {
            imported++;
          }
          resolve();
        });
      });
    });

    await Promise.all(setCookiePromises);
    return { imported, failed };
  }
};
document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements
  const domainInput = document.getElementById('domain');
  const toggleCookieDeletion = document.getElementById('toggleCookieDeletion');
  const saveSessionCookiesButton = document.getElementById('saveSessionCookiesButton');
  const restoreSessionCookiesButton = document.getElementById('restoreSessionCookiesButton');
  const protectSessionCheckbox = document.getElementById('protectSessionCheckbox');
  const cookieDuration = document.getElementById('cookieDuration');
  const statusMessage = document.getElementById('statusMessage');

  // Productivity toggles
  const toggleFocusMode = document.getElementById('toggleFocusMode');
  const configFocusMode = document.getElementById('configFocusMode');

  // Options page button
  const openOptionsPageButton = document.getElementById('openOptionsPage');
  if (openOptionsPageButton) {
    openOptionsPageButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Show/hide Configure button for Focus Mode based on toggle state
  function updateConfigButtonVisibility() {
    if (toggleFocusMode.checked) {
      configFocusMode.style.display = 'inline-block';
    } else {
      configFocusMode.style.display = 'none';
    }
  }

  toggleFocusMode.addEventListener('change', () => {
    chrome.storage.local.set({ focusModeEnabled: toggleFocusMode.checked });
    updateConfigButtonVisibility();
    showStatus(`Focus Mode ${toggleFocusMode.checked ? 'enabled' : 'disabled'}`);
  });

  configFocusMode.addEventListener('click', () => {
    // Open options page and switch to Productivity tab
    chrome.runtime.openOptionsPage(() => {
      // Send a message to options page to switch to productivity tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'switchToProductivityTab' }, () => {
            if (chrome.runtime.lastError) {
              // Suppress the error
              console.warn('Message sending failed:', chrome.runtime.lastError.message);
            }
          });
        }
      });
    });
  });

  // Load saved settings
  chrome.storage.local.get(['protectCookies', 'sessionCookieDuration', 'focusModeEnabled'], (result) => {
    if (result.protectCookies !== undefined) {
      protectSessionCheckbox.checked = result.protectCookies;
    }
    if (result.sessionCookieDuration !== undefined) {
      cookieDuration.value = result.sessionCookieDuration;
    } else {
      cookieDuration.value = 720; // default 720 minutes (12 hours)
      chrome.storage.local.set({ sessionCookieDuration: 720 });
    }
    if (result.focusModeEnabled !== undefined) {
      toggleFocusMode.checked = result.focusModeEnabled;
    }
    updateConfigButtonVisibility();
  });

  protectSessionCheckbox.addEventListener('change', () => {
    chrome.storage.local.set({ protectCookies: protectSessionCheckbox.checked });
  });

  cookieDuration.addEventListener('change', () => {
    let duration = parseInt(cookieDuration.value, 10);
    if (isNaN(duration) || duration < 1) {
      duration = 1;
      cookieDuration.value = duration;
    } else if (duration > 720) {
      duration = 720;
      cookieDuration.value = duration;
    }
    chrome.storage.local.set({ sessionCookieDuration: duration });
  });

  // Helper to show status message
  function showStatus(message, isError = false) {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.style.display = 'block';
      statusMessage.className = `status-message ${isError ? 'error' : 'success'}`;
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 5000);
    }
  }
// Auto-fill domain input with active tab's domain
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs.length > 0 && tabs[0].url) {
    try {
      const url = new URL(tabs[0].url);
      domainInput.value = url.hostname;
    } catch (e) {
      console.warn('Failed to parse active tab URL for domain auto-fill:', e);
    }
  }
});

// Delete Session Cookies for Current Site button handler
  toggleCookieDeletion.addEventListener('change', async () => {
    try {
      toggleCookieDeletion.disabled = true;

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      const tab = tabs[0];
      const url = new URL(tab.url);
      const cookies = await window.cookieUtils.exportCookies(tab);

      const deletePromises = cookies.map(cookie => {
        return new Promise((resolve) => {
          chrome.cookies.remove({
            url: url.protocol + '//' + cookie.domain.replace(/^\./, ''),
            name: cookie.name,
            storeId: cookie.storeId
          }, () => resolve());
        });
      });

      await Promise.all(deletePromises);

      showStatus('Session cookies deleted successfully!');
      chrome.tabs.reload(tab.id);
    } catch (error) {
      console.error('Error deleting session cookies:', error);
      showStatus('Failed to delete session cookies.', true);
    } finally {
      toggleCookieDeletion.disabled = false;
    }
  });

  // Save Session Cookies button handler
  saveSessionCookiesButton.addEventListener('click', async () => {
    try {
      saveSessionCookiesButton.disabled = true;
      saveSessionCookiesButton.textContent = 'Saving...';

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }
      const tab = tabs[0];
      const cookies = await window.cookieUtils.exportCookies(tab);

      const sessionCookieData = JSON.stringify([{ url: tab.url, cookies }], null, 2);
      const blob = new Blob([sessionCookieData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'session_cookies.json';
      a.click();
      URL.revokeObjectURL(url);

      showStatus('Session cookies saved successfully!');
    } catch (error) {
      console.error('Error saving session cookies:', error);
      showStatus('Failed to save session cookies.', true);
    } finally {
      saveSessionCookiesButton.disabled = false;
      saveSessionCookiesButton.textContent = 'Save Cookies for Current Session';
    }
  });

  // Restore Session Cookies button handler
  restoreSessionCookiesButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) {
          throw new Error('No file selected');
        }

        restoreSessionCookiesButton.disabled = true;
        restoreSessionCookiesButton.textContent = 'Importing...';

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const sessionCookieDataJson = reader.result;
            const sessionCookies = JSON.parse(sessionCookieDataJson);

            let totalImported = 0;
            let totalFailed = 0;

            for (const entry of sessionCookies) {
              const { url, cookies } = entry;
              const dummyTab = { url };
              const result = await window.cookieUtils.importCookies(cookies, dummyTab);
              totalImported += result.imported;
              totalFailed += result.failed;
            }

            if (totalImported > 0) {
              showStatus(`Successfully imported ${totalImported} cookies`);
              if (totalFailed > 0) {
                showStatus(`${totalFailed} cookies failed to import`, true);
              }
              // Reload active tab after importing cookies
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                  chrome.tabs.reload(tabs[0].id);
                }
              });
            } else {
              throw new Error('No cookies were imported. Make sure you\'re using the correct session file.');
            }
          } catch (error) {
            console.error('Error importing session cookies:', error);
            showStatus('Failed to import session cookies.', true);
          } finally {
            restoreSessionCookiesButton.disabled = false;
            restoreSessionCookiesButton.textContent = 'Import Session Cookies';
          }
        };
        reader.onerror = () => {
          showStatus('Failed to read the file.', true);
          restoreSessionCookiesButton.disabled = false;
          restoreSessionCookiesButton.textContent = 'Import Session Cookies';
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Import session cookies error:', error);
        showStatus('Failed to import session cookies.', true);
        restoreSessionCookiesButton.disabled = false;
        restoreSessionCookiesButton.textContent = 'Import Session Cookies';
      }
    });

    input.click();
  });
});
