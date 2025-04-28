const { requireAuth } = require('./auth');

// Middleware to check if user has premium access
const requirePremium = async (req, res, next) => {
  try {
    // First check if user is authenticated
    await requireAuth(req, res, () => {
      if (req.user && req.user.premium) {
        next();
      } else {
        res.status(403).json({ 
          error: 'Premium feature',
          message: 'This feature requires a premium subscription'
        });
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = requirePremium; 