module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  testEnvironment: 'node',
  globals: {
    EXTENSION_PATH: process.env.EXTENSION_PATH,
    EXTENSION_ID: process.env.EXTENSION_ID
  }
}; 