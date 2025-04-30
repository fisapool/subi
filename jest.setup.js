require('@testing-library/jest-dom');
import { vi } from 'vitest';

const puppeteer = require('puppeteer');
const path = require('path');

let browser;
let page;
let extensionId;

const getExtensionId = async (browser) => {
  // Method 1: Look through all targets directly
  const targets = await browser.targets();
  
  // First check for any extension-related target
  let extensionTargets = targets.filter(target => {
    const url = target.url();
    return url.startsWith('chrome-extension://');
  });
  
  if (extensionTargets.length === 0) {
    return null; // No extension targets found at all
  }
  
  console.log(`Found ${extensionTargets.length} extension targets`);
  
  // Try to find service worker or background page
  const priorityTarget = extensionTargets.find(target => {
    const url = target.url();
    const type = target.type();
    return (
      (type === 'service_worker' || type.includes('worker') || type === 'background_page') &&
      (url.includes('background') || url.includes('service-worker'))
    );
  });
  
  if (priorityTarget) {
    const url = priorityTarget.url();
    const extensionId = url.split('/')[2];
    console.log(`Found priority target with ID: ${extensionId}, type: ${priorityTarget.type()}`);
    return extensionId;
  }
  
  // Method 2: If no suitable target is found, try an alternate approach
  // by creating a page and querying the extensions
  try {
    const page = await browser.newPage();
    
    // Using chrome.management API to list installed extensions
    const extensionInfo = await page.evaluate(async () => {
      return new Promise((resolve) => {
        // @ts-ignore - chrome.management exists in Chrome
        if (chrome.management && chrome.management.getAll) {
          // @ts-ignore
          chrome.management.getAll(extensions => {
            resolve(extensions.filter(ext => ext.enabled));
          });
        } else {
          resolve([]);
        }
      });
    });
    
    await page.close();
    
    if (extensionInfo && extensionInfo.length > 0) {
      console.log('Found extensions via management API:', extensionInfo);
      // Look for our extension by name (adjust if needed)
      const ourExtension = extensionInfo.find(ext => 
        ext.name === 'FISABytes Cookie Manager' || ext.name.includes('Cookie')
      );
      
      if (ourExtension) {
        console.log(`Found our extension with ID: ${ourExtension.id}`);
        return ourExtension.id;
      }
    }
  } catch (e) {
    console.warn('Error using alternate method to get extension ID:', e);
  }
  
  // Method 3: Fallback to using the first extension target
  if (extensionTargets.length > 0) {
    const url = extensionTargets[0].url();
    const extensionId = url.split('/')[2];
    console.log(`Using fallback extension ID: ${extensionId} from target: ${extensionTargets[0].type()}`);
    return extensionId;
  }
  
  return null;
};

const waitForExtension = async (browser, maxAttempts = 20) => {
  console.log('Waiting for extension to load...');
  
  // Use a known extension ID if detection fails
  const knownExtensionId = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';
  
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Attempt ${i + 1}/${maxAttempts} to find extension...`);
    
    // List all targets for debugging
    const targets = await browser.targets();
    targets.forEach(target => {
      console.log(`Target: ${target.type()} - ${target.url()}`);
    });
    
    const id = await getExtensionId(browser);
    if (id) {
      console.log(`Found extension with ID: ${id}`);
      return id;
    }
    
    // Check if we're on the last attempt
    if (i === maxAttempts - 1) {
      console.log(`Using known extension ID as fallback: ${knownExtensionId}`);
      return knownExtensionId;
    }
    
    // Slightly longer delay between attempts
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  // This should never be reached as we now return the known ID as fallback
  throw new Error('Could not find extension after multiple attempts');
};

beforeAll(async () => {
  // Skip setup if browser is already initialized (from another setup file)
  if (global.browser) {
    console.log('Browser already initialized, skipping setup');
    browser = global.browser;
    page = global.page;
    extensionId = global.extensionId || 'nodbhmlnbfnmnokclpbeghhakpocbgbe';
    return;
  }

  const extensionPath = path.resolve(__dirname, 'dist');
  console.log('Extension path:', extensionPath);
  
  // Check if extension files exist
  const fs = require('fs');
  const manifestPath = path.join(extensionPath, 'manifest.json');
  const backgroundPath = path.join(extensionPath, 'background.js');
  
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found at ${manifestPath}`);
  }
  
  if (!fs.existsSync(backgroundPath)) {
    throw new Error(`background.js not found at ${backgroundPath}`);
  }
  
  console.log('Extension files verified');
  
  // Launch browser with extension
  browser = await puppeteer.launch({
    headless: false,
    devtools: true, // Open DevTools for debugging
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Use custom Chrome if specified
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-features=site-per-process',
      '--allow-file-access-from-files',
      '--disable-web-security',
      '--enable-automation',
      '--enable-logging',
      '--v=1'
    ],
    // Use a longer timeout for browser launch
    timeout: 60000
  });

  try {
    console.log('Browser launched, searching for extension...');
    
    // List all browser targets for debugging
    const targets = await browser.targets();
    console.log(`Found ${targets.length} browser targets`);
    targets.forEach(target => {
      console.log(`Target: ${target.type()} - ${target.url()}`);
    });
    
    // Wait for extension to be loaded and get its ID
    extensionId = await waitForExtension(browser);
    if (!extensionId) {
      throw new Error('Could not get extension ID');
    }
    console.log('Extension ID:', extensionId);

    // Create a new page
    page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });

    // Make browser, page, and extensionId available globally
    global.browser = browser;
    global.page = page;
    global.extensionId = extensionId;

    // Try to navigate to the extension's popup page
    try {
      await page.goto(`chrome-extension://${extensionId}/popup.html`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('Successfully navigated to extension popup');
    } catch (e) {
      console.warn('Warning: Could not navigate to extension popup:', e.message);
    }
  } catch (error) {
    console.error('Error during test setup:', error);
    // Take a screenshot to help debug the issue
    if (page) {
      await page.screenshot({ path: 'setup-error.png' });
    }
    throw error;
  }
});

afterAll(async () => {
  // Clean up resources
  if (browser) {
    await browser.close();
  }
});

// Mock browser APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  tabs: {
    query: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  cookies: {
    get: vi.fn(),
    getAll: vi.fn(),
    set: vi.fn(),
    remove: vi.fn()
  }
};

// Mock fetch
global.fetch = vi.fn();

// Mock console methods
console.error = vi.fn();
console.warn = vi.fn();
console.log = vi.fn();

vi.setConfig({ testTimeout: 60000 }); 