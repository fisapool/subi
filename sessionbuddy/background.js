// Background script for Session Buddy

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
};

const rateLimitMap = new Map();

// CSRF token management
const csrfTokens = new Map();

// Encryption key (in production, this should be securely stored and rotated)
const ENCRYPTION_KEY = crypto.getRandomValues(new Uint8Array(32));

// Rate limiting middleware
function checkRateLimit(sender) {
  const now = Date.now();
  const key = sender.id || sender.tab?.id || 'unknown';
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    return true;
  }

  const limit = rateLimitMap.get(key);
  if (now > limit.resetTime) {
    limit.count = 1;
    limit.resetTime = now + RATE_LIMIT.windowMs;
    return true;
  }

  if (limit.count >= RATE_LIMIT.max) {
    return false;
  }

  limit.count++;
  return true;
}

// CSRF token validation
function validateCSRFToken(token, sender) {
  const storedToken = csrfTokens.get(sender.id);
  return token && storedToken && token === storedToken;
}

// Generate CSRF token
function generateCSRFToken(sender) {
  const token = crypto.getRandomValues(new Uint8Array(32))
    .reduce((acc, val) => acc + val.toString(16).padStart(2, '0'), '');
  csrfTokens.set(sender.id, token);
  return token;
}

// Encrypt session data
async function encryptSessionData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(JSON.stringify(data));
  
  const key = await crypto.subtle.importKey(
    'raw',
    ENCRYPTION_KEY,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return {
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encryptedData))
  };
}

// Decrypt session data
async function decryptSessionData(encryptedData) {
  const key = await crypto.subtle.importKey(
    'raw',
    ENCRYPTION_KEY,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decryptedData = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
    key,
    new Uint8Array(encryptedData.data)
  );

  return JSON.parse(new TextDecoder().decode(decryptedData));
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Rate limiting check
  if (!checkRateLimit(sender)) {
    sendResponse({ error: 'Rate limit exceeded' });
    return true;
  }

  // CSRF token validation for sensitive operations
  if (['GET_SESSIONS', 'RESTORE_SESSION'].includes(request.type)) {
    if (!validateCSRFToken(request.csrfToken, sender)) {
      sendResponse({ error: 'Invalid CSRF token' });
      return true;
    }
  }

  // Handle session management
  if (request.type === 'GET_SESSIONS') {
    chrome.storage.local.get('sessions', async (data) => {
      try {
        const decryptedSessions = await decryptSessionData(data.sessions || { data: [] });
        sendResponse({ 
          sessions: decryptedSessions.data,
          csrfToken: generateCSRFToken(sender)
        });
      } catch (error) {
        console.error('Error decrypting sessions:', error);
        sendResponse({ error: 'Failed to decrypt sessions' });
      }
    });
    return true;
  }
  
  // Handle session restoration
  if (request.type === 'RESTORE_SESSION') {
    restoreSession(request.sessionId);
    return true;
  }
  
  // Handle opening popup
  if (request.type === 'OPEN_POPUP') {
    chrome.action.openPopup();
    return true;
  }
  
  // Handle authentication check
  if (request.type === 'CHECK_AUTH') {
    sendResponse({ 
      isAuthenticated: true,
      csrfToken: generateCSRFToken(sender)
    });
    return true;
  }
});

// Function to restore a session
async function restoreSession(sessionId) {
  try {
    const data = await chrome.storage.local.get('sessions');

    if (!data.sessions) {
      console.error('No sessions found in storage');
      return;
    }

    const decryptedSessions = await decryptSessionData(data.sessions);

    if (!decryptedSessions || !Array.isArray(decryptedSessions.data)) {
      console.error('Invalid session data format');
      return;
    }

    const sessions = decryptedSessions.data;
    const session = sessions.find(s => s.id === parseInt(sessionId, 10));

    if (!session) {
      console.error('Session not found:', sessionId);
      return;
    }

    for (const tabData of session.data || []) {
      if (tabData.url) {
        await chrome.tabs.create({ url: tabData.url });
      }
    }

    for (const tabData of session.data || []) {
      if (tabData.cookies?.cookies) {
        const hostname = new URL(tabData.url).hostname;
        await importCookies(tabData.cookies.cookies, hostname);
      }
    }
  } catch (error) {
    console.error('Error restoring session:', error);
  }
}

// Function to import cookies with enhanced security
async function importCookies(cookies, domain) {
  for (const cookie of cookies) {
    try {
      // Ensure secure cookie attributes
      const secureCookie = {
        url: `https://${cookie.domain}${cookie.path}`, // Force HTTPS
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: true, // Force secure
        httpOnly: true, // Force httpOnly
        sameSite: 'strict', // Force strict same-site
        expirationDate: cookie.expirationDate
      };

      await chrome.cookies.set(secureCookie);
    } catch (error) {
      console.error('Error setting cookie:', error);
    }
  }
} 