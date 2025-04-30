import type { User, ProxyServer, ProxySession, InsertUser, InsertProxyServer, InsertProxySession } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Proxy operations
  getProxies(userId: number): Promise<ProxyServer[]>;
  getProxy(id: number): Promise<ProxyServer | undefined>;
  createProxy(userId: number, proxy: InsertProxyServer): Promise<ProxyServer>;
  updateProxyStatus(id: number, isActive: boolean): Promise<ProxyServer>;
  
  // Session operations
  createSession(userId: number, session: InsertProxySession): Promise<ProxySession>;
  updateSessionStats(id: number, bandwidth: number, latency: number): Promise<void>;
  getActiveSessions(userId: number): Promise<ProxySession[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private proxies: Map<number, ProxyServer> = new Map();
  private sessions: Map<number, ProxySession> = new Map();
  private currentId = 1;

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, credits: 100 };
    this.users.set(id, user);
    return user;
  }

  async getProxies(userId: number): Promise<ProxyServer[]> {
    return Array.from(this.proxies.values())
      .filter(proxy => proxy.userId === userId);
  }

  async getProxy(id: number): Promise<ProxyServer | undefined> {
    return this.proxies.get(id);
  }

  async createProxy(userId: number, proxy: InsertProxyServer): Promise<ProxyServer> {
    const id = this.currentId++;
    const newProxy: ProxyServer = { ...proxy, id, userId, isActive: false };
    this.proxies.set(id, newProxy);
    return newProxy;
  }

  async updateProxyStatus(id: number, isActive: boolean): Promise<ProxyServer> {
    const proxy = await this.getProxy(id);
    if (!proxy) throw new Error("Proxy not found");
    
    const updated = { ...proxy, isActive };
    this.proxies.set(id, updated);
    return updated;
  }

  async createSession(userId: number, session: InsertProxySession): Promise<ProxySession> {
    const id = this.currentId++;
    const newSession: ProxySession = {
      ...session,
      id,
      userId,
      startTime: new Date(),
      endTime: null,
      bandwidthUsed: 0,
      averageLatency: null,
    };
    this.sessions.set(id, newSession);
    return newSession;
  }

  async updateSessionStats(id: number, bandwidth: number, latency: number): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) throw new Error("Session not found");
    
    this.sessions.set(id, {
      ...session,
      bandwidthUsed: bandwidth,
      averageLatency: latency,
    });
  }

  async getActiveSessions(userId: number): Promise<ProxySession[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && !session.endTime);
  }
}

export const storage = new MemStorage();
