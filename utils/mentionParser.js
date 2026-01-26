const Customer = require('../models/Customer');

/**
 * Parse @mentions from comment text
 * Returns array of unique handles found in text
 * @param {string} text - Comment text
 * @returns {string[]} - Array of handles (without @)
 */
const parseMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Match @handle pattern (alphanumeric + underscore, 3-20 chars)
  const mentionRegex = /@([a-z0-9_]{3,20})/gi;
  const matches = text.match(mentionRegex);

  if (!matches) {
    return [];
  }

  // Extract handles (remove @) and make unique
  const handles = matches.map((match) => match.substring(1).toLowerCase());
  return [...new Set(handles)]; // Remove duplicates
};

/**
 * Validate that mentioned handles exist in database
 * @param {string[]} handles - Array of handles to validate
 * @returns {Promise<{valid: string[], invalid: string[]}>}
 */
const validateMentions = async (handles) => {
  if (!handles || handles.length === 0) {
    return { valid: [], invalid: [] };
  }

  const customers = await Customer.find({
    handle: { $in: handles },
    approved: true, // Only mention approved users
  }).select('handle');

  const validHandles = customers.map((c) => c.handle.toLowerCase());
  const invalidHandles = handles.filter((h) => !validHandles.includes(h.toLowerCase()));

  return {
    valid: validHandles,
    invalid: invalidHandles,
  };
};

/**
 * Get user IDs for valid mentions
 * @param {string[]} handles - Array of valid handles
 * @returns {Promise<string[]>} - Array of user IDs
 */
const getMentionedUserIds = async (handles) => {
  if (!handles || handles.length === 0) {
    return [];
  }

  const customers = await Customer.find({
    handle: { $in: handles },
    approved: true,
  }).select('_id');

  return customers.map((c) => c._id.toString());
};

/**
 * Format comment text with mention links (for frontend display)
 * @param {string} text - Comment text
 * @returns {string} - Formatted text with mention markers
 */
const formatMentions = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Replace @handle with formatted version (frontend can convert to links)
  return text.replace(/@([a-z0-9_]{3,20})/gi, '<mention>$1</mention>');
};

module.exports = {
  parseMentions,
  validateMentions,
  getMentionedUserIds,
  formatMentions,
};

