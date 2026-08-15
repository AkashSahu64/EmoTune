const { chatCompletion } = require('../models/llmModel');
const prompts = require('../config/prompts');
const { checkClaim } = require('../services/factCheckService');
const { cleanText } = require('../utils/textPreprocessor');
const constants = require('../config/constants');

async function detectClaim(messageText) {
  if (!messageText || !messageText.trim()) {
    return { found: false, claim: '', category: 'unknown' };
  }

  try {
    const cleaned = cleanText(messageText).slice(0, 1000);

    const result = await chatCompletion(
      [
        { role: 'system', content: prompts.truthClaim },
        { role: 'user', content: cleaned },
      ],
      {
        taskType: 'truth',
        temperature: 0.2,
        responseFormat: 'json_object',
      }
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;

    if (parsed.hasClaim && parsed.claim) {
      const externalSources = await checkClaim(parsed.claim);

      return {
        found: true,
        claim: parsed.claim,
        category: parsed.category || 'general',
        sources: externalSources,
      };
    }

    return { found: false, claim: '', category: 'unknown', sources: [] };
  } catch (error) {
    console.error('Claim detection pipeline error:', error.message);
    return { found: false, claim: '', category: 'unknown', sources: [] };
  }
}

function calculateTruthScore(claimDoc) {
  const { votes = [], sources = [] } = claimDoc;
  const prior = constants.TRUTH_BAYESIAN_PRIOR;
  const pseudoCount = constants.TRUTH_BAYESIAN_PSEUDO_COUNT;

  let upWeight = 0;
  let downWeight = 0;

  for (const vote of votes) {
    const weight = vote.weight || 1;
    if (vote.vote === 1) upWeight += weight;
    else if (vote.vote === -1) downWeight += weight;
  }

  const totalWeight = upWeight + downWeight;
  const communityScore = totalWeight > 0
    ? upWeight / totalWeight
    : prior;

  const sourceScore = sources.length > 0
    ? sources.reduce((sum, s) => sum + (s.reliability || 0.5), 0) / sources.length
    : null;

  let finalScore;
  if (sourceScore !== null) {
    const communityWeight = totalWeight / (totalWeight + pseudoCount);
    const sourceWeight = pseudoCount / (totalWeight + pseudoCount);
    finalScore = communityScore * communityWeight + sourceScore * sourceWeight;

    const agreement = sources.filter((s) => (s.reliability || 0.5) > 0.6).length;
    if (agreement > sources.length / 2) {
      finalScore = finalScore * 0.7 + 0.3;
    }
  } else {
    finalScore = (communityScore * totalWeight + prior * pseudoCount) / (totalWeight + pseudoCount);
  }

  return Math.max(0, Math.min(1, finalScore));
}

function getTruthIndicator(score) {
  if (score >= constants.TRUTH_HIGH_THRESHOLD) return { color: 'green', label: 'Likely True', emoji: '🟢' };
  if (score >= constants.TRUTH_LOW_THRESHOLD) return { color: 'yellow', label: 'Uncertain', emoji: '🟡' };
  if (score > 0) return { color: 'red', label: 'Likely False', emoji: '🔴' };
  return { color: 'gray', label: 'Unrated', emoji: '⚪' };
}

module.exports = {
  detectClaim,
  calculateTruthScore,
  getTruthIndicator,
};
