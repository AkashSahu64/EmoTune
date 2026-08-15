const { chatCompletion } = require('../core/providerManager');
const { parallelFallback } = require('./parallelFallback');
const { logger } = require('../core/logger');
const cacheService = require('../core/cacheService');

const SUMMARY_PROMPT = `Summarize the following chat conversation concisely. Extract:
1. Main topics discussed (2-3 bullet points)
2. Key decisions or conclusions
3. Overall tone of the conversation
4. Any unanswered questions or action items

Return ONLY valid JSON with these exact keys:
{
  "summary": "2-3 sentence overall summary",
  "mainPoints": ["bullet point 1", "bullet point 2"],
  "tone": "overall emotional tone",
  "actionItems": ["action item 1"] or [],
  "unansweredQuestions": ["question 1"] or []
}`;

async function getAISummary(messages) {
  try {
    const conversationText = messages
      .map((m) => (typeof m === 'string' ? m : m.content))
      .filter(Boolean)
      .join('\n')
      .slice(0, 3000);

    if (!conversationText.trim()) return null;

    const result = await chatCompletion(
      [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: conversationText },
      ],
      { taskType: 'default', responseFormat: 'json_object', temperature: 0.3 }
    );

    const cleaned = typeof result === 'string' ? result.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim() : result;
    return typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
  } catch (error) {
    logger.warn('AI summary failed', { error: error.message });
    return null;
  }
}

function getRuleBasedSummary(messages) {
  const texts = messages.map((m) => (typeof m === 'string' ? m : m.content)).filter(Boolean);

  if (texts.length === 0) {
    return { summary: 'No messages to summarize.', mainPoints: [], tone: 'neutral', actionItems: [], unansweredQuestions: [] };
  }

  const totalMessages = texts.length;
  const totalWords = texts.reduce((sum, t) => sum + t.split(/\s+/).length, 0);
  const questions = texts.filter((t) => t.includes('?')).length;
  const exclamations = texts.filter((t) => t.includes('!')).length;

  let tone = 'neutral';
  if (questions > totalMessages * 0.4) tone = 'inquisitive';
  if (exclamations > totalMessages * 0.3) tone = 'excited';

  const actionItems = [];
  const actionKeywords = ['done', 'will', 'going to', 'need to', 'have to', 'remember', 'remind', 'fix', 'update', 'send', 'check', 'please', 'must'];
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const kw of actionKeywords) {
      if (lower.includes(kw) && lower.length > 10) {
        actionItems.push(text.slice(0, 100));
        break;
      }
    }
  }

  const emotionKeywords = { happy: ['happy', 'great', 'awesome', 'love', 'wonderful', 'amazing'], sad: ['sad', 'sorry', 'miss', 'upset', 'hurt'], angry: ['angry', 'mad', 'frustrated', 'hate', 'annoyed'] };
  for (const [emotion, words] of Object.entries(emotionKeywords)) {
    if (words.some((w) => texts.some((t) => t.toLowerCase().includes(w)))) {
      tone = emotion;
      break;
    }
  }

  const unansweredQuestions = texts.filter((t) => t.includes('?') && !texts.slice(texts.indexOf(t) + 1).some((r) => r.length > 10));

  return {
    summary: `This chat has ${totalMessages} messages with approximately ${totalWords} words. The conversation has a ${tone} tone with ${questions} questions.`,
    mainPoints: [
      `${totalMessages} messages exchanged.`,
      texts[0] ? `Started with: "${texts[0].slice(0, 80)}..."` : '',
      texts[texts.length - 1] ? `Latest: "${texts[texts.length - 1].slice(0, 80)}..."` : '',
    ].filter(Boolean),
    tone,
    actionItems: actionItems.slice(0, 3),
    unansweredQuestions: unansweredQuestions.slice(0, 3).map((q) => q.slice(0, 100)),
  };
}

const CIL = require('../intelligence/conversationIntelligenceLayer');

async function getSummary(chatId, messages) {
  if (!messages || messages.length === 0) {
    return { summary: 'No messages to summarize.', mainPoints: [], tone: 'neutral', actionItems: [], unansweredQuestions: [] };
  }

  const context = CIL.getContext(chatId);

  if (context?.snapshotContext) {
    return {
      summary: `Conversation: ${context.topic.current} (${context.state.current})`,
      mainPoints: [
        `Mood: ${context.emotion.current?.emotion || 'neutral'} (${context.emotion.trend || 'stable'})`,
        `Topic: ${context.topic.current || 'general'}`,
        `Relationship: ${context.relationship.type} (${context.relationship.score}/100)`,
        `${context.conversation.messageCount} messages over ${Math.round(context.conversation.duration / 60000)} minutes`,
      ],
      tone: context.emotion.current?.emotion || 'neutral',
      actionItems: [],
      unansweredQuestions: context.snapshotContext?.pendingQuestions || [],
      cilAnalysis: true,
    };
  }

  if (messages.length <= 3) {
    return getRuleBasedSummary(messages);
  }

  const cached = await cacheService.getSemanticCache('summary:' + messages.map((m) => m.content || m).join('').slice(0, 200));
  if (cached) return cached;

  const { results } = await parallelFallback([
    { name: 'ai', fn: () => getAISummary(messages), timeout: 10000 },
    { name: 'rule-based', fn: () => getRuleBasedSummary(messages), timeout: 1000 },
  ]);

  const output = results[0] || getRuleBasedSummary(messages);
  await cacheService.setSemanticCache('summary:' + messages.map((m) => m.content || m).join('').slice(0, 200), output);
  return output;
}

module.exports = { getSummary, getAISummary, getRuleBasedSummary };
