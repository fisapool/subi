/**
 * Tests for cookie import/export functionality
 */

import { jest } from '@jest/globals';
import { resetAllMocks, cleanupAfterTest } from './helpers/reset-mocks';
import { getCookies, setCookie, removeCookie } from '../cookie-utils';

describe('Cookie Utils', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should get cookies', async () => {
    const mockCookies = [
      { name: 'test', value: 'value', domain: 'example.com' }
    ];
    chrome.cookies.getAll.mockResolvedValue(mockCookies);

    const result = await getCookies('example.com');
    expect(result).toEqual(mockCookies);
  });

  it('should set cookie', async () => {
    const cookie = { name: 'test', value: 'value', domain: 'example.com' };
    chrome.cookies.set.mockResolvedValue(cookie);

    const result = await setCookie(cookie);
    expect(result).toEqual(cookie);
  });

  it('should remove cookie', async () => {
    const cookie = { name: 'test', domain: 'example.com' };
    chrome.cookies.remove.mockResolvedValue(cookie);

    const result = await removeCookie(cookie);
    expect(result).toEqual(cookie);
  });
});
