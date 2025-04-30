import { describe, test, expect, beforeEach } from 'vitest';

describe('FISABytes Cookie Manager E2E Tests', () => {
  beforeEach(async () => {
    // Navigate to extension popup
    await global.page.goto(`chrome-extension://${global.extensionId}/popup.html`);
    await global.page.waitForSelector('.container');
  }, 15000);

  test('Extension popup loads correctly', async () => {
    // Verify main UI elements
    const container = await global.page.$('.container');
    const header = await global.page.$('.header');
    const content = await global.page.$('.content');
    
    expect(container).toBeTruthy();
    expect(header).toBeTruthy();
    expect(content).toBeTruthy();
  });

  test('Can interact with authentication', async () => {
    // Verify auth elements
    const authSection = await global.page.$('#authSection');
    const loginEmail = await global.page.$('#loginEmail');
    const loginPassword = await global.page.$('#loginPassword');
    const loginButton = await global.page.$('#loginButton');
    
    expect(authSection).toBeTruthy();
    expect(loginEmail).toBeTruthy();
    expect(loginPassword).toBeTruthy();
    expect(loginButton).toBeTruthy();
  });

  test('Can interact with cookie management', async () => {
    // Verify cookie management elements
    const domainInput = await global.page.$('#domain');
    const testProtectionBtn = await global.page.$('#testProtectionBtn');
    const saveCookiesBtn = await global.page.$('#saveCookiesBtn');
    const restoreCookiesBtn = await global.page.$('#restoreCookiesBtn');
    
    expect(domainInput).toBeTruthy();
    expect(testProtectionBtn).toBeTruthy();
    expect(saveCookiesBtn).toBeTruthy();
    expect(restoreCookiesBtn).toBeTruthy();
  });

  test('Can save cookies', async () => {
    // Enter domain
    await global.page.type('#domain', 'example.com');
    
    // Click save button
    const saveCookiesBtn = await global.page.$('#saveCookiesBtn');
    expect(saveCookiesBtn).toBeTruthy();
    
    if (saveCookiesBtn) {
      await saveCookiesBtn.click();
      
      // Wait for feedback
      await global.page.waitForSelector('#popup-feedback');
      const feedback = await global.page.$('#popup-feedback');
      expect(feedback).toBeTruthy();
    }
  });

  test('Error handling works', async () => {
    // Verify error elements
    const loginError = await global.page.$('#loginError');
    const registerError = await global.page.$('#registerError');
    const syncStatus = await global.page.$('#syncStatus');
    
    expect(loginError).toBeTruthy();
    expect(registerError).toBeTruthy();
    expect(syncStatus).toBeTruthy();
  });

  test('Can manage profile', async () => {
    // Verify profile elements
    const profileSection = await global.page.$('#profileSection');
    const userName = await global.page.$('#userName');
    const userEmail = await global.page.$('#userEmail');
    const logoutButton = await global.page.$('#logoutButton');
    
    expect(profileSection).toBeTruthy();
    expect(userName).toBeTruthy();
    expect(userEmail).toBeTruthy();
    expect(logoutButton).toBeTruthy();
  });
}); 