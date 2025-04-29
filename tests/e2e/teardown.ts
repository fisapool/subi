import { Browser } from 'puppeteer';

export default async function teardown() {
  const browser = global.browser as Browser;
  if (browser) {
    await browser.close();
  }
} 