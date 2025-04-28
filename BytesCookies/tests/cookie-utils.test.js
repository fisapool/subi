/**
 * Tests for cookie import/export functionality
 */

import { resetAllMocks, cleanupAfterTest } from './helpers/reset-mocks';

describe('Cookie Utils', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });
});
