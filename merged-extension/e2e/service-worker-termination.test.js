const { expect, describe, test, beforeAll, afterAll } = require('@jest/globals');
const puppeteer = require('puppeteer');

describe('Service Worker Termination Tests', () => {
  let browser;
  let extensionId;
  let serviceWorker;

  beforeAll(async () => {
    // Launch browser with extension
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${process.env.EXTENSION_PATH || './dist'}`,
        `--load-extension=${process.env.EXTENSION_PATH || './dist'}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--disable-gpu',
      ],
    });

    // Wait for the service worker to be available
    const serviceWorkerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker'
    );
    serviceWorker = await serviceWorkerTarget.worker();
    extensionId = serviceWorkerTarget.url().split('/')[2];
  }, 30000);

  /**
   * Stops the service worker associated with a given extension ID.
   * @param {string} extensionId Extension ID of worker to terminate
   */
  async function stopServiceWorker(extensionId) {
    const host = `chrome-extension://${extensionId}`;
    const target = await browser.waitForTarget((t) => {
      return t.type() === 'service_worker' && t.url().startsWith(host);
    });
    const worker = await target.worker();
    await worker.close();
  }

  test('should handle service worker termination and recovery', async () => {
    // Create a test page
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanels/welcome-sp.html`);

    // First, test normal operation
    const initialResponse = await serviceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.set({ 'test-data': 'initial' }, () => {
          chrome.storage.local.get(['test-data'], result => {
            resolve(result['test-data']);
          });
        });
      });
    });
    expect(initialResponse).toBe('initial');

    // Terminate the service worker
    await stopServiceWorker(extensionId);

    // Wait for the service worker to restart
    const newServiceWorkerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().startsWith(`chrome-extension://${extensionId}`)
    );
    const newServiceWorker = await newServiceWorkerTarget.worker();

    // Test that the service worker can still access persisted data
    const recoveredResponse = await newServiceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['test-data'], result => {
          resolve(result['test-data']);
        });
      });
    });
    expect(recoveredResponse).toBe('initial');

    // Test that the service worker can still handle messages
    const messageResponse = await newServiceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ action: 'switchPanel', panelPath: 'sidepanels/main-sp.html' }, response => {
          resolve(response);
        });
      });
    });
    expect(messageResponse).toEqual({ success: true });

    await page.close();
  }, 30000);

  test('should handle session data persistence after termination', async () => {
    // Create a test session
    const testSession = {
      name: 'Test Session',
      tabs: [{ url: 'https://example.com', title: 'Example Domain' }]
    };

    // Save the session
    await serviceWorker.evaluate((session) => {
      return new Promise(resolve => {
        chrome.storage.local.set({ 'test-session': session }, () => {
          resolve(true);
        });
      });
    }, testSession);

    // Terminate the service worker
    await stopServiceWorker(extensionId);

    // Wait for the service worker to restart
    const newServiceWorkerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker' && target.url().startsWith(`chrome-extension://${extensionId}`)
    );
    const newServiceWorker = await newServiceWorkerTarget.worker();

    // Verify the session data persists
    const recoveredSession = await newServiceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['test-session'], result => {
          resolve(result['test-session']);
        });
      });
    });

    expect(recoveredSession).toBeDefined();
    expect(recoveredSession.name).toBe('Test Session');
    expect(recoveredSession.tabs).toHaveLength(1);
    expect(recoveredSession.tabs[0].url).toBe('https://example.com');
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    if (serviceWorker) {
      await serviceWorker.evaluate(() => {
        return new Promise(resolve => {
          chrome.storage.local.remove(['test-data', 'test-session'], () => {
            resolve();
          });
        });
      });
    }
    // Close the browser
    if (browser) {
      await browser.close();
    }
  });
}); 