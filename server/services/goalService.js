const goalDetectionEngine = require('../intelligence/goalDetectionEngine');

const GOAL_EMOJI_MAP = {
  planning: ['📅', '📋', '✅', '📍', '📝', '🗓️', '📌', '🤝', '🎯', '📊'],
  learning: ['📚', '📖', '🧠', '🎓', '✏️', '📝', '💡', '🔬', '📐', '🤔'],
  dating: ['💕', '🌹', '💋', '💘', '🥰', '😘', '💞', '💗', '💖', '😍'],
  job_interview: ['💼', '📄', '🤝', '🎯', '📊', '🏆', '📋', '✍️', '👔', '📈'],
  birthday: ['🎂', '🎉', '🎊', '🎈', '🎁', '🥳', '🎆', '🎇', '✨', '💫'],
  travel: ['✈️', '🗺️', '🌍', '🧳', '🏖️', '⛰️', '🚗', '🗽', '🌅', '📍'],
  support: ['🤗', '🫂', '💪', '❤️', '🤝', '💗', '🌟', '🙌', '✨', '💖'],
  shopping: ['🛍️', '🛒', '💳', '🏷️', '💰', '🎀', '👗', '📦', '✨', '💎'],
  coding: ['💻', '⌨️', '🖥️', '⚙️', '🐛', '🚀', '📱', '🔧', '💾', '🤖'],
  medical: ['🏥', '💊', '🩺', '🔬', '❤️‍🩹', '🩹', '🚑', '🧬', '💉', '🌡️'],
  business: ['💼', '📊', '📈', '🤝', '🏢', '💵', '📉', '🎯', '📋', '⚖️'],
  entertainment: ['🎬', '🎵', '🎮', '📺', '🎭', '🎪', '🎶', '🎤', '🎧', '🍿'],
  problem_solving: ['🧩', '💡', '🔍', '🔎', '⚙️', '🛠️', '🧠', '💭', '🔧', '🎯'],
  decision_making: ['⚖️', '🤔', '🧐', '📊', '🔀', '💭', '✅', '❌', '🔄', '🎲'],
  casual_chat: ['💬', '😊', '✨', '👋', '🙂', '💭', '🗣️', '👀', '☕', '🌟'],
  deep_conversation: ['🤔', '💭', '🧠', '🌌', '🌟', '🪐', '📖', '🔮', '💫', '♾️'],
  apology: ['🥺', '🙏', '💔', '❤️‍🩹', '🫂', '😢', '🤝', '💝', '😔', '🕊️'],
  confession: ['🤫', '💌', '😳', '🫢', '💭', '🔓', '💔', '❤️', '✨', '📩'],
  gossip: ['☕', '👀', '🤭', '🗣️', '👂', '📢', '🙊', '😱', '💅', '🫖'],
  venting: ['😤', '💢', '😩', '😫', '🤬', '🗯️', '🔥', '😮‍💨', '💥', '😭'],
  motivation: ['💪', '🔥', '🚀', '⭐', '🌟', '🎯', '🏆', '💫', '✨', '🙌'],
  negotiation: ['🤝', '⚖️', '📝', '💼', '🔄', '✍️', '💵', '🎯', '🤔', '✅'],
};

async function getConversationGoal(chatId, messages, context = {}) {
  const ctx = { ...context, chatId };
  return goalDetectionEngine.detectGoal(messages, ctx);
}

async function getGoalAwareSuggestions(goal, baseSuggestions) {
  const influence = goalDetectionEngine.getGoalInfluence(goal.primary || goal);
  const boosted = { ...baseSuggestions };
  const scoreKeys = Object.keys(boosted).filter((k) => typeof boosted[k] === 'object' && 'score' in boosted[k]);

  for (const key of scoreKeys) {
    if (influence.boost.includes(key)) {
      boosted[key].score = Math.min(1, (boosted[key].score || 0.5) * 1.3);
    }
    if (influence.suppress.includes(key)) {
      boosted[key].score = Math.max(0, (boosted[key].score || 0.5) * 0.6);
    }
  }

  if (boosted.weightedScores) {
    for (const [type, score] of Object.entries(boosted.weightedScores)) {
      let newScore = score;
      if (influence.boost.includes(type)) {
        newScore = Math.min(1, score * 1.3);
      }
      if (influence.suppress.includes(type)) {
        newScore = Math.max(0, score * 0.6);
      }
      boosted.weightedScores[type] = newScore;
    }
  }

  return boosted;
}

function getGoalBasedEmojis(goal) {
  const goalKey = typeof goal === 'string' ? goal : (goal.primary || goal);
  return GOAL_EMOJI_MAP[goalKey] || GOAL_EMOJI_MAP.casual_chat;
}

module.exports = {
  getConversationGoal,
  getGoalAwareSuggestions,
  getGoalBasedEmojis,
  GOAL_EMOJI_MAP,
};
