import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Create a basic DOM structure
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head></head>
    <body>
      <div id="status"></div>
      <div id="sessionList"></div>
      <div id="sessionName"></div>
      <div id="cookiesTableBody"></div>
      <button id="newSession"></button>
      <button id="settings"></button>
      <div id="warningDialog"></div>
      <div id="warningDialogContent"></div>
      <button id="closeWarningDialog"></button>
      <div id="overlay"></div>
      <div id="mainPanel"></div>
      <div id="sessionsPanel"></div>
      <div id="settingsPanel"></div>
      <div id="errorHandler"></div>
      <button id="retryButton"></button>
    </body>
  </html>
`);

// Set up global DOM objects
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Mock window methods
global.window.updateStatus = vi.fn();
global.window.getCsrfToken = vi.fn().mockResolvedValue('mock-token');
global.window.loadSessions = vi.fn().mockResolvedValue([]);
global.window.initialize = vi.fn().mockResolvedValue(undefined);
global.window.createNewSession = vi.fn().mockResolvedValue(undefined);
global.window.openSettings = vi.fn();
global.window.closeWarningDialog = vi.fn();

// Mock localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
} as unknown as Storage;

// Mock sessionStorage
global.sessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
} as unknown as Storage;

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn().mockImplementation(id => clearTimeout(id));

// Mock performance
const mockPerformance = {
  now: vi.fn().mockReturnValue(0),
  timeOrigin: Date.now(),
  timing: {
    navigationStart: 0
  },
  memory: {
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0
  },
  getEntries: vi.fn().mockReturnValue([]),
  getEntriesByName: vi.fn().mockReturnValue([]),
  getEntriesByType: vi.fn().mockReturnValue([]),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  clearResourceTimings: vi.fn()
} as unknown as Performance;

global.performance = mockPerformance;

// Function to reset DOM state
export function resetDOM() {
  // Clear all event listeners
  const elements = document.querySelectorAll('*');
  elements.forEach(element => {
    const newElement = element.cloneNode(false);
    element.parentNode?.replaceChild(newElement, element);
  });

  // Reset window methods
  global.window.updateStatus = vi.fn();
  global.window.getCsrfToken = vi.fn().mockResolvedValue('mock-token');
  global.window.loadSessions = vi.fn().mockResolvedValue([]);
  global.window.initialize = vi.fn().mockResolvedValue(undefined);
  global.window.createNewSession = vi.fn().mockResolvedValue(undefined);
  global.window.openSettings = vi.fn();
  global.window.closeWarningDialog = vi.fn();
}

// Export DOM setup
export { dom }; 