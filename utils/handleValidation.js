/**
 * Handle Validation Utility for CBSG
 * Validates user handles according to CBSG requirements:
 * - 3-20 characters
 * - Alphanumeric + underscores only
 * - Case-insensitive (stored lowercase)
 * - Reserved words blocked
 */

const RESERVED_HANDLES = [
  'admin',
  'administrator',
  'allfor4x4',
  'moderator',
  'support',
  'help',
  'api',
  'www',
  'mail',
  'email',
  'root',
  'system',
  'test',
  'testing',
  'null',
  'undefined',
];

/**
 * Validates a handle format
 * @param {string} handle - The handle to validate
 * @returns {Object} - { valid: boolean, error: string }
 */
const validateHandleFormat = (handle) => {
  if (!handle || typeof handle !== 'string') {
    return { valid: false, error: 'Handle is required' };
  }

  const trimmed = handle.trim().toLowerCase();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Handle must be no more than 20 characters' };
  }

  // Alphanumeric + underscore only
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Handle can only contain letters, numbers, and underscores',
    };
  }

  // Check reserved words
  if (RESERVED_HANDLES.includes(trimmed)) {
    return { valid: false, error: 'This handle is reserved and cannot be used' };
  }

  return { valid: true, error: null };
};

/**
 * Normalizes a handle (lowercase, trim)
 * @param {string} handle - The handle to normalize
 * @returns {string} - Normalized handle
 */
const normalizeHandle = (handle) => {
  if (!handle || typeof handle !== 'string') {
    return '';
  }
  return handle.trim().toLowerCase();
};

/**
 * Checks if a handle is available (not in reserved list)
 * Note: Actual database uniqueness check should be done in controller
 * @param {string} handle - The handle to check
 * @returns {boolean} - True if handle is not reserved
 */
const isHandleAvailable = (handle) => {
  const normalized = normalizeHandle(handle);
  return !RESERVED_HANDLES.includes(normalized);
};

module.exports = {
  validateHandleFormat,
  normalizeHandle,
  isHandleAvailable,
  RESERVED_HANDLES,
};

