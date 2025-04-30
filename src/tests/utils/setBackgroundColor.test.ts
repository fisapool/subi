import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

interface StorageCallback {
    theme?: string;
}

describe('Set Background Color', () => {
    let setBackgroundColorModule: any;

    beforeEach(() => {
        // Set up DOM
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        (global as any).document = dom.window.document;
        (global as any).window = dom.window;

        // Mock matchMedia
        (global as any).window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        // Mock chrome.storage
        (global as any).chrome = {
            storage: {
                local: {
                    get: vi.fn(),
                },
                onChanged: {
                    addListener: vi.fn(),
                    removeListener: vi.fn(),
                },
            },
        };

        // Reset document background color
        document.documentElement.style.backgroundColor = '';

        // Clear module cache
        vi.resetModules();
    });

    it('should set dark background when theme is dark', async () => {
        // Mock storage.local.get to return dark theme
        (chrome.storage.local.get as any).mockImplementation((key: string, callback: (items: StorageCallback) => void) => {
            callback({ theme: 'dark' });
            return Promise.resolve({ theme: 'dark' });
        });

        // Mock matchMedia to return light preference (to ensure theme takes precedence)
        (window.matchMedia as any).mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        setBackgroundColorModule = require('../../set-background-color');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.documentElement.style.backgroundColor).toBe('rgb(30, 30, 30)');
    });

    it('should set dark background when theme is not set and system prefers dark', async () => {
        // Mock storage.local.get to return undefined theme
        (chrome.storage.local.get as any).mockImplementation((key: string, callback: (items: StorageCallback) => void) => {
            callback({ theme: undefined });
            return Promise.resolve({ theme: undefined });
        });

        // Mock matchMedia to return dark preference
        (window.matchMedia as any).mockImplementation((query: string) => ({
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        setBackgroundColorModule = require('../../set-background-color');
        
        await vi.waitFor(() => {
            expect(document.documentElement.style.backgroundColor).toBe('rgb(30, 30, 30)');
        }, { timeout: 1000 });
    });

    it('should not set background when theme is light', async () => {
        // Mock storage.local.get to return light theme
        (chrome.storage.local.get as any).mockImplementation((key: string, callback: (items: StorageCallback) => void) => {
            callback({ theme: 'light' });
            return Promise.resolve({ theme: 'light' });
        });

        // Mock matchMedia to return dark preference (to ensure theme takes precedence)
        (window.matchMedia as any).mockImplementation((query: string) => ({
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        setBackgroundColorModule = require('../../set-background-color');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.documentElement.style.backgroundColor).toBe('');
    });

    it('should not set background when theme is not set and system prefers light', async () => {
        // Mock storage.local.get to return undefined theme
        (chrome.storage.local.get as any).mockImplementation((key: string, callback: (items: StorageCallback) => void) => {
            callback({ theme: undefined });
            return Promise.resolve({ theme: undefined });
        });

        // Mock matchMedia to return light preference
        (window.matchMedia as any).mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        setBackgroundColorModule = require('../../set-background-color');
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.documentElement.style.backgroundColor).toBe('');
    });
}); 