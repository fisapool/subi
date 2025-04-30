
import { Router } from 'express';
import { AuthService } from '../services/auth';
import { ProxySessionService } from '../services/proxy-session';
import type { AuthenticatedRequest } from '../routes';

const router = Router();

router.post('/token', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = await AuthService.generateProxyToken(req.user);
    res.json({ token });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({ message: 'Failed to generate token' });
  }
});

router.post('/session/start', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { proxyId } = req.body;
    const sessionId = await ProxySessionService.startSession(req.user, proxyId);
    res.json({ sessionId });
  } catch (error) {
    console.error('Session start error:', error);
    res.status(500).json({ message: 'Failed to start session' });
  }
});

export { router as proxyAuthRouter };
