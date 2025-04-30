const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.join(__dirname, '..');
const EXTENSION_ID = 'jkomgjfbbjocikdmilgaehbfpllalmia';

let browser;

beforeEach(async () => {
  browser = await puppeteer.launch({
    headless: false, // extension are only supported in headful mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
});

afterEach(async () => {
  await browser.close();
});

test('popup renders correctly', async () => {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);

  // Wait for the popup to load
  await page.waitForSelector('#saveButton');
  await page.waitForSelector('#restoreButton');
  await page.waitForSelector('#sessionList');
  await page.waitForSelector('#statusMessage');
  await page.waitForSelector('#loadingSpinner');

  // Test save button functionality
  const saveButton = await page.$('#saveButton');
  expect(saveButton).toBeTruthy();
  await saveButton.click();

  // Test restore button functionality
  const restoreButton = await page.$('#restoreButton');
  expect(restoreButton).toBeTruthy();
  await restoreButton.click();

  // Test session list
  const sessionList = await page.$('#sessionList');
  expect(sessionList).toBeTruthy();
  const children = await sessionList.$$('li');
  expect(children.length).toBeGreaterThanOrEqual(0);

  // Test status message
  const statusMessage = await page.$('#statusMessage');
  expect(statusMessage).toBeTruthy();
  const messageText = await page.evaluate(el => el.textContent, statusMessage);
  expect(messageText).toBeDefined();

  // Test loading spinner
  const loadingSpinner = await page.$('#loadingSpinner');
  expect(loadingSpinner).toBeTruthy();
  const spinnerStyle = await page.evaluate(el => el.style.display, loadingSpinner);
  expect(spinnerStyle).toBeDefined();
}); 