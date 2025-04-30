// Test runner for Session Buddy with Sidepanels
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Create a mock DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true
});

// Set up global objects
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;

// Mock jest functions
global.jest = {
  fn: () => {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args);
      return undefined;
    };
    mockFn.mock = {
      calls: [],
      results: [],
      resolvedValue: undefined,
      rejectedValue: undefined,
      mockResolvedValue: (value) => {
        mockFn.mock.resolvedValue = value;
        return mockFn;
      },
      mockRejectedValue: (value) => {
        mockFn.mock.rejectedValue = value;
        return mockFn;
      },
      mockImplementation: (impl) => {
        mockFn.mock.implementation = impl;
        return mockFn;
      }
    };
    return mockFn;
  }
};

// Load the test script
const testScript = fs.readFileSync(path.join(__dirname, 'test.js'), 'utf8');

// Execute the test script
try {
  // Create a script element and append it to the document
  const script = document.createElement('script');
  script.textContent = testScript;
  document.body.appendChild(script);
  
  console.log('Tests executed successfully!');
} catch (error) {
  console.error('Error executing tests:', error);
} 