module.exports = {
  preset: 'jest-puppeteer',
  testMatch: ['**/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['./jest.e2e.setup.js'],
  testTimeout: 120000,
  verbose: true,
  testEnvironment: 'node',
  globals: {
    EXTENSION_PATH: process.env.EXTENSION_PATH || './dist',
  },
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }]
      ]
    }]
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  }
}; 