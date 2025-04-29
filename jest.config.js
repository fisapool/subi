/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }]
  },
  setupFiles: ['./tests/setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(webextension-polyfill)/)'
  ],
  moduleFileExtensions: ['js', 'json'],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  verbose: true,
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  }
};

export default config; 