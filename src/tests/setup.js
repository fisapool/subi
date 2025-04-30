import { vi } from 'vitest';
import mockBrowser from './mocks/webextension-polyfill';

vi.mock('webextension-polyfill', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    __esModule: true,
    default: mockBrowser,
    ...actual,
    ...mockBrowser,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  if (mockBrowser.runtime) {
    mockBrowser.runtime.sendMessage = vi.fn();
    mockBrowser.runtime.openOptionsPage = vi.fn();
  }
  if (mockBrowser.tabs) {
    mockBrowser.tabs.query = vi.fn();
    mockBrowser.tabs.sendMessage = vi.fn();
  }
});
