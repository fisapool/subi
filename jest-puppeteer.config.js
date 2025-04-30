import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.resolve(__dirname, 'dist');
// Create a dedicated user data directory for E2E testing
const userDataDir = path.join(os.tmpdir(), 'chrome-e2e-testing');

/** @type {import('jest-environment-puppeteer').JestPuppeteerConfig} */
export default {
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