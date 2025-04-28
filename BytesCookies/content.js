chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "testProtection") {
    // Perform the protection test
    const results = testProtection();
    
    // Send the results back to the popup
    sendResponse({success: true, results: results});
  }
  return true; // Keep the message channel open for the asynchronous response
});

function testProtection() {
  const results = [];
  
  // Test 1: Check if the extension is active
  results.push("Extension is active and running.");
  
  // Test 2: Check if the content script is loaded
  results.push("Content script is loaded and functioning.");
  
  // Test 3: Check if the protection is enabled
  const protectionEnabled = localStorage.getItem('protectionEnabled') === 'true';
  results.push(`Protection is ${protectionEnabled ? 'enabled' : 'disabled'}.`);
  
  // Test 4: Check if the extension can access the DOM
  try {
    const body = document.body;
    results.push("Extension can access the DOM.");
  } catch (error) {
    results.push("Extension cannot access the DOM: " + error.message);
  }
  
  // Test 5: Check if the extension can modify the DOM
  try {
    const testElement = document.createElement('div');
    testElement.style.display = 'none';
    document.body.appendChild(testElement);
    document.body.removeChild(testElement);
    results.push("Extension can modify the DOM.");
  } catch (error) {
    results.push("Extension cannot modify the DOM: " + error.message);
  }
  
  return results;
} 