import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import type { Mock } from 'vitest';
import type { Settings, MessageResponse, ChromeAPI, Session } from '../types';
import { loadSettings, saveSettings, validateSettings, exportData, importData, clearData } from '../settings';
import type { Settings as TypeSettings } from '../types';

// Mock the DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(global as any).document = dom.window.document;
(global as any).window = dom.window;
(global as any).URL = {
  createObjectURL: vi.fn(),
  revokeObjectURL: vi.fn(),
};
(global as any).Blob = class Blob {
  constructor(data: any, options: any) {}
};

// Mock crypto
(global as any).crypto = {
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
};

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn() as Mock & ((key?: string | string[] | object) => Promise<any>) & { mockResolvedValue: (value: any) => void },
      set: vi.fn() as Mock & ((items: object) => Promise<void>) & { mockResolvedValue: (value: any) => void },
    },
  },
  runtime: {
    sendMessage: vi.fn() as Mock & ((message: any) => Promise<MessageResponse>) & { 
      mockResolvedValue: (value: any) => void,
      mockResolvedValueOnce: (value: any) => void 
    },
  },
} as unknown as ChromeAPI;

(global as any).chrome = mockChrome;

beforeEach(() => {
  vi.clearAllMocks();
  mockChrome.storage.local.get.mockResolvedValue({
    settings: {
      autoSave: false,
      autoSaveInterval: 30,
      encryptData: true,
    },
  });
  mockChrome.storage.local.set.mockResolvedValue(undefined);
  mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });
});

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset DOM
    document.body.innerHTML = `
      <input type="checkbox" id="autoSave" />
      <input type="number" id="autoSaveInterval" value="30" />
      <input type="checkbox" id="encryptData" />
      <button id="exportData">Export</button>
      <button id="importData">Import</button>
      <button id="clearData">Clear</button>
      <div id="status"></div>
    `;

    // Load the settings.js file
    require('../settings.js');

    // Trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  describe('Settings Management', () => {
    it('should load settings from storage', async () => {
      const autoSaveCheckbox = document.getElementById('autoSave') as HTMLInputElement;
      const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
      const encryptDataCheckbox = document.getElementById('encryptData') as HTMLInputElement;

      // Wait for settings to load
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(autoSaveCheckbox.checked).toBe(false);
      expect(autoSaveIntervalInput.value).toBe('30');
      expect(encryptDataCheckbox.checked).toBe(true);
    });

    it('should save settings to storage', async () => {
      const autoSaveCheckbox = document.getElementById('autoSave') as HTMLInputElement;
      const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
      const encryptDataCheckbox = document.getElementById('encryptData') as HTMLInputElement;

      // Set values
      autoSaveCheckbox.checked = true;
      autoSaveIntervalInput.value = '45';
      encryptDataCheckbox.checked = false;

      // Trigger change event
      autoSaveCheckbox.dispatchEvent(new Event('change'));

      // Wait for settings to save
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        settings: {
          autoSave: true,
          autoSaveInterval: 45,
          encryptData: false,
        },
      });
    });

    it('should validate auto-save interval', async () => {
      const autoSaveIntervalInput = document.getElementById('autoSaveInterval') as HTMLInputElement;
      
      // Test minimum value
      autoSaveIntervalInput.value = '4';
      autoSaveIntervalInput.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(autoSaveIntervalInput.value).toBe('5');

      // Test maximum value
      autoSaveIntervalInput.value = '121';
      autoSaveIntervalInput.dispatchEvent(new Event('change'));
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(autoSaveIntervalInput.value).toBe('120');
    });
  });

  describe('Data Export', () => {
    it('should export sessions data', async () => {
      const exportDataButton = document.getElementById('exportData');
      const mockSessions: Session[] = [{ id: '1', name: 'Test Session', tabs: [], createdAt: Date.now() }];
      
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        sessions: mockSessions,
      });

      exportDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_SESSIONS',
      });
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle export errors', async () => {
      const exportDataButton = document.getElementById('exportData');
      const statusElement = document.getElementById('status');
      
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'Export failed',
      });

      exportDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusElement?.textContent).toContain('Error exporting data');
    });
  });

  describe('Data Import', () => {
    it('should import valid sessions data', async () => {
      const importDataButton = document.getElementById('importData');
      const mockFile = new File(
        [JSON.stringify([{ id: '1', name: 'Test Session', tabs: [{ url: 'https://example.com' }], createdAt: Date.now() }])],
        'test.json',
        { type: 'application/json' }
      );

      // Mock FileReader
      const mockFileReader = {
        readAsText: vi.fn(),
        result: JSON.stringify([{ id: '1', name: 'Test Session', tabs: [{ url: 'https://example.com' }], createdAt: Date.now() }]),
        onload: null as any,
      };
      (global as any).FileReader = vi.fn(() => mockFileReader);

      // Mock CSRF token
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        token: 'test-token',
      });

      importDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate file selection
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const event = new Event('change');
      Object.defineProperty(event, 'target', { value: { files: [mockFile] } });
      fileInput?.dispatchEvent(event);

      // Simulate FileReader load
      mockFileReader.onload?.({ target: { result: mockFileReader.result } });
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_CSRF_TOKEN',
      });
    });

    it('should handle invalid import data', async () => {
      const importDataButton = document.getElementById('importData');
      const statusElement = document.getElementById('status');
      const mockFile = new File(
        [JSON.stringify({ invalid: 'data' })],
        'test.json',
        { type: 'application/json' }
      );

      // Create a spy for readAsText
      const readAsTextSpy = vi.fn().mockImplementation(function(this: { onload: ((e: { target: { result: string } }) => void) | null }, file) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: JSON.stringify({ invalid: 'data' }) } });
          }
        }, 0);
      });

      // Mock FileReader
      const mockFileReader = {
        readAsText: readAsTextSpy,
        result: JSON.stringify({ invalid: 'data' }),
        onload: null
      };
      (global as any).FileReader = vi.fn(() => mockFileReader);

      // Mock CSRF token
      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
        token: 'test-token',
      });

      // Mock createElement to capture the file input
      let fileInput: HTMLInputElement | null = null;
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn((tagName: string) => {
        if (tagName === 'input') {
          fileInput = originalCreateElement.call(document, tagName) as HTMLInputElement;
          fileInput.type = 'file';
          fileInput.accept = '.json';
          // Mock the click method
          fileInput.click = vi.fn(() => {
            // Simulate file selection immediately after click
            const event = new Event('change');
            Object.defineProperty(event, 'target', { value: { files: [mockFile] } });
            fileInput?.dispatchEvent(event);
          });
          return fileInput;
        }
        return originalCreateElement.call(document, tagName);
      });

      importDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Wait for readAsText to be called
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(readAsTextSpy).toHaveBeenCalled();

      // Wait for the status to be updated
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(statusElement?.textContent).toBe('Invalid data format');
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data', async () => {
      const clearDataButton = document.getElementById('clearData');
      const statusElement = document.getElementById('status');

      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: true,
      });

      clearDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CLEAR_ALL_DATA',
      });
      expect(statusElement?.textContent).toContain('Data cleared successfully');
    });

    it('should handle clear data errors', async () => {
      const clearDataButton = document.getElementById('clearData');
      const statusElement = document.getElementById('status');

      mockChrome.runtime.sendMessage.mockResolvedValueOnce({
        success: false,
        error: 'Clear failed',
      });

      clearDataButton?.click();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(statusElement?.textContent).toContain('Error clearing data');
    });
  });
}); 