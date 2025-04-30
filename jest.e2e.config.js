module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./jest.e2e.setup.js'],
  testTimeout: 30000,
  globals: {
    EXTENSION_PATH: process.env.EXTENSION_PATH || './',
  }
}; 