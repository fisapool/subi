import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { type ProxyServer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { updateProxyServer } from "@/lib/firestore";

interface ProxyCardProps {
  proxy: ProxyServer;
  onStatusChange: () => void;
}

export function ProxyCard({ proxy, onStatusChange }: ProxyCardProps) {
  const [isPending, setIsPending] = useState(false);
  const { toast } = useToast();

  const handleToggle = async () => {
    setIsPending(true);
    try {
      await updateProxyServer(proxy.id.toString(), { isActive: !proxy.isActive });
      onStatusChange();
    } catch (error) {
      console.error("Error toggling proxy status:", error);
      toast({
        title: "Error",
        description: "Failed to toggle proxy status",
        variant: "destructive"
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {proxy.name}
        </CardTitle>
        <Badge variant={proxy.isActive ? "default" : "secondary"}>
          {proxy.isActive ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>Host: {proxy.host}</p>
          <p>Port: {proxy.port}</p>
          <p>Location: {proxy.location}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Switch
          checked={proxy.isActive}
          onCheckedChange={handleToggle}
          disabled={isPending}
        />
        <Button variant="outline" size="sm" disabled={isPending}>
          Details
        </Button>
      </CardFooter>
    </Card>
  );
}