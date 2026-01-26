const Setting = require('../models/Setting');
const { getCBSGStatus } = require('../utils/cbsgMasterSwitch');

/**
 * Get CBSG master switch status
 * GET /api/settings/cbsg
 */
const getCBSGSettings = async (req, res) => {
  try {
    const status = await getCBSGStatus();

    res.send({
      enabled: status.enabled,
      mode: status.mode,
      modes: ['hidden', 'live', 'staging'],
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

/**
 * Update CBSG master switch
 * PATCH /api/settings/cbsg
 */
const updateCBSGSettings = async (req, res) => {
  try {
    const { enabled, mode } = req.body;
    const moderatorId = req.user?._id;

    // Validate mode
    if (mode && !['hidden', 'live', 'staging'].includes(mode)) {
      return res.status(400).send({
        message: 'Mode must be one of: hidden, live, staging',
      });
    }

    // Validate enabled
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return res.status(400).send({
        message: 'enabled must be a boolean',
      });
    }

    // Get or create CBSG setting
    let cbsgSetting = await Setting.findOne({ name: 'cbsgSetting' });

    if (!cbsgSetting) {
      cbsgSetting = new Setting({
        name: 'cbsgSetting',
        setting: {
          enabled: enabled !== undefined ? enabled : true,
          mode: mode || 'live',
          updated_by: moderatorId,
        },
      });
    } else {
      // Update existing setting
      if (enabled !== undefined) {
        cbsgSetting.setting = {
          ...cbsgSetting.setting,
          enabled,
          updated_by: moderatorId,
        };
      }
      if (mode) {
        cbsgSetting.setting = {
          ...cbsgSetting.setting,
          mode,
          updated_by: moderatorId,
        };
      }
    }

    await cbsgSetting.save();

    // Log moderation action
    const ModerationAction = require('../models/ModerationAction');
    const moderationAction = new ModerationAction({
      action_type: 'edit_content',
      target_type: 'user', // Using 'user' as placeholder for system settings
      target_id: moderatorId, // Store moderator ID as target
      moderator_id: moderatorId,
      reason: `CBSG master switch updated: ${enabled !== undefined ? `enabled=${enabled}` : ''} ${mode ? `mode=${mode}` : ''}`,
      metadata: {
        enabled: cbsgSetting.setting.enabled,
        mode: cbsgSetting.setting.mode,
      },
    });
    await moderationAction.save();

    res.send({
      message: 'CBSG settings updated successfully',
      enabled: cbsgSetting.setting.enabled,
      mode: cbsgSetting.setting.mode,
    });
  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
};

module.exports = {
  getCBSGSettings,
  updateCBSGSettings,
};

