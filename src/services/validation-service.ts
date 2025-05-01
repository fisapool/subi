import { Session, SessionGroup, Tab } from '../types/types';

export class ValidationService {
  public validateSession(session: Session): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields validation
    if (!session.id) errors.push('Session ID is required');
    if (!session.name) errors.push('Session name is required');
    if (!session.tabs) errors.push('Session tabs are required');
    if (!session.createdAt) errors.push('Session creation timestamp is required');
    if (!session.updatedAt) errors.push('Session update timestamp is required');

    // Data type validation
    if (typeof session.id !== 'string') errors.push('Session ID must be a string');
    if (typeof session.name !== 'string') errors.push('Session name must be a string');
    if (!Array.isArray(session.tabs)) errors.push('Session tabs must be an array');
    if (typeof session.createdAt !== 'number') errors.push('Creation timestamp must be a number');
    if (typeof session.updatedAt !== 'number') errors.push('Update timestamp must be a number');

    // Tab validation
    if (Array.isArray(session.tabs)) {
      session.tabs.forEach((tab, index) => {
        const tabErrors = this.validateTab(tab);
        if (tabErrors.length > 0) {
          errors.push(`Tab ${index + 1}: ${tabErrors.join(', ')}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateTab(tab: Tab): string[] {
    const errors: string[] = [];

    if (!tab.id) errors.push('Tab ID is required');
    if (!tab.url) errors.push('Tab URL is required');
    if (!tab.title) errors.push('Tab title is required');

    if (typeof tab.id !== 'string') errors.push('Tab ID must be a string');
    if (typeof tab.url !== 'string') errors.push('Tab URL must be a string');
    if (typeof tab.title !== 'string') errors.push('Tab title must be a string');

    // URL validation
    try {
      new URL(tab.url);
    } catch {
      errors.push('Invalid URL format');
    }

    return errors;
  }

  public validateSessionGroup(group: SessionGroup): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!group.id) errors.push('Group ID is required');
    if (!group.name) errors.push('Group name is required');
    if (!group.createdAt) errors.push('Group creation timestamp is required');
    if (!group.updatedAt) errors.push('Group update timestamp is required');

    if (typeof group.id !== 'string') errors.push('Group ID must be a string');
    if (typeof group.name !== 'string') errors.push('Group name must be a string');
    if (typeof group.createdAt !== 'number') errors.push('Creation timestamp must be a number');
    if (typeof group.updatedAt !== 'number') errors.push('Update timestamp must be a number');

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public validateCookieData(cookie: chrome.cookies.Cookie): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!cookie.name) errors.push('Cookie name is required');
    if (!cookie.value) errors.push('Cookie value is required');
    if (!cookie.domain) errors.push('Cookie domain is required');
    if (!cookie.path) errors.push('Cookie path is required');

    // Special character validation
    const specialChars = /[<>:"/\\|?*]/;
    if (specialChars.test(cookie.name)) errors.push('Cookie name contains invalid characters');
    if (specialChars.test(cookie.value)) errors.push('Cookie value contains invalid characters');

    // Domain validation
    try {
      new URL(`https://${cookie.domain}`);
    } catch {
      errors.push('Invalid cookie domain format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public isSessionExpired(session: Session, expirationTime: number): boolean {
    return Date.now() - session.updatedAt > expirationTime;
  }

  public async checkPermissions(permissions: string[]): Promise<{ granted: boolean; missing: string[] }> {
    const missing: string[] = [];
    
    for (const permission of permissions) {
      const hasPermission = await chrome.permissions.contains({ permissions: [permission] });
      if (!hasPermission) {
        missing.push(permission);
      }
    }

    return {
      granted: missing.length === 0,
      missing
    };
  }
} 