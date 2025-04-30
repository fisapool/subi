const { expect, describe, test } = require('@jest/globals');

describe('Simple Test', () => {
  test('should pass', () => {
    expect(true).toBe(true);
  });
}); 