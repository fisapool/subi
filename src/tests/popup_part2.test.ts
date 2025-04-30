import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  addTestProtectionButton,
  addHelpButton,
  openHelpPage,
  addTooltips,
  testCookieProtection,
  displayTestResults,
  setButtonLoading,
  showStatusMessage,
  showErrorMessage,
  checkBrowserCompatibility,
  checkStorageUsage
} from '../popup_part2.js';

// Define types for error message details
type ErrorDetails = null | string | string[];

describe('Popup Part 2', () => {
  let mockDocument: any;
  let mockChrome: any;
  let mockWindow: any;

  beforeEach(() => {
    // Mock document
    mockDocument = {
      createElement: vi.fn().mockImplementation(tagName => ({
        tagName,
        textContent: '',
        className: '',
        style: {},
        dataset: {},
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        removeChild: vi.fn(),
        parentNode: {
          removeChild: vi.fn()
        }
      })),
      getElementById: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(),
      body: {
        appendChild: vi.fn()
      }
    };
    vi.stubGlobal('document', mockDocument);

    // Mock chrome
    mockChrome = {
      tabs: {
        create: vi.fn()
      },
      runtime: {
        sendMessage: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn()
        }
      }
    };
    vi.stubGlobal('chrome', mockChrome);

    // Mock window
    mockWindow = {
      utils: {
        withLock: vi.fn().mockImplementation((_, callback) => callback())
      }
    };
    vi.stubGlobal('window', mockWindow);
  });

  it('should add test protection button with tooltip', () => {
    addTestProtectionButton();

    expect(mockDocument.createElement).toHaveBeenCalledWith('button');
    expect(mockDocument.createElement).toHaveBeenCalledWith('div');
    expect(mockDocument.body.appendChild).toHaveBeenCalled();
  });

  it('should add help button', () => {
    addHelpButton();

    expect(mockDocument.createElement).toHaveBeenCalledWith('button');
    expect(mockDocument.body.appendChild).toHaveBeenCalled();
  });

  it('should open help page', () => {
    openHelpPage();

    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://github.com/fisapool/BytesCookies#readme'
    });
  });

  it('should add tooltips to existing elements', () => {
    // Mock existing buttons
    const saveButton = { appendChild: vi.fn() };
    const restoreButton = { appendChild: vi.fn() };
    mockDocument.getElementById.mockImplementation((id: string) => {
      if (id === 'save-session-cookies') return saveButton;
      if (id === 'restore-session-cookies') return restoreButton;
      return null;
    });

    addTooltips();

    expect(saveButton.appendChild).toHaveBeenCalled();
    expect(restoreButton.appendChild).toHaveBeenCalled();
  });

  it('should test cookie protection successfully', async () => {
    // Mock button
    const button = { dataset: {}, textContent: 'Test Protection' };
    mockDocument.getElementById.mockReturnValue(button);

    // Mock successful test results
    mockChrome.runtime.sendMessage.mockResolvedValue(['Test passed']);

    await testCookieProtection();

    expect(mockWindow.utils.withLock).toHaveBeenCalled();
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'testCookieProtection'
    });
  });

  it('should handle cookie protection test errors', async () => {
    // Mock button
    const button = { dataset: {}, textContent: 'Test Protection' };
    mockDocument.getElementById.mockReturnValue(button);

    // Mock error
    mockChrome.runtime.sendMessage.mockRejectedValue(new Error('Test failed'));

    await testCookieProtection();

    expect(mockWindow.utils.withLock).toHaveBeenCalled();
    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'testCookieProtection'
    });
  });

  it('should display test results', () => {
    // Mock existing results
    const existingResults = { remove: vi.fn() };
    mockDocument.querySelector.mockReturnValue(existingResults);

    // Mock button container
    const buttonContainer = { after: vi.fn() };
    mockDocument.querySelector.mockImplementation((selector: string) => {
      if (selector === '.button-container') return buttonContainer;
      return null;
    });

    displayTestResults(['Test 1', 'Test 2']);

    expect(existingResults.remove).toHaveBeenCalled();
    expect(buttonContainer.after).toHaveBeenCalled();
  });

  it('should set button loading state', () => {
    const button = {
      disabled: false,
      textContent: 'Test Protection',
      dataset: {},
      innerHTML: ''
    };

    setButtonLoading(button, true);
    expect(button.disabled).toBe(true);
    expect(button.innerHTML).toContain('spinner');

    setButtonLoading(button, false);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe('Test Protection');
  });

  it('should show status message', () => {
    const statusMessage = {
      textContent: '',
      className: '',
      style: { display: 'none' }
    };
    mockDocument.getElementById.mockReturnValue(statusMessage);

    showStatusMessage('Test message', 'success');

    expect(statusMessage.textContent).toBe('Test message');
    expect(statusMessage.className).toBe('status-message success');
    expect(statusMessage.style.display).toBe('block');
  });

  it('should show error message with details', () => {
    const errorDisplay = { style: { display: 'none' } };
    const errorList = { innerHTML: '' };
    const dismissError = { onclick: null };

    mockDocument.getElementById.mockImplementation((id: string) => {
      if (id === 'errorDisplay') return errorDisplay;
      if (id === 'errorList') return errorList;
      if (id === 'dismissError') return dismissError;
      return null;
    });

    const details: ErrorDetails = ['Detail 1', 'Detail 2'];
    showErrorMessage('Test error', details);

    expect(errorDisplay.style.display).toBe('block');
    expect(errorList.innerHTML).toContain('Test error');
    expect(dismissError.onclick).toBeDefined();
  });

  it('should check browser compatibility', () => {
    const mockNavigator = {
      userAgent: 'Chrome/91.0.4472.124'
    };
    vi.stubGlobal('navigator', mockNavigator);

    const browserInfo = checkBrowserCompatibility();

    expect(browserInfo.name).toBe('Chrome');
    expect(browserInfo.version).toBe('91');
    expect(browserInfo.isSupported).toBe(true);
  });

  it('should check storage usage', async () => {
    const mockItems = { test: 'data' };
    mockChrome.storage.local.get.mockImplementation((_: string, callback: (items: any) => void) => {
      callback(mockItems);
    });

    const usage = await checkStorageUsage();

    expect(usage).toHaveProperty('used');
    expect(usage).toHaveProperty('total');
    expect(usage).toHaveProperty('percent');
    expect(usage).toHaveProperty('isNearLimit');
  });
}); 