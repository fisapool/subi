const { spawn } = require('child_process');
const path = require('path');

process.env.DEBUG = 'jest-puppeteer:*';
process.env.EXTENSION_PATH = path.resolve(__dirname, 'dist');
process.env.EXTENSION_ID = 'gkcpochmomaoagkfnnjakfgipmjclmbn';

const jest = spawn('npx', [
  'jest',
  '--config',
  'jest.config.e2e.js',
  '--no-cache',
  '--detectOpenHandles',
  '--verbose',
  '--runInBand'
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
}); 