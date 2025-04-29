const path = require('path');

module.exports = {
  launch: {
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      `--disable-extensions-except=${path.resolve('dist')}`,
      `--load-extension=${path.resolve('dist')}`
    ]
  },
  server: {
    command: 'echo "No server needed for extension tests"',
    port: 4444,
    launchTimeout: 10000
  }
}; 