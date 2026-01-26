const Notification = require('../models/Notification');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const sgMail = require('@sendgrid/mail');

// Set SendGrid API Key if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Notification types for CBSG
 */
const NOTIFICATION_TYPES = {
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  BUILD_APPROVED: 'build_approved',
  BUILD_REJECTED: 'build_rejected',
  BUILD_LIKED: 'build_liked',
  BUILD_COMMENTED: 'build_commented',
  COMMENT_REPLY: 'comment_reply',
  USER_MENTIONED: 'user_mentioned',
  USER_FOLLOWED: 'user_followed',
  CONTENT_FLAGGED: 'content_flagged',
  BUILD_DISABLED: 'build_disabled',
  USER_DISABLED: 'user_disabled',
};

/**
 * Create and save a notification in the database
 */
const createNotification = async ({
  userId,
  adminId,
  type,
  message,
  image,
  buildId,
  commentId,
  relatedUserId,
  metadata = {},
}) => {
  try {
    const notification = new Notification({
      userId,
      adminId,
      type,
      message,
      image,
      buildId,
      commentId,
      relatedUserId,
      metadata,
      status: 'unread',
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Send email notification (if user has email)
 */
const sendEmailNotification = async (userId, subject, message, html) => {
  try {
    const user = await Customer.findById(userId).select('email name');
    if (!user || !user.email || !process.env.SENDGRID_API_KEY) {
      return;
    }

    // Use simple HTML email if html not provided
    const emailHtml = html || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${subject}</h2>
        <p>${message}</p>
        <p>Best regards,<br>All For 4x4 Team</p>
      </div>
    `;

    const msg = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'gurujee256@gmail.com',
      subject,
      html: emailHtml,
    };

    await sgMail.send(msg);
    console.log(`Email notification sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
};

/**
 * Notify user when their account is approved
 */
const notifyUserApproved = async (userId, reason = '') => {
  const user = await Customer.findById(userId).select('name email');
  if (!user) return;

  const message = `Your account has been approved! You can now create builds and interact with the community.`;
  const subject = 'Account Approved - All For 4x4';

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.USER_APPROVED,
    message,
    metadata: { reason },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

/**
 * Notify user when their account is rejected
 */
const notifyUserRejected = async (userId, reason = '') => {
  const user = await Customer.findById(userId).select('name email');
  if (!user) return;

  const message = reason
    ? `Your account approval request was rejected. Reason: ${reason}`
    : `Your account approval request was rejected. Please contact support for more information.`;
  const subject = 'Account Approval Rejected - All For 4x4';

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.USER_REJECTED,
    message,
    metadata: { reason },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

/**
 * Notify user when their build is approved
 */
const notifyBuildApproved = async (buildId, userId, buildName) => {
  const message = `Your build "${buildName}" has been approved and is now visible to the community!`;
  const subject = `Build Approved: ${buildName}`;

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.BUILD_APPROVED,
    message,
    buildId,
    metadata: { buildName },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

/**
 * Notify user when their build is rejected
 */
const notifyBuildRejected = async (buildId, userId, buildName, reason = '') => {
  const message = reason
    ? `Your build "${buildName}" was rejected. Reason: ${reason}`
    : `Your build "${buildName}" was rejected. Please review and resubmit.`;
  const subject = `Build Rejected: ${buildName}`;

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.BUILD_REJECTED,
    message,
    buildId,
    metadata: { buildName, reason },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

/**
 * Notify build owner when someone likes their build
 */
const notifyBuildLiked = async (buildId, buildOwnerId, likerId, buildName) => {
  // Don't notify if user liked their own build
  if (buildOwnerId.toString() === likerId.toString()) {
    return;
  }

  const liker = await Customer.findById(likerId).select('name handle');
  if (!liker) return;

  const likerName = liker.handle || liker.name;
  const message = `${likerName} liked your build "${buildName}"`;
  const subject = `New Like on Your Build`;

  // Create in-app notification
  await createNotification({
    userId: buildOwnerId,
    type: NOTIFICATION_TYPES.BUILD_LIKED,
    message,
    buildId,
    relatedUserId: likerId,
    image: liker.image,
    metadata: { buildName, likerName },
  });
};

/**
 * Notify build owner when someone comments on their build
 */
const notifyBuildCommented = async (buildId, buildOwnerId, commenterId, buildName) => {
  // Don't notify if user commented on their own build
  if (buildOwnerId.toString() === commenterId.toString()) {
    return;
  }

  const commenter = await Customer.findById(commenterId).select('name handle');
  if (!commenter) return;

  const commenterName = commenter.handle || commenter.name;
  const message = `${commenterName} commented on your build "${buildName}"`;
  const subject = `New Comment on Your Build`;

  // Create in-app notification
  await createNotification({
    userId: buildOwnerId,
    type: NOTIFICATION_TYPES.BUILD_COMMENTED,
    message,
    buildId,
    relatedUserId: commenterId,
    image: commenter.image,
    metadata: { buildName, commenterName },
  });
};

/**
 * Notify comment author when someone replies to their comment
 */
const notifyCommentReply = async (commentId, parentCommentAuthorId, replierId, buildName) => {
  // Don't notify if user replied to their own comment
  if (parentCommentAuthorId.toString() === replierId.toString()) {
    return;
  }

  const replier = await Customer.findById(replierId).select('name handle');
  if (!replier) return;

  const replierName = replier.handle || replier.name;
  const message = `${replierName} replied to your comment on "${buildName}"`;
  const subject = `New Reply to Your Comment`;

  // Create in-app notification
  await createNotification({
    userId: parentCommentAuthorId,
    type: NOTIFICATION_TYPES.COMMENT_REPLY,
    message,
    commentId,
    relatedUserId: replierId,
    image: replier.image,
    metadata: { buildName, replierName },
  });
};

/**
 * Notify user when they are mentioned in a comment
 */
const notifyUserMentioned = async (mentionedUserId, mentionerId, buildId, buildName) => {
  // Don't notify if user mentioned themselves
  if (mentionedUserId.toString() === mentionerId.toString()) {
    return;
  }

  const mentioner = await Customer.findById(mentionerId).select('name handle');
  if (!mentioner) return;

  const mentionerName = mentioner.handle || mentioner.name;
  const message = `${mentionerName} mentioned you in a comment on "${buildName}"`;
  const subject = `You Were Mentioned`;

  // Create in-app notification
  await createNotification({
    userId: mentionedUserId,
    type: NOTIFICATION_TYPES.USER_MENTIONED,
    message,
    buildId,
    relatedUserId: mentionerId,
    image: mentioner.image,
    metadata: { buildName, mentionerName },
  });
};

/**
 * Notify user when someone follows them
 */
const notifyUserFollowed = async (followedUserId, followerId) => {
  // Don't notify if user followed themselves
  if (followedUserId.toString() === followerId.toString()) {
    return;
  }

  const follower = await Customer.findById(followerId).select('name handle');
  if (!follower) return;

  const followerName = follower.handle || follower.name;
  const message = `${followerName} started following you`;
  const subject = `New Follower`;

  // Create in-app notification
  await createNotification({
    userId: followedUserId,
    type: NOTIFICATION_TYPES.USER_FOLLOWED,
    message,
    relatedUserId: followerId,
    image: follower.image,
    metadata: { followerName },
  });
};

/**
 * Notify admins when content is flagged
 */
const notifyContentFlagged = async (contentType, contentId, flaggedBy, reason = '') => {
  try {
    // Get all admins
    const admins = await Admin.find().select('_id email name');

    const message = `A ${contentType} has been flagged for moderation.`;
    const subject = `Content Flagged for Moderation`;

    // Create notifications for all admins
    for (const admin of admins) {
      await createNotification({
        adminId: admin._id,
        type: NOTIFICATION_TYPES.CONTENT_FLAGGED,
        message,
        commentId: contentType === 'comment' ? contentId : null,
        buildId: contentType === 'build' ? contentId : null,
        relatedUserId: flaggedBy,
        metadata: { contentType, contentId, reason },
      });

      // Send email to admin
      if (admin.email && process.env.SENDGRID_API_KEY) {
        try {
          const msg = {
            to: admin.email,
            from: process.env.SENDGRID_FROM_EMAIL || 'gurujee256@gmail.com',
            subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Content Flagged for Moderation</h2>
                <p>A ${contentType} has been flagged and requires your attention.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                <p>Please review it in the moderation queue.</p>
              </div>
            `,
          };
          await sgMail.send(msg);
          console.log(`Flagged content alert sent to admin ${admin.email}`);
        } catch (error) {
          console.error('Error sending flagged content alert:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error notifying admins of flagged content:', error);
  }
};

/**
 * Notify user when their build is disabled
 */
const notifyBuildDisabled = async (buildId, userId, buildName, reason = '') => {
  const message = reason
    ? `Your build "${buildName}" has been disabled. Reason: ${reason}`
    : `Your build "${buildName}" has been disabled by an administrator.`;
  const subject = `Build Disabled: ${buildName}`;

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.BUILD_DISABLED,
    message,
    buildId,
    metadata: { buildName, reason },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

/**
 * Notify user when their account is disabled
 */
const notifyUserDisabled = async (userId, reason = '') => {
  const user = await Customer.findById(userId).select('name email');
  if (!user) return;

  const message = reason
    ? `Your account has been disabled. Reason: ${reason}`
    : `Your account has been disabled by an administrator.`;
  const subject = 'Account Disabled - All For 4x4';

  // Create in-app notification
  await createNotification({
    userId,
    type: NOTIFICATION_TYPES.USER_DISABLED,
    message,
    metadata: { reason },
  });

  // Send email
  await sendEmailNotification(userId, subject, message);
};

module.exports = {
  NOTIFICATION_TYPES,
  createNotification,
  sendEmailNotification,
  notifyUserApproved,
  notifyUserRejected,
  notifyBuildApproved,
  notifyBuildRejected,
  notifyBuildLiked,
  notifyBuildCommented,
  notifyCommentReply,
  notifyUserMentioned,
  notifyUserFollowed,
  notifyContentFlagged,
  notifyBuildDisabled,
  notifyUserDisabled,
};

