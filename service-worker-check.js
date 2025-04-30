const puppeteer = require('puppeteer');
const path = require('path');

// Extension ID - should match the one in run-e2e-tests.js
const EXTENSION_ID = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkServiceWorker() {
  console.log('Starting service worker check...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${path.resolve(__dirname, 'dist')}`,
      `--load-extension=${path.resolve(__dirname, 'dist')}`,
      '--disable-features=site-per-process',
      '--allow-file-access-from-files'
    ],
    timeout: 30000
  });

  try {
    const page = await browser.newPage();
    let serviceWorkerWarningDetected = false;
    let serviceWorkerWarningCount = 0;
    const maxWarningAttempts = 3;

    // Listen for console messages
    page.on('console', async (msg) => {
      const message = msg.text();
      console.log(`Console: ${message}`);

      if (message.includes('Service worker not found after multiple attempts')) {
        serviceWorkerWarningDetected = true;
        serviceWorkerWarningCount++;
        console.warn(`Service worker warning detected (${serviceWorkerWarningCount}/${maxWarningAttempts})`);
        
        if (serviceWorkerWarningCount >= maxWarningAttempts) {
          console.warn('Maximum service worker warning attempts reached. Taking action...');
          // You can add custom handling here, such as:
          // - Reloading the extension
          // - Restarting the browser
          // - Logging to a monitoring service
        }
      }
    });

    // Navigate to the extension popup
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`, {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    // Wait for a short period to catch any delayed console messages
    await wait(2000);

    // Check if we need to take any action based on the warnings
    if (serviceWorkerWarningDetected) {
      console.log('Service worker warnings were detected during the check');
      // Add any additional handling here
    } else {
      console.log('No service worker warnings detected');
    }

  } catch (error) {
    console.error('Error during service worker check:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Export the function for use in other scripts
module.exports = { checkServiceWorker };

// Run the check if this script is executed directly
if (require.main === module) {
  checkServiceWorker()
    .then(() => console.log('Service worker check completed'))
    .catch(error => {
      console.error('Service worker check failed:', error);
      process.exit(1);
    });
} 