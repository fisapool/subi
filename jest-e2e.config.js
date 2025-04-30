/** @type {import('@jest/types').Config.InitialOptions} */
export default {
  preset: 'jest-puppeteer',
  testMatch: ['**/tests/extension.test.js'],
  transform: {},
  testEnvironment: 'jest-environment-puppeteer',
  testTimeout: 30000 // Set global timeout to 30 seconds
}; 