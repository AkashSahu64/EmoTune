const Chat = require('../../models/Chat');
const Message = require('../../models/Message');
const Decision = require('../../models/Decision');
const TruthClaim = require('../../models/TruthClaim');
const MemoryEmbedding = require('../../models/MemoryEmbedding');

function userIdOf(req) {
  return req.user?.id || req.userId;
}

async function findMemberChat(chatId, userId) {
  if (!chatId || !userId) return null;
  return Chat.findOne({ _id: chatId, 'participants.user': userId });
}

const requireChatMember = async (req, res, next) => {
  try {
    const chatId = req.params.chatId || req.body?.chatId || req.query?.chatId;
    const chat = await findMemberChat(chatId, userIdOf(req));
    if (!chat) return res.status(403).json({ error: 'Chat access denied' });
    req.authorizedChat = chat;
    next();
  } catch (error) {
    next(error);
  }
};

const requireMessageAccess = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const chat = await findMemberChat(message.chat, userIdOf(req));
    if (!chat) return res.status(403).json({ error: 'Message access denied' });
    req.authorizedMessage = message;
    req.authorizedChat = chat;
    next();
  } catch (error) {
    next(error);
  }
};

const requireDecisionAccess = async (req, res, next) => {
  try {
    const decision = await Decision.findById(req.params.decisionId);
    const chat = decision && await findMemberChat(decision.chat, userIdOf(req));
    if (!chat) return res.status(403).json({ error: 'Decision access denied' });
    req.authorizedDecision = decision;
    req.authorizedChat = chat;
    next();
  } catch (error) { next(error); }
};

const requireClaimAccess = async (req, res, next) => {
  try {
    const claim = await TruthClaim.findById(req.params.claimId);
    const chat = claim && await findMemberChat(claim.chat, userIdOf(req));
    if (!chat) return res.status(403).json({ error: 'Claim access denied' });
    req.authorizedClaim = claim;
    req.authorizedChat = chat;
    next();
  } catch (error) { next(error); }
};

const requireMemoryAccess = async (req, res, next) => {
  try {
    const memory = await MemoryEmbedding.findById(req.params.memoryId);
    const chat = memory && await findMemberChat(memory.chat, userIdOf(req));
    if (!chat) return res.status(403).json({ error: 'Memory access denied' });
    req.authorizedMemory = memory;
    req.authorizedChat = chat;
    next();
  } catch (error) { next(error); }
};

module.exports = { requireChatMember, requireMessageAccess, requireDecisionAccess, requireClaimAccess, requireMemoryAccess, findMemberChat };
