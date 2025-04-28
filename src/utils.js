/**
 * Utility functions for handling async operations with locking
 */

// Map to track ongoing operations
const operationLocks = new Map();

/**
 * Executes an async operation with a lock to prevent concurrent execution
 * @param {string} lockKey - Unique identifier for the operation
 * @param {Function} operation - Async function to execute
 * @param {Object} options - Additional options
 * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
 * @param {boolean} options.allowReentry - Whether to allow reentry from the same context (default: false)
 * @returns {Promise<any>} - Result of the operation
 */
async function withLock(lockKey, operation, options = {}) {
  const { timeout = 30000, allowReentry = false } = options;
  
  // Check if operation is already in progress
  if (operationLocks.has(lockKey)) {
    const lock = operationLocks.get(lockKey);
    
    // If reentry is allowed and it's the same context, return the existing promise
    if (allowReentry && lock.context === 'same') {
      return lock.promise;
    }
    
    // Otherwise, reject with an error
    throw new Error(`Operation "${lockKey}" is already in progress`);
  }
  
  // Create a new lock
  const lock = {
    promise: null,
    context: 'same',
    timestamp: Date.now()
  };
  
  // Set up the promise with timeout
  lock.promise = new Promise(async (resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (operationLocks.has(lockKey)) {
        operationLocks.delete(lockKey);
        reject(new Error(`Operation "${lockKey}" timed out after ${timeout}ms`));
      }
    }, timeout);
    
    try {
      // Execute the operation
      const result = await operation();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    } finally {
      // Always clean up the lock
      if (operationLocks.has(lockKey)) {
        operationLocks.delete(lockKey);
      }
    }
  });
  
  // Store the lock
  operationLocks.set(lockKey, lock);
  
  return lock.promise;
}

/**
 * Debounces a function to limit how often it can be called
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * Throttles a function to limit how often it can be called
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Safely updates UI elements during async operations
 * @param {HTMLElement} element - UI element to update
 * @param {Object} updates - Updates to apply
 * @param {boolean} updates.disabled - Whether to disable the element
 * @param {string} updates.text - Text content to set
 * @param {string} updates.className - CSS class to add
 * @param {Function} operation - Async operation to perform
 * @returns {Promise<any>} - Result of the operation
 */
async function withUIUpdate(element, updates, operation) {
  // Store original state
  const originalState = {
    disabled: element.disabled,
    text: element.textContent,
    className: element.className
  };
  
  // Apply updates
  if (updates.disabled !== undefined) element.disabled = updates.disabled;
  if (updates.text !== undefined) element.textContent = updates.text;
  if (updates.className !== undefined) element.className = updates.className;
  
  try {
    // Execute operation
    return await operation();
  } finally {
    // Restore original state
    element.disabled = originalState.disabled;
    element.textContent = originalState.text;
    element.className = originalState.className;
  }
}

// Export utility functions
window.utils = {
  withLock,
  debounce,
  throttle,
  withUIUpdate
}; 