import React from "react";
import { CheckCircle, Linkedin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface ExtensionStatusProps {
  isConnected: boolean;
  isLoading: boolean;
  getAuthUrl: () => Promise<string | null>;
  disconnect: () => Promise<boolean>;
}

export const ExtensionStatus: React.FC<ExtensionStatusProps> = ({ isConnected, isLoading, getAuthUrl, disconnect }) => {

  const handleConnect = async () => {
    const authUrl = await getAuthUrl();
    if (authUrl) {
      window.location.href = authUrl;
    } else {
      toast.error("Failed to initiate LinkedIn connection");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect LinkedIn?")) return;
    const success = await disconnect();
    if (success) {
      toast.success("LinkedIn disconnected");
    } else {
      toast.error("Failed to disconnect");
    }
  };

  // Don't show a blocking loading card — let the dashboard render immediately
  if (isLoading) return null;

  if (!isConnected) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Linkedin className="w-8 h-8 text-[#0A66C2]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Connect LinkedIn
              </h3>
              <p className="text-muted-foreground mb-4">
                Connect your LinkedIn account to enable automatic posting via the official LinkedIn API.
              </p>
              <Button onClick={handleConnect} className="gap-2">
                <Linkedin className="w-4 h-4" />
                Connect with LinkedIn
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-success/5 border-success/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              LinkedIn Connected ✓
            </h3>
            <p className="text-muted-foreground mb-4">
              Your LinkedIn account is connected via the official API. Posts will be published directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
