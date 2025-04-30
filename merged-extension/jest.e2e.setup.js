const path = require('path');

module.exports = async () => {
  const extensionPath = path.resolve(__dirname, process.env.EXTENSION_PATH || './dist');
  
  await jestPuppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--disable-gpu',
    ],
    defaultViewport: {
      width: 1280,
      height: 800,
    },
  });
}; 