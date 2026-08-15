const { detectClaim, calculateTruthScore } = require('../../ml/pipelines/truthPipeline');
const { checkClaim } = require('../../ml/services/factCheckService');
const TruthClaim = require('../models/TruthClaim');
const logger = require('../utils/logger');

async function checkExternalSources(claimText) {
  return checkClaim(claimText);
}

async function processClaimDetection(messageId, chatId, userId, claimText, category) {
  const sources = await checkExternalSources(claimText);

  const claim = await TruthClaim.create({
    claimText,
    message: messageId,
    chat: chatId,
    submittedBy: userId,
    category: category || 'unknown',
    sources,
    factCheckStatus: sources.length > 0 ? 'completed' : 'pending',
    externalChecked: true,
    truthScore: 0.5,
    calculatedScore: 0.5,
    lastChecked: new Date(),
  });

  claim.truthScore = calculateTruthScore(claim);
  claim.calculatedScore = claim.truthScore;
  await claim.save();

  return claim;
}

async function addVote(claimId, userId, voteValue) {
  const claim = await TruthClaim.findById(claimId);
  if (!claim) throw new Error('Claim not found');

  const existingVote = claim.votes.find((v) => v.user.toString() === userId.toString());
  if (existingVote) {
    if (existingVote.vote === 1) claim.totalUpvotes--;
    if (existingVote.vote === -1) claim.totalDownvotes--;
    existingVote.vote = voteValue;
  } else {
    claim.votes.push({ user: userId, vote: voteValue, weight: 1 });
  }

  if (voteValue === 1) claim.totalUpvotes++;
  if (voteValue === -1) claim.totalDownvotes++;

  claim.truthScore = calculateTruthScore(claim);
  claim.calculatedScore = claim.truthScore;
  await claim.save();

  return claim;
}

module.exports = {
  checkExternalSources,
  calculateTruthScore,
  processClaimDetection,
  addVote,
};
