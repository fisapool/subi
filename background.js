// Background script for FISABytes Sessions

// Rate limiting configuration
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
}

const rateLimitMap = new Map()

// CSRF token management
const csrfTokens = new Map()

// Encryption key (in production, this should be securely stored and rotated)
let ENCRYPTION_KEY = null

// Initialize encryption key
async function initializeEncryptionKey() {
  try {
    const storage = await chrome.storage.local.get("encryptionKey")
    if (storage.encryptionKey) {
      ENCRYPTION_KEY = storage.encryptionKey
    } else {
      // Generate a new encryption key
      const buffer = new Uint8Array(32)
      crypto.getRandomValues(buffer)
      ENCRYPTION_KEY = Array.from(buffer)
      await chrome.storage.local.set({ encryptionKey: ENCRYPTION_KEY })
    }
    console.log("Encryption key initialized")
    return true
  } catch (error) {
    console.error("Failed to initialize encryption key:", error)
    return false
  }
}

// Initialize on extension load
initializeEncryptionKey()

// Rate limiting middleware
function checkRateLimit(sender) {
  const now = Date.now()
  const key = sender.id || sender.tab?.id || "unknown"

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    })
    return true
  }

  const limit = rateLimitMap.get(key)
  if (now > limit.resetTime) {
    limit.count = 1
    limit.resetTime = now + RATE_LIMIT.windowMs
    return true
  }

  if (limit.count >= RATE_LIMIT.max) {
    return false
  }

  limit.count++
  return true
}

// CSRF token validation
function validateCSRFToken(token, sender) {
  // If no token is provided, reject the request
  if (!token) {
    console.warn("No CSRF token provided")
    return false
  }

  const storedToken = csrfTokens.get(sender.id)

  // If no stored token exists, accept the provided token and store it
  if (!storedToken) {
    console.log("No stored CSRF token found, accepting provided token")
    csrfTokens.set(sender.id, token)
    return true
  }

  // Compare the provided token with the stored token
  return token === storedToken
}

// Generate CSRF token
function generateCSRFToken(sender) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  csrfTokens.set(sender.id, token)
  return token
}

// Function to validate cookie data
function validateCookieData(cookie) {
  const validationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    cookie: { ...cookie },
  }

  // Check required fields
  const requiredFields = ["name", "value", "domain"]
  const missingFields = requiredFields.filter((field) => cookie[field] === undefined)

  if (missingFields.length > 0) {
    validationResult.isValid = false
    validationResult.errors.push(`Missing required cookie fields: ${missingFields.join(", ")}`)
  }

  // Normalize domain (remove leading dot if present)
  if (cookie.domain && cookie.domain.startsWith(".")) {
    validationResult.cookie.domain = cookie.domain.substring(1)
    validationResult.warnings.push(`Normalized domain from ${cookie.domain} to ${validationResult.cookie.domain}`)
  }

  // Set default path if not provided
  if (!cookie.path) {
    validationResult.cookie.path = "/"
    validationResult.warnings.push('Set default path to "/"')
  }

  // Handle host-only cookies
  if (cookie.hostOnly) {
    // For host-only cookies, we should not include the domain in the set operation
    validationResult.warnings.push("Host-only cookie detected, domain will be determined by the URL")
    // We'll keep the domain for URL construction but mark it for special handling
    validationResult.cookie.isHostOnly = true
  }

  // Set default values for optional fields
  validationResult.cookie.secure = cookie.secure ?? true
  validationResult.cookie.httpOnly = cookie.httpOnly ?? false
  validationResult.cookie.sameSite = cookie.sameSite === "unspecified" ? "lax" : (cookie.sameSite ?? "lax")

  // Check for suspicious content in cookie value
  const suspiciousPatterns = [/<script/i, /javascript:/i, /data:/i, /vbscript:/i]
  if (cookie.value && suspiciousPatterns.some((pattern) => pattern.test(cookie.value))) {
    validationResult.warnings.push("Cookie value contains potentially suspicious content")
  }

  // Check cookie size
  if (cookie.value && cookie.value.length > 4096) {
    validationResult.warnings.push("Cookie value exceeds recommended size limit of 4096 bytes")
  }

  // Special handling for __Host- and __Secure- prefixed cookies
  if (cookie.name && cookie.name.startsWith("__Host-")) {
    if (!cookie.secure) {
      validationResult.cookie.secure = true
      validationResult.warnings.push("__Host- prefixed cookie must be secure, setting secure=true")
    }
    if (cookie.path !== "/") {
      validationResult.cookie.path = "/"
      validationResult.warnings.push('__Host- prefixed cookie must have path="/", setting path="/"')
    }
    // __Host- cookies should not have a domain specified
    if (cookie.domain) {
      validationResult.warnings.push("__Host- prefixed cookie should not specify a domain, this may cause issues")
    }
  } else if (cookie.name && cookie.name.startsWith("__Secure-")) {
    if (!cookie.secure) {
      validationResult.cookie.secure = true
      validationResult.warnings.push("__Secure- prefixed cookie must be secure, setting secure=true")
    }
  }

  return validationResult
}

// Encrypt session data
async function encryptSessionData(data) {
  try {
    if (!ENCRYPTION_KEY) {
      await initializeEncryptionKey()
    }

    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(JSON.stringify(data))

    const key = await crypto.subtle.importKey("raw", new Uint8Array(ENCRYPTION_KEY), { name: "AES-GCM" }, false, [
      "encrypt",
    ])

    const encryptedData = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedData)

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData)),
      version: 1, // Adding version for future compatibility
    }
  } catch (error) {
    console.error("Encryption error:", error)
    throw new Error(`Failed to encrypt data: ${error.message}`)
  }
}

// Decrypt session data
async function decryptSessionData(encryptedData) {
  try {
    if (!ENCRYPTION_KEY) {
      await initializeEncryptionKey()
    }

    // Handle legacy format (no version field)
    if (!encryptedData.version) {
      console.warn("Decrypting legacy format data")
    }

    const key = await crypto.subtle.importKey("raw", new Uint8Array(ENCRYPTION_KEY), { name: "AES-GCM" }, false, [
      "decrypt",
    ])

    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(encryptedData.iv) },
      key,
      new Uint8Array(encryptedData.data),
    )

    return JSON.parse(new TextDecoder().decode(decryptedData))
  } catch (error) {
    console.error("Decryption error:", error)
    throw new Error(`Failed to decrypt data: ${error.message}`)
  }
}

// Function to import cookies with enhanced security
async function importCookies(cookies, domain) {
  console.log(`Importing ${cookies.length} cookies for domain: ${domain}`)

  const results = {
    success: [],
    failed: [],
    warnings: [],
  }

  for (const cookie of cookies) {
    try {
      // Validate and sanitize cookie data
      const validation = validateCookieData(cookie)

      // Add any warnings to the results
      if (validation.warnings.length > 0) {
        results.warnings.push({
          cookie: cookie.name,
          domain: domain,
          warnings: validation.warnings,
        })
      }

      // If validation failed, add to failed list and continue
      if (!validation.isValid) {
        results.failed.push({
          cookie,
          error: validation.errors.join(", "),
        })
        continue
      }

      const validatedCookie = validation.cookie

      // Construct URL based on cookie's secure flag
      const protocol = validatedCookie.secure ? "https" : "http"
      let url

      // Special handling for host-only cookies
      if (validatedCookie.isHostOnly) {
        // For host-only cookies, use the exact domain without modifications
        url = `${protocol}://${domain}${validatedCookie.path}`
      } else {
        // For domain cookies, use the cookie's domain
        url = `${protocol}://${validatedCookie.domain}${validatedCookie.path}`
      }

      console.log(`Setting cookie: ${validatedCookie.name} for ${url}`)

      // Set cookie with validated attributes
      const cookieToSet = {
        url,
        name: validatedCookie.name,
        value: validatedCookie.value,
        path: validatedCookie.path,
        secure: validatedCookie.secure,
        httpOnly: validatedCookie.httpOnly,
        sameSite: validatedCookie.sameSite,
        expirationDate: validatedCookie.expirationDate || Math.floor(Date.now() / 1000) + 86400 * 30, // 30 days default
      }

      // Only include domain for non-host-only cookies
      if (!validatedCookie.isHostOnly) {
        cookieToSet.domain = validatedCookie.domain
      }

      const result = await chrome.cookies.set(cookieToSet)
      if (result) {
        console.log(`Successfully set cookie: ${validatedCookie.name}`)
        results.success.push(cookieToSet)
      } else {
        console.warn(`Failed to set cookie: ${validatedCookie.name} - API returned null`)

        // Try one more time with a slightly different approach for host-only cookies
        if (validatedCookie.isHostOnly) {
          // Try without specifying domain at all
          delete cookieToSet.domain

          const retryResult = await chrome.cookies.set(cookieToSet)
          if (retryResult) {
            console.log(`Successfully set host-only cookie on retry: ${validatedCookie.name}`)
            results.success.push(cookieToSet)
            continue
          }
        }

        results.failed.push({
          cookie,
          error: "Chrome cookies API returned null",
        })
      }
    } catch (error) {
      console.error(`Error setting cookie ${cookie.name}:`, error)
      results.failed.push({
        cookie,
        error: error.message,
      })

      // Add warning for non-critical errors
      if (!error.message.includes("Missing required cookie fields")) {
        results.warnings.push({
          type: "cookie_import_warning",
          message: `Failed to import cookie for ${domain}: ${error.message}`,
          cookie: cookie.name,
        })
      }
    }
  }

  console.log(
    `Cookie import results for ${domain}: ${results.success.length} successful, ${results.failed.length} warnings`,
  )
  return results
}

// Function to export cookies
async function exportCookies(domain) {
  try {
    console.log(`Exporting cookies for domain: ${domain}`)

    // Get all cookies for the domain
    const cookies = await chrome.cookies.getAll({ domain })

    console.log(`Found ${cookies.length} cookies for domain: ${domain}`)

    // Validate each cookie and collect warnings
    const warnings = []
    const validatedCookies = cookies.map((cookie) => {
      const validation = validateCookieData(cookie)

      if (validation.warnings.length > 0) {
        warnings.push({
          cookie: cookie.name,
          warnings: validation.warnings,
        })
      }

      return validation.cookie
    })

    return {
      cookies: validatedCookies,
      warnings: warnings.length > 0 ? warnings : null,
    }
  } catch (error) {
    console.error(`Error exporting cookies for ${domain}:`, error)
    throw new Error(`Failed to export cookies: ${error.message}`)
  }
}

// Message handling with improved error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message.type)

  // Check rate limit
  if (!checkRateLimit(sender)) {
    console.warn("Rate limit exceeded for sender:", sender.id)
    sendResponse({
      success: false,
      error: "Rate limit exceeded. Please try again later.",
    })
    return true
  }

  // Handle different message types
  const messageHandlers = {
    GET_CSRF_TOKEN: async () => {
      try {
        const token = generateCSRFToken(sender)
        return { success: true, token }
      } catch (error) {
        console.error("Error generating CSRF token:", error)
        return { success: false, error: error.message }
      }
    },

    IMPORT_SESSION: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        return await importSession(message.sessionData)
      } catch (error) {
        console.error("Error importing session:", error)
        return { success: false, error: error.message }
      }
    },

    IMPORT_SESSION_IN_FORMAT: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        return await importSessionInFormat(message.sessionData)
      } catch (error) {
        console.error("Error importing session in format:", error)
        return { success: false, error: error.message }
      }
    },

    EXPORT_SESSION_IN_FORMAT: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        return await exportSessionInFormat(message.sessionId)
      } catch (error) {
        console.error("Error exporting session in format:", error)
        return { success: false, error: error.message }
      }
    },

    RESTORE_SESSION: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        return await restoreSession(message.sessionId)
      } catch (error) {
        console.error("Error restoring session:", error)
        return { success: false, error: error.message }
      }
    },

    DELETE_SESSION: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        return await deleteSession(message.sessionId)
      } catch (error) {
        console.error("Error deleting session:", error)
        return { success: false, error: error.message }
      }
    },

    GET_SESSIONS: async () => {
      try {
        return await getSessions()
      } catch (error) {
        console.error("Error getting sessions:", error)
        return { success: false, error: error.message }
      }
    },
    SAVE_SESSIONS: async () => {
      try {
        if (!validateCSRFToken(message.csrfToken, sender)) {
          return { success: false, error: "Invalid CSRF token" }
        }

        if (!Array.isArray(message.sessions)) {
          return { success: false, error: "Invalid sessions data format" }
        }

        const encryptedSessions = await encryptSessionData({ data: message.sessions })
        await chrome.storage.local.set({ sessions: encryptedSessions })

        return {
          success: true,
          message: "Sessions saved successfully",
        }
      } catch (error) {
        console.error("Error saving sessions:", error)
        return { success: false, error: error.message }
      }
    },

    UPDATE_AUTO_SAVE: async () => {
      try {
        // Clear existing alarm if any
        await chrome.alarms.clear("autoSaveSession")

        // Create new alarm
        const interval = message.interval || 30
        await chrome.alarms.create("autoSaveSession", {
          periodInMinutes: interval,
        })

        console.log(`Auto-save enabled with interval of ${interval} minutes`)

        return {
          success: true,
          message: `Auto-save enabled with interval of ${interval} minutes`,
        }
      } catch (error) {
        console.error("Error updating auto-save:", error)
        return { success: false, error: error.message }
      }
    },

    DISABLE_AUTO_SAVE: async () => {
      try {
        await chrome.alarms.clear("autoSaveSession")
        console.log("Auto-save disabled")

        return {
          success: true,
          message: "Auto-save disabled",
        }
      } catch (error) {
        console.error("Error disabling auto-save:", error)
        return { success: false, error: error.message }
      }
    },
  }

  // Process the message asynchronously
  if (messageHandlers[message.type]) {
    messageHandlers[message.type]()
      .then((response) => sendResponse(response))
      .catch((error) => {
        console.error(`Error handling message ${message.type}:`, error)
        sendResponse({
          success: false,
          error: `Internal error: ${error.message}`,
        })
      })
    return true // Keep the message channel open for the async response
  } else {
    sendResponse({
      success: false,
      error: "Unknown message type",
    })
    return false
  }
})

// Function to restore a session
async function restoreSession(sessionId) {
  console.log(`Restoring session: ${sessionId}`)

  try {
    const { sessions } = await getSessions()

    if (!sessions || sessions.length === 0) {
      throw new Error("No sessions found in storage")
    }

    const session = sessions.find((s) => s.id === sessionId)

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`)
    }

    console.log(`Found session: ${session.name} with ${session.tabs?.length || 0} tabs`)

    // Create a new window for the session with a delay to ensure stability
    let newWindow
    let retryCount = 0
    const maxRetries = 3
    
    while (retryCount < maxRetries) {
      try {
        newWindow = await chrome.windows.create({})
        if (!newWindow || !newWindow.id) {
          throw new Error("Failed to create valid window")
        }
        
        // Add a small delay to ensure window is fully created
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Verify window exists after creation
        const windowExists = await chrome.windows.get(newWindow.id)
        if (!windowExists) {
          throw new Error("Window verification failed immediately after creation")
        }
        
        break
      } catch (error) {
        console.error(`Window creation attempt ${retryCount + 1} failed:`, error)
        retryCount++
        if (retryCount === maxRetries) {
          throw new Error("Failed to create stable window after multiple attempts")
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // Store the window ID for later use
    const windowId = newWindow.id
    console.log(`Created and verified new window with ID: ${windowId}`)

    // First restore cookies for all tabs
    const cookieResults = {
      success: 0,
      failed: 0,
      warnings: [],
    }

    // Process cookies in batches to avoid overwhelming the browser
    const batchSize = 10
    const tabsWithCookies = (session.tabs || []).filter((tab) => tab.cookies && tab.cookies.length > 0)

    for (let i = 0; i < tabsWithCookies.length; i += batchSize) {
      const batch = tabsWithCookies.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (tab) => {
          try {
            if (!tab.url) return

            const hostname = new URL(tab.url).hostname
            const results = await importCookies(tab.cookies, hostname)

            cookieResults.success += results.success.length
            cookieResults.failed += results.failed.length
            cookieResults.warnings.push(...results.warnings)
          } catch (error) {
            console.error(`Error restoring cookies for tab ${tab.url}:`, error)
            cookieResults.warnings.push({
              type: "tab_cookies_error",
              message: `Failed to restore cookies for ${tab.url}: ${error.message}`,
              url: tab.url,
            })
          }
        }),
      )
    }

    console.log(`Cookie restoration complete: ${cookieResults.success} successful, ${cookieResults.failed} failed`)

    // Close the initial blank tab in the new window
    try {
      const initialTabs = await chrome.tabs.query({ windowId })
      if (initialTabs.length > 0) {
        await chrome.tabs.remove(initialTabs[0].id)
      }
    } catch (error) {
      console.error("Error closing initial tab:", error)
      // Continue with tab creation even if closing initial tab fails
    }

    // Then open tabs in batches
    const tabsToRestore = session.tabs || []
    const createdTabs = []
    
    for (let i = 0; i < tabsToRestore.length; i += batchSize) {
      const batch = tabsToRestore.slice(i, i + batchSize)
      
      // Verify window still exists before creating tabs
      let currentWindowId = windowId
      let windowRetryCount = 0
      const maxWindowRetries = 3
      
      while (windowRetryCount < maxWindowRetries) {
        try {
          const windowExists = await chrome.windows.get(currentWindowId)
          if (!windowExists) {
            // If window doesn't exist, create a new one
            const newWindow = await chrome.windows.create({})
            if (!newWindow || !newWindow.id) {
              throw new Error("Failed to create valid window")
            }
            
            // Add a small delay to ensure window is fully created
            await new Promise(resolve => setTimeout(resolve, 100))
            
            // Verify window exists after creation
            const windowExists = await chrome.windows.get(newWindow.id)
            if (!windowExists) {
              throw new Error("Window verification failed immediately after creation")
            }
            
            currentWindowId = newWindow.id
            console.log(`Created and verified new window with ID: ${currentWindowId} for tab restoration`)
          }
          
          // Create tabs in the current batch
          const batchResults = await Promise.allSettled(
            batch.map(async (tab) => {
              try {
                if (tab.url) {
                  console.log(`Opening tab: ${tab.url}`)
                  const newTab = await chrome.tabs.create({
                    windowId: currentWindowId,
                    url: tab.url,
                    active: false,
                  })
                  return { success: true, tab: newTab }
                }
                return { success: false, error: "No URL provided" }
              } catch (error) {
                console.error(`Error creating tab ${tab.url}:`, error)
                return { success: false, error: error.message, url: tab.url }
              }
            })
          )
          
          // Process batch results
          batchResults.forEach(result => {
            if (result.status === 'fulfilled') {
              if (result.value.success) {
                createdTabs.push(result.value.tab)
              } else {
                cookieResults.warnings.push({
                  type: "tab_creation_error",
                  message: `Failed to create tab: ${result.value.error}`,
                  url: result.value.url,
                })
              }
            } else {
              cookieResults.warnings.push({
                type: "tab_creation_error",
                message: `Failed to create tab: ${result.reason}`,
              })
            }
          })
          
          // If we got here, the window and tabs were created successfully
          break
        } catch (error) {
          console.error(`Window/tab creation attempt ${windowRetryCount + 1} failed:`, error)
          windowRetryCount++
          if (windowRetryCount === maxWindowRetries) {
            throw new Error("Failed to create stable window and tabs after multiple attempts")
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
    }

    // Activate the first tab if any were created
    if (createdTabs.length > 0) {
      try {
        await chrome.tabs.update(createdTabs[0].id, { active: true })
      } catch (error) {
        console.error("Error activating first tab:", error)
        // Continue even if activating first tab fails
      }
    }

    console.log(`Session restoration complete: ${session.name}`)
    return { 
      success: true, 
      warnings: cookieResults.warnings,
      tabsCreated: createdTabs.length,
      totalTabs: tabsToRestore.length
    }
  } catch (error) {
    console.error("Session restoration failed:", error)
    return { success: false, error: error.message }
  }
}

// Function to get all sessions
async function getSessions() {
  try {
    const data = await chrome.storage.local.get("sessions")

    if (!data.sessions) {
      return { success: true, sessions: [] }
    }

    try {
      const decryptedSessions = await decryptSessionData(data.sessions)
      return {
        success: true,
        sessions: Array.isArray(decryptedSessions.data) ? decryptedSessions.data : [],
      }
    } catch (error) {
      console.error("Error decrypting sessions:", error)

      // Try to recover from corrupted data
      console.warn("Attempting to recover from corrupted session data")
      await chrome.storage.local.set({ sessions: { data: [], version: 1 } })

      return {
        success: true,
        sessions: [],
        warning: "Session data was corrupted and has been reset",
      }
    }
  } catch (error) {
    console.error("Error getting sessions:", error)
    return { success: false, error: error.message }
  }
}

// Function to delete a session
async function deleteSession(sessionId) {
  try {
    const { success, sessions, error } = await getSessions()

    if (!success) {
      throw new Error(error || "Failed to get sessions")
    }

    const updatedSessions = sessions.filter((session) => session.id !== sessionId)

    if (updatedSessions.length === sessions.length) {
      return {
        success: false,
        error: `Session with ID ${sessionId} not found`,
      }
    }

    const encryptedSessions = await encryptSessionData({ data: updatedSessions })
    await chrome.storage.local.set({ sessions: encryptedSessions })

    return {
      success: true,
      message: "Session deleted successfully",
    }
  } catch (error) {
    console.error("Error deleting session:", error)
    return { success: false, error: error.message }
  }
}

// Function to import a session
async function importSession(sessionData) {
  try {
    // Validate session data
    if (!sessionData || !Array.isArray(sessionData.tabs)) {
      throw new Error("Invalid session data format")
    }

    // Get existing sessions
    const { success, sessions, error } = await getSessions()

    if (!success) {
      throw new Error(error || "Failed to get sessions")
    }

    // Generate a unique ID for the new session
    const sessionId = crypto.randomUUID()

    // Create the new session object
    const newSession = {
      id: sessionId,
      name: sessionData.name || `Imported Session ${new Date().toLocaleString()}`,
      tabs: sessionData.tabs,
      createdAt: Date.now(),
    }

    // Add the new session to the list
    const updatedSessions = [...sessions, newSession]

    // Encrypt and save the updated sessions
    const encryptedSessions = await encryptSessionData({ data: updatedSessions })
    await chrome.storage.local.set({ sessions: encryptedSessions })

    return {
      success: true,
      sessionId,
      message: "Session imported successfully",
    }
  } catch (error) {
    console.error("Error importing session:", error)
    return { success: false, error: error.message }
  }
}

// Function to import a session in the provided format
async function importSessionInFormat(sessionData) {
  console.log("Importing session in provided format")

  try {
    // Validate session data
    if (!sessionData.url || !Array.isArray(sessionData.cookies)) {
      throw new Error("Invalid session data format")
    }

    const url = sessionData.url
    let hostname

    try {
      hostname = new URL(url).hostname
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`)
    }

    console.log(`Importing session for ${url} with ${sessionData.cookies.length} cookies`)

    // Import cookies
    const results = await importCookies(sessionData.cookies, hostname)

    // Convert to internal format and save to storage
    const internalSession = {
      id: crypto.randomUUID(),
      name: `Imported Session - ${hostname}`,
      tabs: [
        {
          id: 0,
          title: sessionData.title || hostname,
          url: sessionData.url,
          cookies: sessionData.cookies,
        },
      ],
      createdAt: Date.now(),
    }

    // Get existing sessions
    const { success, sessions, error } = await getSessions()

    if (!success) {
      throw new Error(error || "Failed to get sessions")
    }

    // Add the new session
    const updatedSessions = [...sessions, internalSession]

    // Encrypt and save
    const encryptedSessions = await encryptSessionData({ data: updatedSessions })
    await chrome.storage.local.set({ sessions: encryptedSessions })

    // Open the tab if requested
    if (sessionData.openTab) {
      try {
        // Get the current window
        const currentWindow = await chrome.windows.getCurrent()
        
        // Create the tab in the current window
        await chrome.tabs.create({ 
          windowId: currentWindow.id,
          url: url,
          active: true 
        })
        
        console.log(`Opened tab for ${url} in window ${currentWindow.id}`)
      } catch (error) {
        console.error(`Error opening tab for ${url}:`, error)
        // Continue even if opening the tab fails
      }
    }

    return {
      success: true,
      cookieResults: results,
      sessionId: internalSession.id,
    }
  } catch (error) {
    console.error("Error importing session:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Function to export a session in the provided format
async function exportSessionInFormat(sessionId) {
  console.log(`Exporting session ${sessionId} in provided format`)

  try {
    // Handle 'current' session ID
    if (sessionId === 'current') {
      // Get current window and tabs
      const currentWindow = await chrome.windows.getCurrent()
      const currentTabs = await chrome.tabs.query({ windowId: currentWindow.id })
      
      if (!currentTabs || currentTabs.length === 0) {
        throw new Error("No tabs found in current window")
      }

      // Get cookies for the current tab
      const currentTab = currentTabs[0]
      const hostname = new URL(currentTab.url).hostname
      const cookies = await exportCookies(hostname)

      const currentSession = {
        url: currentTab.url,
        title: currentTab.title,
        cookies: cookies.success ? cookies.cookies : [],
      }

      return {
        success: true,
        sessionData: currentSession,
      }
    }

    // Get the session for other session IDs
    const { success, sessions, error } = await getSessions()

    if (!success) {
      throw new Error(error || "Failed to get sessions")
    }

    const session = sessions.find((s) => s.id === sessionId)

    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`)
    }

    // Convert to external format
    if (!session.tabs || session.tabs.length === 0) {
      throw new Error("Session has no tabs to export")
    }

    const tab = session.tabs[0]
    const externalSession = {
      url: tab.url,
      title: tab.title,
      cookies: tab.cookies || [],
    }

    return {
      success: true,
      sessionData: externalSession,
    }
  } catch (error) {
    console.error("Error exporting session:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Initialize the extension
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    console.log("FISABytes Sessions extension installed")

    // Initialize encryption key
    await initializeEncryptionKey()

    // Set default settings
    await chrome.storage.local.set({
      settings: {
        autoSave: false,
        autoSaveInterval: 30,
        encryptData: true,
      },
    })
  } else if (details.reason === "update") {
    console.log(`FISABytes Sessions extension updated from ${details.previousVersion}`)

    // Ensure encryption key exists
    await initializeEncryptionKey()
  }
})

// Handle browser startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("Browser started, initializing FISABytes Sessions")

  // Initialize encryption key
  await initializeEncryptionKey()
})

async function handleMessage(message, sender) {
  try {
    // Check rate limit
    if (!checkRateLimit(sender)) {
      console.warn("Rate limit exceeded for sender:", sender.id)
      return { error: "Rate limit exceeded. Please try again later." }
    }

    // Handle different message types
    switch (message.type) {
      case 'GET_CSRF_TOKEN':
        const token = generateCSRFToken(sender)
        return { success: true, token }

      case 'GET_SESSIONS':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for GET_SESSIONS")
          return { error: "Invalid CSRF token" }
        }
        return await getSessions()

      case 'SAVE_SESSIONS':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for SAVE_SESSIONS")
          return { error: "Invalid CSRF token" }
        }
        
        if (!Array.isArray(message.sessions)) {
          return { error: "Invalid sessions data format" }
        }

        const encryptedSessions = await encryptSessionData({ data: message.sessions })
        await chrome.storage.local.set({ sessions: encryptedSessions })

        return {
          success: true,
          message: "Sessions saved successfully",
        }

      case 'DELETE_SESSION':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for DELETE_SESSION")
          return { error: "Invalid CSRF token" }
        }
        return await deleteSession(message.sessionId)

      case 'RESTORE_SESSION':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for RESTORE_SESSION")
          return { error: "Invalid CSRF token" }
        }
        return await restoreSession(message.sessionId)

      case 'IMPORT_SESSION':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for IMPORT_SESSION")
          return { error: "Invalid CSRF token" }
        }
        return await importSession(message.sessionData)

      case 'IMPORT_SESSION_IN_FORMAT':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for IMPORT_SESSION_IN_FORMAT")
          return { error: "Invalid CSRF token" }
        }
        return await importSessionInFormat(message.sessionData)

      case 'EXPORT_SESSION_IN_FORMAT':
        // Validate CSRF token for session operations
        if (!validateCSRFToken(message.csrfToken, sender)) {
          console.warn("Invalid CSRF token for EXPORT_SESSION_IN_FORMAT")
          return { error: "Invalid CSRF token" }
        }
        return await exportSessionInFormat(message.sessionId)

      default:
        return { error: 'Unknown message type' }
    }
  } catch (error) {
    console.error("Error handling message:", error)
    return { error: error.message }
  }
}
