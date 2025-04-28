// Error types and constants
const ERROR_LEVELS = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info'
};

const MAX_RETRY_ATTEMPTS = 3;
const REQUIRED_COOKIE_FIELDS = ['domain', 'name', 'value'];
const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
const MAX_COOKIE_SIZE = 4096;
const SUSPICIOUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /data:/i,
  /vbscript:/i,
  /onclick/i,
  /onerror/i,
  /onload/i,
  /%3Cscript/i
];

// Special cookie prefixes that require special handling
const SPECIAL_COOKIE_PREFIXES = [
  '__Host-',
  '__Secure-',
  '__SameSite=',
  '__Host-',
  '__Secure-'
];

// Cache configuration
const CACHE_CONFIG = {
  MAX_SIZE: 1000,
  TTL: 5 * 60 * 1000, // 5 minutes
  BATCH_SIZE: 50
};

// Cache implementation
class Cache {
  constructor(maxSize = CACHE_CONFIG.MAX_SIZE, ttl = CACHE_CONFIG.TTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }
}

// Error handling class
class ErrorHandler {
  constructor() {
    this.retryCount = new Map();
  }

  async handleError(error, context, operation) {
    console.error(`Error in ${context} during ${operation}:`, error);
    
    // Enhance error with context
    const enhancedError = this.enhanceError(error, context);
    
    // Log error
    await this.logError(enhancedError);
    
    // Check if we should retry
    if (this.shouldRetry(enhancedError)) {
      const retryResult = await this.retryOperation(enhancedError, operation);
      if (retryResult.success) {
        return {
          handled: true,
          recovered: true,
          message: 'Operation recovered after retry'
        };
      }
    }
    
    // Return error result
    return {
      handled: true,
      recovered: false,
      message: this.getErrorMessage(enhancedError)
    };
  }
  
  enhanceError(error, context) {
    return {
      original: error,
      timestamp: new Date(),
      context,
      level: this.determineErrorLevel(error),
      code: this.getErrorCode(error),
      recoverable: this.isRecoverable(error)
    };
  }
  
  determineErrorLevel(error) {
    // Handle different types of error objects
    let errorMessage = '';
    
    if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error';
    } else if (typeof error === 'object' && error !== null) {
      // Check if the object has a message property
      if (error.message) {
        errorMessage = error.message;
      } else {
        // Try to stringify the object
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error object';
        }
      }
    } else {
      errorMessage = String(error);
    }
    
    // Ensure we have a valid error message
    if (!errorMessage || errorMessage === '[object Object]') {
      errorMessage = 'Unknown error';
    }
    
    // Critical errors that should always be shown
    if (errorMessage.includes('Failed to parse') || 
        errorMessage.includes('Invalid cookie data') ||
        errorMessage.includes('Security violation')) {
      return ERROR_LEVELS.CRITICAL;
    }
    
    // Warnings for validation issues that don't prevent cookie operation
    if (errorMessage.includes('Missing domain') ||
        errorMessage.includes('__Host-') ||
        errorMessage.includes('validation')) {
      return ERROR_LEVELS.WARNING;
    }
    
    // Info level for non-critical issues
    return ERROR_LEVELS.INFO;
  }
  
  getErrorCode(error) {
    if (error instanceof DOMException) {
      return `DOM_${error.name}`;
    }
    
    // Check for specific cookie errors
    if (error.message.includes('Failed to parse or set cookie')) {
      return 'COOKIE_PARSE_ERROR';
    }
    
    if (error.message.includes('__Host-') || error.message.includes('__Secure-')) {
      return 'HOST_COOKIE_ERROR';
    }
    
    return error.name || 'UNKNOWN_ERROR';
  }
  
  isRecoverable(error) {
    // Network errors and some DOMExceptions are recoverable
    return error.message.includes('network') || 
           (error instanceof DOMException && 
            !error.message.includes('QuotaExceededError'));
  }
  
  shouldRetry(error) {
    const retryCount = this.retryCount.get(error.code) || 0;
    return error.recoverable && retryCount < MAX_RETRY_ATTEMPTS;
  }
  
  async retryOperation(error, operation) {
    const retryCount = this.retryCount.get(error.code) || 0;
    this.retryCount.set(error.code, retryCount + 1);
    
    // Exponential backoff
    const delay = Math.pow(2, retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return { success: true };
  }
  
  async logError(error) {
    // Create a detailed error entry with context and suggestions
    const errorEntry = {
      message: error.original.message || 'Unknown error',
      context: error.context || 'Unknown context',
      level: error.level || 'unknown',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString(),
      suggestions: this.getErrorSuggestions(error),
      recoverable: error.recoverable
    };

    // Only include stack trace for critical errors
    if (error.level === ERROR_LEVELS.CRITICAL) {
      errorEntry.stack = error.original.stack;
    }

    // Log to console with appropriate verbosity based on error level
    if (error.level === ERROR_LEVELS.CRITICAL) {
      console.error(
        `[CookieManager.${error.context}] Critical Error:`,
        JSON.stringify(errorEntry, null, 2)
      );
    } else if (error.level === ERROR_LEVELS.WARNING) {
      console.warn(
        `[CookieManager.${error.context}] Warning:`,
        errorEntry.message
      );
    } else {
      console.info(
        `[CookieManager.${error.context}] Info:`,
        errorEntry.message
      );
    }

    // Only notify UI for critical errors
    if (error.level === ERROR_LEVELS.CRITICAL) {
      this.notifyUI(errorEntry);
    }
  }
  
  getErrorSuggestions(error) {
    const suggestions = [];

    // Add context-specific suggestions
    switch (error.code) {
      case 'COOKIE_PARSE_ERROR':
        suggestions.push(
          'Check if the cookie data is properly formatted',
          'Verify that all required fields are present',
          'Ensure the cookie value is properly encoded'
        );
        break;
      case 'HOST_COOKIE_ERROR':
        suggestions.push(
          'Verify that the domain matches the __Host- or __Secure- prefix requirements',
          'Ensure the cookie is being set over HTTPS',
          'Check if the path is set to "/" for __Host- cookies'
        );
        break;
      case 'DOM_QuotaExceededError':
        suggestions.push(
          'Consider clearing some existing cookies',
          'Check if the cookie value size can be reduced',
          'Verify if the storage quota has been exceeded'
        );
        break;
      default:
        if (error.recoverable) {
          suggestions.push('The operation will be retried automatically');
        }
    }

    return suggestions;
  }
  
  notifyUI(errorEntry) {
    // Attempt to send error to extension's UI if available
    try {
      chrome.runtime.sendMessage({
        type: 'ERROR_NOTIFICATION',
        error: errorEntry
      });
    } catch (e) {
      console.warn('Failed to notify UI of error:', e);
    }
  }
  
  getErrorMessage(error) {
    // Handle different error types
    if (error.original instanceof DOMException) {
      return `Error in ${error.context}: ${error.original.name} - ${error.original.message}`;
    } else if (error.original && typeof error.original === 'object') {
      // For object errors, try to extract a meaningful message
      const message = error.original.message || 
                     error.original.toString() || 
                     JSON.stringify(error.original);
      return `Error in ${error.context}: ${message}`;
    } else {
      return `Error in ${error.context}: ${error.original || 'Unknown error'}`;
    }
  }
}

// Cookie validation class
class CookieValidator {
  validateCookie(cookie) {
    const errors = [];
    const warnings = [];
    
    // Check for hostOnly property and add a warning
    if ('hostOnly' in cookie) {
      warnings.push({
        field: 'hostOnly',
        message: 'hostOnly property is not supported by Chrome cookies API and will be removed'
      });
    }
    
    // Validate required fields
    this.validateRequiredFields(cookie, errors);
    
    // Validate domain
    this.validateDomain(cookie.domain, errors);
    
    // Validate value
    this.validateValue(cookie.value, warnings);
    
    // Check for suspicious content
    if (this.containsSuspiciousContent(cookie.value)) {
      warnings.push({
        field: 'value',
        message: 'Cookie value contains potentially suspicious content'
      });
    }
    
    // Validate size
    if (cookie.value.length > MAX_COOKIE_SIZE) {
      warnings.push({
        field: 'value',
        message: 'Cookie value exceeds recommended size'
      });
    }
    
    // Special handling for host-prefixed cookies
    this.validateHostCookie(cookie, errors, warnings);
    
    // Validate security flags
    this.validateSecurityFlags(cookie, warnings);
    
    // Validate expirationDate if present
    if (cookie.expirationDate !== undefined) {
      if (typeof cookie.expirationDate !== 'number') {
        errors.push({
          field: 'expirationDate',
          message: 'expirationDate must be a number (seconds since epoch)'
        });
      } else if (cookie.expirationDate < Date.now() / 1000) {
        warnings.push({
          field: 'expirationDate',
          message: 'Cookie has already expired'
        });
      }
    }
    
    // Validate sameSite if present
    if (cookie.sameSite !== undefined) {
      const validSameSiteValues = ['no_restriction', 'lax', 'strict'];
      if (!validSameSiteValues.includes(cookie.sameSite)) {
        errors.push({
          field: 'sameSite',
          message: `sameSite must be one of: ${validSameSiteValues.join(', ')}`
        });
      }
    }
    
    // Validate path if present
    if (cookie.path !== undefined && typeof cookie.path !== 'string') {
      errors.push({
        field: 'path',
        message: 'path must be a string'
      });
    }
    
    // Validate secure flag if present
    if (cookie.secure !== undefined && typeof cookie.secure !== 'boolean') {
      errors.push({
        field: 'secure',
        message: 'secure must be a boolean'
      });
    }
    
    // Validate httpOnly flag if present
    if (cookie.httpOnly !== undefined && typeof cookie.httpOnly !== 'boolean') {
      errors.push({
        field: 'httpOnly',
        message: 'httpOnly must be a boolean'
      });
    }
    
    // Validate storeId if present
    if (cookie.storeId !== undefined && typeof cookie.storeId !== 'string') {
      errors.push({
        field: 'storeId',
        message: 'storeId must be a string'
      });
    }
    
    // Create detailed validation result
    const validationResult = {
      isValid: errors.length === 0,
      cookieName: cookie.name || 'unknown',
      cookieDomain: cookie.domain || 'unknown',
      errors,
      warnings,
      timestamp: new Date().toISOString()
    };
    
    // Log validation results with JSON formatting - only log errors, not warnings
    if (errors.length > 0) {
      console.error(`Cookie validation errors for ${cookie.name}:`, JSON.stringify(validationResult, null, 2));
    }
    
    // Only log warnings at debug level to reduce noise
    if (warnings.length > 0) {
      console.debug(`Cookie validation warnings for ${cookie.name}:`, JSON.stringify(validationResult, null, 2));
    }
    
    return validationResult;
  }
  
  validateRequiredFields(cookie, errors) {
    const missingFields = REQUIRED_COOKIE_FIELDS.filter(field => !cookie[field]);
    
    // Special handling for __Host- cookies which may not have a domain
    if (cookie.name && cookie.name.startsWith('__Host-')) {
      // Remove domain from required fields for __Host- cookies
      const hostSpecificFields = REQUIRED_COOKIE_FIELDS.filter(field => field !== 'domain');
      const missingHostFields = hostSpecificFields.filter(field => !cookie[field]);
      
      if (missingHostFields.length > 0) {
        errors.push({
          level: ERROR_LEVELS.CRITICAL,
          message: `Missing required fields for __Host- cookie: ${missingHostFields.join(', ')}`
        });
      }
    } else if (missingFields.length > 0) {
      errors.push({
        level: ERROR_LEVELS.CRITICAL,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
  }
  
  validateDomain(domain, errors) {
    if (!domain || !DOMAIN_REGEX.test(domain)) {
      errors.push({
        field: 'domain',
        message: 'Invalid domain format'
      });
    }
  }
  
  validateValue(value, warnings) {
    if (!value) {
      warnings.push({
        field: 'value',
        message: 'Empty cookie value'
      });
    }
  }
  
  containsSuspiciousContent(value) {
    return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(value));
  }
  
  validateHostCookie(cookie, errors, warnings) {
    // Check if this is a host-prefixed cookie
    const isHostCookie = SPECIAL_COOKIE_PREFIXES.some(prefix => 
      cookie.name.startsWith(prefix)
    );
    
    if (isHostCookie) {
      // Host cookies require specific settings
      if (!cookie.secure) {
        errors.push({
          field: 'secure',
          message: 'Host-prefixed cookies must be secure'
        });
      }
      
      if (cookie.path !== '/') {
        errors.push({
          field: 'path',
          message: 'Host-prefixed cookies must have path="/"'
        });
      }
      
      // For __Host- cookies, domain should be empty or match the current domain
      if (cookie.name.startsWith('__Host-')) {
        if (cookie.domain) {
          warnings.push({
            field: 'domain',
            message: '__Host- cookies should not specify a domain according to browser standards'
          });
        }
      }
    }
  }

  validateSecurityFlags(cookie, warnings) {
    // Check for secure flag on sensitive cookies
    if (cookie.name.includes('session') || cookie.name.includes('token')) {
      if (!cookie.secure) {
        warnings.push({
          field: 'secure',
          message: 'Sensitive cookies should be secure'
        });
      }
    }

    // Check for httpOnly flag on sensitive cookies
    if (cookie.name.includes('session') || cookie.name.includes('token')) {
      if (!cookie.httpOnly) {
        warnings.push({
          field: 'httpOnly',
          message: 'Sensitive cookies should be httpOnly'
        });
      }
    }
  }
}

export class CookieManager {
  constructor() {
    this.validator = new CookieValidator();
    this.errorHandler = new ErrorHandler();
    this.errorManager = new ErrorManager();
    this.cache = new Cache();
    this.pendingOperations = new Map();
    this.worker = null;
    this.initializeWorker();
  }

  initializeWorker() {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker('cookie-worker.js');
      this.worker.onmessage = (e) => {
        const { id, result } = e.data;
        const resolve = this.pendingOperations.get(id);
        if (resolve) {
          resolve(result);
          this.pendingOperations.delete(id);
        }
      };
    }
  }

  async batchProcess(operations) {
    const batches = [];
    for (let i = 0; i < operations.length; i += CACHE_CONFIG.BATCH_SIZE) {
      batches.push(operations.slice(i, i + CACHE_CONFIG.BATCH_SIZE));
    }

    const results = [];
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(op => this.executeOperation(op))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async executeOperation(operation) {
    const cacheKey = this.getCacheKey(operation);
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) return cachedResult;

    if (this.worker && operation.type === 'heavy') {
      return new Promise((resolve) => {
        const id = Date.now().toString();
        this.pendingOperations.set(id, resolve);
        this.worker.postMessage({ id, operation });
      });
    }

    const result = await this.processOperation(operation);
    this.cache.set(cacheKey, result);
    return result;
  }

  getCacheKey(operation) {
    return `${operation.type}-${operation.domain}-${JSON.stringify(operation.data)}`;
  }

  async processOperation(operation) {
    switch (operation.type) {
      case 'get':
        return this.getCookies(operation.domain);
      case 'set':
        return this.setCookies(operation.data, operation.domain);
      case 'remove':
        return this.removeCookies(operation.domain);
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async initialize() {
    try {
      const result = await chrome.storage.local.get('encryptionKey');
      if (result.encryptionKey) {
        this.encryptionKey = result.encryptionKey;
      } else {
        this.encryptionKey = await this.generateEncryptionKey();
        await chrome.storage.local.set({ encryptionKey: this.encryptionKey });
      }
    } catch (error) {
      this.errorManager.addError(error, { operation: 'initialize' });
      throw error;
    }
  }

  async generateEncryptionKey() {
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    return key;
  }

  async importCookies(cookies, ignoreWarnings = false) {
    return this.errorManager.withRetry(async () => {
      if (!Array.isArray(cookies)) {
        throw new Error('Invalid cookie data format');
      }

      const results = {
        success: [],
        failed: [],
        warnings: [],
        summary: {
          total: cookies.length,
          success: 0,
          failed: 0,
          warnings: 0
        }
      };

      // Check if session is functional before proceeding
      const isSessionValid = await this.validateSession();
      this.errorManager.setSessionValid(isSessionValid);

      for (const cookie of cookies) {
        try {
          // Create a copy of the cookie to avoid modifying the original
          const cookieToImport = { ...cookie };
          
          // Remove unsupported hostOnly property
          if ('hostOnly' in cookieToImport) {
            console.log(`Removing unsupported 'hostOnly' property from cookie: ${cookieToImport.name}`);
            delete cookieToImport.hostOnly;
            // Only add to warnings if not ignoring warnings
            if (!ignoreWarnings) {
              results.warnings.push({
                cookie: cookieToImport.name,
                message: 'Removed unsupported hostOnly property'
              });
              results.summary.warnings++;
            }
          }
          
          // Validate cookie against Chrome extension cookies API schema
          const validation = this.validator.validateCookie(cookieToImport);
          
          // Add any warnings from validation - only if not ignoring warnings
          if (validation.warnings.length > 0 && !ignoreWarnings) {
            results.warnings.push({
              cookie: cookieToImport.name,
              warnings: validation.warnings
            });
            results.summary.warnings++;
          }
          
          // Check for validation errors
          if (!validation.isValid) {
            // Create a detailed error report
            const errorReport = {
              cookie: {
                name: cookieToImport.name,
                domain: cookieToImport.domain,
                path: cookieToImport.path || '/',
                secure: cookieToImport.secure || false,
                httpOnly: cookieToImport.httpOnly || false,
                sameSite: cookieToImport.sameSite || 'no_restriction'
              },
              validationErrors: validation.errors,
              validationWarnings: validation.warnings,
              timestamp: new Date().toISOString()
            };
            
            results.failed.push(errorReport);
            results.summary.failed++;
            
            // Notify UI of validation failure
            this.notifyValidationFailure(errorReport, ignoreWarnings);
            continue;
          }

          // Ensure all required fields are present
          if (!this.validateRequiredCookieFields(cookieToImport)) {
            const errorReport = {
              cookie: {
                name: cookieToImport.name,
                domain: cookieToImport.domain
              },
              error: 'Missing required fields for Chrome cookies API',
              timestamp: new Date().toISOString()
            };
            
            results.failed.push(errorReport);
            results.summary.failed++;
            
            // Notify UI of validation failure
            this.notifyValidationFailure(errorReport, ignoreWarnings);
            continue;
          }

          // Special handling for host-prefixed cookies
          if (this.SPECIAL_COOKIE_PREFIXES.some(prefix => cookieToImport.name.startsWith(prefix))) {
            await this.processHostCookie(cookieToImport);
          } else {
            await this.processRegularCookie(cookieToImport);
          }

          results.success.push({
            name: cookieToImport.name,
            domain: cookieToImport.domain,
            path: cookieToImport.path || '/'
          });
          results.summary.success++;
          
          console.log(`Successfully imported cookie: ${cookieToImport.name} for domain: ${cookieToImport.domain}`);
        } catch (error) {
          // Create a more descriptive error message
          const errorMessage = `Failed to import cookie "${cookie.name}" for domain "${cookie.domain}": ${error.message || 'Unknown error'}`;
          const enhancedError = new Error(errorMessage);
          enhancedError.originalError = error;
          
          this.errorManager.addError(enhancedError, { 
            cookie,
            operation: 'importCookies'
          });
          
          const errorReport = {
            cookie: {
              name: cookie.name,
              domain: cookie.domain
            },
            error: errorMessage,
            timestamp: new Date().toISOString()
          };
          
          results.failed.push(errorReport);
          results.summary.failed++;
          
          // Notify UI of validation failure
          this.notifyValidationFailure(errorReport, ignoreWarnings);
          
          console.error(`Cookie import error: ${errorMessage}`, error);
        }
      }

      // Log summary of import results
      console.log('Cookie import summary:', JSON.stringify(results.summary, null, 2));
      
      return results;
    }, { operation: 'importCookies' });
  }

  // Helper method to validate required fields for Chrome cookies API
  validateRequiredCookieFields(cookie) {
    const requiredFields = ['name', 'value', 'domain'];
    const missingFields = requiredFields.filter(field => !cookie[field]);
    
    if (missingFields.length > 0) {
      console.error(`Missing required fields for cookie: ${JSON.stringify({
        cookieName: cookie.name || 'unknown',
        missingFields,
        timestamp: new Date().toISOString()
      }, null, 2)}`);
      return false;
    }
    
    return true;
  }

  // Method to notify UI of validation failures
  notifyValidationFailure(errorReport, ignoreWarnings = false) {
    // Don't notify UI for validation warnings if ignoreWarnings is true
    if (ignoreWarnings && errorReport.validationWarnings && !errorReport.validationErrors) {
      return;
    }
    
    try {
      chrome.runtime.sendMessage({
        type: 'COOKIE_VALIDATION_FAILURE',
        error: errorReport
      });
    } catch (e) {
      console.warn('Failed to notify UI of validation failure:', e);
    }
  }

  async processHostCookie(cookie) {
    try {
      // Ensure secure flag is set
      cookie.secure = true;
      
      // Set path to root for host cookies
      cookie.path = '/';
      
      // For __Host- cookies, remove domain
      if (cookie.name.startsWith('__Host-')) {
        // Remove domain for __Host- cookies as per browser standards
        delete cookie.domain;
      }

      // Prepare cookie object for chrome.cookies.set
      const cookieDetails = {
        url: this.getCookieUrl(cookie),
        name: cookie.name,
        value: cookie.value,
        path: cookie.path,
        secure: cookie.secure,
        httpOnly: cookie.httpOnly || false,
        sameSite: cookie.sameSite || 'no_restriction'
      };

      // Only add domain if it exists (for __Secure- cookies)
      if (cookie.domain) {
        cookieDetails.domain = cookie.domain;
      }

      // Add expirationDate if present
      if (cookie.expirationDate) {
        cookieDetails.expirationDate = cookie.expirationDate;
      }

      // Set the cookie
      const result = await chrome.cookies.set(cookieDetails);
      
      if (!result) {
        throw new Error(`Failed to set host cookie: ${cookie.name}`);
      }
      
      console.log(`Successfully set host cookie: ${cookie.name}`);
      return result;
    } catch (error) {
      console.error(`Error setting host cookie: ${cookie.name}`, error);
      throw error;
    }
  }

  async processRegularCookie(cookie) {
    try {
      // Normalize domain
      cookie.domain = this.normalizeDomain(cookie.domain);
      
      // Ensure path is set
      cookie.path = cookie.path || '/';

      // Prepare cookie object for chrome.cookies.set
      const cookieDetails = {
        url: this.getCookieUrl(cookie),
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        secure: cookie.secure || false,
        httpOnly: cookie.httpOnly || false,
        sameSite: cookie.sameSite || 'no_restriction'
      };

      // Add expirationDate if present
      if (cookie.expirationDate) {
        cookieDetails.expirationDate = cookie.expirationDate;
      }

      // Set the cookie
      const result = await chrome.cookies.set(cookieDetails);
      
      if (!result) {
        throw new Error(`Failed to set regular cookie: ${cookie.name}`);
      }
      
      console.log(`Successfully set regular cookie: ${cookie.name}`);
      return result;
    } catch (error) {
      console.error(`Error setting regular cookie: ${cookie.name}`, error);
      throw error;
    }
  }

  normalizeDomain(domain) {
    // Remove leading dot if present
    return domain.startsWith('.') ? domain.slice(1) : domain;
  }

  getCookieUrl(cookie) {
    // For __Host- cookies, use the current origin if domain is missing
    if (cookie.name && cookie.name.startsWith('__Host-') && !cookie.domain) {
      return window.location.origin;
    }
    
    if (!cookie.domain) {
      // For non-__Host- cookies without domain, use current origin as fallback
      return window.location.origin;
    }
    
    const protocol = cookie.secure ? 'https:' : 'http:';
    return `${protocol}//${cookie.domain}`;
  }

  async exportCookies(domain) {
    return this.errorManager.withRetry(async () => {
      const cookies = await chrome.cookies.getAll({ domain });
      
      // Validate cookies and collect warnings
      const warnings = [];
      for (const cookie of cookies) {
        const validation = this.validator.validateCookie(cookie);
        if (validation.warnings.length > 0) {
          warnings.push({
            cookie: cookie.name,
            warnings: validation.warnings
          });
        }
      }
      
      return {
        cookies: cookies.map(cookie => ({
          ...cookie,
          domain: this.normalizeDomain(cookie.domain)
        })),
        warnings: warnings.length > 0 ? warnings : null
      };
    }, { operation: 'exportCookies', domain });
  }

  async setCookies(cookies, domain, ignoreWarnings = false) {
    const operations = cookies.map(cookie => ({
      type: 'set',
      domain,
      data: cookie
    }));

    return this.batchProcess(operations);
  }

  async getCookies(domain) {
    const cacheKey = `cookies-${domain}`;
    const cachedCookies = this.cache.get(cacheKey);
    if (cachedCookies) return cachedCookies;

    const cookies = await chrome.cookies.getAll({ domain });
    this.cache.set(cacheKey, cookies);
    return cookies;
  }

  async removeCookies(domain) {
    const cookies = await this.getCookies(domain);
    const operations = cookies.map(cookie => ({
      type: 'remove',
      domain,
      data: cookie
    }));

    return this.batchProcess(operations);
  }

  async validateSession() {
    try {
      // Check if we can access basic cookie operations
      const testCookie = {
        name: '__test_session_validation',
        value: '1',
        domain: 'localhost'
      };
      
      await chrome.cookies.set(testCookie);
      await chrome.cookies.remove({
        url: 'http://localhost',
        name: testCookie.name
      });
      
      return true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }
}

class ErrorManager {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.maxRetries = 3;
    this.suppressedErrors = new Set();
    this.sessionValid = false;
  }

  // Utility method to safely stringify objects
  safeStringify(obj, indent = 2) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      // Handle Error objects specially
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
          ...Object.getOwnPropertyNames(value).reduce((acc, key) => {
            acc[key] = value[key];
            return acc;
          }, {})
        };
      }
      return value;
    }, indent);
  }

  addError(error, context = {}) {
    let errorDetails = {
      message: '',
      stack: '',
      originalError: null
    };

    if (error instanceof Error) {
      errorDetails = {
        message: error.message || 'Unknown error',
        stack: error.stack || '',
        originalError: error
      };
    } else if (typeof error === 'object' && error !== null) {
      try {
        if (error.message) {
          errorDetails.message = error.message;
        } else {
          errorDetails.message = this.safeStringify(error);
        }
        errorDetails.originalError = error;
      } catch (e) {
        errorDetails.message = 'Failed to process error object';
        errorDetails.originalError = error;
      }
    } else {
      errorDetails.message = String(error);
    }

    // Ensure we have a valid error message
    if (!errorDetails.message || errorDetails.message === '[object Object]') {
      errorDetails.message = 'Unknown error';
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message: errorDetails.message,
      stack: errorDetails.stack,
      context: {
        ...context,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      },
      level: this.determineErrorLevel(error),
      originalError: errorDetails.originalError
    };

    this.errors.push(errorEntry);

    // Enhanced console output with JSON formatting
    console.error(
      `[CookieManager Error] ${errorEntry.context.operation || 'Unknown Operation'}:`,
      JSON.stringify({
        message: errorEntry.message,
        context: errorEntry.context,
        stack: errorEntry.stack || 'No stack trace available',
        level: errorEntry.level
      }, null, 2)
    );

    return errorEntry;
  }

  addWarning(warning, context = {}) {
    // Extract warning message for checking if it should be suppressed
    let warningMessage = '';
    if (typeof warning === 'object') {
      warningMessage = warning.message || this.safeStringify(warning);
    } else {
      warningMessage = String(warning);
    }
    
    // Check if this warning should be suppressed
    const warningKey = this.getErrorKey({ message: warningMessage });
    if (this.shouldSuppressError({ message: warningMessage }, warningKey)) {
      // Only log at debug level for suppressed warnings
      console.debug(
        `[CookieManager Suppressed Warning] ${context.operation || 'Unknown Operation'}:`,
        '\nMessage:', warningMessage,
        '\nContext:', this.safeStringify(context)
      );
      return null;
    }
    
    const warningEntry = {
      timestamp: new Date().toISOString(),
      message: warningMessage,
      context: {
        ...context,
        warningType: typeof warning
      }
    };

    this.warnings.push(warningEntry);
    console.warn(
      `[CookieManager Warning] ${warningEntry.context.operation || 'Unknown Operation'}:`,
      '\nMessage:', warningEntry.message,
      '\nContext:', this.safeStringify(warningEntry.context)
    );

    return warningEntry;
  }

  determineErrorLevel(error) {
    // Handle different types of error objects
    let errorMessage = '';
    
    if (error instanceof Error) {
      errorMessage = error.message || 'Unknown error';
    } else if (typeof error === 'object' && error !== null) {
      // Check if the object has a message property
      if (error.message) {
        errorMessage = error.message;
      } else {
        // Try to stringify the object
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Unknown error object';
        }
      }
    } else {
      errorMessage = String(error);
    }
    
    // Ensure we have a valid error message
    if (!errorMessage || errorMessage === '[object Object]') {
      errorMessage = 'Unknown error';
    }
    
    // Critical errors that should always be shown
    if (errorMessage.includes('Failed to parse') || 
        errorMessage.includes('Invalid cookie data') ||
        errorMessage.includes('Security violation')) {
      return ERROR_LEVELS.CRITICAL;
    }
    
    // Warnings for validation issues that don't prevent cookie operation
    if (errorMessage.includes('Missing domain') ||
        errorMessage.includes('__Host-') ||
        errorMessage.includes('validation')) {
      return ERROR_LEVELS.WARNING;
    }
    
    // Info level for non-critical issues
    return ERROR_LEVELS.INFO;
  }

  async withRetry(operation, context = {}) {
    let lastError = null;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const retryContext = {
          ...context,
          attempt,
          maxRetries: this.maxRetries,
          operation: context.operation || 'Unknown Operation',
          timestamp: new Date().toISOString()
        };

        // Format error for retry context
        let formattedError = error;
        if (!(error instanceof Error)) {
          const errorMessage = typeof error === 'object'
            ? this.safeStringify(error)
            : String(error);
          formattedError = new Error(errorMessage);
          formattedError.originalError = error;
        }

        // Check if this is a suppressed error type
        const errorKey = this.getErrorKey(formattedError);
        if (this.shouldSuppressError(formattedError, errorKey)) {
          // Only log at debug level for suppressed errors
          console.debug(
            `[CookieManager Suppressed] ${retryContext.operation}:`,
            `\nAttempt ${attempt}/${this.maxRetries}`,
            `\nError: ${formattedError.message}`
          );
          continue;
        }

        // Add error with retry context
        this.addError(formattedError, retryContext);

        if (attempt < this.maxRetries) {
          console.warn(
            `[CookieManager Retry] ${retryContext.operation}:`,
            `\nAttempt ${attempt}/${this.maxRetries}`,
            `\nLast Error: ${formattedError.message}`,
            `\nRetrying in ${Math.pow(2, attempt - 1)} seconds...`
          );

          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    // Create a detailed final error
    const finalError = new Error(
      `Operation "${context.operation || 'Unknown'}" failed after ${this.maxRetries} attempts`
    );
    finalError.originalError = lastError;
    finalError.context = context;
    finalError.attempts = this.maxRetries;
    finalError.lastError = lastError instanceof Error ? lastError.message : this.safeStringify(lastError);

    throw finalError;
  }

  getErrorKey(error) {
    // Create a unique key for the error type
    const message = error.message || '';
    if (message.includes('Invalid cookie data format')) {
      return 'INVALID_COOKIE_FORMAT';
    }
    if (message.includes('Failed to parse')) {
      return 'PARSE_ERROR';
    }
    return message;
  }

  shouldSuppressError(error, errorKey) {
    // Don't suppress if session is not valid
    if (!this.sessionValid) {
      return false;
    }

    // Check if this error type should be suppressed
    if (errorKey === 'INVALID_COOKIE_FORMAT') {
      // Only suppress if we've seen this error before
      if (this.suppressedErrors.has(errorKey)) {
        return true;
      }
      this.suppressedErrors.add(errorKey);
      return false;
    }
    
    // Suppress validation warnings for cookies that are still valid
    if (error.message && 
        (error.message.includes('validation') || 
         error.message.includes('__Host-') || 
         error.message.includes('domain format') ||
         error.message.includes('Empty cookie value') ||
         error.message.includes('Cookie value exceeds recommended size') ||
         error.message.includes('Cookie has already expired') ||
         error.message.includes('Sensitive cookies should be secure') ||
         error.message.includes('Sensitive cookies should be httpOnly'))) {
      return true;
    }

    return false;
  }

  setSessionValid(valid) {
    this.sessionValid = valid;
    if (!valid) {
      // Clear suppressed errors when session becomes invalid
      this.suppressedErrors.clear();
    }
  }

  getErrors() {
    return this.errors;
  }

  getWarnings() {
    return this.warnings;
  }

  clear() {
    this.errors = [];
    this.warnings = [];
  }
} 