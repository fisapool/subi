/// <reference types="chrome" />
import { Page } from 'puppeteer';
import { getExtensionPopup, getExtensionBackgroundPage } from './setup';

describe.skip('Cookie Management', () => {
  let popupPage: Page;
  let backgroundPage: Page;

  beforeAll(async () => {
    if (!global.browser) {
      throw new Error('Browser not initialized. Make sure jest-puppeteer is properly configured.');
    }
  });

  beforeEach(async () => {
    popupPage = await getExtensionPopup(global.browser);
    backgroundPage = await getExtensionBackgroundPage(global.browser);
  });

  afterEach(async () => {
    if (popupPage) {
      await popupPage.close();
    }
    if (backgroundPage) {
      await backgroundPage.close();
    }
  });

  it('should export cookies to file', async () => {
    // Click export button
    const exportButton = await popupPage.$('#export-button');
    await exportButton?.click();

    // Wait for download to complete
    const downloadPath = await popupPage.evaluate(() => {
      return new Promise<string>(resolve => {
        chrome.downloads.onChanged.addListener(download => {
          if (download.state?.current === 'complete' && download.filename?.current) {
            resolve(download.filename.current);
          }
        });
      });
    });

    expect(downloadPath).toBeTruthy();
  });

  it('should import cookies from file', async () => {
    // Click import button
    const importButton = await popupPage.$('#import-button');
    await importButton?.click();

    // Wait for file input and upload test file
    const fileInput = await popupPage.$('input[type="file"]');
    await fileInput?.uploadFile('./tests/e2e/fixtures/cookies.json');

    // Verify success message
    const successMessage = await popupPage.$('.success-message');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toHaveText('Cookies imported successfully');
  });

  it('should handle cookie validation', async () => {
    // Click import button
    const importButton = await popupPage.$('#import-button');
    await importButton?.click();

    // Upload invalid cookie file
    const fileInput = await popupPage.$('input[type="file"]');
    await fileInput?.uploadFile('./tests/e2e/fixtures/invalid-cookies.json');

    // Verify error message
    const errorMessage = await popupPage.$('.error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toHaveText('Invalid cookie format');
  });
});
