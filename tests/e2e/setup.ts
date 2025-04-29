import { Browser, Page, Target } from 'puppeteer';
import path from 'path';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeVisible(): Promise<R>;
      toHaveText(text: string): Promise<R>;
    }
  }
}

export const EXTENSION_PATH = path.join(__dirname, '../../dist');
export const EXTENSION_ID = 'gkcpochmomaoagkfnnjakfgipmjclmbn';

export async function getExtensionPage(browser: Browser, pageName: string): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${EXTENSION_ID}/${pageName}`);
  return page;
}

export async function getExtensionPopup(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
  return page;
}

export async function getExtensionBackgroundPage(browser: Browser): Promise<Page> {
  const targets = await browser.targets();
  const backgroundTarget = targets.find(
    (target) => target.type() === 'background_page' && target.url().includes(EXTENSION_ID)
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