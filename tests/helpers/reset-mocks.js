import { jest } from '@jest/globals';

/**
 * Helper functions for resetting mocks in tests
 */

/**
 * Resets all Chrome API mocks
 */
export const resetChromeMocks = () => {
  Object.values(chrome).forEach(api => {
    if (typeof api === 'object' && api !== null) {
      Object.values(api).forEach(method => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
};

/**
 * Resets all window utils mocks
 */
export const resetWindowUtilsMocks = () => {
  Object.values(window.utils).forEach(method => {
    if (jest.isMockFunction(method)) {
      method.mockReset();
    }
  });
};

/**
 * Resets all document mocks
 */
export const resetDocumentMocks = () => {
  Object.values(document).forEach(method => {
    if (jest.isMockFunction(method)) {
      method.mockReset();
    }
  });
};

/**
 * Resets all console mocks
 */
export const resetConsoleMocks = () => {
  Object.values(console).forEach(method => {
    if (jest.isMockFunction(method)) {
      method.mockReset();
    }
  });
};

/**
 * Resets all mocks and timers
 * This is the main reset function to use in beforeEach
 */
export const resetAllMocks = () => {
  jest.clearAllMocks();
  resetChromeMocks();
  resetWindowUtilsMocks();
  resetDocumentMocks();
  resetConsoleMocks();
};

/**
 * Cleans up after tests
 * This is the main cleanup function to use in afterEach
 */
export const cleanupAfterTest = async () => {
  // Reset all mocks to their initial state
  jest.resetAllMocks();
  
  // Clear any DOM elements added during the test
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Reset any global variables that might have been modified
  global.sessionLoggingEnabled = false;
  global.focusModeEnabled = false;
  global.meetingModeEnabled = false;

  // Await any asynchronous cleanup operations here if needed
  await new Promise(resolve => setTimeout(resolve, 0));
};
