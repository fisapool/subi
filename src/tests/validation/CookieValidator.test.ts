import { describe, it, expect } from 'vitest';
import { CookieValidator } from '../../../validation/CookieValidator';
import { Cookie } from '../../../types';

describe('CookieValidator', () => {
  const validator = new CookieValidator();

  const validCookie: Cookie = {
    domain: 'example.com',
    name: 'session',
    value: 'abc123',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
  };

  describe('validateCookie', () => {
    it('should validate a valid cookie', async () => {
      const result = await validator.validateCookie(validCookie);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata).toEqual(
        expect.objectContaining({
          created: expect.any(Number),
          size: expect.any(Number),
          hasSecureFlag: true,
        })
      );
    });

    it('should handle missing required fields', async () => {
      const invalidCookie = {
        domain: 'example.com',
        name: 'session',
        // missing value and path
      } as Cookie;

      const result = await validator.validateCookie(invalidCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'MISSING_REQUIRED_FIELD',
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'path',
          code: 'MISSING_REQUIRED_FIELD',
        })
      );
    });

    it('should validate domain format', async () => {
      const invalidDomainCookie = {
        ...validCookie,
        domain: 'invalid-domain',
      };

      const result = await validator.validateCookie(invalidDomainCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'domain',
          code: 'INVALID_DOMAIN_FORMAT',
        })
      );
    });

    it('should warn about long cookie values', async () => {
      const longValueCookie = {
        ...validCookie,
        value: 'a'.repeat(5000),
      };

      const result = await validator.validateCookie(longValueCookie);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'VALUE_TOO_LONG',
        })
      );
    });

    it('should detect suspicious content', async () => {
      const suspiciousPatterns = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'data:text/html,<script>',
        'vbscript:alert',
        'onclick=alert(1)',
        'onerror=alert(1)',
        'onload=alert(1)',
        '%3Cscript%3Ealert(1)%3C/script%3E',
      ];

      for (const pattern of suspiciousPatterns) {
        const suspiciousCookie = {
          ...validCookie,
          value: pattern,
        };

        const result = await validator.validateCookie(suspiciousCookie);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'value',
            code: 'SUSPICIOUS_CONTENT',
          })
        );
      }
    });

    it('should validate path format', async () => {
      const invalidPathCookie = {
        ...validCookie,
        path: 'invalid-path',
      };

      const result = await validator.validateCookie(invalidPathCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'path',
          code: 'INVALID_PATH_FORMAT',
        })
      );
    });

    it('should warn about missing security flags', async () => {
      const insecureCookie = {
        ...validCookie,
        domain: 'https://example.com',
        secure: false,
        httpOnly: false,
        sameSite: 'none',
      };

      const result = await validator.validateCookie(insecureCookie);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'secure',
          code: 'MISSING_SECURE_FLAG',
        })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'httpOnly',
          code: 'MISSING_HTTPONLY_FLAG',
        })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'sameSite',
          code: 'WEAK_SAME_SITE',
        })
      );
    });

    it('should warn about large cookie size', async () => {
      const largeCookie = {
        ...validCookie,
        value: 'a'.repeat(4000), // This will make the stringified cookie exceed 4096 bytes
        extraField1: 'a'.repeat(1000),
        extraField2: 'a'.repeat(1000),
      } as Cookie;

      const result = await validator.validateCookie(largeCookie);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'size',
          code: 'COOKIE_TOO_LARGE',
        })
      );
    });

    it('should handle validation errors gracefully', async () => {
      const malformedCookie = null as unknown as Cookie;

      await expect(validator.validateCookie(malformedCookie)).rejects.toThrow('Validation failed');
    });

    it('should validate empty string values as invalid', async () => {
      const emptyValuesCookie = {
        ...validCookie,
        value: '',
        path: '',
      };

      const result = await validator.validateCookie(emptyValuesCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'MISSING_REQUIRED_FIELD',
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'path',
          code: 'MISSING_REQUIRED_FIELD',
        })
      );
    });

    it('should validate domain length', async () => {
      const longDomainCookie = {
        ...validCookie,
        domain: `${'a'.repeat(250)}.com`,
      };

      const result = await validator.validateCookie(longDomainCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'domain',
          code: 'INVALID_DOMAIN_FORMAT',
        })
      );
    });

    it('should accept valid domain variations', async () => {
      const validDomains = [
        'example.com',
        'sub.example.com',
        'sub-domain.example.com',
        'example-domain.com',
        'example.co.uk',
      ];

      for (const domain of validDomains) {
        const cookie = { ...validCookie, domain };
        const result = await validator.validateCookie(cookie);
        expect(result.isValid).toBe(true);
      }
    });

    it('should validate sameSite enum values', async () => {
      const invalidSameSiteCookie = {
        ...validCookie,
        sameSite: 'invalid' as any,
      };

      const result = await validator.validateCookie(invalidSameSiteCookie);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'sameSite',
          code: 'WEAK_SAME_SITE',
        })
      );
    });

    it('should accumulate multiple validation errors', async () => {
      const multipleErrorsCookie = {
        ...validCookie,
        domain: 'invalid-domain',
        path: 'invalid-path',
        value: '<script>alert(1)</script>',
      };

      const result = await validator.validateCookie(multipleErrorsCookie);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'domain',
          code: 'INVALID_DOMAIN_FORMAT',
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'path',
          code: 'INVALID_PATH_FORMAT',
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'value',
          code: 'SUSPICIOUS_CONTENT',
        })
      );
    });

    it('should generate accurate metadata', async () => {
      const testCookie = {
        ...validCookie,
        secure: false,
      };

      const result = await validator.validateCookie(testCookie);
      const cookieSize = JSON.stringify(testCookie).length;

      expect(result.metadata).toEqual({
        created: expect.any(Number),
        size: cookieSize,
        hasSecureFlag: false,
      });
      expect(result.metadata.created).toBeLessThanOrEqual(Date.now());
      expect(result.metadata.created).toBeGreaterThan(Date.now() - 1000); // Within last second
    });

    it('should handle undefined optional fields', async () => {
      const minimalCookie = {
        domain: 'example.com',
        name: 'session',
        value: 'abc123',
        path: '/',
      };

      const result = await validator.validateCookie(minimalCookie);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'httpOnly',
          code: 'MISSING_HTTPONLY_FLAG',
        })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'sameSite',
          code: 'WEAK_SAME_SITE',
        })
      );
    });

    it('should validate domain with special TLDs', async () => {
      const specialTLDs = [
        'example.co.uk',
        'example.com.br',
        'example.edu',
        'example.gov',
        'example.app',
      ];

      for (const domain of specialTLDs) {
        const cookie = { ...validCookie, domain };
        const result = await validator.validateCookie(cookie);
        expect(result.isValid).toBe(true);
      }
    });

    describe('domain validation', () => {
      it('should reject domains exceeding maximum length', async () => {
        const longDomain = 'a'.repeat(256) + '.com';
        const cookie = { ...validCookie, domain: longDomain };

        const result = await validator.validateCookie(cookie);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'domain',
            code: 'INVALID_DOMAIN_FORMAT',
          })
        );
      });

      it('should reject domains with special characters', async () => {
        const invalidDomains = [
          'example!.com',
          'example@.com',
          'example#.com',
          'example$.com',
          'example%.com',
        ];

        for (const domain of invalidDomains) {
          const cookie = { ...validCookie, domain };
          const result = await validator.validateCookie(cookie);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              field: 'domain',
              code: 'INVALID_DOMAIN_FORMAT',
            })
          );
        }
      });

      it('should handle undefined domain', async () => {
        const cookie = {
          ...validCookie,
          domain: undefined as unknown as string,
        };

        const result = await validator.validateCookie(cookie);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'domain',
            code: 'MISSING_REQUIRED_FIELD',
          })
        );
      });
    });

    describe('security checks', () => {
      it('should detect each suspicious pattern individually', async () => {
        const patterns = [
          '<script>',
          'javascript:',
          'data:',
          'vbscript:',
          'onclick=',
          'onerror=',
          'onload=',
          '%3Cscript',
        ];

        for (const pattern of patterns) {
          const cookie = { ...validCookie, value: `prefix${pattern}suffix` };
          const result = await validator.validateCookie(cookie);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              field: 'value',
              code: 'SUSPICIOUS_CONTENT',
            })
          );
        }
      });

      it('should detect multiple suspicious patterns in one value', async () => {
        const cookie = {
          ...validCookie,
          value: '<script>javascript:alert(1)</script>',
        };

        const result = await validator.validateCookie(cookie);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'value',
            code: 'SUSPICIOUS_CONTENT',
          })
        );
      });

      it('should detect suspicious patterns case-insensitively', async () => {
        const variations = [
          '<SCRIPT>',
          'JAVASCRIPT:',
          'Data:',
          'VBScript:',
          'ONCLICK=',
          'OnError=',
          'OnLoad=',
          '%3CsCrIpT',
        ];

        for (const pattern of variations) {
          const cookie = { ...validCookie, value: pattern };
          const result = await validator.validateCookie(cookie);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContainEqual(
            expect.objectContaining({
              field: 'value',
              code: 'SUSPICIOUS_CONTENT',
            })
          );
        }
      });
    });

    describe('error handling', () => {
      it('should handle undefined cookie object', async () => {
        await expect(validator.validateCookie(undefined as any)).rejects.toThrow(
          'Validation failed'
        );
      });

      it('should handle malformed cookie properties', async () => {
        const malformedCookie = {
          ...validCookie,
          secure: 'not-a-boolean',
          httpOnly: 123,
          sameSite: true,
        } as any;

        const result = await validator.validateCookie(malformedCookie);

        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            field: 'sameSite',
            code: 'WEAK_SAME_SITE',
          })
        );
      });

      it('should handle empty string cookie values', async () => {
        const cookie = {
          ...validCookie,
          value: '',
        };

        const result = await validator.validateCookie(cookie);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual(
          expect.objectContaining({
            field: 'value',
            code: 'MISSING_REQUIRED_FIELD',
          })
        );
      });
    });
  });
});
