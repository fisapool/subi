import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertProxyServerSchema, insertProxySessionSchema } from "@shared/schema";
import { auth } from "./firebase";
import { z } from "zod";

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    username: string;
    credits: number;
  };
}

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Middleware to verify Firebase token
  const authenticateUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = req.headers.authorization?.split("Bearer ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decodedToken = await auth.verifyIdToken(token);
      const user = await storage.getUserByUid(decodedToken.uid);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ message: "Invalid token" });
    }
  };

  // User routes
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split("Bearer ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decodedToken = await auth.verifyIdToken(token);
      const existingUser = await storage.getUserByUid(decodedToken.uid);

      if (existingUser) {
        return res.json(existingUser);
      }

      const user = await storage.createUser({
        uid: decodedToken.uid,
        email: decodedToken.email!,
        username: decodedToken.email!.split("@")[0],
      });

      res.json(user);
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Proxy routes
  app.get("/api/proxies", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const proxies = await storage.getProxies(req.user.id);
      res.json(proxies);
    } catch (error) {
      console.error('Fetch proxies error:', error);
      res.status(500).json({ message: "Failed to fetch proxies" });
    }
  });

  app.post("/api/proxies", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const proxy = insertProxyServerSchema.parse(req.body);
      const newProxy = await storage.createProxy(req.user.id, proxy);
      res.json(newProxy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proxy data" });
      }
      console.error('Create proxy error:', error);
      res.status(500).json({ message: "Failed to create proxy" });
    }
  });

  app.post("/api/proxy/:id/toggle", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const proxyId = parseInt(req.params.id);
      const { active } = req.body;

      const proxy = await storage.getProxy(proxyId);
      if (!proxy) {
        return res.status(404).json({ message: "Proxy not found" });
      }

      if (proxy.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updated = await storage.updateProxyStatus(proxyId, active);
      res.json(updated);
    } catch (error) {
      console.error('Toggle proxy error:', error);
      res.status(500).json({ message: "Failed to update proxy status" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/bandwidth", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const sessions = await storage.getActiveSessions(req.user.id);
      const data = sessions.map(session => ({
        timestamp: session.startTime.toISOString(),
        bandwidth: session.bandwidthUsed,
      }));
      res.json(data);
    } catch (error) {
      console.error('Fetch bandwidth error:', error);
      res.status(500).json({ message: "Failed to fetch bandwidth data" });
    }
  });

  app.get("/api/analytics/latency", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const sessions = await storage.getActiveSessions(req.user.id);
      const latencies = sessions
        .map(s => s.averageLatency)
        .filter((l): l is number => l !== null);

      res.json({
        current: latencies[latencies.length - 1] || 0,
        average: latencies.reduce((a, b) => a + b, 0) / latencies.length || 0,
        max: Math.max(...latencies, 0),
      });
    } catch (error) {
      console.error('Fetch latency error:', error);
      res.status(500).json({ message: "Failed to fetch latency data" });
    }
  });

  return httpServer;
}