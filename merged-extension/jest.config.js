module.exports = {
  testEnvironment: 'jsdom',
  verbose: true,
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  testTimeout: 120000,
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ]
    }]
  },
  modulePathIgnorePatterns: [
    'chrome-extensions-samples'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/chrome-extensions-samples/',
    '/e2e/'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironmentOptions: {
    url: 'http://localhost/'
  }
}; 