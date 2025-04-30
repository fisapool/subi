const { exec } = require('child_process');
const path = require('path');
const { runDiagnostics } = require('./extension-debug-helper');

// First run the diagnostics to see if we can identify any issues
async function main() {
  try {
    console.log('Running extension diagnostics...');
    const diagnostics = await runDiagnostics();
    
    // Set the known extension ID
    const knownExtensionId = 'nodbhmlnbfnmnokclpbeghhakpocbgbe';
    
    // If we found an extension ID, save it for tests, otherwise use the known ID
    if (diagnostics.extensionId) {
      console.log(`Found extension ID: ${diagnostics.extensionId}`);
      process.env.EXTENSION_ID = diagnostics.extensionId;
    } else {
      console.log(`Using provided extension ID: ${knownExtensionId}`);
      process.env.EXTENSION_ID = knownExtensionId;
    }
    
    // Check if there are any potential issues before running tests
    const potentialIssues = [];
    
    if (diagnostics.extensionTargets.length === 0) {
      potentialIssues.push('No extension targets found. The extension may not be loading properly.');
    }
    
    if (!diagnostics.targets.some(t => t.type === 'service_worker')) {
      potentialIssues.push('No service worker targets found. The extension service worker may not be initializing.');
    }
    
    if (potentialIssues.length > 0) {
      console.log('\n⚠️ Potential issues detected:');
      potentialIssues.forEach((issue, i) => {
        console.log(`  ${i+1}. ${issue}`);
      });
      console.log('\nAttempting to run tests anyway...');
    }
    
    // Now run the tests
    console.log('\nRunning tests...');
    
    // Use npx to run vitest or jest
    const testCommand = 'npx vitest run';
    
    exec(testCommand, (error, stdout, stderr) => {
      console.log(stdout);
      
      if (stderr) {
        console.error(`Test stderr: ${stderr}`);
      }
      
      if (error) {
        console.error(`Test execution failed: ${error}`);
        process.exit(1);
      }
      
      console.log('Tests completed.');
    });
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

main(); 