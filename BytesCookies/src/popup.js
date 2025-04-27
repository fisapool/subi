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
    let failedCookies = [];

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
            failedCookies.push({
              name: cookie.name,
              domain: domain,
              reason: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error'
            });
          } else {
            imported++;
          }
          resolve();
        });
      });
    });

    await Promise.all(setCookiePromises);
    return { imported, failed, failedCookies };
  },
  
  // Validate cookie data structure
  validateCookieData: function(data) {
    if (!data) {
      throw new Error('No data provided');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Invalid file format: Expected an array of cookie entries');
    }
    
    if (data.length === 0) {
      throw new Error('No cookie entries found in the file');
    }
    
    const validationErrors = [];
    
    data.forEach((entry, index) => {
      if (!entry.url) {
        validationErrors.push(`Entry ${index + 1}: Missing URL`);
      }
      
      if (!Array.isArray(entry.cookies)) {
        validationErrors.push(`Entry ${index + 1}: Missing or invalid cookies array`);
      } else {
        entry.cookies.forEach((cookie, cookieIndex) => {
          if (!cookie.name) {
            validationErrors.push(`Entry ${index + 1}, Cookie ${cookieIndex + 1}: Missing cookie name`);
          }
          if (!cookie.value) {
            validationErrors.push(`Entry ${index + 1}, Cookie ${cookieIndex + 1}: Missing cookie value`);
          }
        });
      }
    });
    
    if (validationErrors.length > 0) {
      throw new Error('Validation errors: ' + validationErrors.join(', '));
    }
    
    return true;
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
    // Check if we have the tabs permission before enabling focus mode
    if (toggleFocusMode.checked) {
      chrome.permissions.contains({ permissions: ['tabs'] }, (hasPermission) => {
        if (hasPermission) {
          chrome.storage.local.set({ focusModeEnabled: true });
          updateConfigButtonVisibility();
          showStatus('Focus Mode enabled');
        } else {
          // If we don't have permission, uncheck the toggle and show a message
          toggleFocusMode.checked = false;
          showStatus('Focus Mode requires additional permissions. Please grant them in the Security & Permissions tab.', true);
        }
      });
    } else {
      chrome.storage.local.set({ focusModeEnabled: false });
      updateConfigButtonVisibility();
      showStatus('Focus Mode disabled');
    }
  });

  configFocusMode.addEventListener('click', () => {
    // Open options page and switch to Productivity tab
    chrome.runtime.openOptionsPage(() => {
      // Send a message to options page to switch to productivity tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          // First check if we can inject the content script
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['src/content.js']
          }).then(() => {
            // Now send the message
            chrome.tabs.sendMessage(tabs[0].id, { action: 'switchToProductivityTab' }, (response) => {
              if (chrome.runtime.lastError) {
                console.warn('Message sending failed:', chrome.runtime.lastError.message);
              } else if (response && response.success) {
                console.log('Successfully switched to productivity tab');
              }
            });
          }).catch((err) => {
            console.warn('Failed to inject content script:', err);
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

  // Helper function to validate and format duration
  function validateDuration(duration) {
    duration = parseInt(duration, 10);
    if (isNaN(duration) || duration < 1) {
      return 1;
    }
    if (duration > 1440) { // 24 hours in minutes
      return 1440;
    }
    return duration;
  }

  // Helper function to format duration for display
  function formatDuration(minutes) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  cookieDuration.addEventListener('change', () => {
    const duration = validateDuration(cookieDuration.value);
    cookieDuration.value = duration;
    chrome.storage.local.set({ sessionCookieDuration: duration }, () => {
      showStatus(`Session duration set to ${formatDuration(duration)}`);
    });
  });

  // Add input validation on blur
  cookieDuration.addEventListener('blur', () => {
    const duration = validateDuration(cookieDuration.value);
    if (duration !== parseInt(cookieDuration.value, 10)) {
      cookieDuration.value = duration;
      showStatus(`Session duration adjusted to ${formatDuration(duration)}`);
    }
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

  // Enhanced error display system
  function showError(error, userMessage = null) {
    const errorDisplay = document.getElementById('errorDisplay');
    const errorMessage = document.getElementById('errorMessage');
    const errorStack = document.getElementById('errorStack');
    const showDetailsBtn = document.getElementById('showErrorDetails');
    const dismissBtn = document.getElementById('dismissError');

    // Set the user-friendly message
    errorMessage.textContent = userMessage || error.message || 'An unexpected error occurred';

    // Set the technical details
    if (error.failedCookies) {
      // If we have failed cookies, display them in a formatted list
      let failedCookiesHtml = '<ul class="failed-cookies-list">';
      error.failedCookies.forEach(cookie => {
        failedCookiesHtml += `<li><strong>${cookie.name}</strong> (${cookie.domain}): ${cookie.reason}</li>`;
      });
      failedCookiesHtml += '</ul>';
      errorStack.innerHTML = failedCookiesHtml;
    } else {
      // Otherwise show the error stack or string representation
      errorStack.textContent = error.stack || error.toString();
    }

    // Show the error display
    errorDisplay.style.display = 'block';

    // Toggle details visibility
    showDetailsBtn.onclick = () => {
      const details = document.getElementById('errorDetails');
      const isHidden = details.style.display === 'none';
      details.style.display = isHidden ? 'block' : 'none';
      showDetailsBtn.textContent = isHidden ? 'Hide Details' : 'Show Details';
    };

    // Dismiss error
    dismissBtn.onclick = () => {
      errorDisplay.style.display = 'none';
    };

    // Log to console for debugging
    console.error('Error details:', error);
  }

  // Enhanced error handling for cookie operations
  async function handleCookieOperation(operation, action) {
    try {
      // Use the withLock utility to prevent concurrent operations
      return await window.utils.withLock(`cookie_operation_${action}`, async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) {
          throw new Error('No active tab found. Please make sure you have a valid tab open.');
        }
        const tab = tabs[0];
        
        if (!tab.url) {
          throw new Error('Cannot perform operation: Tab URL is not available.');
        }

        return await operation(tab);
      });
    } catch (error) {
      let userMessage = 'An error occurred while performing the operation.';
      
      if (error.message.includes('No active tab')) {
        userMessage = 'Please open a valid webpage before performing this action.';
      } else if (error.message.includes('Tab URL')) {
        userMessage = 'Cannot perform this action on the current page. Please try a different webpage.';
      } else if (error.message.includes('Invalid file format')) {
        userMessage = 'The imported file is not in the correct format. Please use a valid cookie export file.';
      } else if (error.message.includes('No cookies found')) {
        userMessage = 'No cookies were found to perform this action.';
      } else if (error.message.includes('is already in progress')) {
        userMessage = 'This operation is already in progress. Please wait for it to complete.';
      }

      showError(error, userMessage);
      throw error;
    }
  }

  // Loading and feedback state management
  function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'flex';
    }
  }

  function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }

  function showDomainFeedback(message, type = 'info') {
    const domainFeedback = document.getElementById('domainFeedback');
    if (domainFeedback) {
      domainFeedback.textContent = message;
      domainFeedback.className = `domain-feedback ${type}`;
      domainFeedback.style.display = 'block';
      
      setTimeout(() => {
        domainFeedback.style.display = 'none';
      }, 3000);
    }
  }

  // Domain processing functionality
  const processButton = document.getElementById('processButton');
  if (processButton) {
    // Use debounce to prevent rapid clicks
    const debouncedProcess = window.utils.debounce(async () => {
      const domainInput = document.getElementById('domainInput');
      const domain = domainInput.value.trim();
      
      if (!domain) {
        showDomainFeedback('Please enter a domain', 'error');
        return;
      }
      
      try {
        // Use withUIUpdate to safely update UI during operation
        await window.utils.withUIUpdate(
          processButton,
          { disabled: true, text: 'Processing...' },
          async () => {
            showLoading();
            // Process domain logic here
            await processDomain(domain);
            showDomainFeedback('Domain processed successfully', 'success');
          }
        );
      } catch (error) {
        showDomainFeedback(error.message, 'error');
      } finally {
        hideLoading();
      }
    }, 300); // 300ms debounce
    
    processButton.addEventListener('click', debouncedProcess);
  }

  async function processDomain(domain) {
    // Use withLock to prevent concurrent processing
    return await window.utils.withLock(`process_domain_${domain}`, async () => {
      // Add your domain processing logic here
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulated processing
    });
  }

  // Update the cookie operation handlers to use the new error handling
  toggleCookieDeletion.addEventListener('change', async () => {
    try {
      // Use withUIUpdate to safely update UI during operation
      await window.utils.withUIUpdate(
        toggleCookieDeletion,
        { disabled: true, text: 'Deleting...' },
        async () => {
          await handleCookieOperation(async (tab) => {
            const url = new URL(tab.url);
            const cookies = await window.cookieUtils.exportCookies(tab);
            
            if (cookies.length === 0) {
              throw new Error('No cookies found to delete.');
            }

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
            showStatus(`Successfully deleted ${cookies.length} cookies!`);
            chrome.tabs.reload(tab.id);
          }, 'delete');
        }
      );
    } catch (error) {
      // Error is already handled by handleCookieOperation
    }
  });

  // Save Session Cookies button handler
  saveSessionCookiesButton.addEventListener('click', async () => {
    try {
      // Use withUIUpdate to safely update UI during operation
      await window.utils.withUIUpdate(
        saveSessionCookiesButton,
        { disabled: true, text: 'Saving...' },
        async () => {
          showLoading();

          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tabs.length === 0) {
            throw new Error('No active tab found');
          }
          const tab = tabs[0];
          const cookies = await window.cookieUtils.exportCookies(tab);

          if (cookies.length === 0) {
            throw new Error('No cookies found to save');
          }

          const sessionCookieData = JSON.stringify([{ url: tab.url, cookies }], null, 2);
          const blob = new Blob([sessionCookieData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'session_cookies.json';
          a.click();
          URL.revokeObjectURL(url);

          showStatus(`Successfully saved ${cookies.length} cookies!`);
        }
      );
    } catch (error) {
      console.error('Error saving session cookies:', error);
      showError(error, 'Failed to save session cookies. Please try again.');
    } finally {
      hideLoading();
    }
  });

  // Update import handler with better error handling
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

        // Use withUIUpdate to safely update UI during operation
        await window.utils.withUIUpdate(
          restoreSessionCookiesButton,
          { disabled: true, text: 'Importing...' },
          async () => {
            showLoading();

            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const sessionCookieDataJson = reader.result;
                let sessionCookies;
                
                try {
                  sessionCookies = JSON.parse(sessionCookieDataJson);
                } catch (e) {
                  throw new Error('Invalid file format: The file is not a valid JSON file.');
                }
                
                // Validate the cookie data structure
                window.cookieUtils.validateCookieData(sessionCookies);

                let totalImported = 0;
                let totalFailed = 0;
                let failedCookies = [];

                for (const entry of sessionCookies) {
                  const { url, cookies } = entry;
                  const dummyTab = { url };
                  const result = await window.cookieUtils.importCookies(cookies, dummyTab);
                  totalImported += result.imported;
                  totalFailed += result.failed;
                  
                  if (result.failedCookies && result.failedCookies.length > 0) {
                    failedCookies = failedCookies.concat(result.failedCookies);
                  }
                }

                if (totalImported > 0) {
                  showStatus(`Successfully imported ${totalImported} cookies`);
                  
                  if (totalFailed > 0) {
                    // Show detailed error information
                    const errorDetails = document.getElementById('errorDetails');
                    const errorStack = document.getElementById('errorStack');
                    
                    let failedCookiesHtml = '<ul class="failed-cookies-list">';
                    failedCookies.forEach(cookie => {
                      failedCookiesHtml += `<li><strong>${cookie.name}</strong> (${cookie.domain}): ${cookie.reason}</li>`;
                    });
                    failedCookiesHtml += '</ul>';
                    
                    errorStack.innerHTML = failedCookiesHtml;
                    
                    const error = new Error(`${totalFailed} cookies failed to import`);
                    error.failedCookies = failedCookies;
                    showError(error, `${totalFailed} cookies failed to import. Click 'Show Details' to see which ones failed.`);
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
                showError(error);
              } finally {
                hideLoading();
              }
            };
            
            reader.onerror = () => {
              showError(new Error('Failed to read the file.'), 'Unable to read the selected file. Please try again.');
              hideLoading();
            };
            
            reader.readAsText(file);
          }
        );
      } catch (error) {
        showError(error);
        hideLoading();
      }
    });

    input.click();
  });
});
