import type { Cookie } from '@/types/cookie';

/**
 * Converts a Chrome cookie to our internal Cookie type
 * @param chromeCookie - The cookie object from Chrome's API
 * @returns Our internal Cookie type
 */
export function convertChromeCookie(chromeCookie: chrome.cookies.Cookie): Cookie {
  return {
    name: chromeCookie.name,
    value: chromeCookie.value,
    domain: chromeCookie.domain,
    path: chromeCookie.path,
    secure: chromeCookie.secure,
    httpOnly: chromeCookie.httpOnly,
    sameSite: chromeCookie.sameSite as 'strict' | 'lax' | 'none',
    expirationDate: chromeCookie.expirationDate
  };
}

/**
 * Converts our internal Cookie type to Chrome's cookie format
 * @param cookie - Our internal Cookie type
 * @returns Chrome's cookie format
 */
export function convertToChromeCookie(cookie: Cookie): chrome.cookies.SetDetails {
  return {
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expirationDate: cookie.expirationDate
  };
}

/**
 * Gets all cookies for a specific domain
 * @param domain - The domain to get cookies for
 * @returns Promise resolving to an array of cookies
 */
export async function getCookiesForDomain(domain: string): Promise<Cookie[]> {
  try {
    const cookies = await chrome.cookies.getAll({ domain });
    return cookies.map(convertChromeCookie);
  } catch (error) {
    console.error('Error getting cookies for domain:', error);
    throw error;
  }
}

/**
 * Sets a cookie in the browser
 * @param cookie - The cookie to set
 * @returns Promise resolving when the cookie is set
 */
export async function setCookie(cookie: Cookie): Promise<void> {
  try {
    await chrome.cookies.set(convertToChromeCookie(cookie));
  } catch (error) {
    console.error('Error setting cookie:', error);
    throw error;
  }
}

/**
 * Removes a cookie from the browser
 * @param cookie - The cookie to remove
 * @returns Promise resolving when the cookie is removed
 */
export async function removeCookie(cookie: Cookie): Promise<void> {
  try {
    const url = `http${cookie.secure ? 's' : ''}://${cookie.domain}${cookie.path}`;
    await chrome.cookies.remove({
      url,
      name: cookie.name
    });
  } catch (error) {
    console.error('Error removing cookie:', error);
    throw error;
  }
}

/**
 * Validates a cookie object
 * @param cookie - The cookie to validate
 * @returns true if the cookie is valid, false otherwise
 */
export function isValidCookie(cookie: Cookie): boolean {
  return (
    typeof cookie.name === 'string' &&
    typeof cookie.value === 'string' &&
    typeof cookie.domain === 'string' &&
    typeof cookie.path === 'string' &&
    typeof cookie.secure === 'boolean' &&
    typeof cookie.httpOnly === 'boolean' &&
    ['strict', 'lax', 'none'].includes(cookie.sameSite)
  );
} 