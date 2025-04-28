const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const User = require('../models/User');

// Middleware to validate JWT token (reuse from auth.js)
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error();

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Please authenticate.' });
  }
};

// Create new team
router.post('/', auth, [
  body('name').trim().notEmpty(),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    const team = new Team({
      name,
      description,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await team.save();

    // Add team to user's teams
    req.user.teams.push(team._id);
    await req.user.save();

    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ error: 'Error creating team' });
  }
});

// Get user's teams
router.get('/', auth, async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .populate('owner', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching teams' });
  }
});

// Get team details
router.get('/:teamId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate('members.user', 'name email')
      .populate('owner', 'name email');

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.isMember(req.user._id)) {
      return res.status(403).json({ error: 'Not a team member' });
    }

    res.json(team);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching team details' });
  }
});

// Invite user to team
router.post('/:teamId/invite', auth, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to invite members' });
    }

    const userToInvite = await User.findOne({ email: req.body.email });
    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (team.isMember(userToInvite._id)) {
      return res.status(400).json({ error: 'User is already a team member' });
    }

    // Add user to team
    team.members.push({
      user: userToInvite._id,
      role: 'member'
    });
    await team.save();

    // Add team to user's teams
    userToInvite.teams.push(team._id);
    await userToInvite.save();

    // Notify user via Socket.IO
    req.app.get('io').to(`user:${userToInvite._id}`).emit('team-invite', {
      teamId: team._id,
      teamName: team.name,
      invitedBy: req.user.name
    });

    res.json({ message: 'User invited successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error inviting user' });
  }
});

// Remove user from team
router.delete('/:teamId/members/:userId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({ error: 'Not authorized to remove members' });
    }

    const memberToRemove = team.members.find(
      member => member.user.toString() === req.params.userId
    );

    if (!memberToRemove) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (memberToRemove.role === 'admin' && team.members.filter(m => m.role === 'admin').length === 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin' });
    }

    // Remove member from team
    team.members = team.members.filter(
      member => member.user.toString() !== req.params.userId
    );
    await team.save();

    // Remove team from user's teams
    const user = await User.findById(req.params.userId);
    if (user) {
      user.teams = user.teams.filter(
        teamId => teamId.toString() !== team._id.toString()
      );
      await user.save();
    }

    // Notify removed user via Socket.IO
    req.app.get('io').to(`user:${req.params.userId}`).emit('team-removed', {
      teamId: team._id,
      teamName: team.name
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error removing member' });
  }
});

module.exports = router; 