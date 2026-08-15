const timeIntelligence = require('../intelligence/timeIntelligence');

function getTimeContext(timezone) {
  return timeIntelligence.getCurrentTimeContext(timezone);
}

function enrichWithTime(suggestions) {
  if (!suggestions) return suggestions;
  var context = timeIntelligence.getCurrentTimeContext();

  var enriched = {};
  for (var key in suggestions) {
    if (suggestions.hasOwnProperty(key)) {
      enriched[key] = suggestions[key];
    }
  }

  if (enriched.weightedScores) {
    var weightedScores = {};
    for (var type in enriched.weightedScores) {
      if (enriched.weightedScores.hasOwnProperty(type)) {
        var baseScore = enriched.weightedScores[type];
        var boost = timeIntelligence.getTimeBasedBoost(type);
        weightedScores[type] = Math.min(1.0, baseScore * boost);
      }
    }
    enriched.weightedScores = weightedScores;
  }

  if (enriched.emoji && enriched.emoji.suggestions) {
    var timeEmojis = timeIntelligence.getTimeBasedEmojis(context.partOfDay);
    var combined = [];
    var seen = {};
    for (var i = 0; i < timeEmojis.length && i < 2; i++) {
      if (!seen[timeEmojis[i]]) {
        combined.push(timeEmojis[i]);
        seen[timeEmojis[i]] = true;
      }
    }
    for (var i = 0; i < enriched.emoji.suggestions.length; i++) {
      if (!seen[enriched.emoji.suggestions[i]]) {
        combined.push(enriched.emoji.suggestions[i]);
        seen[enriched.emoji.suggestions[i]] = true;
      }
    }
    enriched.emoji.suggestions = combined;
    enriched.emoji.score = Math.min(1.0, (enriched.emoji.score || 0.5) * 1.2);
  }

  if (context.festival) {
    var festivalContent = timeIntelligence.getFestivalSuggestions(context.festival);
    if (festivalContent) {
      enriched.festival = {
        name: context.festival,
        emojis: festivalContent.emojis,
        theme: festivalContent.theme,
        shayari: festivalContent.shayari,
        songs: festivalContent.songs,
      };
    }
  }

  if (context.season) {
    var seasonal = timeIntelligence.getSeasonalAdjustment(context.season);
    enriched.seasonalBoost = seasonal;
  }

  enriched.timeContext = {
    partOfDay: context.partOfDay,
    dayType: context.dayType,
    season: context.season,
    festival: context.festival,
  };

  return enriched;
}

function getTimeAwareGreeting(userDNA) {
  var context = timeIntelligence.getCurrentTimeContext();
  var greeting = timeIntelligence.formatTimeGreeting(context.hour, userDNA);
  return {
    greeting: greeting,
    partOfDay: context.partOfDay,
    emoji: timeIntelligence.getTimeBasedEmojis(context.partOfDay)[0],
    time: {
      hour: context.hour,
      minute: context.minute,
      dayType: context.dayType,
    },
    festival: context.festival ? {
      name: context.festival,
      content: timeIntelligence.getFestivalSuggestions(context.festival),
    } : null,
  };
}

function getFestivalContent() {
  var context = timeIntelligence.getCurrentTimeContext();
  if (!context.festival) return null;
  var suggestions = timeIntelligence.getFestivalSuggestions(context.festival);
  if (!suggestions) return null;
  return {
    festival: context.festival,
    theme: suggestions.theme,
    emojis: suggestions.emojis,
    shayari: suggestions.shayari,
    songs: suggestions.songs,
    partOfDay: context.partOfDay,
    season: context.season,
  };
}

var TIME_AWARE_SUGGESTIONS = {
  morning: { types: ['energetic', 'greeting-focused', 'motivational'], boost: { greeting: 2.0, motivational: 1.5, casual: 1.2 } },
  afternoon: { types: ['casual', 'productive', 'conversational'], boost: { casual: 1.5, productive: 1.8, conversational: 1.3 } },
  evening: { types: ['relaxing', 'entertainment', 'social'], boost: { relaxing: 1.8, entertainment: 1.6, social: 1.4 } },
  night: { types: ['calm', 'romantic', 'deep'], boost: { calm: 1.8, romantic: 2.0, deep: 1.6 } },
  dawn: { types: ['peaceful', 'quiet', 'reflective'], boost: { peaceful: 2.0, quiet: 1.8, reflective: 1.6 } },
};

function getTimeBasedSuggestions(partOfDay) {
  var pod = partOfDay || timeIntelligence.getCurrentTimeContext().partOfDay;
  var config = TIME_AWARE_SUGGESTIONS[pod];

  if (!config) {
    return {
      partOfDay: pod,
      types: ['casual'],
      emojis: timeIntelligence.getTimeBasedEmojis(pod),
      boost: {},
    };
  }

  return {
    partOfDay: pod,
    types: config.types,
    emojis: timeIntelligence.getTimeBasedEmojis(pod),
    boost: config.boost,
  };
}

module.exports = {
  getTimeContext: getTimeContext,
  enrichWithTime: enrichWithTime,
  getTimeAwareGreeting: getTimeAwareGreeting,
  getFestivalContent: getFestivalContent,
  getTimeBasedSuggestions: getTimeBasedSuggestions,
};