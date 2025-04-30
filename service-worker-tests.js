const puppeteer = require('puppeteer');
const path = require('path');

// Extension ID - should match the one in run-e2e-tests.js
const EXTENSION_ID = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testServiceWorkerFunctionality() {
  console.log('Starting comprehensive service worker tests...');
  
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
    let testResults = {
      registration: false,
      activation: false,
      fetchEvents: false,
      caching: false,
      errors: []
    };

    // Listen for console messages to track service worker events
    page.on('console', async (msg) => {
      const message = msg.text();
      console.log(`Console: ${message}`);

      // Track service worker lifecycle events
      if (message.includes('Service Worker registered successfully')) {
        testResults.registration = true;
      }
      if (message.includes('Service Worker activated')) {
        testResults.activation = true;
      }
      if (message.includes('Fetch event handled')) {
        testResults.fetchEvents = true;
      }
      if (message.includes('Resource cached successfully')) {
        testResults.caching = true;
      }
      if (message.includes('Error:')) {
        testResults.errors.push(message);
      }
    });

    // Test 1: Service Worker Registration
    console.log('\nTest 1: Service Worker Registration');
    await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`, {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    // Wait for service worker registration
    await wait(2000);

    // Test 2: Check Service Worker Status
    console.log('\nTest 2: Service Worker Status');
    const swRegistration = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        active: !!registration?.active,
        state: registration?.active?.state
      };
    });

    if (swRegistration.active) {
      console.log('✓ Service worker is active');
      console.log(`Service worker state: ${swRegistration.state}`);
    } else {
      console.warn('⚠ Service worker is not active');
      testResults.errors.push('Service worker not active');
    }

    // Test 3: Test Fetch Events
    console.log('\nTest 3: Fetch Events');
    await page.reload({ waitUntil: 'networkidle2' });
    await wait(1000);

    // Test 4: Cache Storage
    console.log('\nTest 4: Cache Storage');
    const cacheContents = await page.evaluate(async () => {
      const cache = await caches.open('extension-cache');
      const keys = await cache.keys();
      return keys.map(request => request.url);
    });

    if (cacheContents.length > 0) {
      console.log('✓ Cache storage is working');
      console.log('Cached resources:', cacheContents);
      testResults.caching = true;
    } else {
      console.warn('⚠ No cached resources found');
    }

    // Print test summary
    console.log('\nTest Summary:');
    console.log('-------------');
    console.log(`Registration: ${testResults.registration ? '✓' : '⚠'}`);
    console.log(`Activation: ${testResults.activation ? '✓' : '⚠'}`);
    console.log(`Fetch Events: ${testResults.fetchEvents ? '✓' : '⚠'}`);
    console.log(`Caching: ${testResults.caching ? '✓' : '⚠'}`);
    
    if (testResults.errors.length > 0) {
      console.log('\nErrors encountered:');
      testResults.errors.forEach(error => console.log(`- ${error}`));
    }

    return testResults;

  } catch (error) {
    console.error('Error during service worker tests:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Export the function for use in other scripts
module.exports = { testServiceWorkerFunctionality };

// Run the tests if this script is executed directly
if (require.main === module) {
  testServiceWorkerFunctionality()
    .then(results => {
      console.log('Service worker tests completed');
      if (results.errors.length > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Service worker tests failed:', error);
      process.exit(1);
    });
} 