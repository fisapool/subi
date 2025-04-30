// Background script for Session Buddy

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}

// CSRF token configuration
const CSRF_TOKEN = {
  expirationMs: 5 * 60 * 1000, // 5 minutes
  cleanupIntervalMs: 60 * 1000, // 1 minute
}

// Initialize on extension load
chrome.runtime.onInstalled.addListener(async () => {
  // Initialize encryption key
  const storage = await chrome.storage.local.get("encryptionKey")
  if (!storage.encryptionKey) {
    // Generate a new encryption key
    const buffer = new Uint8Array(32)
    crypto.getRandomValues(buffer)
    const encryptionKey = Array.from(buffer)
    await chrome.storage.local.set({ encryptionKey })
  }

  // Initialize rate limit map and CSRF tokens
  await chrome.storage.local.set({ 
    rateLimitMap: {},
    csrfTokens: {}
  })

  // Start CSRF token cleanup interval
  setInterval(cleanupExpiredTokens, CSRF_TOKEN.cleanupIntervalMs)
  
  console.log("Extension initialized")
})

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle the message asynchronously
  handleMessage(message, sender).then(sendResponse)
  return true // Keep the message channel open for async response
})

async function cleanupExpiredTokens() {
  try {
    const now = Date.now()
    const { csrfTokens = {} } = await chrome.storage.local.get("csrfTokens")
    const validTokens = {}
    
    for (const [token, data] of Object.entries(csrfTokens)) {
      if (now - data.timestamp < CSRF_TOKEN.expirationMs) {
        validTokens[token] = data
      }
    }
    
    await chrome.storage.local.set({ csrfTokens: validTokens })
  } catch (error) {
    console.error("Error cleaning up CSRF tokens:", error)
  }
}

async function validateCsrfToken(token, sender) {
  try {
    if (!token) {
      return { valid: false, error: 'Missing CSRF token' }
    }

    const { csrfTokens = {} } = await chrome.storage.local.get("csrfTokens")
    const tokenData = csrfTokens[token]

    if (!tokenData) {
      return { valid: false, error: 'Invalid CSRF token' }
    }

    const now = Date.now()
    if (now - tokenData.timestamp > CSRF_TOKEN.expirationMs) {
      return { valid: false, error: 'CSRF token expired' }
    }

    if (tokenData.sender !== (sender.id || sender.tab?.id)) {
      return { valid: false, error: 'CSRF token sender mismatch' }
    }

    return { valid: true }
  } catch (error) {
    console.error("Error validating CSRF token:", error)
    return { valid: false, error: 'Error validating CSRF token' }
  }
}

async function handleMessage(message, sender) {
  try {
    // Check rate limit
    const rateLimitMap = await chrome.storage.local.get("rateLimitMap")
    const now = Date.now()
    const key = sender.id || sender.tab?.id || "unknown"
    const rateData = rateLimitMap[key] || { count: 0, resetTime: now + RATE_LIMIT.windowMs }

    if (now > rateData.resetTime) {
      rateData.count = 1
      rateData.resetTime = now + RATE_LIMIT.windowMs
    } else if (rateData.count >= RATE_LIMIT.max) {
      return { error: 'Rate limit exceeded' }
    } else {
      rateData.count++
    }

    await chrome.storage.local.set({ rateLimitMap: { ...rateLimitMap, [key]: rateData } })

    // Handle message types
    switch (message.type) {
      case 'getCsrfToken':
        const token = crypto.randomUUID()
        const csrfTokens = await chrome.storage.local.get("csrfTokens") || {}
        csrfTokens[token] = {
          timestamp: now,
          sender: sender.id || sender.tab?.id
        }
        await chrome.storage.local.set({ csrfTokens })
        return { token }

      case 'getSessions':
        const tokenValidation = await validateCsrfToken(message.token, sender)
        if (!tokenValidation.valid) {
          return { error: tokenValidation.error }
        }
        const sessions = await chrome.storage.local.get("sessions") || {}
        return { sessions: Object.values(sessions) }

      case 'saveSession':
        const saveValidation = await validateCsrfToken(message.token, sender)
        if (!saveValidation.valid) {
          return { error: saveValidation.error }
        }
        
        // Validate session data
        if (!message.name || typeof message.name !== 'string') {
          return { error: 'Invalid session name' }
        }
        
        if (!message.data || !message.data.windows) {
          return { error: 'Invalid session data' }
        }
        
        const sessionId = `session-${Date.now()}`
        const session = {
          id: sessionId,
          name: message.name,
          timestamp: Date.now(),
          data: message.data,
          tabs: message.data.windows.reduce((acc, window) => {
            return acc.concat(window.tabs || [])
          }, [])
        }
        
        const existingSessions = await chrome.storage.local.get("sessions") || {}
        await chrome.storage.local.set({ 
          sessions: { ...existingSessions, [sessionId]: session }
        })
        return { success: true, sessionId }

      default:
        return { error: 'Unknown message type' }
    }
  } catch (error) {
    console.error("Error handling message:", error)
    return { error: error.message }
  }
}
