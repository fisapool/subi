/**
 * Cookie utility functions for BytesCookies extension
 */

const CookieUtils = {
    async safeOperation(operation) {
        try {
            return await operation();
        } catch (error) {
            if (error.message.includes('Expected at most 1 argument')) {
                // Handle the specific error by using chrome API as fallback
                return new Promise((resolve, reject) => {
                    try {
                        chrome[operation.name](...operation.arguments, resolve);
                    } catch (chromeError) {
                        reject(chromeError);
                    }
                });
            }
            throw error;
        }
    },

    createCookieUrl(cookie) {
        return `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
    },

    async getAllCookies(domain) {
        return this.safeOperation(async () => {
            return await browser.cookies.getAll({ domain });
        });
    },

    async setCookie(cookie) {
        return this.safeOperation(async () => {
            return await browser.cookies.set({
                url: this.createCookieUrl(cookie),
                name: cookie.name,
                value: cookie.value,
                domain: cookie.domain,
                path: cookie.path,
                secure: cookie.secure,
                httpOnly: cookie.httpOnly,
                sameSite: cookie.sameSite,
                expirationDate: cookie.expirationDate
            });
        });
    },

    async removeCookie(cookie) {
        return this.safeOperation(async () => {
            return await browser.cookies.remove({
                url: this.createCookieUrl(cookie),
                name: cookie.name
            });
        });
    }
};

export default CookieUtils;

/**
 * Export cookies to a JSON format
 * @returns {Promise<Object>} Object containing cookies and metadata
 */
export const exportCookies = async () => {
  try {
    const cookies = await chrome.cookies.getAll({});
    return {
      cookies,
      timestamp: Date.now(),
      version: '1.0'
    };
  } catch (error) {
    console.error('Failed to export cookies:', error);
    throw error;
  }
};

/**
 * Import cookies from a JSON format
 * @param {Object} importData - Data containing cookies to import
 * @returns {Promise<Object>} Result of the import operation
 */
export const importCookies = async (importData) => {
  if (!importData || !Array.isArray(importData.cookies)) {
    throw new Error('Invalid import data format');
  }

  if (importData.version && importData.version !== '1.0') {
    throw new Error('Unsupported version');
  }

  let imported = 0;
  let failed = 0;

  for (const cookie of importData.cookies) {
    try {
      await chrome.cookies.set({
        url: `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly,
        sameSite: cookie.sameSite,
        expirationDate: cookie.expirationDate
      });
      imported++;
    } catch (error) {
      console.error(`Failed to import cookie ${cookie.name}:`, error);
      failed++;
    }
  }

  return {
    success: true,
    imported,
    failed
  };
}; 