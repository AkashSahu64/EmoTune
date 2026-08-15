const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../identity/middleware/authMiddleware');

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.create({ ...req.body, owner: req.user._id });
    res.status(201).json(community);
  } catch (err) { next(err); }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const communities = await Community.find({ members: req.user._id });
    res.json(communities);
  } catch (err) { next(err); }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community);
  } catch (err) { next(err); }
});

router.patch('/:id', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true }
    );
    if (!community) return res.status(404).json({ error: 'Community not found or not authorized' });
    res.json(community);
  } catch (err) { next(err); }
});

router.post('/:id/join', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { members: req.user._id } },
      { new: true }
    );
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community);
  } catch (err) { next(err); }
});

router.post('/:id/leave', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findByIdAndUpdate(
      req.params.id,
      { $pull: { members: req.user._id } },
      { new: true }
    );
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community);
  } catch (err) { next(err); }
});

router.post('/:id/members/:userId/role', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findOne({ _id: req.params.id, owner: req.user._id });
    if (!community) return res.status(403).json({ error: 'Only the owner can change roles' });
    community.memberRoles.set(req.params.userId, req.body.role);
    await community.save();
    res.json(community);
  } catch (err) { next(err); }
});

router.post('/:id/channels', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findOne({ _id: req.params.id, owner: req.user._id });
    if (!community) return res.status(403).json({ error: 'Only the owner can create channels' });
    community.channels.push(req.body);
    await community.save();
    res.status(201).json(community);
  } catch (err) { next(err); }
});

router.get('/:id/channels', authMiddleware, async (req, res, next) => {
  try {
    const Community = require('../models/Community');
    const community = await Community.findById(req.params.id).select('channels');
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json(community.channels);
  } catch (err) { next(err); }
});

module.exports = router;