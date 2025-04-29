import setup from 'jest-puppeteer/setup';

export default async function globalSetup() {
  await setup();
} 