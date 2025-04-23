// Cookie Worker for handling heavy computations
self.onmessage = async function(e) {
  const { id, operation } = e.data;
  
  try {
    const result = await processOperation(operation);
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

async function processOperation(operation) {
  switch (operation.type) {
    case 'set':
      return await processSetOperation(operation);
    case 'remove':
      return await processRemoveOperation(operation);
    case 'validate':
      return await processValidationOperation(operation);
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}

async function processSetOperation(operation) {
  const { domain, data: cookie } = operation;
  
  // Perform heavy validation and processing
  const validationResult = validateCookie(cookie);
  if (!validationResult.isValid) {
    throw new Error(`Invalid cookie: ${validationResult.errors.join(', ')}`);
  }

  // Process the cookie
  const url = getCookieUrl(cookie, domain);
  await chrome.cookies.set({
    url,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain || domain,
    path: cookie.path || '/',
    secure: cookie.secure || false,
    httpOnly: cookie.httpOnly || false,
    sameSite: cookie.sameSite || 'no_restriction',
    expirationDate: cookie.expirationDate
  });

  return { success: true, cookie: { name: cookie.name, domain } };
}

async function processRemoveOperation(operation) {
  const { domain, data: cookie } = operation;
  const url = getCookieUrl(cookie, domain);
  
  await chrome.cookies.remove({
    url,
    name: cookie.name
  });

  return { success: true, cookie: { name: cookie.name, domain } };
}

async function processValidationOperation(operation) {
  const { cookie } = operation;
  return validateCookie(cookie);
}

function validateCookie(cookie) {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!cookie.name) errors.push('Cookie name is required');
  if (!cookie.value) errors.push('Cookie value is required');
  if (!cookie.domain) errors.push('Cookie domain is required');

  // Domain validation
  if (cookie.domain && !isValidDomain(cookie.domain)) {
    errors.push('Invalid domain format');
  }

  // Value validation
  if (cookie.value && cookie.value.length > 4096) {
    errors.push('Cookie value exceeds maximum length of 4096 bytes');
  }

  // Security validation
  if (cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-')) {
    if (!cookie.secure) {
      errors.push('Host/Secure cookies must be secure');
    }
    if (cookie.domain) {
      warnings.push('Host/Secure cookies should not specify a domain');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function isValidDomain(domain) {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

function getCookieUrl(cookie, domain) {
  const protocol = cookie.secure ? 'https:' : 'http:';
  const domainPrefix = cookie.domain || domain;
  return `${protocol}//${domainPrefix}${cookie.path || '/'}`;
} 