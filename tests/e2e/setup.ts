import { Browser, Page, Target } from 'puppeteer';
import puppeteer from 'puppeteer';
import path from 'path';
import { beforeAll, afterAll } from 'vitest';

declare global {
  var browser: Browser;
  var extensionId: string;
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): Promise<R>;
      toHaveText(text: string): Promise<R>;
    }
  }
}

export const EXTENSION_PATH = path.join(__dirname, '../../dist');
// Get extension ID from environment if available (set by our diagnostic script)
export const EXTENSION_ID = process.env.EXTENSION_ID || 'nodbhmlnbfnmnokclpbeghhakpocbgbe';

let browser: Browser;

// Initialize the browser before all tests
beforeAll(async () => {
  console.log('Setting up browser for e2e tests with extension ID:', EXTENSION_ID);
  
  browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--disable-features=site-per-process',
      '--allow-file-access-from-files',
      '--enable-automation'
    ],
    timeout: 60000
  });
  
  console.log('Browser launched, waiting for extension...');
  
  // List all targets for debugging
  const targets = await browser.targets();
  console.log(`Found ${targets.length} browser targets`);
  targets.forEach(target => {
    console.log(`Target: ${target.type()} - ${target.url()}`);
  });
  
  // Make browser and extensionId available globally
  global.browser = browser;
  global.extensionId = EXTENSION_ID;
  
  console.log('Browser and extension setup complete');
}, 60000);

// Clean up after all tests
afterAll(async () => {
  if (browser) {
    await browser.close();
    console.log('Browser closed after tests');
  }
});

export async function waitForServiceWorker(browser: Browser, maxAttempts = 20): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Attempt ${i + 1}/${maxAttempts} to find service worker...`);
    const targets = await browser.targets();
    const serviceWorkerTarget = targets.find(target => {
      const type = target.type();
      const url = target.url();
      return (type === 'service_worker' || type.includes('worker')) && 
             url.startsWith('chrome-extension://') && url.includes(EXTENSION_ID);
    });
    
    if (serviceWorkerTarget) {
      console.log('Found service worker:', serviceWorkerTarget.url());
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.warn('Warning: Service worker not found after multiple attempts, continuing anyway');
}

export async function getExtensionPage(browser: Browser, pageName: string): Promise<Page> {
  // First ensure service worker is ready (but don't fail if not found)
  try {
    await waitForServiceWorker(browser);
  } catch (e: any) {
    console.warn('Warning:', e.message);
  }
  
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${EXTENSION_ID}/${pageName}`, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  return page;
}

export async function getExtensionPopup(browser: Browser): Promise<Page> {
  return getExtensionPage(browser, 'popup.html');
}

export async function getExtensionBackgroundPage(browser: Browser): Promise<Page> {
  // First wait for the extension to be ready (but don't fail if not found)
  try {
    await waitForServiceWorker(browser);
  } catch (e: any) {
    console.warn('Warning:', e.message);
  }
  
  const targets = await browser.targets();
  console.log('Looking for background page among targets:');
  targets.forEach(target => {
    console.log(`- Type: ${target.type()}, URL: ${target.url()}`);
  });
  
  const backgroundTarget = targets.find(
    (target) => {
      const url = target.url();
      return (
        (target.type() === 'background_page' || target.type() === 'service_worker') && 
        url.includes(EXTENSION_ID)
      );
    }
  );
  
  if (!backgroundTarget) {
    throw new Error('Background page not found');
  }
  
  const page = await backgroundTarget.page();
  if (!page) {
    throw new Error('Failed to get background page');
  }
  
  return page;
}

// Custom matchers
expect.extend({
  async toBeVisible(received: any) {
    const isVisible = await received.isVisible();
    return {
      message: () => `expected element to ${isVisible ? 'not be' : 'be'} visible`,
      pass: isVisible,
    };
  },
  async toHaveText(received: any, text: string) {
    const elementText = await received.evaluate((el: Element) => el.textContent);
    return {
      message: () => `expected element to have text "${text}" but got "${elementText}"`,
      pass: elementText?.includes(text),
    };
  },
}); 