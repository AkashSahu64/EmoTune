const Bookmark = require('../models/Bookmark');
const { bookmarkSchema } = require('../utils/validators');
const logger = require('../utils/logger');

exports.createBookmark = async (req, res) => {
  try {
    const { error, value } = bookmarkSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const bookmark = await Bookmark.create({
      user: req.userId,
      ...value,
    });

    res.status(201).json({ bookmark });
  } catch (err) {
    logger.error('Create bookmark error', { error: err.message });
    res.status(500).json({ error: 'Failed to save bookmark' });
  }
};

exports.getBookmarks = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const query = { user: req.userId };
    if (type) query.type = type;

    const bookmarks = await Bookmark.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Bookmark.countDocuments(query);

    res.json({ bookmarks, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
};

exports.deleteBookmark = async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    const bookmark = await Bookmark.findOneAndDelete({ _id: bookmarkId, user: req.userId });
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });

    res.json({ message: 'Bookmark deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
};

exports.incrementUsage = async (req, res) => {
  try {
    const { bookmarkId } = req.params;
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: bookmarkId, user: req.userId },
      { $inc: { usageCount: 1 }, lastUsed: new Date() },
      { new: true }
    );
    if (!bookmark) return res.status(404).json({ error: 'Bookmark not found' });

    res.json({ bookmark });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
};
