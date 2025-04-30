// Settings page for SessionBuddy

document.addEventListener("DOMContentLoaded", () => {
  // Declare chrome if it's not already defined (e.g., in a testing environment)
  if (typeof chrome === "undefined") {
    console.warn("Chrome API not available.  This script is intended to run within a Chrome extension.")
    // Provide a mock implementation for testing purposes.  This will prevent errors, but the extension won't actually work.
    chrome = {
      storage: {
        local: {
          get: (keys) => {
            return new Promise((resolve) => {
              const mockData = { settings: { autoSave: false, autoSaveInterval: 30, encryptData: true } }
              resolve(mockData)
            })
          },
          set: (items) => {
            return new Promise((resolve) => {
              resolve()
            })
          },
        },
      },
      runtime: {
        sendMessage: (message) => {
          return new Promise((resolve) => {
            console.log("Mock Chrome API: sendMessage", message)
            resolve({ success: true })
          })
        },
      },
    }
  }

  // Get UI elements
  const autoSaveCheckbox = document.getElementById("autoSave")
  const autoSaveIntervalInput = document.getElementById("autoSaveInterval")
  const encryptDataCheckbox = document.getElementById("encryptData")
  const exportDataButton = document.getElementById("exportData")
  const importDataButton = document.getElementById("importData")
  const clearDataButton = document.getElementById("clearData")
  const statusElement = document.getElementById("status")

  // Load current settings
  loadSettings()

  // Add event listeners
  autoSaveCheckbox?.addEventListener("change", saveSettings)
  autoSaveIntervalInput?.addEventListener("change", saveSettings)
  encryptDataCheckbox?.addEventListener("change", saveSettings)
  exportDataButton?.addEventListener("click", exportData)
  importDataButton?.addEventListener("click", importData)
  clearDataButton?.addEventListener("click", clearData)

  // Function to load settings
  async function loadSettings() {
    try {
      const storage = await chrome.storage.local.get("settings")
      const settings = storage.settings || {
        autoSave: false,
        autoSaveInterval: 30,
        encryptData: true,
      }

      // Update UI with loaded settings
      if (autoSaveCheckbox) autoSaveCheckbox.checked = settings.autoSave
      if (autoSaveIntervalInput) autoSaveIntervalInput.value = settings.autoSaveInterval
      if (encryptDataCheckbox) encryptDataCheckbox.checked = settings.encryptData
    } catch (error) {
      showStatus("Error loading settings: " + error.message, "error")
    }
  }

  // Function to save settings
  async function saveSettings() {
    try {
      if (!autoSaveCheckbox || !autoSaveIntervalInput || !encryptDataCheckbox) {
        throw new Error("UI elements not found")
      }

      const settings = {
        autoSave: autoSaveCheckbox.checked,
        autoSaveInterval: Number.parseInt(autoSaveIntervalInput.value, 10) || 30,
        encryptData: encryptDataCheckbox.checked,
      }

      // Validate settings
      if (settings.autoSaveInterval < 5) {
        settings.autoSaveInterval = 5
        autoSaveIntervalInput.value = "5"
      } else if (settings.autoSaveInterval > 120) {
        settings.autoSaveInterval = 120
        autoSaveIntervalInput.value = "120"
      }

      await chrome.storage.local.set({ settings })
      showStatus("Settings saved successfully", "success")

      // Update auto-save alarm if needed
      if (settings.autoSave) {
        await chrome.runtime.sendMessage({
          type: "UPDATE_AUTO_SAVE",
          interval: settings.autoSaveInterval,
        })
      } else {
        await chrome.runtime.sendMessage({ type: "DISABLE_AUTO_SAVE" })
      }
    } catch (error) {
      showStatus("Error saving settings: " + error.message, "error")
    }
  }

  // Function to export data
  async function exportData() {
    try {
      showStatus("Preparing data for export...", "info")

      const response = await chrome.runtime.sendMessage({ type: "GET_SESSIONS" })

      if (!response.success) {
        throw new Error(response.error || "Failed to get sessions")
      }

      const sessions = response.sessions || []

      // Create a data URL for download
      const dataStr = JSON.stringify(sessions, null, 2)
      const dataBlob = new Blob([dataStr], { type: "application/json" })
      const dataUrl = URL.createObjectURL(dataBlob)

      // Create download link
      const exportFileDefaultName = "sessionbuddy_export_" + new Date().toISOString().slice(0, 10) + ".json"
      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUrl)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.style.display = "none"
      document.body.appendChild(linkElement)
      linkElement.click()
      document.body.removeChild(linkElement)

      // Clean up the URL object
      setTimeout(() => {
        URL.revokeObjectURL(dataUrl)
      }, 100)

      showStatus(`Data exported successfully (${sessions.length} sessions)`, "success")
    } catch (error) {
      console.error("Error exporting data:", error)
      showStatus("Error exporting data: " + error.message, "error")
    }
  }

  // Function to import data
  function importData() {
    // Create file input element
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = ".json"

    // Handle file selection
    fileInput.addEventListener("change", async (event) => {
      try {
        const file = event.target.files[0]
        if (!file) return

        showStatus("Reading import file...", "info")

        // First get a CSRF token
        const tokenResponse = await chrome.runtime.sendMessage({ type: "GET_CSRF_TOKEN" })
        if (!tokenResponse.success) {
          throw new Error("Failed to get CSRF token")
        }
        const csrfToken = tokenResponse.token

        const reader = new FileReader()
        reader.onload = async (e) => {
          try {
            const importedData = JSON.parse(e.target.result)

            // Validate imported data
            if (!Array.isArray(importedData)) {
              throw new Error("Invalid data format: Expected an array of sessions")
            }

            // Validate each session
            const validSessions = []
            const invalidSessions = []

            for (const session of importedData) {
              if (!session.id || !session.name || !Array.isArray(session.tabs)) {
                invalidSessions.push(session)
                continue
              }

              // Ensure each tab has required fields
              const validTabs = session.tabs.filter((tab) => tab && tab.url)

              if (validTabs.length === 0) {
                invalidSessions.push(session)
                continue
              }

              // Create a valid session object
              validSessions.push({
                id: session.id,
                name: session.name,
                tabs: validTabs,
                createdAt: session.createdAt || Date.now(),
              })
            }

            if (validSessions.length === 0) {
              throw new Error("No valid sessions found in the import file")
            }

            showStatus(`Importing ${validSessions.length} sessions...`, "info")

            // Get current sessions
            const response = await chrome.runtime.sendMessage({ 
              type: "GET_SESSIONS",
              csrfToken 
            })

            if (!response.success) {
              throw new Error(response.error || "Failed to get current sessions")
            }

            const currentSessions = response.sessions || []

            // Check for duplicate IDs
            const currentIds = new Set(currentSessions.map((s) => s.id))
            const duplicates = validSessions.filter((s) => currentIds.has(s.id))

            if (duplicates.length > 0) {
              // Generate new IDs for duplicates
              for (const session of duplicates) {
                session.id = crypto.randomUUID()
                session.name = `${session.name} (Imported)`
              }
            }

            // Merge sessions
            const mergedSessions = [...currentSessions, ...validSessions]

            // Save merged sessions
            const saveResponse = await chrome.runtime.sendMessage({
              type: "SAVE_SESSIONS",
              sessions: mergedSessions,
              csrfToken
            })

            if (!saveResponse.success) {
              throw new Error(saveResponse.error || "Failed to save imported sessions")
            }

            let statusMessage = `Successfully imported ${validSessions.length} sessions`
            if (invalidSessions.length > 0) {
              statusMessage += ` (${invalidSessions.length} invalid sessions were skipped)`
            }

            showStatus(statusMessage, "success")
          } catch (error) {
            console.error("Error parsing imported data:", error)
            showStatus("Error parsing imported data: " + error.message, "error")
          }
        }

        reader.readAsText(file)
      } catch (error) {
        console.error("Error importing data:", error)
        showStatus("Error importing data: " + error.message, "error")
      }
    })

    // Trigger file selection dialog
    fileInput.click()
  }

  // Function to clear data
  async function clearData() {
    if (confirm("Are you sure you want to clear all sessions? This action cannot be undone.")) {
      try {
        showStatus("Clearing all sessions...", "info")

        const response = await chrome.runtime.sendMessage({
          type: "SAVE_SESSIONS",
          sessions: [],
        })

        if (!response.success) {
          throw new Error(response.error || "Failed to clear sessions")
        }

        showStatus("All sessions cleared successfully", "success")
      } catch (error) {
        console.error("Error clearing data:", error)
        showStatus("Error clearing data: " + error.message, "error")
      }
    }
  }

  // Function to show status messages
  function showStatus(message, type) {
    if (!statusElement) return

    statusElement.textContent = message
    statusElement.className = "status " + type

    // Hide status after 5 seconds for success messages
    if (type === "success") {
      setTimeout(() => {
        statusElement.className = "status"
      }, 5000)
    }
  }
})
