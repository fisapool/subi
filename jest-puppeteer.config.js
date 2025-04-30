const path = require('path');
const os = require('os');

const distPath = path.resolve(__dirname, 'dist');
// Create a dedicated user data directory for E2E testing
const userDataDir = path.join(os.tmpdir(), 'chrome-e2e-testing');

/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
module.exports = {
  launch: {
    headless: false, // Run in non-headless mode to debug
    userDataDir, // Use dedicated user data directory
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--disable-extensions-except=${distPath}`,
      `--load-extension=${distPath}`,
      '--allow-file-access-from-files',
      '--enable-automation',
      '--enable-logging',
      '--v=1',
      '--profile-directory=e2e' // Use dedicated E2E profile
    ],
    devtools: true, // Open DevTools for debugging
    defaultViewport: null
  },
  browserContext: 'default',
  exitOnPageError: false,
  // Increase timeouts for service worker operations
  timeout: 30000,
  // Enable service worker debugging
  dumpio: true
}; 