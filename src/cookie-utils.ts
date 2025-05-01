import { Cookie, CookieOperation, ExportResult, ImportResult } from '../types/cookie-types';

const CookieUtils = {
  async safeOperation(operation: CookieOperation) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Expected at most 1 argument')) {
        // Handle the specific error by using chrome API as fallback
        return new Promise((resolve, reject) => {
          try {
            (chrome as any)[operation.name](...operation.arguments, resolve);
          } catch (chromeError) {
            reject(chromeError);
          }
        });
      }
      throw error;
    }
  },

  createCookieUrl(cookie: Cookie): string {
    if (!cookie.domain) {
      throw new Error('Cookie domain is required');
    }
    return `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path || '/'}`;
  },

  validateCookie(cookie: Cookie): void {
    if (!cookie.name || !cookie.value || !cookie.domain) {
      throw new Error('Missing required cookie fields');
    }

    if (cookie.secure && !cookie.domain.startsWith('https://')) {
      throw new Error('Secure cookie can only be set over HTTPS');
    }

    if (cookie.expirationDate && typeof cookie.expirationDate !== 'number') {
      throw new Error('Invalid expiration date');
    }

    if (cookie.expirationDate && cookie.expirationDate < Date.now() / 1000) {
      throw new Error('Cookie has expired');
    }

    // Check cookie size limit (typically 4096 bytes)
    const cookieSize = new Blob([JSON.stringify(cookie)]).size;
    if (cookieSize > 4096) {
      throw new Error('Cookie size exceeds limit');
    }
  },

  async getAllCookies(domain: string): Promise<Cookie[]> {
    if (!domain) {
      throw new Error('Domain is required');
    }
    try {
      return await chrome.cookies.getAll({ domain });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Expected at most 1 argument')) {
        return new Promise((resolve) => {
          chrome.cookies.getAll({ domain }, resolve);
        });
      }
      throw error;
    }
  },

  async setCookie(cookie: Cookie): Promise<void> {
    this.validateCookie(cookie);
    try {
      await chrome.cookies.set({
        url: this.createCookieUrl(cookie),
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Expected at most 1 argument')) {
        return new Promise((resolve) => {
          chrome.cookies.set({
            url: this.createCookieUrl(cookie),
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path || '/',
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite,
            expirationDate: cookie.expirationDate,
          }, resolve);
        });
      }
      throw error;
    }
  },

  async removeCookie(cookie: Cookie): Promise<void> {
    if (!cookie.name || !cookie.domain) {
      throw new Error('Cookie name and domain are required');
    }
    try {
      await chrome.cookies.remove({
        url: this.createCookieUrl(cookie),
        name: cookie.name,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Expected at most 1 argument')) {
        return new Promise((resolve) => {
          chrome.cookies.remove({
            url: this.createCookieUrl(cookie),
            name: cookie.name,
          }, resolve);
        });
      }
      throw error;
    }
  },
};

export default CookieUtils;

/**
 * Export cookies to a JSON format
 * @returns {Promise<ExportResult>} Object containing cookies and metadata
 */
export const exportCookies = async (): Promise<ExportResult> => {
  try {
    const cookies = await chrome.cookies.getAll({});
    return {
      cookies,
      timestamp: Date.now(),
      version: '1.0',
    };
  } catch (error) {
    console.error('Failed to export cookies:', error);
    throw error;
  }
};

/**
 * Import cookies from a JSON format
 * @param {Object} importData - Data containing cookies to import
 * @returns {Promise<ImportResult>} Result of the import operation
 */
export const importCookies = async (importData: { cookies: Cookie[]; version?: string }): Promise<ImportResult> => {
  if (!importData || !Array.isArray(importData.cookies)) {
    throw new Error('Invalid import data format');
  }

  if (importData.version && importData.version !== '1.0') {
    throw new Error('Unsupported version');
  }

  let imported = 0;
  let failed = 0;
  const errors: Array<{ cookie: string; error: string }> = [];

  for (const cookie of importData.cookies) {
    try {
      CookieUtils.validateCookie(cookie);
      await chrome.cookies.set({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path || '/'}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate,
      });
      imported++;
    } catch (error) {
      console.error(`Failed to import cookie ${cookie.name}:`, error);
      failed++;
      errors.push({ 
        cookie: cookie.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  return {
    success: imported > 0 || failed === 0,
    imported,
    failed,
    errors,
  };
}; 