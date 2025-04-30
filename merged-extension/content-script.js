// Content script for SessionBuddy
// This script runs in the context of web pages

// Store the page info
const pageInfo = {
  title: document.title,
  url: window.location.href,
  domain: window.location.hostname,
  favicon: null,
}

// Try to find the favicon
function getFavicon() {
  // Look for favicon in link tags
  const links = document.querySelectorAll('link[rel*="icon"]')
  if (links.length > 0) {
    // Sort by size preference (larger is better)
    const icons = Array.from(links)
      .map((link) => {
        const sizes = link.getAttribute("sizes")
        const size = sizes ? Number.parseInt(sizes.split("x")[0]) : 0
        return { href: link.href, size }
      })
      .sort((a, b) => b.size - a.size)

    return icons[0]?.href || null
  }

  // Default favicon location
  const defaultFavicon = `${window.location.protocol}//${window.location.host}/favicon.ico`

  // Check if default favicon exists
  return defaultFavicon
}

// Get the favicon when the page loads
window.addEventListener("load", () => {
  pageInfo.favicon = getFavicon()
  pageInfo.title = document.title // Update title in case it changed during load

  // Send the updated page info to the extension
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime.sendMessage({
      action: "pageLoaded",
      data: pageInfo,
    })
  }
})

// Listen for messages from the extension
if (typeof chrome !== "undefined" && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getPageInfo") {
      // Update the page info before sending
      pageInfo.title = document.title
      pageInfo.url = window.location.href
      pageInfo.domain = window.location.hostname
      pageInfo.favicon = pageInfo.favicon || getFavicon()

      // Return information about the current page
      sendResponse({
        success: true,
        data: pageInfo,
      })
    } else if (message.action === "getCookies") {
      // This is just for the extension to know what domain to query
      // The actual cookie access happens in the background script
      sendResponse({
        success: true,
        domain: window.location.hostname,
      })
    }

    return true // Keep the message channel open for async responses
  })
}

// Handle errors gracefully
window.addEventListener("error", (event) => {
  console.error("Content script error:", event.error)

  // Report errors to the extension
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime
      .sendMessage({
        action: "contentScriptError",
        data: {
          message: event.error?.message || "Unknown error",
          url: pageInfo.url,
          lineNumber: event.lineno,
          columnNumber: event.colno,
        },
      })
      .catch((err) => {
        // Suppress errors from disconnected port
        if (!err.message.includes("disconnected port")) {
          console.error("Failed to report error:", err)
        }
      })
  }
})

// Detect page visibility changes
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Page became visible, notify the extension
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime
        .sendMessage({
          action: "pageVisible",
          data: pageInfo,
        })
        .catch(() => {
          // Ignore errors from disconnected port
        })
    }
  }
})
