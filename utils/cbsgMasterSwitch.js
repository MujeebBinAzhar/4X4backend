const Setting = require('../models/Setting');

/**
 * Check CBSG master switch status
 * Returns: { enabled: boolean, mode: 'hidden' | 'live' | 'staging' }
 */
const getCBSGStatus = async () => {
  try {
    const cbsgSetting = await Setting.findOne({ name: 'cbsgSetting' });
    
    if (!cbsgSetting || !cbsgSetting.setting) {
      // Default: CBSG is enabled and live if no setting exists
      return { enabled: true, mode: 'live' };
    }

    const { enabled = true, mode = 'live' } = cbsgSetting.setting;
    return { enabled, mode };
  } catch (err) {
    console.error('Error checking CBSG status:', err);
    // Default to enabled on error
    return { enabled: true, mode: 'live' };
  }
};

/**
 * Middleware to check if CBSG is enabled
 * Blocks requests if CBSG is hidden (except for admins)
 */
const checkCBSGEnabled = async (req, res, next) => {
  try {
    const status = await getCBSGStatus();
    
    // If disabled/hidden, block all requests (admins can still access via admin routes)
    if (!status.enabled || status.mode === 'hidden') {
      // Check if user is admin (for admin routes)
      // For now, allow if it's an admin route or if user has admin token
      // This will be refined when we implement proper admin check
      return res.status(503).send({
        message: 'CBSG is currently under maintenance',
        mode: status.mode,
      });
    }

    // Staging mode: only allow testers (to be implemented)
    if (status.mode === 'staging') {
      // TODO: Check if user is in tester list
      // For now, allow all authenticated users
    }

    req.cbsgStatus = status;
    next();
  } catch (err) {
    console.error('Error in CBSG middleware:', err);
    next();
  }
};

/**
 * Check if user can create builds (user must be approved)
 */
const canUserCreateBuild = async (userId) => {
  try {
    const Customer = require('../models/Customer');
    const customer = await Customer.findById(userId);
    
    if (!customer) {
      return { allowed: false, reason: 'User not found' };
    }

    if (!customer.approved) {
      return { allowed: false, reason: 'User account is pending approval' };
    }

    return { allowed: true };
  } catch (err) {
    console.error('Error checking user build permission:', err);
    return { allowed: false, reason: 'Error checking permissions' };
  }
};

module.exports = {
  getCBSGStatus,
  checkCBSGEnabled,
  canUserCreateBuild,
};

