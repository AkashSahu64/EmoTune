const dnaService = require('../services/dnaService');

exports.getDNAProfile = async (req, res) => {
  try {
    const profile = await dnaService.getProfile(req.userId);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDNARecommendationProfile = async (req, res) => {
  try {
    const profile = await dnaService.getRecommendationProfile(req.userId);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getWritingStyle = async (req, res) => {
  try {
    const style = await dnaService.getWritingStyleProfile(req.userId);
    res.json({ style });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getActivityProfile = async (req, res) => {
  try {
    const activity = await dnaService.getActivityProfile(req.userId);
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTopEmojis = async (req, res) => {
  try {
    const emojis = await dnaService.getTopEmojis(req.userId, parseInt(req.query.limit) || 5);
    res.json({ emojis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.resetDNA = async (req, res) => {
  try {
    const dna = await dnaService.resetDNA(req.userId);
    res.json({ message: 'DNA reset successfully', dna });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
