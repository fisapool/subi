import { Cookie, ValidationResult, ValidationError, ValidationWarning } from '../types';
import { CookieError } from '../errors';

export class CookieValidator {
  private static readonly REQUIRED_FIELDS = ['name', 'value', 'domain', 'path'] as const;
  private static readonly DOMAIN_REGEX =
    /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9](\.[a-z0-9][a-z0-9-]{1,61}[a-z0-9])*$/i;
  private static readonly MAX_COOKIE_SIZE = 4096;
  private static readonly SUSPICIOUS_PATTERNS = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /on\w+=/i,
    /alert\(/i,
    /eval\(/i,
    /%3Cscript/i,
    /%3C/i,
  ];

  async validateCookie(cookie: Cookie): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Basic validation
      this.validateRequiredFields(cookie, errors);
      this.validateDomain(cookie.domain, errors);
      this.validateValue(cookie.value, warnings);

      // Enhanced security checks
      await this.performSecurityChecks(cookie, errors, warnings);

      // Size validation
      this.validateSize(cookie, warnings);

      // Format validation
      this.validateFormat(cookie, errors);

      // Security best practices
      this.validateSecurityFlags(cookie, warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: this.generateMetadata(cookie),
      };
    } catch (error) {
      throw new CookieError('Validation failed');
    }
  }

  private validateRequiredFields(cookie: Cookie, errors: ValidationError[]): void {
    CookieValidator.REQUIRED_FIELDS.forEach(field => {
      if (!(field in cookie) || !cookie[field as keyof Cookie]) {
        errors.push({
          field,
          code: 'MISSING_REQUIRED_FIELD',
          message: `Missing required field: ${field}`,
          severity: 'error',
          name: 'ValidationError',
        });
      }
    });
  }

  private validateDomain(domain: string | undefined, errors: ValidationError[]): void {
    if (!this.isValidDomainFormat(domain)) {
      errors.push({
        field: 'domain',
        code: 'INVALID_DOMAIN_FORMAT',
        message: 'Invalid domain format',
        severity: 'error',
        name: 'ValidationError',
      });
    }
  }

  private validateValue(value: string, warnings: ValidationWarning[]): void {
    if (value && value.length > 4096) {
      warnings.push({
        field: 'value',
        code: 'VALUE_TOO_LONG',
        message: 'Cookie value exceeds recommended length',
        severity: 'warning',
      });
    }
  }

  private async performSecurityChecks(
    cookie: Cookie,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (cookie.value) {
      // Check for suspicious patterns in the cookie value
      for (const pattern of CookieValidator.SUSPICIOUS_PATTERNS) {
        if (pattern.test(cookie.value)) {
          errors.push({
            field: 'value',
            code: 'SUSPICIOUS_CONTENT',
            message: 'Cookie value contains suspicious content',
            severity: 'error',
            name: 'ValidationError',
          });
          break;
        }
      }
    }

    // Check secure flag for HTTPS domains
    if (cookie.domain && cookie.domain.includes('https://') && !cookie.secure) {
      warnings.push({
        field: 'secure',
        code: 'MISSING_SECURE_FLAG',
        message: 'Secure flag recommended for HTTPS domains',
        severity: 'warning',
      });
    }

    // Recommend httpOnly for sensitive cookies
    if (!cookie.httpOnly) {
      warnings.push({
        field: 'httpOnly',
        code: 'MISSING_HTTPONLY_FLAG',
        message: 'HttpOnly flag recommended for security',
        severity: 'warning',
      });
    }

    // Check SameSite attribute
    const validSameSiteValues = ['strict', 'lax', 'none'];
    const sameSiteValue = typeof cookie.sameSite === 'string' ? cookie.sameSite.toLowerCase() : '';

    if (!sameSiteValue || !validSameSiteValues.includes(sameSiteValue)) {
      warnings.push({
        field: 'sameSite',
        code: 'WEAK_SAME_SITE',
        message: 'Consider using strict SameSite policy',
        severity: 'warning',
      });
    } else if (sameSiteValue === 'none') {
      warnings.push({
        field: 'sameSite',
        code: 'WEAK_SAME_SITE',
        message: 'Consider using strict SameSite policy',
        severity: 'warning',
      });
    }
  }

  private generateMetadata(cookie: Cookie): Record<string, unknown> {
    return {
      created: Date.now(),
      size: JSON.stringify(cookie).length,
      hasSecureFlag: cookie.secure || false,
    };
  }

  private validateFormat(cookie: Cookie, errors: ValidationError[]): void {
    // Check domain format
    if (cookie.domain && !this.isValidDomainFormat(cookie.domain)) {
      errors.push({
        field: 'domain',
        code: 'INVALID_DOMAIN_FORMAT',
        message: 'Invalid domain format',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    // Check path format
    if (cookie.path && !cookie.path.startsWith('/')) {
      errors.push({
        field: 'path',
        code: 'INVALID_PATH_FORMAT',
        message: 'Path must start with /',
        severity: 'error',
        name: 'ValidationError',
      });
    }
  }

  private validateSecurityFlags(cookie: Cookie, warnings: ValidationWarning[]): void {
    // HTTPS domains should use secure flag
    if (cookie.domain && cookie.domain.includes('https://') && !cookie.secure) {
      warnings.push({
        field: 'secure',
        code: 'MISSING_SECURE_FLAG',
        message: 'Secure flag recommended for HTTPS domains',
        severity: 'warning',
      });
    }

    // Recommend httpOnly for sensitive cookies
    if (!cookie.httpOnly) {
      warnings.push({
        field: 'httpOnly',
        code: 'MISSING_HTTPONLY_FLAG',
        message: 'HttpOnly flag recommended for security',
        severity: 'warning',
      });
    }

    // Check SameSite attribute
    const validSameSiteValues = ['strict', 'lax', 'none'];
    const sameSiteValue = typeof cookie.sameSite === 'string' ? cookie.sameSite.toLowerCase() : '';

    if (!sameSiteValue || !validSameSiteValues.includes(sameSiteValue)) {
      warnings.push({
        field: 'sameSite',
        code: 'WEAK_SAME_SITE',
        message: 'Consider using strict SameSite policy',
        severity: 'warning',
      });
    } else if (sameSiteValue === 'none') {
      warnings.push({
        field: 'sameSite',
        code: 'WEAK_SAME_SITE',
        message: 'Consider using strict SameSite policy',
        severity: 'warning',
      });
    }
  }

  private validateSize(cookie: Cookie, warnings: ValidationWarning[]): void {
    const size = JSON.stringify(cookie).length;
    if (size > CookieValidator.MAX_COOKIE_SIZE) {
      warnings.push({
        field: 'size',
        code: 'COOKIE_TOO_LARGE',
        message: `Cookie size (${size} bytes) exceeds recommended limit`,
        severity: 'warning',
      });
    }
  }

  private isValidDomainFormat(domain: string | undefined): boolean {
    if (!domain) return false;

    // Split domain into parts
    const parts = domain.split('.');
    if (parts.length < 2) return false;

    // Check each part
    for (const part of parts) {
      // Part must not be empty
      if (!part) return false;

      // Part must start and end with alphanumeric
      if (!/^[a-zA-Z0-9].*[a-zA-Z0-9]$/.test(part)) return false;

      // Part must only contain alphanumeric and hyphens
      if (!/^[a-zA-Z0-9-]+$/.test(part)) return false;

      // Part must not be longer than 63 characters
      if (part.length > 63) return false;
    }

    // TLD must be at least 2 characters
    if (parts[parts.length - 1].length < 2) return false;

    // Total length must not exceed 255 characters
    if (domain.length > 255) return false;

    return true;
  }
}
