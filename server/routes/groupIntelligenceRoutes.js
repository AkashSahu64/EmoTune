const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');
const {
  createGroup, getGroups, addMember, removeMember,
} = require('../controllers/groupController');
const {
  getGroupIntelligence,
  getGroupMood,
  getMemberEngagement,
  getGroupSummary,
  getTopicDrift,
  detectConflicts,
  getParticipationScore,
  getSpamScore,
  getSharedMedia,
  searchGroupMessages,
  setGroupPermissions,
  manageJoinRequests,
  createInviteLink,
  joinViaInvite,
  toggleMute,
  getOnlineMembers,
} = require('../controllers/groupIntelligenceController');

// Basic group operations
router.post('/', authMiddleware, createGroup);
router.get('/', authMiddleware, getGroups);
router.post('/add-member', authMiddleware, addMember);
router.post('/remove-member', authMiddleware, removeMember);

router.get('/:chatId/intelligence', authMiddleware, getGroupIntelligence);
router.get('/:chatId/mood', authMiddleware, getGroupMood);
router.get('/:chatId/engagement', authMiddleware, getMemberEngagement);
router.get('/:chatId/summary', authMiddleware, getGroupSummary);
router.get('/:chatId/topics/drift', authMiddleware, getTopicDrift);
router.get('/:chatId/conflicts', authMiddleware, detectConflicts);
router.get('/:chatId/participation/:userId', authMiddleware, getParticipationScore);
router.get('/:chatId/spam', authMiddleware, getSpamScore);
router.get('/:chatId/media', authMiddleware, getSharedMedia);
router.get('/:chatId/search', authMiddleware, searchGroupMessages);
router.patch('/:chatId/permissions', authMiddleware, setGroupPermissions);
router.post('/:chatId/join-requests', authMiddleware, manageJoinRequests);
router.post('/:chatId/invite', authMiddleware, createInviteLink);
router.post('/:code/join', authMiddleware, joinViaInvite);
router.post('/:chatId/mute', authMiddleware, toggleMute);
router.get('/:chatId/online', authMiddleware, getOnlineMembers);

module.exports = router;