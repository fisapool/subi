
import type { ProxyServer, ProxySession } from '@shared/schema';

export const mockProxyServers: ProxyServer[] = [
  {
    id: 'mock-1',
    userId: 'test-user',
    name: 'Development Proxy',
    host: '0.0.0.0',
    port: 8080,
    location: 'Local',
    isActive: true
  },
  {
    id: 'mock-2',
    userId: 'test-user',
    name: 'Testing Proxy',
    host: '0.0.0.0',
    port: 8081,
    location: 'Development',
    isActive: false
  }
];

export const mockSessions: ProxySession[] = [
  {
    id: 'session-1',
    userId: 'test-user',
    proxyId: 'mock-1',
    startTime: new Date(Date.now() - 3600000),
    endTime: null,
    bandwidthUsed: 1500000,
    averageLatency: 150
  }
];
