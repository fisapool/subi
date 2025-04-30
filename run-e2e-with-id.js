#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const EXTENSION_ID = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';
const DIST_DIR = path.join(__dirname, 'dist');

// Utility function to execute commands
function exec(command, options = {}) {
  console.log(`> ${command}`);
  return execSync(command, {
    stdio: 'inherit',
    ...options,
  });
}

// Check if dist directory exists and has necessary files
function verifyExtensionBuild() {
  console.log('Verifying extension build...');
  
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist directory does not exist. Build the extension first with `npm run build`.');
    process.exit(1);
  }
  
  const requiredFiles = ['manifest.json', 'popup.html'];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(DIST_DIR, file))) {
      console.error(`Error: ${file} not found in dist directory. Build the extension first with \`npm run build\`.`);
      process.exit(1);
    }
  }
  
  console.log('Extension build verified ✅');
}

// Run the e2e tests
function runE2ETests() {
  console.log('Running e2e tests with extension ID:', EXTENSION_ID);
  
  try {
    // Set environment variables for the tests
    process.env.EXTENSION_ID = EXTENSION_ID;
    process.env.EXTENSION_PATH = DIST_DIR;
    
    // Run the tests
    exec('npx vitest run --config vitest.e2e.config.ts');
    
    console.log('E2E tests completed successfully ✅');
  } catch (error) {
    console.error('E2E tests failed ❌');
    process.exit(1);
  }
}

// Main function
async function main() {
  console.log('=== Running E2E Tests with Specific Extension ID ===');
  
  // Verify that the extension is built
  verifyExtensionBuild();
  
  // Run the e2e tests
  runE2ETests();
}

// Run the script
main().catch(error => {
  console.error('Error running e2e tests:', error);
  process.exit(1);
}); 