const TruthClaim = require('../models/TruthClaim');
const { processClaimDetection, addVote } = require('../services/factCheckService');
const logger = require('../utils/logger');

exports.getClaim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = await TruthClaim.findById(claimId)
      .populate('submittedBy', 'username')
      .populate('votes.user', 'username');

    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    res.json({ claim });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
};

exports.getChatClaims = async (req, res) => {
  try {
    const { chatId } = req.params;
    const claims = await TruthClaim.find({ chat: chatId })
      .populate('submittedBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ claims });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
};

exports.voteOnClaim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { vote } = req.body;

    if (![-1, 0, 1].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be -1, 0, or 1' });
    }

    const claim = await addVote(claimId, req.userId, vote);

    const io = req.app.get('io');
    io.to(claim.chat.toString()).emit('truth:voteUpdate', {
      claimId: claim._id,
      truthScore: claim.truthScore,
      totalUpvotes: claim.totalUpvotes,
      totalDownvotes: claim.totalDownvotes,
    });

    res.json({ claim });
  } catch (err) {
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.createClaim = async (req, res) => {
  try {
    const { messageId, chatId, claimText, category } = req.body;
    if (!claimText) return res.status(400).json({ error: 'Claim text required' });

    const claim = await processClaimDetection(messageId, chatId, req.userId, claimText, category);

    const io = req.app.get('io');
    io.to(chatId).emit('truth:newClaim', { claim });

    res.status(201).json({ claim });
  } catch (err) {
    logger.error('Create claim error', { error: err.message });
    res.status(500).json({ error: 'Failed to create claim' });
  }
};
