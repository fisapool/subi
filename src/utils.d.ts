export interface CookieSettings {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function getCookieConsent(): Promise<boolean>;
export function setCookieConsent(value: boolean): Promise<void>;
export function getCookieSettings(): Promise<CookieSettings>;
export function setCookieSettings(settings: CookieSettings): Promise<void>;
export const defaultSettings: CookieSettings;