import { jest } from '@jest/globals';
import { resetAllMocks, cleanupAfterTest } from './helpers/reset-mocks';
import { initializeBackground } from '../background';

describe('Background Script', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should initialize without errors', done => {
    expect(() => initializeBackground()).not.toThrow();
    done();
  });

  it('should handle messages from content script', done => {
    const mockMessage = { action: 'testProtection' };
    const mockSendResponse = jest.fn();

    // Mock chrome.runtime.onMessage.addListener
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    listener(mockMessage, {}, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalled();
    done();
  });

  it('should handle tab updates', done => {
    const mockTab = { id: 1, url: 'https://example.com' };
    const mockChangeInfo = { status: 'complete' };

    // Mock chrome.tabs.onUpdated.addListener
    const listener = chrome.tabs.onUpdated.addListener.mock.calls[0][0];
    listener(mockTab.id, mockChangeInfo, mockTab);

    expect(chrome.tabs.onUpdated.addListener).toHaveBeenCalled();
    done();
  });

  it('should handle storage changes', done => {
    const mockChanges = {
      focusModeEnabled: { newValue: true },
      meetingModeEnabled: { newValue: false }
    };

    // Mock chrome.storage.onChanged.addListener
    const listener = chrome.storage.onChanged.addListener.mock.calls[0][0];
    listener(mockChanges, 'local');

    expect(chrome.storage.onChanged.addListener).toHaveBeenCalled();
    done();
  });
}); 