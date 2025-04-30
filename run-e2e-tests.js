const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { checkServiceWorker } = require('./service-worker-check');
const { testServiceWorkerFunctionality } = require('./service-worker-tests');

// Extension ID provided by the user
const EXTENSION_ID = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';

// Execute a command and return a promise
function execCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// Verify the extension is built and available
async function verifyExtension() {
  const distPath = path.resolve(__dirname, 'dist');
  
  if (!fs.existsSync(distPath)) {
    console.log('dist directory not found, building extension...');
    await execCommand('npm run build');
  }
  
  // Check for essential files
  const requiredFiles = ['manifest.json', 'background.js', 'popup.html'];
  const missingFiles = [];
  
  for (const file of requiredFiles) {
    const filePath = path.join(distPath, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    throw new Error(`Required files missing: ${missingFiles.join(', ')}. Try rebuilding the extension.`);
  }
  
  console.log('✓ Extension files verified');
  return distPath;
}

// Test if the extension can be loaded in a browser
async function testExtensionLoading(extensionPath) {
  console.log('Testing extension loading in browser...');
  
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--disable-features=site-per-process',
      '--allow-file-access-from-files'
    ],
    timeout: 30000
  });
  
  try {
    // Create a page and try to navigate to the extension
    const page = await browser.newPage();
    console.log(`Attempting to navigate to extension with ID: ${EXTENSION_ID}`);
    
    try {
      await page.goto(`chrome-extension://${EXTENSION_ID}/popup.html`, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      console.log('✓ Successfully navigated to extension popup');
    } catch (e) {
      console.warn(`Warning: Could not navigate to extension popup: ${e.message}`);
      console.log('This may be normal for the first run. Continuing with tests...');
    }
    
    // List all targets for debugging
    const targets = await browser.targets();
    const extensionTargets = targets.filter(t => t.url().startsWith('chrome-extension://'));
    
    console.log(`Found ${extensionTargets.length} extension targets:`);
    extensionTargets.forEach(target => {
      console.log(`- Type: ${target.type()}, URL: ${target.url()}`);
    });
    
  } finally {
    await browser.close();
  }
}

// Run the e2e tests
async function runE2ETests() {
  console.log('Running E2E tests...');
  
  // Set environment variables
  process.env.EXTENSION_ID = EXTENSION_ID;
  process.env.DEBUG = 'puppeteer:*';
  process.env.TEST_TIMEOUT = '60000';
  
  try {
    // Run the e2e tests with our custom configuration
    const e2eTestCommand = 'npx vitest run --config vitest.e2e.config.ts';
    
    await execCommand(e2eTestCommand);
    console.log('✓ E2E tests completed');
  } catch (error) {
    console.error('E2E tests failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('=== Running E2E Tests with Extension ID:', EXTENSION_ID, '===\n');
  
  try {
    // Step 1: Verify the extension
    const extensionPath = await verifyExtension();
    
    // Step 2: Run comprehensive service worker tests
    console.log('\nRunning comprehensive service worker tests...');
    const swTestResults = await testServiceWorkerFunctionality();
    
    // Step 3: Check for service worker warnings
    console.log('\nRunning service worker warning check...');
    await checkServiceWorker();
    
    // Step 4: Test if extension loads properly (optional)
    await testExtensionLoading(extensionPath);
    
    // Step 5: Run the actual e2e tests
    await runE2ETests();
    
    // Print final test summary
    console.log('\n=== Final Test Summary ===');
    if (swTestResults) {
      console.log('\nService Worker Tests:');
      console.log(`Registration: ${swTestResults.registration ? '✓' : '⚠'}`);
      console.log(`Activation: ${swTestResults.activation ? '✓' : '⚠'}`);
      console.log(`Fetch Events: ${swTestResults.fetchEvents ? '✓' : '⚠'}`);
      console.log(`Caching: ${swTestResults.caching ? '✓' : '⚠'}`);
      
      if (swTestResults.errors.length > 0) {
        console.log('\nService Worker Errors:');
        swTestResults.errors.forEach(error => console.log(`- ${error}`));
      }
    }
    
    console.log('\n✓ All steps completed successfully');
  } catch (error) {
    console.error(`\n❌ Process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 