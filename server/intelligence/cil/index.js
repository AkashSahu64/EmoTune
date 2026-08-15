const ConversationIntelligenceLayer = require('./ConversationIntelligenceLayer');
const GroupIntelligenceEngine = require('./GroupIntelligenceEngine');
const StoryIntelligenceEngine = require('./StoryIntelligenceEngine');

module.exports = {
  cil: ConversationIntelligenceLayer,
  groupIntelligence: GroupIntelligenceEngine,
  storyIntelligence: StoryIntelligenceEngine,
};