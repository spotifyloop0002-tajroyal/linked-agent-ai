import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useLinkedInAPI } from "@/hooks/useLinkedInAPI";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Linkedin,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const LinkedInConnectionPage = () => {
  const { toast } = useToast();
  const {
    isConnected,
    isLoading: apiLoading,
    linkedinId,
    getAuthUrl,
    disconnect,
    checkConnection,
  } = useLinkedInAPI();

  const { profile, isLoading: profileLoading } = useDashboardProfile();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const authUrl = await getAuthUrl();
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast({
          title: "Connection failed",
          description: "Could not generate LinkedIn authorization URL.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect LinkedIn?")) return;
    const success = await disconnect();
    if (success) {
      toast({ title: "LinkedIn disconnected" });
    }
  };

  if (apiLoading || profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">LinkedIn Connection</h1>
          <p className="text-muted-foreground mt-1">
            Connect your LinkedIn account via the official API to enable automatic posting
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:100ms]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Linkedin className="w-5 h-5 text-[#0A66C2]" />
                  LinkedIn API Connection
                </CardTitle>
                <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
                  {isConnected ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {isConnected ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isConnected ? (
                <>
                  <Alert>
                    <Linkedin className="w-4 h-4" />
                    <AlertDescription>
                      Connect your LinkedIn account using the official LinkedIn API. This allows LinkedBot to post content directly to your profile — no browser extensions needed.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleConnect} disabled={connecting} className="gap-2">
                    {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                    Connect with LinkedIn
                  </Button>
                </>
              ) : (
                <>
                  <Alert className="border-success/50 bg-success/10">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <AlertDescription className="text-success">
                      LinkedIn account is connected and ready! Posts will be published via the official API.
                    </AlertDescription>
                  </Alert>
                  {linkedinId && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
                      LinkedIn ID: {linkedinId}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button onClick={() => checkConnection()} variant="outline" className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh Status
                    </Button>
                    <Button onClick={handleDisconnect} variant="destructive">
                      Disconnect
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Redirect URI info for developers */}
        <div className="animate-fade-up [animation-delay:200ms]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Developer Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium mb-1">OAuth Redirect URI</p>
                <code className="text-xs bg-muted px-3 py-2 rounded block break-all">
                  {window.location.origin}/auth/linkedin/callback
                </code>
                <p className="text-xs text-muted-foreground mt-1">
                  Add this URL in your LinkedIn Developer App settings under "Authorized redirect URLs"
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Required Permissions</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">openid</Badge>
                  <Badge variant="outline">profile</Badge>
                  <Badge variant="outline">email</Badge>
                  <Badge variant="outline">w_member_social</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LinkedInConnectionPage;
