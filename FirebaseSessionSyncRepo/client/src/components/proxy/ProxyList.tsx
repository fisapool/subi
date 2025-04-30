import { useEffect, useState } from "react";
import { ProxyCard } from "./ProxyCard";
import { type ProxyServer } from "@shared/schema";
import { subscribeToProxyServers } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useDevMode } from "@/lib/hooks/useDevMode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export function ProxyList() {
  const [proxies, setProxies] = useState<ProxyServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { isDevMode, mockData } = useDevMode();

  useEffect(() => {
    const user = auth.currentUser;
    
    if (isDevMode) {
      setProxies(mockData.proxyServers);
      setIsLoading(false);
      return;
    }

    if (!user) {
      setError("Please sign in to view your proxies");
      setIsLoading(false);
      return;
    }

    console.log("Setting up proxy subscription for user:", user.uid);
    const unsubscribe = subscribeToProxyServers(user.uid, (updatedProxies) => {
      console.log("Received proxy update:", updatedProxies);
      setProxies(updatedProxies);
      setIsLoading(false);
      setError(null);
    });

    return () => {
      console.log("Cleaning up proxy subscription");
      unsubscribe();
    };
  }, [isDevMode, mockData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (proxies.length === 0) {
    return (
      <Alert>
        <AlertDescription>No proxies found. Add a proxy to get started.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {proxies.map((proxy) => (
        <ProxyCard 
          key={proxy.id} 
          proxy={proxy}
          onStatusChange={() => {
            toast({
              title: "Status Updated",
              description: `${proxy.name} status has been updated.`
            });
          }}
        />
      ))}
    </div>
  );
}