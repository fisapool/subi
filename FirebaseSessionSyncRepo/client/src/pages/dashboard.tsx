import { useEffect } from "react";
import { useLocation } from "wouter";
import { auth } from '@/lib/firebase';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { ProxyList } from "@/components/proxy/ProxyList";
import { BandwidthChart } from "@/components/analytics/BandwidthChart";
import { LatencyMonitor } from "@/components/analytics/LatencyMonitor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut } from "lucide-react";
import React from 'react';


const TimeRangeSelector = React.lazy(() => import('@/components/analytics/TimeRangeSelector').then(m => ({ default: m.TimeRangeSelector })));


export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        setLocation("/auth");
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Assuming logout is a function that signs out the user.  The original code was missing this.
      setLocation("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto py-4 px-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Proxy Dashboard</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
          <div className="flex items-center gap-4">
            <React.Suspense fallback={<div>Loading...</div>}>
              <TimeRangeSelector onChange={(range) => console.log('Selected range:', range)} />
            </React.Suspense>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BandwidthChart />
          <LatencyMonitor />
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Active Proxies</h2>
          <React.Suspense fallback={<div>Loading...</div>}>
            <ProxyList />
          </React.Suspense>
        </div>
      </main>
    </div>
  );
}