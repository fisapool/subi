// Type definitions for popup_part2.js

export function addTestProtectionButton(): void;
export function addHelpButton(): void;
export function openHelpPage(): void;
export function addTooltips(): void;
export function testCookieProtection(): Promise<void>;
export function displayTestResults(results: string[]): void;
export function setButtonLoading(button: HTMLButtonElement, isLoading: boolean): void;
export function showStatusMessage(message: string, type?: string): void;
export function showErrorMessage(message: string, details?: null | string | string[]): void;
export function checkBrowserCompatibility(): {
  name: string;
  version: string;
  isSupported: boolean;
};
export function checkStorageUsage(): Promise<{
  used: number;
  total: number;
  percent: number;
  isNearLimit: boolean;
}>; 