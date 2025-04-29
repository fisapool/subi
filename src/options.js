import browser from 'webextension-polyfill';

// Initialize options page
export async function initializeOptionsPage() {
  await loadSettings();
  await initializePremiumFeatures();
  
  const form = document.getElementById('settings-form');
  form.addEventListener('submit', handleFormSubmit);
}

// Load saved settings
export async function loadSettings() {
  try {
    const settings = await browser.storage.sync.get(['autoDelete', 'whitelist']);
    
    const autoDeleteCheckbox = document.getElementById('auto-delete');
    const whitelistInput = document.getElementById('whitelist');
    
    if (settings.autoDelete !== undefined) {
      autoDeleteCheckbox.checked = settings.autoDelete;
    }
    
    if (settings.whitelist) {
      whitelistInput.value = Array.isArray(settings.whitelist) 
        ? settings.whitelist.join(',') 
        : settings.whitelist;
    }
  } catch (error) {
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Failed to load settings';
      statusMessage.className = 'error';
      statusMessage.style.display = 'block';
    }
  }
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();
  
  const autoDeleteCheckbox = document.getElementById('auto-delete');
  const whitelistInput = document.getElementById('whitelist');
  
  const whitelist = whitelistInput.value.trim();
  if (!validateWhitelist(whitelist)) {
    showStatusMessage('Invalid whitelist format', true);
    return;
  }
  
  try {
    await browser.storage.sync.set({
      autoDelete: autoDeleteCheckbox.checked,
      whitelist: whitelist.split(',').map(domain => domain.trim())
    });
    
    showStatusMessage('Settings saved successfully');
  } catch (error) {
    showStatusMessage('Failed to save settings: ' + error.message, true);
  }
}

// Whitelist validation
export function validateWhitelist(whitelist) {
  if (!whitelist) return true; // Empty whitelist is valid
  return whitelist.split(',')
    .map(domain => domain.trim())
    .every(domain => /^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/.test(domain));
}

// Premium features
export async function initializePremiumFeatures() {
  const upgradeButton = document.getElementById('upgrade-premium');
  if (upgradeButton) {
    upgradeButton.addEventListener('click', handlePremiumUpgrade);
  }
  
  await updatePremiumStatus();
}

async function handlePremiumUpgrade() {
  try {
    const authUrl = 'https://api.bytescookies.com/auth/premium';
    const redirectUrl = browser.identity.getRedirectURL();
    
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: `${authUrl}?redirect_uri=${encodeURIComponent(redirectUrl)}`,
      interactive: true
    });
    
    const token = extractTokenFromUrl(responseUrl);
    await handleAuthCallback(token);
    
  } catch (error) {
    showStatusMessage('Failed to upgrade: ' + error.message, true);
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
      statusMessage.textContent = 'Failed to upgrade: ' + error.message;
      statusMessage.style.display = 'block';
    }
  }
}

export async function handleAuthCallback(token) {
  try {
    await browser.storage.sync.set({
      premiumToken: token,
      isPremium: true
    });
    
    await updatePremiumStatus();
    showStatusMessage('Premium upgrade successful');
    
  } catch (error) {
    showStatusMessage('Failed to complete premium upgrade: ' + error.message, true);
  }
}

async function updatePremiumStatus() {
  const { isPremium } = await browser.storage.sync.get('isPremium');
  const upgradeButton = document.getElementById('upgrade-premium');
  
  if (upgradeButton) {
    upgradeButton.style.display = isPremium ? 'none' : 'block';
  }
}

// Data management
export async function exportData() {
  try {
    const data = await browser.storage.sync.get(null);
    return JSON.stringify(data, null, 2);
  } catch (error) {
    throw new Error('Failed to export data: ' + error.message);
  }
}

export async function importData(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    validateImportedData(data);
    await browser.storage.sync.set(data);
  } catch (error) {
    throw new Error('Failed to import data: ' + error.message);
  }
}

function validateImportedData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  
  const requiredFields = ['settings', 'cookies'];
  for (const field of requiredFields) {
    if (!(field in data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

// Helper functions
function showStatusMessage(message, isError = false) {
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : 'success';
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
}

function extractTokenFromUrl(url) {
  const match = url.match(/[#?]token=([^&]+)/);
  if (!match) {
    throw new Error('Invalid authentication response');
  }
  return match[1];
}

