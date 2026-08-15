const { chatCompletion } = require('../models/llmModel');
const prompts = require('../config/prompts');
const constants = require('../config/constants');

const DEFAULT_RESULT = {
  summary: 'Unable to analyze the conversation at this time.',
  pollOptions: ['Continue discussing', 'Defer decision'],
  compromise: 'Try discussing further with more context.',
  deadlock: false,
};

async function facilitateDecision(conversationHistory, options = {}) {
  if (!conversationHistory || !conversationHistory.trim()) {
    return { ...DEFAULT_RESULT, summary: 'No conversation history provided.' };
  }

  try {
    const truncated = conversationHistory.slice(0, 3000);

    const result = await chatCompletion(
      [
        { role: 'system', content: prompts.decideFacilitator },
        { role: 'user', content: truncated },
      ],
      {
        taskType: 'decide',
        temperature: constants.DECIDE_TEMPERATURE,
        responseFormat: 'json_object',
        ...options,
      }
    );

    const parsed = typeof result === 'string' ? JSON.parse(result) : result;

    return {
      summary: parsed.summary || DEFAULT_RESULT.summary,
      pollOptions: Array.isArray(parsed.pollOptions) && parsed.pollOptions.length >= 2
        ? parsed.pollOptions
        : DEFAULT_RESULT.pollOptions,
      compromise: parsed.compromise || DEFAULT_RESULT.compromise,
      deadlock: parsed.deadlock === true,
    };
  } catch (error) {
    console.error('Decide pipeline error:', error.message);
    return { ...DEFAULT_RESULT };
  }
}

async function formatDecisionResult(decision, participants) {
  const totalVotes = decision.pollOptions.reduce((sum, opt) => sum + (opt.voteCount || 0), 0);
  const requiredVotes = Math.ceil((participants || 1) * (constants.DECIDE_VOTE_REQUIRED_PERCENT / 100));

  const result = {
    status: decision.status,
    totalVotes,
    requiredVotes,
    progress: Math.min(100, (totalVotes / requiredVotes) * 100),
    options: decision.pollOptions.map((opt, i) => ({
      index: i,
      text: opt.text,
      votes: opt.voteCount || 0,
      percentage: totalVotes > 0 ? ((opt.voteCount || 0) / totalVotes) * 100 : 0,
      isLeading: false,
    })),
  };

  if (result.options.length > 0) {
    const maxVotes = Math.max(...result.options.map((o) => o.votes));
    result.options.forEach((o) => { o.isLeading = o.votes === maxVotes && maxVotes > 0; });
  }

  if (decision.deadlock) {
    result.status = 'deadlocked';
    result.message = 'AI detected a deadlock. Consider the suggested compromise.';
  } else if (totalVotes >= requiredVotes) {
    result.status = 'resolved';
    const winner = result.options.find((o) => o.isLeading);
    result.winner = winner ? winner.text : null;
    result.message = `Resolution reached: "${result.winner}"`;
  } else {
    result.message = `${totalVotes}/${requiredVotes} votes needed`;
  }

  return result;
}

module.exports = {
  facilitateDecision,
  formatDecisionResult,
  DEFAULT_RESULT,
};
