const path = require('path');

module.exports = {
  launch: {
    headless: false,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    product: 'chrome',
    ignoreDefaultArgs: ['--disable-extensions'],
    defaultViewport: {
      width: 1280,
      height: 800
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      `--disable-extensions-except=${path.resolve(__dirname, 'dist')}`,
      `--load-extension=${path.resolve(__dirname, 'dist')}`
    ]
  },
  browserContext: 'default',
  exitOnPageError: false,
  server: {
    command: 'echo "No server needed"',
    port: 4444,
    launchTimeout: 10000
  }
}; 