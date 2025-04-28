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
  deleteSessionCookiesButton.addEventListener('click', async () => {
    try {
      deleteSessionCookiesButton.disabled = true;
      deleteSessionCookiesButton.textContent = 'Deleting...';

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
      deleteSessionCookiesButton.disabled = false;
      deleteSessionCookiesButton.textContent = 'Delete Session Cookies for Current Site';
    }
  });

  // Export Session Cookies button handler
  exportSessionCookiesButton.addEventListener('click', async () => {
    try {
      exportSessionCookiesButton.disabled = true;
      exportSessionCookiesButton.textContent = 'Exporting...';

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

      showStatus('Session cookies exported successfully!');
    } catch (error) {
      console.error('Error exporting session cookies:', error);
      showStatus('Failed to export session cookies.', true);
    } finally {
      exportSessionCookiesButton.disabled = false;
      exportSessionCookiesButton.textContent = 'Export Session Cookies';
    }
  });

  // Import Session Cookies button handler
  importSessionCookiesButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.addEventListener('change', async (event) => {
      try {
        const file = event.target.files[0];
        if (!file) {
          throw new Error('No file selected');
        }

        importSessionCookiesButton.disabled = true;
        importSessionCookiesButton.textContent = 'Importing...';

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
            importSessionCookiesButton.disabled = false;
            importSessionCookiesButton.textContent = 'Import Session Cookies';
          }
        };
        reader.onerror = () => {
          showStatus('Failed to read the file.', true);
          importSessionCookiesButton.disabled = false;
          importSessionCookiesButton.textContent = 'Import Session Cookies';
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('Import session cookies error:', error);
        showStatus('Failed to import session cookies.', true);
        importSessionCookiesButton.disabled = false;
        importSessionCookiesButton.textContent = 'Import Session Cookies';
      }
    });

    input.click();
  });
});
