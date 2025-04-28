const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const SupportRequest = require('../models/SupportRequest');
const User = require('../models/User');

// GET /api/support - Get user's support requests
router.get('/', requireAuth, async (req, res) => {
  try {
    const requests = await SupportRequest.find({ user: req.user.id })
      .sort({ updatedAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support requests' });
  }
});

// GET /api/support/:id - Get specific support request
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await SupportRequest.findOne({
      _id: req.params.id,
      user: req.user.id
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Support request not found' });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch support request' });
  }
});

// POST /api/support - Create new support request
router.post('/',
  requireAuth,
  [
    body('subject').notEmpty().trim(),
    body('message').notEmpty().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user is premium
      const user = await User.findById(req.user.id);
      const isPremium = user.premium;

      const supportRequest = new SupportRequest({
        user: req.user.id,
        subject: req.body.subject,
        message: req.body.message,
        isPremium,
        priority: isPremium ? 'high' : 'normal'
      });

      await supportRequest.save();
      res.json(supportRequest);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create support request' });
    }
  }
);

// POST /api/support/:id/respond - Add response to support request
router.post('/:id/respond',
  requireAuth,
  body('message').notEmpty().trim(),
  async (req, res) => {
    try {
      const request = await SupportRequest.findOne({
        _id: req.params.id,
        user: req.user.id
      });

      if (!request) {
        return res.status(404).json({ error: 'Support request not found' });
      }

      request.responses.push({
        from: 'user',
        message: req.body.message
      });

      await request.save();
      res.json(request);
    } catch (error) {
      res.status(500).json({ error: 'Failed to add response' });
    }
  }
);

module.exports = router; 