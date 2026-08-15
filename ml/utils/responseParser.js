function parseAIResponse(aiText) {
  if (!aiText || typeof aiText !== 'string') {
    throw new Error('AI response is empty or not a string');
  }

  let cleaned = aiText.trim();

  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  cleaned = cleaned.replace(/^[^{[]*/, '').replace(/[^}\]]*$/, '');

  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    try {
      const singleLine = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
      return JSON.parse(singleLine);
    } catch (secondError) {
      try {
        const escaped = cleaned
          .replace(/\\(?!["\\/bfnrt])/g, '\\\\')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        return JSON.parse(escaped);
      } catch (thirdError) {
        throw new Error(
          `Failed to parse AI response as JSON. ` +
          `Original text: "${aiText.slice(0, 200)}..." ` +
          `Cleaned text: "${cleaned.slice(0, 200)}..."`
        );
      }
    }
  }
}

function safeParseJSON(text, defaultValue = null) {
  try {
    return parseAIResponse(text);
  } catch {
    return defaultValue;
  }
}

function extractJsonFromResponse(text) {
  if (!text) return null;

  const patterns = [
    /{[\s\S]*?}/,
    /\[[\s\S]*?\]/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        continue;
      }
    }
  }

  return null;
}

function validateResponseSchema(parsed, schema) {
  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Response is not an object'] };
  }

  const errors = [];

  for (const [key, type] of Object.entries(schema)) {
    const value = parsed[key];
    if (value === undefined || value === null) {
      errors.push(`Missing required key: "${key}"`);
      continue;
    }

    if (type === 'array' && !Array.isArray(value)) {
      errors.push(`Key "${key}" should be an array`);
    } else if (type === 'string' && typeof value !== 'string') {
      errors.push(`Key "${key}" should be a string`);
    } else if (type === 'number' && typeof value !== 'number') {
      errors.push(`Key "${key}" should be a number`);
    } else if (type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Key "${key}" should be a boolean`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  parseAIResponse,
  safeParseJSON,
  extractJsonFromResponse,
  validateResponseSchema,
};
