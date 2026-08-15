const PARTS_OF_DAY = {
  dawn: [4, 5, 6],
  morning: [6, 7, 8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16],
  evening: [17, 18, 19, 20],
  night: [21, 22, 23, 0, 1, 2, 3],
};

const DAY_TYPES = { weekday: 'weekday', weekend: 'weekend', holiday: 'holiday' };

const SEASONS = {
  spring: [2, 3, 4],
  summer: [5, 6, 7],
  fall: [8, 9, 10],
  winter: [11, 0, 1],
};

const FESTIVAL_MAP = {
  '01-01': 'new_year',
  '01-06': 'epiphany',
  '01-14': 'makar_sankranti',
  '01-15': 'pongal',
  '01-26': 'republic_day_india',
  '02-02': 'groundhog_day',
  '02-04': 'world_cancer_day',
  '02-05': 'kashmir_day',
  '02-14': 'valentines',
  '02-20': 'world_day_of_social_justice',
  '03-01': 'zero_discrimination_day',
  '03-03': 'world_wildlife_day',
  '03-08': 'womens_day',
  '03-14': 'pi_day',
  '03-17': 'st_patricks',
  '03-20': 'spring_equinox',
  '03-21': 'world_poetry_day',
  '03-22': 'world_water_day',
  '03-26': 'bangladesh_independence_day',
  '04-01': 'april_fools',
  '04-05': 'qingming',
  '04-07': 'world_health_day',
  '04-14': 'baisakhi',
  '04-22': 'earth_day',
  '04-23': 'world_book_day',
  '04-25': 'world_malaria_day',
  '05-01': 'labour_day',
  '05-04': 'star_wars_day',
  '05-05': 'cinco_de_mayo',
  '05-08': 'world_red_cross_day',
  '05-09': 'europe_day',
  '05-12': 'international_nurses_day',
  '05-22': 'international_biodiversity_day',
  '05-31': 'world_no_tobacco_day',
  '06-01': 'childrens_day',
  '06-05': 'world_environment_day',
  '06-08': 'world_oceans_day',
  '06-14': 'world_blood_donor_day',
  '06-19': 'fathers_day',
  '06-20': 'summer_solstice',
  '06-21': 'international_yoga_day',
  '06-26': 'international_day_against_drugs',
  '07-01': 'canada_day',
  '07-04': 'independence_day_usa',
  '07-11': 'world_population_day',
  '07-14': 'bastille_day',
  '07-30': 'international_friendship_day',
  '08-01': 'friendship_day',
  '08-06': 'hiroshima_day',
  '08-09': 'international_indigenous_day',
  '08-12': 'international_youth_day',
  '08-14': 'pakistan_independence_day',
  '08-15': 'independence_day_india',
  '08-19': 'world_photography_day',
  '08-21': 'international_day_of_remembrance',
  '08-23': 'international_slave_trade_remembrance',
  '08-26': 'womens_equality_day',
  '08-29': 'international_day_against_nuclear_tests',
  '09-01': 'world_peace_day',
  '09-05': 'teachers_day_india',
  '09-08': 'international_literacy_day',
  '09-10': 'international_day_of_peace',
  '09-15': 'international_democracy_day',
  '09-17': 'world_patient_safety_day',
  '09-19': 'international_talk_like_a_pirate_day',
  '09-21': 'world_alzheimers_day',
  '09-22': 'autumn_equinox',
  '09-27': 'world_tourism_day',
  '09-29': 'world_heart_day',
  '10-01': 'international_music_day',
  '10-02': 'gandhi_jayanti',
  '10-04': 'world_animal_day',
  '10-05': 'world_teachers_day',
  '10-09': 'world_post_day',
  '10-10': 'world_mental_health_day',
  '10-13': 'international_day_for_disaster_reduction',
  '10-14': 'world_standards_day',
  '10-15': 'global_handwashing_day',
  '10-16': 'world_food_day',
  '10-17': 'international_day_for_poverty_eradication',
  '10-20': 'world_statistics_day',
  '10-24': 'united_nations_day',
  '10-27': 'world_audiovisual_heritage_day',
  '10-31': 'halloween',
  '11-01': 'all_saints_day',
  '11-02': 'all_souls_day',
  '11-07': 'international_day_of_meditation',
  '11-10': 'world_science_day',
  '11-11': 'remembrance_day',
  '11-14': 'world_diabetes_day',
  '11-15': 'world_philosophy_day',
  '11-16': 'international_day_for_tolerance',
  '11-19': 'womens_entrepreneurship_day',
  '11-20': 'childrens_day_un',
  '11-21': 'world_television_day',
  '11-25': 'international_day_elimination_violence_women',
  '11-29': 'international_day_of_solidarity',
  '11-30': 'world_chess_day',
  '12-01': 'world_aids_day',
  '12-02': 'world_computer_literacy_day',
  '12-03': 'international_day_of_persons_with_disabilities',
  '12-05': 'world_soil_day',
  '12-07': 'international_civil_aviation_day',
  '12-09': 'international_anti_corruption_day',
  '12-10': 'human_rights_day',
  '12-11': 'international_mountain_day',
  '12-14': 'world_energy_day',
  '12-18': 'international_migrants_day',
  '12-20': 'international_human_solidarity_day',
  '12-21': 'winter_solstice',
  '12-22': 'world_orgasm_day',
  '12-25': 'christmas',
  '12-26': 'boxing_day',
  '12-31': 'new_years_eve',
};

const TIME_AWARE_SUGGESTIONS = {
  morning: { types: ['energetic', 'greeting-focused', 'motivational'], boost: { greeting: 2.0, motivational: 1.5, casual: 1.2 } },
  afternoon: { types: ['casual', 'productive', 'conversational'], boost: { casual: 1.5, productive: 1.8, conversational: 1.3 } },
  evening: { types: ['relaxing', 'entertainment', 'social'], boost: { relaxing: 1.8, entertainment: 1.6, social: 1.4 } },
  night: { types: ['calm', 'romantic', 'deep'], boost: { calm: 1.8, romantic: 2.0, deep: 1.6 } },
  dawn: { types: ['peaceful', 'quiet', 'reflective'], boost: { peaceful: 2.0, quiet: 1.8, reflective: 1.6 } },
};

const FESTIVAL_CONTENT = {
  new_year: { emojis: ['🎉', '🎊', '🥳', '🎆', '🎇', '✨', '🌟', '💫', '🍾', '🥂'], shayari: ['celebratory', 'motivational'], songs: ['party', 'countdown'], theme: 'celebration' },
  christmas: { emojis: ['🎄', '🎅', '🤶', '☃️', '❄️', '🦌', '🎁', '🌟', '🔔', '🕯️'], shayari: ['festive', 'happy'], songs: ['christmas', 'holiday'], theme: 'festive' },
  halloween: { emojis: ['🎃', '👻', '💀', '🕸️', '🕷️', '🧛', '🧟', '🦇', '🔮', '⚰️'], shayari: ['spooky', 'fun'], songs: ['halloween', 'spooky'], theme: 'spooky' },
  valentines: { emojis: ['💕', '💖', '💗', '🌹', '💐', '💞', '💘', '🥰', '😘', '💝'], shayari: ['romantic', 'love'], songs: ['romantic', 'love'], theme: 'romantic' },
  diwali: { emojis: ['🪔', '💡', '✨', '🎆', '🎇', '🌺', '🌸', '🍬', '🥻', '🏮'], shayari: ['celebratory', 'festive'], songs: ['festive', 'traditional'], theme: 'festive' },
  holi: { emojis: ['🌈', '🎨', '🪅', '💦', '🌸', '🎉', '🫧', '☀️', '🌺', '🌈'], shayari: ['colorful', 'joyful'], songs: ['festive', 'traditional'], theme: 'joyful' },
  eid: { emojis: ['🌙', '⭐', '🕌', '🤲', '🍽️', '👨‍👩‍👧‍👦', '🎁', '🌸', '✨', '🍬'], shayari: ['blessings', 'peace'], songs: ['spiritual', 'celebratory'], theme: 'spiritual' },
  thanksgiving: { emojis: ['🦃', '🍂', '🍁', '🥧', '🍗', '🥂', '🙏', '🌽', '🧡', '🍽️'], shayari: ['grateful', 'thanks'], songs: ['folk', 'gratitude'], theme: 'gratitude' },
  mothers_day: { emojis: ['💐', '🌸', '🌷', '❤️', '🥰', '👩‍👧‍👦', '🎀', '💗', '🌺', '😊'], shayari: ['love', 'grateful'], songs: ['love', 'family'], theme: 'gratitude' },
  fathers_day: { emojis: ['👨‍👧‍👦', '💪', '❤️', '🎁', '😊', '🌟', '👔', '🛠️', '🏆', '👨'], shayari: ['family', 'respect'], songs: ['family', 'inspirational'], theme: 'family' },
  independence_day_india: { emojis: ['🇮🇳', '🎉', '🪁', '🏛️', '🌟', '🔥', '📯', '🎆', '🙏', '🧡🤍💚'], shayari: ['patriotic', 'motivational'], songs: ['patriotic', 'inspirational'], theme: 'patriotic' },
  republic_day_india: { emojis: ['🇮🇳', '🎉', '📜', '🏛️', '🌟', '🪖', '🎆', '🤝', '🧡🤍💚'], shayari: ['patriotic', 'motivational'], songs: ['patriotic', 'inspirational'], theme: 'patriotic' },
  friendship_day: { emojis: ['🤝', '👫', '👬', '👭', '💛', '💞', '🤗', '🌟', '✨', '🎉'], shayari: ['friendship', 'happy'], songs: ['friendship', 'happy'], theme: 'friendship' },
  womens_day: { emojis: ['👩', '👩‍🦰', '👩‍🦱', '👩‍🦳', '👩‍🦲', '🌸', '🌺', '💪', '💜', '✨'], shayari: ['respect', 'motivational'], songs: ['inspirational', 'empowerment'], theme: 'empowerment' },
  labour_day: { emojis: ['👷', '👨‍🍳', '👩‍🔧', '🔨', '🛠️', '🏗️', '💪', '👏', '🌟', '⚙️'], shayari: ['motivational', 'respect'], songs: ['motivational', 'work'], theme: 'hard_work' },
  world_environment_day: { emojis: ['🌍', '🌱', '🌿', '🍃', '💚', '♻️', '🌳', '🌻', '🐝', '☀️'], shayari: ['nature', 'motivational'], songs: ['nature', 'peace'], theme: 'nature' },
  childrens_day: { emojis: ['🧒', '👧', '🧸', '🎈', '🎠', '🍭', '🎡', '🎪', '🤡', '🎀'], shayari: ['playful', 'happy'], songs: ['playful', 'fun'], theme: 'playful' },
  april_fools: { emojis: ['🤡', '🎭', '🃏', '😜', '😝', '🤪', '😂', '🫢', '🧸', '🎪'], shayari: ['funny', 'humorous'], songs: ['funny', 'prank'], theme: 'fun' },
  world_mental_health_day: { emojis: ['🧠', '💚', '❤️‍🩹', '🤗', '🫂', '🌿', '🧘', '✨', '💪', '🕊️'], shayari: ['supportive', 'calm'], songs: ['meditation', 'calm'], theme: 'wellness' },
  international_yoga_day: { emojis: ['🧘', '🧘‍♂️', '🧘‍♀️', '🌿', '☀️', '🕉️', '✨', '🪷', '🧠', '💚'], shayari: ['calm', 'peaceful'], songs: ['meditation', 'spiritual'], theme: 'wellness' },
  gandhi_jayanti: { emojis: ['🕊️', '☮️', '🤝', '✨', '📖', '🧡', '💚', '🌿', '🙏', '🕉️'], shayari: ['peace', 'motivational'], songs: ['peaceful', 'inspirational'], theme: 'peace' },
  world_peace_day: { emojis: ['🕊️', '☮️', '🤝', '🌍', '💙', '🕯️', '✨', '💗', '🤲', '🌟'], shayari: ['peace', 'unity'], songs: ['peace', 'inspirational'], theme: 'peace' },
  easter: { emojis: ['🐰', '🥚', '🌸', '🐣', '🐤', '🌷', '☀️', '🍫', '🧺', '✝️'], shayari: ['festive', 'happy'], songs: ['festive', 'happy'], theme: 'festive' },
  st_patricks: { emojis: ['🍀', '☘️', '🇮🇪', '🟢', '🤢', '🌈', '💰', '🍺', '🎻', '🧧'], shayari: ['lucky', 'celebratory'], songs: ['irish', 'folk'], theme: 'celebration' },
};

function getTimeInTimezone(timezone) {
  const offset = parseTimezoneOffset(timezone);
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + offset * 3600000);
}

function parseTimezoneOffset(tz) {
  if (typeof tz === 'number') return tz;
  const match = String(tz).match(/^([+-])(\d{2}):?(\d{2})$/);
  if (!match) return 5.5;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * (Number(match[2]) + Number(match[3]) / 60);
}

function formatDateStr(month, date) {
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(date).padStart(2, '0');
  return mm + '-' + dd;
}

class TimeIntelligence {
  static getCurrentTimeContext(timezone) {
    timezone = timezone || '+05:30';
    const now = getTimeInTimezone(timezone);
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();
    const date = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    const dateStr = formatDateStr(month, date);
    const festival = this.getFestival(dateStr, month, year);

    return {
      partOfDay: this.getPartOfDay(hour),
      dayType: this.getDayType(dayOfWeek),
      season: this.getSeason(month),
      festival: festival,
      hour: hour,
      minute: minute,
      dayOfWeek: dayOfWeek,
      month: month,
      date: date,
      year: year,
      dateStr: dateStr,
    };
  }

  static getPartOfDay(hour) {
    var h = Number(hour);
    for (var part in PARTS_OF_DAY) {
      if (PARTS_OF_DAY[part].indexOf(h) !== -1) return part;
    }
    return 'night';
  }

  static getDayType(dayOfWeek) {
    if (dayOfWeek === 0 || dayOfWeek === 6) return DAY_TYPES.weekend;
    return DAY_TYPES.weekday;
  }

  static isWeekend(dayOfWeek) {
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  static getSeason(month) {
    var m = Number(month);
    for (var season in SEASONS) {
      if (SEASONS[season].indexOf(m) !== -1) return season;
    }
    return 'winter';
  }

  static getFestival(dateStr, month, year) {
    if (FESTIVAL_MAP[dateStr]) return FESTIVAL_MAP[dateStr];
    if (month !== undefined) {
      var specials = this._getDynamicFestivals(month, year);
      if (specials) return specials;
    }
    return null;
  }

  static _getDynamicFestivals(month, year) {
    var m = Number(month);
    var y = year || new Date().getFullYear();
    var now = getTimeInTimezone('+05:30');

    if ((m === 2 || m === 3) && this._isDateMatch(this._getEasterDate(y), now, 2)) {
      return 'easter';
    }
    if ((m === 2 || m === 3) && this._isDateMatch(this._getHoliDate(y), now, 2)) {
      return 'holi';
    }
    if ((m >= 9 && m <= 11) && this._isDateMatch(this._getDiwaliDate(y), now)) {
      return 'diwali';
    }
    return null;
  }

  static _isDateMatch(d1, d2, margin) {
    margin = margin || 0;
    if (margin === 0) return d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    var diff = Math.abs(d1.getTime() - d2.getTime()) / 86400000;
    return diff <= margin;
  }

  static _getEasterDate(year) {
    var f = Math.floor;
    var G = year % 19;
    var C = f(year / 100);
    var H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
    var I = H - f(H / 28) * (1 - f(H / 28) * f(29 / (H + 1)) * f((21 - G) / 11));
    var L = I - (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
    var month = 3 + f((L + 40) / 44);
    var day = L + 28 - 31 * f(month / 4);
    return new Date(year, month - 1, day);
  }

  static _getHoliDate(year) {
    var fullMoon = this._findFullMoonDate(year, 2);
    var holiDate = new Date(fullMoon);
    holiDate.setDate(holiDate.getDate() + 1);
    return holiDate;
  }

  static _getDiwaliDate(year) {
    var fullMoon = this._findFullMoonDate(year, 9);
    var diwali = new Date(fullMoon);
    diwali.setDate(diwali.getDate() + 14);
    return diwali;
  }

  static _findFullMoonDate(year, targetMonth) {
    for (var day = 28; day >= 0; day--) {
      var dt = new Date(year, targetMonth, day);
      var age = this._lunarAge(dt);
      if (age >= 13.5 && age <= 15.5) return dt;
    }
    return new Date(year, targetMonth, 15);
  }

  static _lunarAge(date) {
    var synodic = 29.53058867;
    var knownNew = new Date(2000, 0, 6, 18, 14);
    var diff = (date.getTime() - knownNew.getTime()) / 86400000;
    return ((diff % synodic) + synodic) % synodic;
  }

  static getTimeBasedBoost(suggestionType, partOfDay) {
    var pod = partOfDay || this.getPartOfDay(getTimeInTimezone('+05:30').getHours());
    var boosts = TIME_AWARE_SUGGESTIONS[pod];
    if (!boosts) return 1.0;

    if (boosts.boost[suggestionType]) return boosts.boost[suggestionType];

    var st = suggestionType.toLowerCase().replace(/[_-]/g, '');
    for (var key in boosts.boost) {
      var k = key.toLowerCase().replace(/[_-]/g, '');
      if (st.indexOf(k) !== -1 || k.indexOf(st) !== -1) return boosts.boost[key];
    }

    return 1.0;
  }

  static getFestivalSuggestions(festival) {
    if (!festival) return null;
    if (FESTIVAL_CONTENT[festival]) return FESTIVAL_CONTENT[festival];

    var normalized = festival.toLowerCase().replace(/[_-]/g, '_');
    for (var key in FESTIVAL_CONTENT) {
      if (normalized.indexOf(key) !== -1 || key.indexOf(normalized) !== -1) {
        return FESTIVAL_CONTENT[key];
      }
    }

    return {
      emojis: ['🎉', '✨', '🌟'],
      shayari: ['festive'],
      songs: ['celebratory'],
      theme: 'celebration',
    };
  }

  static getTimeBasedEmojis(partOfDay) {
    var map = {
      morning: ['☀️', '🌅', '🌞', '☕', '🥐', '🙋', '👋', '✨', '😊', '🌟'],
      afternoon: ['☀️', '🌤️', '💼', '📋', '✅', '💪', '⚡', '📌', '🗂️', '🤝'],
      evening: ['🌇', '🌆', '🌅', '🌃', '🍿', '🎬', '🍷', '🥘', '🎵', '🎶'],
      night: ['🌙', '🌚', '✨', '💫', '🌃', '🌟', '🌛', '🎑', '😴', '💤'],
      dawn: ['🌅', '🌄', '☁️', '🌤️', '🧘', '☕', '🌸', '🌿', '🕊️', '🌺'],
    };
    return map[partOfDay] || map.morning;
  }

  static getSeasonalAdjustment(season) {
    var adjustments = {
      spring: { romantic: 1.3, happy: 1.2, love: 1.3, nature: 1.5, poetic: 1.3 },
      summer: { energetic: 1.4, travel: 1.5, fun: 1.3, outdoor: 1.5, party: 1.3 },
      fall: { cozy: 1.4, reflective: 1.3, grateful: 1.3, warm: 1.2, nostalgic: 1.4 },
      winter: { cozy: 1.5, romantic: 1.2, warm: 1.4, festive: 1.5, indoor: 1.3 },
    };
    return adjustments[season] || {};
  }

  static applyTimeBoost(timeContext, recommendation) {
    if (!recommendation) return recommendation;
    var pod = timeContext.partOfDay || this.getPartOfDay(getTimeInTimezone('+05:30').getHours());
    var boosted = {};

    for (var key in recommendation) {
      if (recommendation.hasOwnProperty(key)) {
        boosted[key] = recommendation[key];
      }
    }

    if (recommendation.score !== undefined) {
      var boostMultiplier = 1.0;
      if (recommendation.type) {
        boostMultiplier = this.getTimeBasedBoost(recommendation.type, pod);
      }
      var festivalBoost = timeContext.festival ? 1.3 : 1.0;
      var dayTypeBoost = timeContext.dayType === DAY_TYPES.weekend ? 1.15 : timeContext.dayType === DAY_TYPES.holiday ? 1.2 : 1.0;
      boosted.score = Math.min(1.0, recommendation.score * boostMultiplier * festivalBoost * dayTypeBoost);
    }

    if (recommendation.emojis && Array.isArray(recommendation.emojis)) {
      var timeEmojis = this.getTimeBasedEmojis(pod);
      boosted.emojis = [];
      var seen = {};
      for (var i = 0; i < timeEmojis.length && i < 3; i++) {
        if (!seen[timeEmojis[i]]) {
          boosted.emojis.push(timeEmojis[i]);
          seen[timeEmojis[i]] = true;
        }
      }
      for (var i = 0; i < recommendation.emojis.length; i++) {
        if (!seen[recommendation.emojis[i]]) {
          boosted.emojis.push(recommendation.emojis[i]);
          seen[recommendation.emojis[i]] = true;
        }
      }
    }

    if (recommendation.suggestions && Array.isArray(recommendation.suggestions)) {
      boosted.suggestions = [];
      for (var i = 0; i < recommendation.suggestions.length; i++) {
        var s = recommendation.suggestions[i];
        if (typeof s === 'object' && s !== null && s.score !== undefined) {
          var boost = this.getTimeBasedBoost(s.type || 'casual', pod);
          var copy = {};
          for (var k in s) { if (s.hasOwnProperty(k)) copy[k] = s[k]; }
          copy.score = Math.min(1.0, s.score * boost);
          boosted.suggestions.push(copy);
        } else {
          boosted.suggestions.push(s);
        }
      }
    }

    boosted._timeBoost = true;
    boosted._context = { partOfDay: pod, festival: timeContext.festival, dayType: timeContext.dayType };
    return boosted;
  }

  static _pickGreetingType(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  static formatTimeGreeting(hour, userDNA) {
    var h = Number(hour);
    var style = (userDNA && userDNA.writingStyle) ? userDNA.writingStyle : {};
    var formality = style.formalScore !== undefined ? style.formalScore : 0.5;
    var humor = style.humorScore !== undefined ? style.humorScore : 0.3;
    var creativity = style.creativityScore !== undefined ? style.creativityScore : 0.3;
    var kindness = style.kindnessScore !== undefined ? style.kindnessScore : 0.6;
    var romantic = style.romanticScore !== undefined ? style.romanticScore : 0.3;

    var partName = this.getPartOfDay(h);

    var greetings = {
      morning: {
        formal: ['Good morning', 'Good morning, have a wonderful day', 'Wishing you a great morning'],
        casual: ['Good morning! ☀️', 'Morning! 😊', 'Hey! Rise and shine!'],
        funny: ['Morning! Coffee is ready... or is it?', 'Good morning! I hope your day is as nice as you!'],
        romantic: ['Good morning my love ❤️', 'Morning sunshine ☀️', 'You make every morning beautiful'],
        poetic: ['With the golden sunrise, my thoughts turn to you', 'A beautiful morning to match your beautiful soul'],
      },
      afternoon: {
        formal: ['Good afternoon', 'Hope you are having a productive day', 'Good afternoon, how is your day going?'],
        casual: ['Hey! How is your day?', 'Heyyy, what is up?', 'Good afternoon! 😊'],
        romantic: ['Thinking of you this afternoon', 'You are making my afternoon better', 'Missing you this afternoon'],
        poetic: ['The afternoon sun reminds me of your warm smile', 'In the silence of the afternoon, I hear your voice'],
        funny: ['Surviving the afternoon slump?', 'Afternoon vibes 😎'],
      },
      evening: {
        formal: ['Good evening', 'Good evening, hope you had a good day', 'Wishing you a pleasant evening'],
        casual: ['Hey! Good evening!', 'Evening! 😊', 'How was your day?'],
        romantic: ['Good evening my love 💕', 'Ready for a cozy evening with you', 'The evening is perfect because you are in it'],
        poetic: ['As the sun sets, my thoughts rise for you', 'The evening paints the sky, but you paint my world'],
        funny: ['Evening! Time to pretend I am going to sleep early', 'Evening! The best time to pretend I have my life together'],
      },
      night: {
        formal: ['Good night', 'Wishing you a restful night', 'Good night, sleep well'],
        casual: ['Good night! 😴', 'Night! Sleep well!', 'Heading to bed? 🌙'],
        romantic: ['Good night my love 💕', 'Wish I was there to say goodnight in person', 'Dream of me tonight 😘'],
        poetic: ['The stars remind me of your eyes', 'As the world sleeps, I dream of you', 'May your dreams be as beautiful as you'],
        funny: ['Night night! Do not let the bedbugs bite!', 'Time to recharge for another day of surviving'],
      },
      dawn: {
        formal: ['Good early morning', 'Wishing you a quiet dawn', 'Peaceful morning to you'],
        casual: ['Up and at them!', 'The early bird! 🐦', 'Dawn patrol reporting!'],
        romantic: ['Watching the sunrise thinking of you', 'Dawn is beautiful, but not as beautiful as you'],
        poetic: ['The world wakes, but you are the only thing on my mind', 'Dawn whispers your name'],
        funny: ['Who needs sleep anyway?', 'This is way too early'],
      },
    };

    var partGreetings = greetings[partName] || greetings.morning;

    var styleText = formality > 0.7 ? 'formal' : humor > 0.5 ? 'funny' : romantic > 0.6 ? 'romantic' : creativity > 0.6 ? 'poetic' : kindness > 0.6 ? 'poetic' : 'casual';

    var pool = partGreetings[styleText] || partGreetings.casual;

    return this._pickGreetingType(pool);
  }

  getCurrentTimeContext(timezone) {
    return TimeIntelligence.getCurrentTimeContext(timezone);
  }
  getDayType(dayOfWeek) { return TimeIntelligence.getDayType(dayOfWeek); }
  _pickGreetingType(arr) { return TimeIntelligence._pickGreetingType(arr); }
  getPartOfDay(hour) { return TimeIntelligence.getPartOfDay(hour); }
  getFestival(dateStr, month, year) { return TimeIntelligence.getFestival(dateStr, month, year); }
  getSeason(month) { return TimeIntelligence.getSeason(month); }
  isWeekend(dayOfWeek) { return TimeIntelligence.isWeekend(dayOfWeek); }
  getTimeBasedBoost(suggestionType, partOfDay) { return TimeIntelligence.getTimeBasedBoost(suggestionType, partOfDay); }
  getFestivalSuggestions(festival) { return TimeIntelligence.getFestivalSuggestions(festival); }
  getTimeBasedEmojis(partOfDay) { return TimeIntelligence.getTimeBasedEmojis(partOfDay); }
  getSeasonalAdjustment(season) { return TimeIntelligence.getSeasonalAdjustment(season); }
  applyTimeBoost(timeContext, recommendation) { return TimeIntelligence.applyTimeBoost(timeContext, recommendation); }
  formatTimeGreeting(hour, userDNA) { return TimeIntelligence.formatTimeGreeting(hour, userDNA); }
}

module.exports = new TimeIntelligence();