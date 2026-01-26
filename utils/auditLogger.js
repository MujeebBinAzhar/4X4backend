const ModerationAction = require('../models/ModerationAction');

/**
 * Audit logging utility for CBSG
 * Logs all important actions for security and compliance
 */

/**
 * Log an audit event
 */
const logAuditEvent = async ({
  action_type,
  target_type,
  target_id,
  user_id,
  user_role,
  details = {},
  ip_address,
  user_agent,
}) => {
  try {
    const auditLog = new ModerationAction({
      action_type,
      target_type,
      target_id,
      moderator_id: user_id, // Reusing moderator_id field for user_id
      reason: JSON.stringify({
        user_role,
        details,
        ip_address,
        user_agent,
        timestamp: new Date().toISOString(),
      }),
      metadata: {
        user_role,
        ip_address,
        user_agent,
        ...details,
      },
    });

    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error logging audit event:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
};

/**
 * Log user action (login, logout, profile update, etc.)
 */
const logUserAction = async (req, actionType, details = {}) => {
  if (!req.user) {
    return;
  }

  return logAuditEvent({
    action_type: actionType,
    target_type: 'user',
    target_id: req.user._id,
    user_id: req.user._id,
    user_role: req.user.role || 'Customer',
    details,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });
};

/**
 * Log admin action
 */
const logAdminAction = async (req, actionType, targetType, targetId, details = {}) => {
  if (!req.user) {
    return;
  }

  return logAuditEvent({
    action_type: actionType,
    target_type: targetType,
    target_id: targetId,
    user_id: req.user._id,
    user_role: req.user.role || 'Admin',
    details,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
  });
};

/**
 * Log build action
 */
const logBuildAction = async (req, actionType, buildId, details = {}) => {
  return logAdminAction(req, actionType, 'build', buildId, details);
};

/**
 * Log content moderation action
 */
const logModerationAction = async (req, actionType, targetType, targetId, reason = '') => {
  return logAdminAction(req, actionType, targetType, targetId, { reason });
};

module.exports = {
  logAuditEvent,
  logUserAction,
  logAdminAction,
  logBuildAction,
  logModerationAction,
};

