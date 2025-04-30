import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Redirect', () => {
  let mockChrome: any;
  let mockWindow: any;

  beforeEach(() => {
    // Mock chrome.runtime
    mockChrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn()
        },
        sendMessage: vi.fn()
      }
    };
    vi.stubGlobal('chrome', mockChrome);

    // Mock window.location
    mockWindow = {
      location: {
        replace: vi.fn()
      }
    };
    vi.stubGlobal('window', mockWindow);
  });

  it('should handle authenticated status', () => {
    // Simulate message listener being called
    const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    messageListener({ type: 'AUTH_STATUS', isAuthenticated: true }, {}, vi.fn());

    expect(mockWindow.location.replace).toHaveBeenCalledWith('main.html');
  });

  it('should handle unauthenticated status', () => {
    // Simulate message listener being called
    const messageListener = mockChrome.runtime.onMessage.addListener.mock.calls[0][0];
    messageListener({ type: 'AUTH_STATUS', isAuthenticated: false }, {}, vi.fn());

    expect(mockWindow.location.replace).toHaveBeenCalledWith('session-buddy.html');
  });

  it('should check initial auth status', () => {
    // Simulate chrome.runtime.sendMessage callback
    const callback = mockChrome.runtime.sendMessage.mock.calls[0][1];
    callback({ isAuthenticated: true });

    expect(mockWindow.location.replace).toHaveBeenCalledWith('main.html');
  });

  it('should handle undefined auth status response', () => {
    // Simulate chrome.runtime.sendMessage callback with undefined response
    const callback = mockChrome.runtime.sendMessage.mock.calls[0][1];
    callback({});

    expect(mockWindow.location.replace).not.toHaveBeenCalled();
  });

  it('should handle null response', () => {
    // Simulate chrome.runtime.sendMessage callback with null response
    const callback = mockChrome.runtime.sendMessage.mock.calls[0][1];
    callback(null);

    expect(mockWindow.location.replace).not.toHaveBeenCalled();
  });
}); 