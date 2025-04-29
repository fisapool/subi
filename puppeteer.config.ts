import { PuppeteerLaunchOptions } from 'puppeteer';

export const puppeteerConfig: PuppeteerLaunchOptions = {
  headless: 'new', // Use the new headless mode
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--window-size=1920,1080',
  ],
  defaultViewport: {
    width: 1920,
    height: 1080,
  },
  timeout: 30000, // 30 seconds timeout for operations
  ignoreHTTPSErrors: true,
  dumpio: process.env.DEBUG === 'true', // Enable browser console logging when DEBUG is true
};

// Helper function to get browser launch options based on environment
export function getLaunchOptions(): PuppeteerLaunchOptions {
  const options: PuppeteerLaunchOptions = { ...puppeteerConfig };
  
  if (process.env.CI) {
    // Additional settings for CI environment
    options.args = [
      ...(options.args || []),
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--enable-features=NetworkService,NetworkServiceInProcess',
      '--metrics-recording-only',
      '--mute-audio',
    ];
  }

  return options;
} 