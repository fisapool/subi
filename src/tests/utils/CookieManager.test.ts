import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CookieManager } from '../../utils/CookieManager';
import { CookieEncryption } from '../../../security/CookieEncryption';
import { CookieValidator } from '../../../validation/CookieValidator';
import { ErrorHandler } from '../../core/error/ErrorHandler';
import { SecurityManager } from '../../core/security/SecurityManager';
import { Store } from '../../core/state/Store';
import { Cookie, EncryptedData, ValidationResult } from '../../../types';

// Mock the chrome API
const mockChrome = {
  cookies: {
    getAll: vi.fn(),
    set: vi.fn(),
  },
  runtime: {
    lastError: null,
  },
};

// Mock the global chrome object
(global as any).chrome = mockChrome;

// Create mock instances with proper typing for async functions
const mockSecurity = {
  encryptCookies: vi.fn(),
  decryptCookies: vi.fn(),
};

const mockValidator = {
  validateCookie: vi.fn(),
};

const mockErrorHandler = {
  handleError: vi.fn(),
};

const mockSecurityManager = {
  isOperationAllowed: vi.fn(),
  validateCookieData: vi.fn(),
};

const mockStore = {
  setState: vi.fn(),
};

// Mock the static getInstance methods
vi.mock('../../core/error/ErrorHandler', () => ({
  ErrorHandler: {
    getInstance: () => mockErrorHandler,
  },
}));

vi.mock('../../core/security/SecurityManager', () => ({
  SecurityManager: {
    getInstance: () => mockSecurityManager,
  },
}));

vi.mock('../../core/state/Store', () => ({
  Store: {
    getInstance: () => mockStore,
  },
}));

// Mock the constructors
vi.mock('../../../security/CookieEncryption', () => ({
  CookieEncryption: function () {
    return mockSecurity;
  },
}));

vi.mock('../../../validation/CookieValidator', () => ({
  CookieValidator: function () {
    return mockValidator;
  },
}));

describe('CookieManager', () => {
  let cookieManager: CookieManager;

  const mockCookies: Cookie[] = [
    {
      domain: 'example.com',
      name: 'session',
      value: 'abc123',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      expirationDate: 1735689600,
    },
  ];

  const mockEncryptedData: EncryptedData = {
    data: 'encrypted-data',
    iv: 'initialization-vector',
    hash: 'mock-hash',
    salt: 'mock-salt',
    timestamp: Date.now(),
    version: '1.0.0',
  };

  const mockValidationResult: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset Chrome API mock state
    mockChrome.runtime.lastError = null;

    // Setup default mock behaviors
    mockChrome.cookies.getAll.mockImplementation((_, callback) => callback(mockCookies));
    mockChrome.cookies.set.mockImplementation((details, callback) => {
      // Simulate successful cookie setting
      if (callback) callback();
      return Promise.resolve({
        name: details.name,
        value: details.value,
        domain: details.domain,
        path: details.path,
      });
    });

    // Reset mock implementations to their default values
    mockSecurityManager.isOperationAllowed.mockImplementation(() => Promise.resolve(true));
    mockSecurityManager.validateCookieData.mockImplementation(() => true);
    mockValidator.validateCookie.mockImplementation(() => Promise.resolve(mockValidationResult));
    mockSecurity.encryptCookies.mockImplementation(() => Promise.resolve(mockEncryptedData));
    mockSecurity.decryptCookies.mockImplementation(() => Promise.resolve(mockCookies));

    // Create CookieManager instance
    cookieManager = new CookieManager();
  });

  describe('exportCookies', () => {
    it('should successfully export cookies', async () => {
      const result = await cookieManager.exportCookies('example.com');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockEncryptedData);
      expect(result.metadata.total).toBe(1);
      expect(result.metadata.valid).toBe(1);
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: false,
          cookies: mockCookies,
          lastOperation: expect.objectContaining({
            type: 'export',
            success: true,
          }),
        })
      );
    });

    it('should handle rate limiting', async () => {
      mockSecurityManager.isOperationAllowed.mockImplementation(() => Promise.resolve(false));

      await expect(cookieManager.exportCookies('example.com')).rejects.toThrow(
        'Rate limit exceeded'
      );
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: false,
          error: expect.any(Error),
          lastOperation: expect.objectContaining({
            type: 'export',
            success: false,
          }),
        })
      );
    });

    it('should handle chrome API errors', async () => {
      (mockChrome.runtime.lastError as any) = { message: 'Chrome API error' };
      mockChrome.cookies.getAll.mockImplementation((_, callback) => callback([]));

      await expect(cookieManager.exportCookies('example.com')).rejects.toThrow('Chrome API error');
      expect(mockErrorHandler.handleError).toHaveBeenCalled();
    });

    it('should filter out invalid cookies', async () => {
      mockValidator.validateCookie.mockImplementationOnce(() =>
        Promise.resolve({
          ...mockValidationResult,
          isValid: false,
          errors: [
            {
              field: 'value',
              code: 'INVALID_VALUE',
              message: 'Invalid cookie value',
              severity: 'error',
              name: 'ValidationError',
            },
          ],
        })
      );

      const result = await cookieManager.exportCookies('example.com');

      expect(result.metadata.total).toBe(1);
      expect(result.metadata.valid).toBe(0);
    });
  });

  describe('importCookies', () => {
    it('should successfully import cookies', async () => {
      const result = await cookieManager.importCookies(mockEncryptedData);

      expect(result.success).toBe(true);
      expect(result.metadata.total).toBe(1);
      expect(result.metadata.valid).toBe(1);
      expect(result.metadata.imported).toBe(1);
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: false,
          cookies: expect.any(Array),
          lastOperation: expect.objectContaining({
            type: 'import',
            success: true,
          }),
        })
      );
    });

    it('should handle rate limiting', async () => {
      mockSecurityManager.isOperationAllowed.mockImplementation(() => Promise.resolve(false));

      await expect(cookieManager.importCookies(mockEncryptedData)).rejects.toThrow(
        'Rate limit exceeded'
      );
      expect(mockStore.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          loading: false,
          error: expect.any(Error),
          lastOperation: expect.objectContaining({
            type: 'import',
            success: false,
          }),
        })
      );
    });

    it('should handle chrome API errors during cookie setting', async () => {
      (mockChrome.runtime.lastError as any) = { message: 'Chrome API error' };
      mockChrome.cookies.set.mockImplementation((_, callback) => callback());

      const result = await cookieManager.importCookies(mockEncryptedData);

      expect(result.success).toBe(false);
      expect(result.metadata.imported).toBe(0);
    });

    it('should handle invalid cookie data structure', async () => {
      mockSecurityManager.validateCookieData.mockImplementation(() => false);

      await expect(cookieManager.importCookies(mockEncryptedData)).rejects.toThrow(
        'Invalid cookie data structure'
      );
    });
  });
});
