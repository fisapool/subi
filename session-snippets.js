// Session Snippets Module for BytesCookies
// Handles saving and restoring browser sessions including tabs, cookies, and forms

// Session snippet data structure
class SessionSnippet {
  constructor(name) {
    this.name = name;
    this.createdAt = Date.now();
    this.tabs = [];
    this.cookies = {};
    this.forms = {};
  }
}

// Save current session
async function saveCurrentSession(name) {
  try {
    // Create new session snippet
    const snippet = new SessionSnippet(name);
    
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // Process each tab
    for (const tab of tabs) {
      // Skip chrome:// and other restricted URLs
      if (!tab.url || tab.url.startsWith('chrome://')) continue;
      
      // Add tab info
      snippet.tabs.push({
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      });
      
      // Get cookies for this tab's domain
      const domain = new URL(tab.url).hostname;
      const cookies = await chrome.cookies.getAll({ domain });
      snippet.cookies[domain] = cookies;
      
      // Get form data (if possible)
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const forms = {};
            document.querySelectorAll('form').forEach((form, index) => {
              forms[index] = {};
              new FormData(form).forEach((value, key) => {
                forms[index][key] = value;
              });
            });
            return forms;
          }
        });
        snippet.forms[tab.url] = result;
      } catch (error) {
        console.warn(`Could not get form data for ${tab.url}:`, error);
      }
    }
    
    // Save to storage
    const { savedSessions = [] } = await chrome.storage.local.get('savedSessions');
    savedSessions.push(snippet);
    await chrome.storage.local.set({ savedSessions });
    
    return snippet;
  } catch (error) {
    console.error('Error saving session:', error);
    throw error;
  }
}

// Restore a saved session
async function restoreSession(snippet) {
  try {
    // Create new window for restored tabs
    const window = await chrome.windows.create({});
    
    // Restore tabs and their cookies
    for (const tab of snippet.tabs) {
      // Create tab
      const newTab = await chrome.tabs.create({
        windowId: window.id,
        url: tab.url
      });
      
      // Set cookies for this tab's domain
      const domain = new URL(tab.url).hostname;
      const cookies = snippet.cookies[domain] || [];
      
      for (const cookie of cookies) {
        try {
          await chrome.cookies.set({
            url: tab.url,
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate
          });
        } catch (error) {
          console.warn(`Could not set cookie for ${tab.url}:`, error);
        }
      }
      
      // Restore form data (if available)
      const formData = snippet.forms[tab.url];
      if (formData) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: (data) => {
              Object.entries(data).forEach(([formIndex, fields]) => {
                const form = document.forms[formIndex];
                if (form) {
                  Object.entries(fields).forEach(([key, value]) => {
                    const input = form.elements[key];
                    if (input) input.value = value;
                  });
                }
              });
            },
            args: [formData]
          });
        } catch (error) {
          console.warn(`Could not restore form data for ${tab.url}:`, error);
        }
      }
    }
    
    return window;
  } catch (error) {
    console.error('Error restoring session:', error);
    throw error;
  }
}

// Get all saved sessions
async function getSavedSessions() {
  const { savedSessions = [] } = await chrome.storage.local.get('savedSessions');
  return savedSessions;
}

// Delete a saved session
async function deleteSession(snippetName) {
  const { savedSessions = [] } = await chrome.storage.local.get('savedSessions');
  const updatedSessions = savedSessions.filter(s => s.name !== snippetName);
  await chrome.storage.local.set({ savedSessions: updatedSessions });
}

// Export functions
export {
  saveCurrentSession,
  restoreSession,
  getSavedSessions,
  deleteSession
}; 