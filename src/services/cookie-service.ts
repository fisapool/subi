import { ValidationService } from './validation-service';

export class CookieService {
  private validationService: ValidationService;

  constructor() {
    this.validationService = new ValidationService();
  }

  public async exportCookies(domain: string): Promise<{ success: boolean; cookies?: chrome.cookies.Cookie[]; error?: string }> {
    try {
      // Validate domain
      try {
        new URL(`https://${domain}`);
      } catch {
        return { success: false, error: 'Invalid domain format' };
      }

      const cookies = await chrome.cookies.getAll({ domain });
      
      if (cookies.length === 0) {
        return { success: true, cookies: [] };
      }

      // Validate each cookie
      const validCookies = cookies.filter(cookie => {
        const validation = this.validationService.validateCookieData(cookie);
        return validation.isValid;
      });

      return { success: true, cookies: validCookies };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async importCookies(cookies: chrome.cookies.Cookie[]): Promise<{ success: boolean; error?: string }> {
    try {
      const results = await Promise.all(
        cookies.map(async cookie => {
          // Validate cookie data
          const validation = this.validationService.validateCookieData(cookie);
          if (!validation.isValid) {
            return { success: false, error: validation.errors.join(', ') };
          }

          try {
            await chrome.cookies.set({
              url: `https://${cookie.domain}${cookie.path}`,
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path,
              secure: cookie.secure,
              httpOnly: cookie.httpOnly,
              sameSite: cookie.sameSite,
              expirationDate: cookie.expirationDate
            });
            return { success: true };
          } catch (error: any) {
            return { success: false, error: error.message };
          }
        })
      );

      const failures = results.filter(result => !result.success);
      if (failures.length > 0) {
        return {
          success: false,
          error: `Failed to import ${failures.length} cookies: ${failures.map(f => f.error).join(', ')}`
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async clearCookies(domain: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate domain
      try {
        new URL(`https://${domain}`);
      } catch {
        return { success: false, error: 'Invalid domain format' };
      }

      const cookies = await chrome.cookies.getAll({ domain });
      
      if (cookies.length === 0) {
        return { success: true };
      }

      const results = await Promise.all(
        cookies.map(cookie =>
          chrome.cookies.remove({
            url: `https://${cookie.domain}${cookie.path}`,
            name: cookie.name
          })
        )
      );

      const failures = results.filter(result => !result);
      if (failures.length > 0) {
        return {
          success: false,
          error: `Failed to clear ${failures.length} cookies`
        };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async backupCookies(): Promise<{ success: boolean; cookies?: chrome.cookies.Cookie[]; error?: string }> {
    try {
      const cookies = await chrome.cookies.getAll({});
      
      if (cookies.length === 0) {
        return { success: true, cookies: [] };
      }

      // Validate each cookie
      const validCookies = cookies.filter(cookie => {
        const validation = this.validationService.validateCookieData(cookie);
        return validation.isValid;
      });

      return { success: true, cookies: validCookies };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async restoreFromBackup(cookies: chrome.cookies.Cookie[]): Promise<{ success: boolean; error?: string }> {
    return this.importCookies(cookies);
  }
} 