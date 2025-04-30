
import { useState, useEffect } from 'react';
import { mockProxyServers, mockSessions } from '../mockData';

export function useDevMode() {
  const [isDevMode, setIsDevMode] = useState(false);
  
  useEffect(() => {
    const isDev = process.env.NODE_ENV === 'development';
    setIsDevMode(isDev);
  }, []);

  return {
    isDevMode,
    mockData: {
      proxyServers: mockProxyServers,
      sessions: mockSessions
    }
  };
}
