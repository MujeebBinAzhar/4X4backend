const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for CBSG endpoints
 * Different limits for different types of actions
 */

// General CBSG API rate limiter (public endpoints)
const cbsgGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Comment rate limiter (prevent spam)
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 comments per 15 minutes
  message: 'Too many comments. Please wait before commenting again.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Post rate limiter (prevent spam)
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 posts per hour
  message: 'Too many posts. Please wait before posting again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Like rate limiter (prevent spam)
const likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 likes per minute
  message: 'Too many likes. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Follow rate limiter
const followLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 follows per 15 minutes
  message: 'Too many follow actions. Please wait before following again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Build creation rate limiter
const buildCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 builds per hour
  message: 'Too many builds created. Please wait before creating another build.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Search rate limiter
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute
  message: 'Too many searches. Please wait before searching again.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  cbsgGeneralLimiter,
  commentLimiter,
  postLimiter,
  likeLimiter,
  followLimiter,
  buildCreationLimiter,
  searchLimiter,
};

