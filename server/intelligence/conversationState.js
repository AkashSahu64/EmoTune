const STATES = {
  GREETING: 'greeting',
  INTRODUCTION: 'introduction',
  SMALL_TALK: 'small_talk',
  DISCUSSION: 'discussion',
  PLANNING: 'planning',
  ARGUMENT: 'argument',
  APOLOGY: 'apology',
  CELEBRATION: 'celebration',
  FLIRTING: 'flirting',
  PROFESSIONAL: 'professional',
  SUPPORT: 'support',
  ENDING: 'ending',
  SILENCE: 'silence',
};

const VALID_TRANSITIONS = {
  [STATES.GREETING]: [STATES.INTRODUCTION, STATES.SMALL_TALK, STATES.PROFESSIONAL, STATES.FLIRTING, STATES.PLANNING, STATES.DISCUSSION],
  [STATES.INTRODUCTION]: [STATES.SMALL_TALK, STATES.DISCUSSION, STATES.PROFESSIONAL, STATES.FLIRTING],
  [STATES.SMALL_TALK]: [STATES.DISCUSSION, STATES.PLANNING, STATES.FLIRTING, STATES.CELEBRATION, STATES.SUPPORT, STATES.ENDING],
  [STATES.DISCUSSION]: [STATES.PLANNING, STATES.ARGUMENT, STATES.SMALL_TALK, STATES.CELEBRATION, STATES.ENDING, STATES.PROFESSIONAL],
  [STATES.PLANNING]: [STATES.DISCUSSION, STATES.CELEBRATION, STATES.ENDING, STATES.SMALL_TALK],
  [STATES.ARGUMENT]: [STATES.APOLOGY, STATES.DISCUSSION, STATES.SUPPORT, STATES.ENDING],
  [STATES.APOLOGY]: [STATES.SUPPORT, STATES.SMALL_TALK, STATES.DISCUSSION, STATES.ENDING],
  [STATES.CELEBRATION]: [STATES.SMALL_TALK, STATES.DISCUSSION, STATES.ENDING],
  [STATES.FLIRTING]: [STATES.DISCUSSION, STATES.CELEBRATION, STATES.SMALL_TALK, STATES.ENDING],
  [STATES.PROFESSIONAL]: [STATES.DISCUSSION, STATES.SMALL_TALK, STATES.PLANNING, STATES.ENDING],
  [STATES.SUPPORT]: [STATES.SMALL_TALK, STATES.DISCUSSION, STATES.ENDING],
  [STATES.ENDING]: [STATES.GREETING, STATES.SMALL_TALK],
  [STATES.SILENCE]: [STATES.GREETING, STATES.SMALL_TALK, STATES.SUPPORT, STATES.ENDING],
};

const STATE_KEYWORDS = {
  [STATES.GREETING]: ['hello', 'hi', 'hey', 'how are you', 'good morning', 'good evening', 'whats up', 'sup', 'yo', 'hii', 'heyy', 'namaste'],
  [STATES.ARGUMENT]: ['angry', 'frustrated', 'you never', 'you always', 'why did you', 'i am upset', 'not fair', 'fuck', 'shit', 'stupid', 'hate', 'stop', 'leave me alone', 'i dont care', 'youre wrong', 'shut up'],
  [STATES.APOLOGY]: ['sorry', 'apologize', 'my mistake', 'i was wrong', 'please forgive', 'my bad', 'i regret', 'i apologize', 'im sorry', 'so sorry', 'forgive me'],
  [STATES.CELEBRATION]: ['congrats', 'congratulations', 'party', 'celebrate', 'excited', 'amazing', 'awesome', 'fantastic', 'great news', 'proud', 'happy for', 'good job', 'well done', 'yay', 'woohoo', 'finally', 'we did it'],
  [STATES.FLIRTING]: ['beautiful', 'handsome', 'cute', 'sexy', 'hot', 'gorgeous', 'pretty', 'lovely', 'miss you', 'kiss', 'hug', 'date', 'romantic', 'crush', 'like you', 'love you', 'you look', 'beautiful smile'],
  [STATES.PLANNING]: ['let us', 'plan', 'schedule', 'meet', 'tomorrow', 'next week', 'weekend', 'time', 'when', 'where', 'shall we', 'what about', 'how about', 'propose', 'suggest', 'organized', 'arrange'],
  [STATES.SUPPORT]: ['i understand', 'i am here', 'everything will be ok', 'stay strong', 'take care', 'you matter', 'you can do it', 'i support', 'i believe', 'dont worry', 'it is ok', 'it will be fine', 'im here for you', 'let me help', 'can i help'],
  [STATES.ENDING]: ['bye', 'goodbye', 'see you', 'talk later', 'good night', 'gotta go', 'ttyl', 'catch you later', 'take care bye', 'see ya', 'peace', 'later'],
  [STATES.PROFESSIONAL]: ['meeting', 'deadline', 'project', 'report', 'submission', 'budget', 'client', 'task', 'assignment', 'official', 'formal', 'request', 'approval', 'presentation'],
  [STATES.DISCUSSION]: ['what do you think', 'how about', 'i think', 'in my opinion', 'maybe', 'perhaps', 'consider', 'option', 'alternative', 'suggestion', 'compare', 'analysis', 'reason', 'because', 'explain'],
};

function detectStateFromMessage(text, currentState) {
  if (!text) return currentState || STATES.SMALL_TALK;
  const lower = text.toLowerCase();

  const scores = {};
  for (const [state, keywords] of Object.entries(STATE_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > 0) scores[state] = score;
  }

  const question = /\?/.test(lower);
  const length = text.length;
  const exclamation = lower.includes('!');

  if (exclamation && !scores[STATES.ARGUMENT]) {
    scores[STATES.CELEBRATION] = (scores[STATES.CELEBRATION] || 0) + 0.5;
  }
  if (question) {
    scores[STATES.DISCUSSION] = (scores[STATES.DISCUSSION] || 0) + 1;
    scores[STATES.PLANNING] = (scores[STATES.PLANNING] || 0) + 0.5;
  }
  if (length < 10) {
    scores[STATES.SMALL_TALK] = (scores[STATES.SMALL_TALK] || 0) + 1;
  }

  if (Object.keys(scores).length === 0) return STATES.SMALL_TALK;

  let best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];

  if (currentState && currentState !== best) {
    const validNext = VALID_TRANSITIONS[currentState] || Object.values(STATES);
    if (!validNext.includes(best)) {
      best = currentState;
    }
  }

  return best;
}

function isStateChangeSignificant(from, to) {
  if (!from || !to) return true;
  const pairs = [
    [STATES.GREETING, STATES.ENDING],
    [STATES.ARGUMENT, STATES.APOLOGY],
    [STATES.CELEBRATION, STATES.ENDING],
    [STATES.DISCUSSION, STATES.ARGUMENT],
    [STATES.FLIRTING, STATES.ENDING],
  ];
  const isSignificantChange = (a, b) => {
    if (a === b) return false;
    for (const [x, y] of pairs) {
      if ((a === x && b === y) || (a === y && b === x)) return true;
    }
    return false;
  };
  return isSignificantChange(from, to);
}

class ConversationStateManager {
  constructor() {
    this.STATES = STATES;
    this.VALID_TRANSITIONS = VALID_TRANSITIONS;
  }

  detectState(message, currentState) {
    return detectStateFromMessage(message?.text || message, currentState);
  }

  isValidTransition(from, to) {
    if (!from || !to) return true;
    const valid = VALID_TRANSITIONS[from];
    return valid ? valid.includes(to) : true;
  }

  updateState(currentState, message) {
    const detected = this.detectState(message, currentState);
    const result = {
      state: detected,
      previousState: currentState,
      isTransition: currentState !== detected,
      isSignificant: currentState ? isStateChangeSignificant(currentState, detected) : true,
      timestamp: new Date(),
    };
    return result;
  }

  getStateDescription(state) {
    const descriptions = {
      [STATES.GREETING]: 'Starting a conversation',
      [STATES.INTRODUCTION]: 'Getting to know each other',
      [STATES.SMALL_TALK]: 'Casual conversation',
      [STATES.DISCUSSION]: 'Discussing something in detail',
      [STATES.PLANNING]: 'Making plans or arrangements',
      [STATES.ARGUMENT]: 'Disagreement or conflict',
      [STATES.APOLOGY]: 'Making up or apologizing',
      [STATES.CELEBRATION]: 'Celebrating or happy moment',
      [STATES.FLIRTING]: 'Romantic or playful interaction',
      [STATES.PROFESSIONAL]: 'Formal or work-related talk',
      [STATES.SUPPORT]: 'Providing emotional support',
      [STATES.ENDING]: 'Wrapping up the conversation',
      [STATES.SILENCE]: 'No active conversation',
    };
    return descriptions[state] || 'In conversation';
  }

  suggestNextActions(state) {
    const suggestions = {
      [STATES.GREETING]: ['Respond with greeting', 'Ask how they are', 'Share something interesting'],
      [STATES.INTRODUCTION]: ['Introduce yourself properly', 'Ask about their interests', 'Share common ground'],
      [STATES.SMALL_TALK]: ['Ask an open question', 'Share a story', 'Suggest a topic'],
      [STATES.DISCUSSION]: ['Ask for their opinion', 'Share your perspective', 'Suggest a solution'],
      [STATES.PLANNING]: ['Confirm details', 'Suggest alternatives', 'Set a timeline'],
      [STATES.ARGUMENT]: ['Apologize if needed', 'Take a pause', 'Find common ground'],
      [STATES.APOLOGY]: ['Accept apology', 'Reassure them', 'Move conversation forward'],
      [STATES.CELEBRATION]: ['Join the celebration', 'Share excitement', 'Suggest celebrating'],
      [STATES.FLIRTING]: ['Be playful', 'Give compliment', 'Plan something special'],
      [STATES.PROFESSIONAL]: ['Stay focused', 'Be concise', 'Follow up professionally'],
      [STATES.SUPPORT]: ['Listen actively', 'Offer help', 'Be present'],
      [STATES.ENDING]: ['Say goodbye warmly', 'Suggest next conversation', 'End on positive note'],
    };
    return suggestions[state] || [];
  }
}

module.exports = new ConversationStateManager();
module.exports.STATES = STATES;
module.exports.detectStateFromMessage = detectStateFromMessage;
