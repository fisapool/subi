/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./jest.setup.cjs'],
  testTimeout: 30000,
  verbose: true
};
