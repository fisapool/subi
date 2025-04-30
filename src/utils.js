// @ts-check

/** @typedef {Object} CookieSettings
 * @property {boolean} essential - Essential cookies setting
 * @property {boolean} analytics - Analytics cookies setting
 * @property {boolean} marketing - Marketing cookies setting
 */

// Default cookie settings
/** @type {CookieSettings} */
const defaultSettings = {
  essential: true,
  analytics: false,
  marketing: false,
};

// Get cookie consent from storage
/** @returns {Promise<boolean>} */
export async function getCookieConsent() {
  try {
    const { cookieConsent } = await chrome.storage.local.get('cookieConsent');
    return cookieConsent ?? false;
  } catch (error) {
    console.error('Error getting cookie consent:', error);
    throw error;
  }
}

// Set cookie consent in storage
/** @param {boolean} value */
export async function setCookieConsent(value) {
  try {
    await chrome.storage.local.set({ cookieConsent: value });
  } catch (error) {
    console.error('Error setting cookie consent:', error);
    throw error;
  }
}

// Get cookie settings from storage
/** @returns {Promise<CookieSettings>} */
export async function getCookieSettings() {
  try {
    const { cookieSettings } = await chrome.storage.local.get('cookieSettings');
    return cookieSettings ?? defaultSettings;
  } catch (error) {
    console.error('Error getting cookie settings:', error);
    throw error;
  }
}

// Set cookie settings in storage
/** @param {CookieSettings} settings */
export async function setCookieSettings(settings) {
  try {
    await chrome.storage.local.set({ cookieSettings: settings });
  } catch (error) {
    console.error('Error setting cookie settings:', error);
    throw error;
  }
}

// Export default settings for testing
export { defaultSettings };
