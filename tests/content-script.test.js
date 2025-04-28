import { resetAllMocks, cleanupAfterTest } from './helpers/reset-mocks';
import { initializeContentScript } from '../content';

describe('Content Script', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should initialize without errors', done => {
    expect(() => initializeContentScript()).not.toThrow();
    done();
  });

  it('should handle messages from the popup', done => {
    const mockMessage = { action: 'testProtection' };
    const mockSendResponse = jest.fn();

    // Mock chrome.runtime.onMessage.addListener
    const listener = chrome.runtime.onMessage.addListener.mock.calls[0][0];
    listener(mockMessage, {}, mockSendResponse);

    expect(mockSendResponse).toHaveBeenCalled();
    done();
  });
}); 