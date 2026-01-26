/**
 * Input sanitization utilities for CBSG
 * Prevents XSS attacks and validates user input
 */

/**
 * Basic HTML entity encoding to prevent XSS
 */
const escapeHtml = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Sanitize text input (remove HTML tags, escape special characters)
 */
const sanitizeText = (text, options = {}) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let sanitized = text;

  // Remove HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Escape HTML entities
  sanitized = escapeHtml(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length if specified
  if (options.maxLength) {
    sanitized = sanitized.substring(0, options.maxLength);
  }

  return sanitized;
};

/**
 * Sanitize array of strings (for tags, etc.)
 */
const sanitizeArray = (arr, options = {}) => {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr
    .map((item) => {
      if (typeof item === 'string') {
        return sanitizeText(item, options);
      }
      return item;
    })
    .filter((item) => item && item.length > 0);
};

/**
 * Sanitize object (for specs, metadata, etc.)
 */
const sanitizeObject = (obj, options = {}) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value, options);
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeArray(value, options);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Basic profanity filter (simple word list - can be enhanced with external service)
 */
const profanityWords = [
  // Add common profanity words here (keeping it minimal for now)
  // In production, use a comprehensive profanity detection library
];

const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const lowerText = text.toLowerCase();
  return profanityWords.some((word) => lowerText.includes(word.toLowerCase()));
};

/**
 * Validate and sanitize comment body
 */
const sanitizeComment = (body) => {
  if (!body || typeof body !== 'string') {
    return null;
  }

  // Check length
  if (body.trim().length === 0 || body.trim().length > 1000) {
    return null;
  }

  // Check for profanity (optional - can be disabled)
  // if (containsProfanity(body)) {
  //   return null; // or return sanitized version
  // }

  // Sanitize but preserve @mentions (they're handled separately)
  // Allow @mentions to pass through
  return sanitizeText(body, { maxLength: 1000 });
};

/**
 * Validate file upload
 */
const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  } = options;

  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` };
  }

  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only images are allowed.' };
  }

  return { valid: true };
};

/**
 * Sanitize URL
 */
const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (e) {
    return null;
  }
};

module.exports = {
  escapeHtml,
  sanitizeText,
  sanitizeArray,
  sanitizeObject,
  containsProfanity,
  sanitizeComment,
  validateFileUpload,
  sanitizeUrl,
};

