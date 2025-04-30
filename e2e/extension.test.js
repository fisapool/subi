describe('Chrome Extension E2E Tests', () => {
  let extensionId;

  beforeAll(async () => {
    // Get the extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => target.type() === 'background_page');
    const extensionUrl = extensionTarget.url();
    extensionId = extensionUrl.split('/')[2];
  });

  test('should load the extension popup', async () => {
    // Open the popup page
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

    // Wait for the popup to load
    await popupPage.waitForSelector('body');

    // Take a screenshot for debugging
    await popupPage.screenshot({ path: 'popup.png' });

    // Example: Check if a specific element exists
    const element = await popupPage.$('#some-element');
    expect(element).toBeTruthy();
  });

  test('should test background page functionality', async () => {
    // Access the background page
    const backgroundPage = await browser.newPage();
    await backgroundPage.goto(`chrome-extension://${extensionId}/background.js`);

    // Example: Test storage API
    const storageValue = await backgroundPage.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['key'], result => {
          resolve(result.key);
        });
      });
    });

    expect(storageValue).toBeDefined();
  });

  test('should test content script injection', async () => {
    // Create a test page
    const testPage = await browser.newPage();
    await testPage.goto('https://example.com');

    // Wait for content script to inject
    await testPage.waitForFunction(() => {
      return document.querySelector('.extension-injected-element');
    });

    // Verify content script functionality
    const injectedElement = await testPage.$('.extension-injected-element');
    expect(injectedElement).toBeTruthy();
  });
}); 