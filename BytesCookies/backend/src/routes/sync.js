const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const SyncData = require('../models/SyncData');

// GET /api/sync - Get user's synced data
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await SyncData.findOne({ user: req.user.id });
    res.json(data ? data.data : {});
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sync data' });
  }
});

// POST /api/sync - Upload/replace user's data
router.post('/',
  requireAuth,
  body('data').isObject(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      let syncData = await SyncData.findOne({ user: req.user.id });
      if (!syncData) {
        syncData = new SyncData({ user: req.user.id, data: req.body.data });
      } else {
        syncData.data = req.body.data;
      }
      await syncData.save();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save sync data' });
    }
  }
);

// PATCH /api/sync - Merge/patch user's data
router.patch('/',
  requireAuth,
  body('data').isObject(),
  async (req, res) => {
    try {
      let syncData = await SyncData.findOne({ user: req.user.id });
      if (!syncData) {
        syncData = new SyncData({ user: req.user.id, data: req.body.data });
      } else {
        syncData.data = { ...syncData.data, ...req.body.data };
      }
      await syncData.save();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update sync data' });
    }
  }
);

module.exports = router; 