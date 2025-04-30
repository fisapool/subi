const path = require('path');

module.exports = async () => {
  // Set the extension path
  const extensionPath = path.resolve(__dirname, process.env.EXTENSION_PATH || './');
  
  // Configure Puppeteer to load the extension
  await jestPuppeteer.launch({
    headless: false, // Extensions are not supported in headless mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
}; 