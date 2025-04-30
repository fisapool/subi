// Extension debugging helper functions
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * Launches a browser with the extension and returns detailed diagnostics
 * @param {string} extensionPath - Path to the extension directory
 * @returns {Promise<Object>} - Diagnostic information
 */
async function diagnoseBrowserExtension(extensionPath) {
  console.log('Starting extension diagnostics...');
  console.log('Extension path:', extensionPath);
  
  // Check if extension files exist
  const filesExist = {
    manifest: fs.existsSync(path.join(extensionPath, 'manifest.json')),
    background: fs.existsSync(path.join(extensionPath, 'background.js')),
    serviceWorker: fs.existsSync(path.join(extensionPath, 'service-worker-loader.js'))
  };
  
  console.log('Files exist check:', filesExist);
  
  // Launch browser with extension
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--allow-file-access-from-files',
      '--enable-automation',
      '--enable-logging',
      '--v=1',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ],
    timeout: 60000
  });
  
  // Get diagnostics
  const diagnostics = {
    browserVersion: await browser.version(),
    targets: [],
    extensionTargets: [],
    errors: []
  };
  
  try {
    // List all targets
    const targets = await browser.targets();
    diagnostics.targets = targets.map(target => ({
      type: target.type(),
      url: target.url()
    }));
    
    // Get extension-related targets
    diagnostics.extensionTargets = diagnostics.targets.filter(target => 
      target.url.startsWith('chrome-extension://')
    );
    
    // Try to find extension ID
    const extensionTarget = diagnostics.extensionTargets.find(target => 
      target.url.includes('background') || 
      target.url.includes('service-worker') ||
      target.type === 'service_worker'
    );
    
    if (extensionTarget) {
      const url = new URL(extensionTarget.url);
      diagnostics.extensionId = url.hostname;
    }
    
    // Get browser logs if possible
    const pages = await browser.pages();
    if (pages.length > 0) {
      const logs = [];
      const page = pages[0];
      
      // Enable console logging
      page.on('console', message => {
        logs.push({
          type: message.type(),
          text: message.text()
        });
      });
      
      // Navigate to extension page if we found an ID
      if (diagnostics.extensionId) {
        try {
          await page.goto(`chrome-extension://${diagnostics.extensionId}/popup.html`);
          await page.waitForTimeout(2000); // Wait for logs
        } catch (e) {
          diagnostics.errors.push(`Failed to navigate to extension page: ${e.message}`);
        }
      }
      
      diagnostics.logs = logs;
    }
  } catch (error) {
    diagnostics.errors.push(`Error during diagnostics: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  return diagnostics;
}

/**
 * Run diagnostics and print results
 */
async function runDiagnostics() {
  const extensionPath = path.resolve(__dirname, 'dist');
  const results = await diagnoseBrowserExtension(extensionPath);
  
  console.log('\n============ EXTENSION DIAGNOSTICS ============');
  console.log('Browser version:', results.browserVersion);
  console.log('\nExtension ID:', results.extensionId || 'Not found');
  
  console.log('\nExtension targets:');
  if (results.extensionTargets.length === 0) {
    console.log('  No extension targets found!');
  } else {
    results.extensionTargets.forEach((target, i) => {
      console.log(`  ${i+1}. Type: ${target.type}, URL: ${target.url}`);
    });
  }
  
  console.log('\nAll browser targets:');
  results.targets.forEach((target, i) => {
    console.log(`  ${i+1}. Type: ${target.type}, URL: ${target.url}`);
  });
  
  if (results.logs && results.logs.length > 0) {
    console.log('\nBrowser logs:');
    results.logs.forEach((log, i) => {
      console.log(`  ${i+1}. [${log.type}] ${log.text}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach((error, i) => {
      console.log(`  ${i+1}. ${error}`);
    });
  }
  
  console.log('\n============================================');
  
  return results;
}

// Export functions for use in other files
module.exports = {
  diagnoseBrowserExtension,
  runDiagnostics
};

// Run diagnostics if this file is executed directly
if (require.main === module) {
  runDiagnostics()
    .then(() => console.log('Diagnostics complete'))
    .catch(err => console.error('Diagnostics failed:', err));
} 