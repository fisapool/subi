const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

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

// Build the extension and run tests
async function main() {
  try {
    // Step 1: Clean and build the extension
    console.log('--- Step 1: Building extension ---');
    await execCommand('npm run build');
    
    // Step 2: Verify the build artifacts
    console.log('\n--- Step 2: Verifying build artifacts ---');
    const distPath = path.resolve(__dirname, 'dist');
    
    if (!fs.existsSync(distPath)) {
      throw new Error(`dist directory not found at ${distPath}`);
    }
    
    // Check for essential files
    const requiredFiles = ['manifest.json', 'background.js', 'popup.html'];
    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not found: ${filePath}`);
      }
      console.log(`✓ ${file} exists`);
    }
    
    // Step 3: Set up debugging options
    console.log('\n--- Step 3: Setting up test environment ---');
    
    // Set environment variables to help with debugging
    process.env.DEBUG = 'puppeteer:*';
    process.env.TEST_TIMEOUT = '60000'; // 60 seconds
    
    // Use a custom Chrome path if you have issues with the bundled one
    // Uncomment and adjust if needed
    /* 
    const possibleChromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/usr/bin/google-chrome',                                       // Linux
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'    // Windows
    ];
    
    for (const chromePath of possibleChromePaths) {
      if (fs.existsSync(chromePath)) {
        process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
        console.log(`Using Chrome at: ${chromePath}`);
        break;
      }
    }
    */
    
    // Step 4: Run the tests
    console.log('\n--- Step 4: Running tests ---');
    await execCommand('node run-tests.js');
    
    console.log('\n✓ All steps completed successfully');
  } catch (error) {
    console.error(`\n❌ Process failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
main(); 