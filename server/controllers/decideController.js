const Decision = require('../models/Decision');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { facilitateDecision } = require('../services/aiService');
const logger = require('../utils/logger');

exports.triggerDecision = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (chat.type !== 'group') return res.status(400).json({ error: 'DecideFlow only for groups' });

    const recentMessages = await Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username')
      .select('content sender');

    const conversationHistory = recentMessages
      .reverse()
      .map((m) => `${m.sender?.username || 'Unknown'}: ${m.content}`)
      .join('\n');

    const decisionData = await facilitateDecision(conversationHistory);

    const participantCount = chat.participants.length;
    const requiredVotes = Math.ceil(participantCount * 0.6);

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const decision = await Decision.create({
      chat: chatId,
      triggeredBy: req.userId,
      summary: decisionData.summary,
      context: conversationHistory.slice(0, 500),
      pollOptions: decisionData.pollOptions.map((opt) => ({
        text: opt,
        votes: [],
        voteCount: 0,
      })),
      compromise: decisionData.compromise,
      deadlock: decisionData.deadlock,
      requiredVotes,
      expiresAt,
    });

    const io = req.app.get('io');
    io.to(chatId).emit('decision:new', { decision });

    res.status(201).json({ decision });
  } catch (err) {
    logger.error('Trigger decision error', { error: err.message });
    res.status(500).json({ error: 'Failed to trigger decision' });
  }
};

exports.voteOnDecision = async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { optionIndex } = req.body;

    const decision = await Decision.findById(decisionId);
    if (!decision) return res.status(404).json({ error: 'Decision not found' });
    if (decision.status !== 'active') return res.status(400).json({ error: 'Decision is no longer active' });
    if (Date.now() > decision.expiresAt) {
      decision.status = 'expired';
      await decision.save();
      return res.status(400).json({ error: 'Decision has expired' });
    }

    const option = decision.pollOptions[optionIndex];
    if (!option) return res.status(400).json({ error: 'Invalid option' });

    const alreadyVoted = option.votes.some((v) => v.user.toString() === req.userId.toString());
    if (alreadyVoted) return res.status(400).json({ error: 'Already voted for this option' });

    decision.pollOptions.forEach((opt) => {
      opt.votes = opt.votes.filter((v) => v.user.toString() !== req.userId.toString());
      opt.voteCount = opt.votes.length;
    });

    option.votes.push({ user: req.userId });
    option.voteCount = option.votes.length;
    decision.voteCount = decision.pollOptions.reduce((sum, opt) => sum + opt.voteCount, 0);

    const maxVotesOption = decision.pollOptions.reduce((max, opt) =>
      opt.voteCount > (max?.voteCount || 0) ? opt : max, null
    );

    if (maxVotesOption && maxVotesOption.voteCount >= decision.requiredVotes) {
      decision.status = 'resolved';
      decision.winnerOption = decision.pollOptions.indexOf(maxVotesOption);
      decision.result = `Option "${maxVotesOption.text}" won with ${maxVotesOption.voteCount} votes`;
      decision.resolvedAt = new Date();
    }

    await decision.save();

    const io = req.app.get('io');
    io.to(decision.chat.toString()).emit('decision:update', { decision });

    res.json({ decision });
  } catch (err) {
    logger.error('Decision vote error', { error: err.message });
    res.status(500).json({ error: 'Failed to vote' });
  }
};

exports.getDecision = async (req, res) => {
  try {
    const { decisionId } = req.params;
    const decision = await Decision.findById(decisionId)
      .populate('triggeredBy', 'username avatar')
      .populate('pollOptions.votes.user', 'username');

    if (!decision) return res.status(404).json({ error: 'Decision not found' });

    res.json({ decision });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decision' });
  }
};

exports.getChatDecisions = async (req, res) => {
  try {
    const { chatId } = req.params;
    const decisions = await Decision.find({ chat: chatId })
      .populate('triggeredBy', 'username')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ decisions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch decisions' });
  }
};
