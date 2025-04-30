/// <reference types="chrome" />
import { Page } from 'puppeteer';
import { getExtensionPopup } from './setup';
import { afterAll, beforeAll, expect, vi } from 'vitest';

describe('Extension Basic Tests', () => {
  let popupPage: Page;
  
  // Use a large timeout for the test setup
  beforeAll(async () => {
    if (!global.browser) {
      throw new Error('Browser not initialized. Make sure test setup is properly configured.');
    }
  }, 60000);

  // Use a separate test just for loading the popup
  it('should load extension popup', async () => {
    // Get the extension popup page with longer timeout
    console.log('Getting extension popup page...');
    popupPage = await getExtensionPopup(global.browser);
    
    // Verify popup loaded by checking page title or URL
    const url = await popupPage.url();
    console.log('Popup page URL:', url);
    
    // Just check that we loaded a chrome-extension URL with the right ID
    expect(url).toContain('chrome-extension://nodbhmlnbfnmnokclpbeghhakpocbgbe/popup.html');
    
    // Take a screenshot for debugging
    await popupPage.screenshot({ path: 'popup-screenshot.png' });
    console.log('Saved screenshot to popup-screenshot.png');
    
    // Check that the page has rendered something
    const bodyContent = await popupPage.evaluate(() => document.body.innerHTML);
    expect(bodyContent.length).toBeGreaterThan(0);
    
    await popupPage.close();
  }, 60000); // Use a long timeout
}); 