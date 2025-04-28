/**
 * Tests for popup functionality
 */

import { resetAllMocks, cleanupAfterTest } from './helpers/reset-mocks';

jest.setTimeout(30000); // Increase global timeout to 30 seconds

describe('Popup functionality', () => {
  beforeEach(() => {
    resetAllMocks();
    // Reset button states and clear results
    document.getElementById('results').innerHTML = '';
    document.getElementById('errorMessage').innerHTML = '';
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });
});
