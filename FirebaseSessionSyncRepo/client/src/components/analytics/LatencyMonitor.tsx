
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';

interface LatencyData {
  current: number;
  average: number;
  max: number;
}

export function LatencyMonitor() {
  const { data, isLoading } = useQuery<LatencyData>({
    queryKey: ['latency', auth.currentUser?.uid],
    queryFn: async () => {
      const response = await fetch('/api/analytics/latency');
      return response.json();
    },
    refetchInterval: 2000,
    retry: 3,
    staleTime: 1000,
  });

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-green-500';
    if (latency < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Monitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse bg-muted" />
      </Card>
    );
  }

  const percentage = data ? (data.current / data.max) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency Monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className={getLatencyColor(data?.current || 0)}>
              Current: {data?.current}ms
            </span>
            <span>Average: {data?.average}ms</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
