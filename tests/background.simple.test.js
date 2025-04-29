import { jest } from '@jest/globals';
import { clearMocks } from './mocks/webextension-polyfill.js';

describe('Background Script - Simple Test', () => {
  beforeEach(() => {
    clearMocks();
  });

  it('should import the background module', async () => {
    // This test just checks if we can import the module without errors
    const backgroundModule = await import('../src/background.js');
    expect(backgroundModule).toBeDefined();
  });

  it('should have exported functions', async () => {
    const { 
      handleMessage, 
      handleTabUpdate,
      handleTabRemove,
      handleCookieConsent,
      handleCookieSettings,
      saveSettings,
      getSettings,
      getCookiesForDomain,
      deleteCookiesForDomain,
      scheduleCleanup,
      clearCleanupAlarm,
      initializeAlarms,
      getActiveTab,
      sendMessageToTab
    } = await import('../src/background.js');
    
    expect(handleMessage).toBeDefined();
    expect(handleTabUpdate).toBeDefined();
    expect(handleTabRemove).toBeDefined();
    expect(handleCookieConsent).toBeDefined();
    expect(handleCookieSettings).toBeDefined();
    expect(saveSettings).toBeDefined();
    expect(getSettings).toBeDefined();
    expect(getCookiesForDomain).toBeDefined();
    expect(deleteCookiesForDomain).toBeDefined();
    expect(scheduleCleanup).toBeDefined();
    expect(clearCleanupAlarm).toBeDefined();
    expect(initializeAlarms).toBeDefined();
    expect(getActiveTab).toBeDefined();
    expect(sendMessageToTab).toBeDefined();
  });
}); 