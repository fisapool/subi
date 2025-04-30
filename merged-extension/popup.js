// Popup script for Session Buddy

// Global state
let csrfToken = null
let currentSessions = []
const isLoading = false
let statusMessage = "Ready"

// DOM elements
let sessionListElement
let statusElement
let newSessionButton
let settingsButton
let warningDialog
let warningDialogContent
let closeWarningDialogButton
let cancelImportButton
let proceedImportButton
let overlay

// Initialize the popup
export async function initializePopup() {
  // Get DOM elements
  sessionListElement = document.getElementById("sessionList")
  statusElement = document.getElementById("status")
  newSessionButton = document.getElementById("newSession")
  settingsButton = document.getElementById("settings")
  warningDialog = document.getElementById("warningDialog")
  warningDialogContent = document.getElementById("warningDialogContent")
  closeWarningDialogButton = document.getElementById("closeWarningDialog")
  cancelImportButton = document.getElementById("cancelImport")
  proceedImportButton = document.getElementById("proceedImport")
  overlay = document.getElementById("overlay")

  // Set initial loading state
  updateStatus("Initializing...", true)

  try {
    // Get CSRF token
    await getCsrfToken()
    
    // Load sessions
    await loadSessions()
    
    // Add event listeners
    setupEventListeners()
    
    // Update status
    updateStatus("Ready")
  } catch (error) {
    console.error("Failed to initialize popup:", error)
    updateStatus("Failed to initialize", false, true)
  }
}

// Send message to service worker and wait for response
export async function sendMessageToServiceWorker(message) {
  try {
    const response = await chrome.runtime.sendMessage(message)
    if (response.error) {
      throw new Error(response.error)
    }
    return response
  } catch (error) {
    console.error("Failed to send message to service worker:", error)
    throw error
  }
}

// Get CSRF token from service worker
export async function getCsrfToken() {
  try {
    const response = await sendMessageToServiceWorker({ type: 'getCsrfToken' })
    if (response && response.token) {
      csrfToken = response.token
      return true
    }
    throw new Error('No CSRF token received')
  } catch (error) {
    console.error("Failed to get CSRF token:", error)
    throw error
  }
}

// Load sessions from service worker
export async function loadSessions() {
  try {
    const response = await sendMessageToServiceWorker({ 
      type: 'getSessions',
      token: csrfToken 
    })
    
    if (response && response.sessions) {
      currentSessions = response.sessions
      renderSessionList()
      return true
    }
    throw new Error('No sessions received')
  } catch (error) {
    console.error("Failed to load sessions:", error)
    throw error
  }
}

// Render session list
export function renderSessionList() {
  if (!sessionListElement) return
  
  if (currentSessions.length === 0) {
    sessionListElement.innerHTML = "<p>No saved sessions</p>"
    return
  }

  const sessionItems = currentSessions.map(session => {
    const sessionDate = new Date(session.timestamp).toLocaleString()
    return `
      <div class="session-item" data-id="${session.id}">
        <div class="session-info">
          <h3>${escapeHtml(session.name)}</h3>
          <p>${session.tabs.length} tabs • ${sessionDate}</p>
        </div>
        <div class="session-actions">
          <button class="restore-btn" data-id="${session.id}">Restore</button>
          <button class="delete-btn" data-id="${session.id}">Delete</button>
        </div>
      </div>
    `
  }).join("")

  sessionListElement.innerHTML = sessionItems
}

// Setup event listeners
export function setupEventListeners() {
  if (newSessionButton) {
    newSessionButton.addEventListener("click", createNewSession)
  }
  
  if (settingsButton) {
    settingsButton.addEventListener("click", openSettings)
  }
  
  if (sessionListElement) {
    sessionListElement.addEventListener("click", (event) => {
      const target = event.target
      
      if (target.classList.contains("restore-btn")) {
        const sessionId = target.getAttribute("data-id")
        restoreSession(sessionId)
      }
      
      if (target.classList.contains("delete-btn")) {
        const sessionId = target.getAttribute("data-id")
        deleteSession(sessionId)
      }
    })
  }
  
  if (closeWarningDialogButton) {
    closeWarningDialogButton.addEventListener("click", closeWarningDialog)
  }
  
  if (cancelImportButton) {
    cancelImportButton.addEventListener("click", closeWarningDialog)
  }
}

// Create new session
export async function createNewSession() {
  try {
    updateStatus("Creating new session...", true)
    
    const sessionName = `Session ${new Date().toLocaleString()}`
    const windows = await chrome.windows.getAll({ populate: true })
    
    const response = await sendMessageToServiceWorker({
      type: 'saveSession',
      token: csrfToken,
      name: sessionName,
      data: {
        windows: windows
      }
    })
    
    if (response && response.success) {
      await loadSessions()
      updateStatus("Session created successfully")
    } else {
      throw new Error('Failed to create session')
    }
  } catch (error) {
    console.error("Failed to create session:", error)
    updateStatus("Failed to create session", false, true)
  }
}

// Restore session
export async function restoreSession(sessionId) {
  try {
    updateStatus("Restoring session...", true)
    
    const response = await chrome.runtime.sendMessage({ 
      type: "RESTORE_SESSION",
      sessionId,
      csrfToken 
    })

    if (!response.success) {
      throw new Error(response.error || "Failed to restore session")
    }

    updateStatus("Session restored successfully", false)
  } catch (error) {
    console.error("Error restoring session:", error)
    updateStatus(`Error: ${error.message}`, false, true)
  }
}

// Delete session
export async function deleteSession(sessionId) {
  try {
    updateStatus("Deleting session...", true)
    
    const response = await chrome.runtime.sendMessage({ 
      type: "DELETE_SESSION",
      sessionId,
      csrfToken 
    })

    if (!response.success) {
      throw new Error(response.error || "Failed to delete session")
    }

    // Refresh session list
    await loadSessions()
    
    updateStatus("Session deleted successfully", false)
  } catch (error) {
    console.error("Error deleting session:", error)
    updateStatus(`Error: ${error.message}`, false, true)
  }
}

// Open settings
export function openSettings() {
  chrome.runtime.openOptionsPage()
}

// Show warning dialog
export function showWarningDialog(warnings, onProceed) {
  if (!warningDialog || !warningDialogContent || !proceedImportButton) return
  
  warningDialogContent.innerHTML = warnings.map(warning => 
    `<p class="warning">${escapeHtml(warning)}</p>`
  ).join("")
  
  proceedImportButton.onclick = () => {
    closeWarningDialog()
    if (onProceed) onProceed()
  }
  
  warningDialog.classList.remove("hidden")
  if (overlay) overlay.classList.remove("hidden")
}

// Close warning dialog
export function closeWarningDialog() {
  if (!warningDialog || !overlay) return
  
  warningDialog.classList.add("hidden")
  overlay.classList.add("hidden")
}

// Update status
export function updateStatus(message, isLoading = false, isWarning = false) {
  if (!statusElement) return
  
  statusMessage = message
  statusElement.textContent = message
  
  if (isLoading) {
    statusElement.classList.add("loading")
  } else {
    statusElement.classList.remove("loading")
  }
  
  if (isWarning) {
    statusElement.classList.add("warning")
  } else {
    statusElement.classList.remove("warning")
  }
}

// Escape HTML
export function escapeHtml(unsafe) {
  if (unsafe === undefined || unsafe === null) {
    return '';
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Settings management
export function updateSettingsDisplay(settings) {
  const autoSaveElement = document.getElementById("autoSave")
  const saveIntervalElement = document.getElementById("saveInterval")
  
  if (autoSaveElement) {
    autoSaveElement.checked = settings.autoSave
  }
  
  if (saveIntervalElement) {
    saveIntervalElement.value = settings.saveInterval
  }
}

export async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings)
    return true
  } catch (error) {
    console.error("Failed to save settings:", error)
    throw error
  }
}

// Session management
function displaySessionList(sessions) {
  const sessionListElement = document.getElementById("sessionList")
  
  if (!sessionListElement) return
  
  if (Object.keys(sessions).length === 0) {
    sessionListElement.innerHTML = "<p>No saved sessions</p>"
    return
  }

  const sessionItems = Object.entries(sessions).map(([id, session]) => {
    const sessionDate = new Date(session.timestamp || Date.now()).toLocaleString()
    return `
      <div class="session-item" data-id="${id}">
        <div class="session-info">
          <h3>${escapeHtml(session.name || "Unnamed Session")}</h3>
          <p>${session.tabs ? session.tabs.length : 0} tabs • ${sessionDate}</p>
        </div>
        <div class="session-actions">
          <button class="restore-btn" data-id="${id}">Restore</button>
          <button class="delete-btn" data-id="${id}">Delete</button>
        </div>
      </div>
    `
  }).join("")

  sessionListElement.innerHTML = sessionItems
}

async function handleSessionSelection(sessionId) {
  const session = await chrome.runtime.sendMessage({ 
    type: "GET_SESSION", 
    sessionId,
    csrfToken 
  })
  
  if (session.success) {
    restoreSession(sessionId)
  } else {
    updateStatus(`Error: ${session.error || "Failed to get session"}`, false, true)
  }
}

// UI updates
function showLoading(isLoading) {
  const loadingElement = document.getElementById("loading")
  
  if (!loadingElement) return
  
  if (isLoading) {
    loadingElement.classList.remove("hidden")
  } else {
    loadingElement.classList.add("hidden")
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup)
