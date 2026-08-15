const User = require('../models/User');
const Chat = require('../models/Chat');
const { updateProfileSchema, changePasswordSchema, preferencesSchema } = require('../utils/validators');
const logger = require('../utils/logger');
const passwordService = require('../identity/services/passwordService');
const sessionService = require('../identity/services/sessionService');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-refreshTokens -encryptionKey');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toPublicJSON() });
  } catch (error) {
    logger.error('Get me error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const updates = {};
    if (value.username) updates.username = value.username;
    if (value.bio !== undefined) updates.bio = value.bio;
    if (value.phone !== undefined) updates.phone = value.phone;
    if (value.avatar !== undefined) updates.avatar = value.avatar;
    if (value.wallpaper !== undefined) updates.wallpaper = value.wallpaper;
    if (value.displayName !== undefined) updates['preferences.account.displayName'] = value.displayName;
    if (value.about !== undefined) updates['preferences.account.about'] = value.about;

    if (value.username) {
      const existing = await User.findOne({ username: value.username, _id: { $ne: req.userId } });
      if (existing) return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const io = req.app.get('io');
    if (io) {
      const updatedUser = { _id: user._id, username: user.username, avatar: user.avatar, status: user.status };
      const chatIds = (await Chat.find({ 'participants.user': req.userId }).select('_id')).map((c) => c._id.toString());
      chatIds.forEach((chatId) => {
        io.to(chatId).emit('user:profileUpdated', { user: updatedUser });
      });
    }

    res.json({ user: user.toPublicJSON(), message: 'Profile updated' });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { error, value } = preferencesSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const updateObj = {};
    for (const [category, fields] of Object.entries(value)) {
      for (const [field, val] of Object.entries(fields)) {
        updateObj[`preferences.${category}.${field}`] = val;
      }
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updateObj }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ preferences: user.preferences, message: 'Preferences updated' });
  } catch (error) {
    logger.error('Update preferences error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    await passwordService.changePassword(req.userId, value.currentPassword, value.newPassword, {
      sessionId: req.user.sessionId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    await sessionService.terminateAllSessions(req.userId, 'password_changed');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });

    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ error: 'Password is incorrect' });

    user.deletedAt = new Date();
    user.username = `deleted_${user._id}`;
    user.email = `deleted_${user._id}@emotune.app`;
    user.password = require('bcryptjs').hashSync('deleted_account', 12);
    user.status = 'deleted';
    user.avatar = '';
    user.bio = '';
    user.phone = '';
    user.wallpaper = '';
    user.personas = [];
    user.settings = {};
    user.preferences = {};
    user.refreshToken = null;
    await user.save();
    await sessionService.terminateAllSessions(req.userId, 'account_deletion');

    res.json({ message: 'Account deleted permanently' });
  } catch (error) {
    logger.error('Delete account error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await sessionService.getActiveSessions(req.userId);

    res.json({ sessions });
  } catch (error) {
    logger.error('Get sessions error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};

exports.logoutOtherSessions = async (req, res) => {
  try {
    await sessionService.terminateOtherSessions(req.userId, req.user.sessionId);

    res.json({ message: 'Other sessions terminated' });
  } catch (error) {
    logger.error('Logout other sessions error', { error: error.message });
    res.status(500).json({ error: 'Server error' });
  }
};
