
import { useState, useEffect } from 'react';
import { subscribeToProxyServers, subscribeToProxySessions } from '../firestore';
import type { ProxyServer, ProxySession } from '@shared/schema';

export function useProxyData(userId: string) {
  const [proxyServers, setProxyServers] = useState<ProxyServer[]>([]);
  const [sessions, setSessions] = useState<ProxySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    setLoading(true);
    console.log("Setting up proxy subscription for user:", userId);

    const unsubProxies = subscribeToProxyServers(userId, (proxies) => {
      console.log("Received proxy update:", proxies);
      setProxyServers(proxies);
      setLoading(false);
    });

    const unsubSessions = subscribeToProxySessions(userId, (sessions) => {
      console.log("Received sessions update:", sessions);
      setSessions(sessions);
    });

    return () => {
      console.log("Cleaning up proxy subscription");
      unsubProxies();
      unsubSessions();
    };
  }, [userId]);

  return { proxyServers, sessions, loading };
}
