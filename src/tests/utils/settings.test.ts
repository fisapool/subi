import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Settings', () => {
    let dom: JSDOM;
    let document: Document;
    let chrome: any;
    let settingsModule: any;

    beforeEach(async () => {
        // Setup DOM
        dom = new JSDOM(`
            <!DOCTYPE html>
            <html>
                <body>
                    <input type="checkbox" id="autoSave" />
                    <input type="number" id="autoSaveInterval" />
                    <input type="checkbox" id="encryptData" />
                    <button id="exportData">Export</button>
                    <button id="importData">Import</button>
                    <button id="clearData">Clear</button>
                    <div id="status"></div>
                </body>
            </html>
        `);
        
        document = dom.window.document;
        global.document = document;
        global.window = dom.window as any;

        // Mock FileReader
        class MockFileReader implements Partial<FileReader> {
            onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
            result: string | null = null;
            error: DOMException | null = null;
            readyState: 0 | 1 | 2 = 0;

            readAsText(file: Blob): void {
                setTimeout(() => {
                    if (this.onload) {
                        const mockReader = new FileReader();
                        Object.assign(mockReader, this);
                        const event = new ProgressEvent('load') as ProgressEvent<FileReader>;
                        Object.defineProperty(event, 'target', { value: mockReader });
                        this.onload.call(mockReader, event);
                    }
                }, 0);
            }
        }
        global.FileReader = MockFileReader as any;

        // Mock URL methods
        global.URL.createObjectURL = vi.fn(() => 'mock-url');
        global.URL.revokeObjectURL = vi.fn();

        // Mock chrome API
        chrome = {
            storage: {
                local: {
                    get: vi.fn(),
                    set: vi.fn().mockResolvedValue(undefined)
                }
            },
            runtime: {
                sendMessage: vi.fn()
            }
        };
        global.chrome = chrome;

        // Reset modules
        vi.resetModules();
        settingsModule = await import('../../settings.js');
    });

    it('should load default settings when storage is empty', async () => {
        chrome.storage.local.get.mockResolvedValue({});
        
        // Trigger DOMContentLoaded
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        await vi.waitFor(() => {
            const autoSave = document.getElementById('autoSave') as HTMLInputElement;
            const interval = document.getElementById('autoSaveInterval') as HTMLInputElement;
            const encryptData = document.getElementById('encryptData') as HTMLInputElement;
            
            expect(autoSave.checked).toBe(false);
            expect(interval.value).toBe('30');
            expect(encryptData.checked).toBe(true);
        });
    });

    it('should save settings and update auto-save alarm', async () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        const autoSave = document.getElementById('autoSave') as HTMLInputElement;
        const interval = document.getElementById('autoSaveInterval') as HTMLInputElement;
        const encryptData = document.getElementById('encryptData') as HTMLInputElement;
        
        autoSave.checked = true;
        interval.value = '45';
        encryptData.checked = false;
        autoSave.dispatchEvent(new Event('change'));
        
        await vi.waitFor(() => {
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                settings: {
                    autoSave: true,
                    autoSaveInterval: 45,
                    encryptData: false
                }
            });
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'UPDATE_AUTO_SAVE',
                interval: 45
            });
        });
    });

    it('should handle invalid data during import', async () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true, token: 'mock-token' });
        
        // Mock FileReader
        const mockFileReader = {
            onload: null as any,
            result: '{"invalid": "data"}',
            readAsText: vi.fn().mockImplementation(function(file) {
                setTimeout(() => {
                    if (this.onload) {
                        const event = { target: { result: this.result } };
                        this.onload(event);
                    }
                }, 0);
            }),
        };
        (global as any).FileReader = vi.fn(() => mockFileReader);
        
        // Mock createElement to capture the file input
        let fileInput: HTMLInputElement | null = null;
        const originalCreateElement = document.createElement;
        document.createElement = vi.fn((tagName: string) => {
            if (tagName === 'input') {
                fileInput = originalCreateElement.call(document, tagName) as HTMLInputElement;
                return fileInput;
            }
            return originalCreateElement.call(document, tagName);
        });
        
        const importButton = document.getElementById('importData');
        importButton?.click();
        
        // Wait for the file input to be created
        await new Promise(resolve => setTimeout(resolve, 0));
        
        // Verify that the file input was created
        expect(fileInput).not.toBeNull();
        
        // Simulate file selection
        const mockFile = new File(['{"invalid": "data"}'], 'test.json', { type: 'application/json' });
        const event = new Event('change');
        Object.defineProperty(event, 'target', { value: { files: [mockFile] } });
        fileInput?.dispatchEvent(event);
        
        // Wait for the FileReader to complete
        await new Promise(resolve => setTimeout(resolve, 0));
        
        await vi.waitFor(() => {
            const status = document.getElementById('status');
            expect(status?.textContent).toBe('Invalid data format');
        });
        
        // Restore createElement
        document.createElement = originalCreateElement;
    });

    it('should handle successful data export', async () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        const mockSessions = [
            { id: '1', name: 'Session 1', tabs: [] },
            { id: '2', name: 'Session 2', tabs: [] }
        ];
        
        chrome.runtime.sendMessage.mockResolvedValueOnce({
            success: true,
            sessions: mockSessions
        });
        
        const exportButton = document.getElementById('exportData');
        exportButton?.click();
        
        await vi.waitFor(() => {
            const status = document.getElementById('status');
            expect(status?.textContent).toBe('Data exported successfully (2 sessions)');
            expect(URL.createObjectURL).toHaveBeenCalled();
            expect(URL.revokeObjectURL).toHaveBeenCalled();
        });
    });

    it('should handle clear data with confirmation', async () => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
        
        // Mock window.confirm
        const originalConfirm = window.confirm;
        window.confirm = vi.fn(() => true);
        
        chrome.runtime.sendMessage.mockResolvedValueOnce({ success: true });
        
        const clearButton = document.getElementById('clearData');
        clearButton?.click();
        
        await vi.waitFor(() => {
            const status = document.getElementById('status');
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
                type: 'CLEAR_ALL_DATA'
            });
            expect(status?.textContent).toBe('Data cleared successfully');
        });
        
        // Restore original confirm
        window.confirm = originalConfirm;
    });
}); 