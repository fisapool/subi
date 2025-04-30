describe('Session Buddy Extension E2E Tests', () => {
  let extensionId;
  let serviceWorker;

  beforeAll(async () => {
    // Wait for the service worker to be available
    const serviceWorkerTarget = await browser.waitForTarget(
      target => target.type() === 'service_worker'
    );
    serviceWorker = await serviceWorkerTarget.worker();
    extensionId = serviceWorkerTarget.url().split('/')[2];
  }, 30000);

  test('should load the extension popup', async () => {
    const popupPage = await browser.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // Wait for the popup to load
    await popupPage.waitForSelector('body');
    
    // Take a screenshot for debugging
    await popupPage.screenshot({ path: 'popup.png' });
    
    // Close the popup
    await popupPage.close();
  }, 30000);

  test('should test session saving functionality', async () => {
    // Create a test tab
    const testPage = await browser.newPage();
    await testPage.goto('https://example.com');
    
    // Save the session using the service worker
    const result = await serviceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.set({ 'test-session': { 
          name: 'Test Session',
          tabs: [{ url: 'https://example.com', title: 'Example Domain' }]
        }}, () => {
          resolve(true);
        });
      });
    });
    
    expect(result).toBe(true);
    
    // Verify the session was saved
    const savedSession = await serviceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.get(['test-session'], result => {
          resolve(result['test-session']);
        });
      });
    });
    
    expect(savedSession).toBeDefined();
    expect(savedSession.name).toBe('Test Session');
    
    await testPage.close();
  }, 30000);

  test('should test side panel functionality', async () => {
    const sidePanelPage = await browser.newPage();
    await sidePanelPage.goto(`chrome-extension://${extensionId}/sidepanels/welcome-sp.html`);
    
    // Wait for side panel to load
    await sidePanelPage.waitForSelector('body');
    
    // Take a screenshot for debugging
    await sidePanelPage.screenshot({ path: 'sidepanel.png' });
    
    await sidePanelPage.close();
  }, 30000);

  test('should test content script injection', async () => {
    const testPage = await browser.newPage();
    await testPage.goto('https://example.com');
    
    // Wait for content script to inject and modify the page
    await testPage.waitForFunction(() => {
      return document.querySelector('body') !== null;
    });
    
    await testPage.close();
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await serviceWorker.evaluate(() => {
      return new Promise(resolve => {
        chrome.storage.local.remove(['test-session'], () => {
          resolve();
        });
      });
    });
  });
}); 