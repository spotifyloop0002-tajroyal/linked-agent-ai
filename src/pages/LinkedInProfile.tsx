import { useState, useEffect } from "react";
import { RefreshCw, MapPin, Briefcase, User, Clock, AlertCircle, ExternalLink, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import type { LinkedInProfileData } from "@/hooks/useUserProfile";
import { useProfileSync } from "@/hooks/useProfileSync";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const LinkedInProfile = () => {
  const { isConnected, isInstalled, isLoading: extensionLoading } = useLinkedBotExtension();
  const { profile, isLoading: profileLoading, fetchProfile } = useDashboardProfile();
  const { syncProfileData, isRefreshing } = useProfileSync();
  
  const [profileData, setProfileData] = useState<LinkedInProfileData | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    if (profile) {
      const savedData = profile.linkedin_profile_data;
      if (savedData) {
        setProfileData(savedData);
      } else if (profile.linkedin_profile_url || profile.linkedin_username || profile.name) {
        // Build profile data from existing user_profiles fields
        setProfileData({
          fullName: profile.name || undefined,
          username: profile.linkedin_username || undefined,
          profileUrl: profile.linkedin_profile_url || undefined,
        });
      }
      if (profile.profile_last_scraped) {
        setLastSynced(new Date(profile.profile_last_scraped));
      }
    }
  }, [profile]);

  const handleRefresh = async () => {
    const result = await syncProfileData(profile?.linkedin_profile_url || undefined);
    if (result.success && result.data) {
      setProfileData(result.data);
      setLastSynced(new Date());
      fetchProfile();
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isLoading = extensionLoading || profileLoading;
  const hasProfileUrl = Boolean(profile?.linkedin_profile_url);

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">LinkedIn Profile</h1>
          <p className="text-muted-foreground mt-2">
            View and sync your LinkedIn profile data
          </p>
        </div>

        {/* Extension Status Warning */}
        {!isLoading && !isInstalled && (
          <div className="animate-fade-up [animation-delay:100ms]">
            <Alert className="border-warning/50 bg-warning/10">
              <AlertCircle className="w-4 h-4 text-warning" />
              <AlertDescription className="flex items-center justify-between">
                <span>Install the LinkedBot Chrome extension to sync your profile data.</span>
                <Button size="sm" variant="outline" asChild className="ml-4">
                  <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Install
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!isLoading && isInstalled && !isConnected && (
          <div className="animate-fade-up [animation-delay:100ms]">
            <Alert className="border-warning/50 bg-warning/10">
              <AlertCircle className="w-4 h-4 text-warning" />
              <AlertDescription className="flex items-center justify-between">
                <span>Connect your extension to sync data.</span>
                <Button size="sm" variant="outline" asChild className="ml-4">
                  <Link to="/dashboard/linkedin-connection">
                    <Linkedin className="w-3 h-3 mr-1" />
                    Connect
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Missing Profile URL Warning */}
        {!isLoading && isConnected && !hasProfileUrl && (
          <div className="animate-fade-up [animation-delay:100ms]">
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <AlertDescription className="flex items-center justify-between">
                <span>Add your LinkedIn profile URL to enable data syncing.</span>
                <Button size="sm" variant="outline" asChild className="ml-4">
                  <Link to="/dashboard/linkedin-connection">
                    Add URL
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Profile Card */}
        <div className="animate-fade-up [animation-delay:200ms]">
          <Card>
            <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Profile Data</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing || !isConnected || !hasProfileUrl}
                  title={!hasProfileUrl ? "Add your LinkedIn URL first" : undefined}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh Data"}
                </Button>
              </div>
              </CardTitle>
              <CardDescription>
                {lastSynced ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last updated: {formatDistanceToNow(lastSynced, { addSuffix: true })}
                  </span>
                ) : (
                  "No data synced yet"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-start gap-4">
                  <Skeleton className="w-20 h-20 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : profileData ? (
                <div className="flex items-start gap-6">
                  <Avatar className="w-20 h-20 border-2 border-primary/20">
                    <AvatarImage src={profileData.profilePhoto} alt={profileData.fullName || profileData.username} />
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {getInitials(profileData.fullName || profileData.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {profileData.fullName || profileData.username || "Unknown"}
                      </h2>
                      {profileData.headline && (
                        <p className="text-muted-foreground">{profileData.headline}</p>
                      )}
                    </div>
                    {(profileData.currentRole || profileData.currentCompany) && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {profileData.currentRole}
                          {profileData.currentRole && profileData.currentCompany && " at "}
                          {profileData.currentCompany && <span className="font-medium">{profileData.currentCompany}</span>}
                        </span>
                      </div>
                    )}
                    {profileData.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{profileData.location}</span>
                      </div>
                    )}
                    <div className="flex gap-4 pt-2">
                      {profileData.followersCount !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold">{profileData.followersCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Followers</p>
                        </div>
                      )}
                      {profileData.connectionsCount !== undefined && (
                        <div className="text-center">
                          <p className="text-lg font-semibold">{profileData.connectionsCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Connections</p>
                        </div>
                      )}
                    </div>
                    {profileData.profileUrl && (
                      <a href={profileData.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        View on LinkedIn →
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No profile data available</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    {hasProfileUrl ? 'Click "Refresh Data" to sync your LinkedIn profile' : 'Connect your LinkedIn account to see your profile data here'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saved LinkedIn URL */}
        {profile?.linkedin_profile_url && (
          <div className="animate-fade-up [animation-delay:300ms]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Profile URL</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href={profile.linkedin_profile_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {profile.linkedin_profile_url}
                </a>
                {profile.linkedin_profile_confirmed && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    🔒 Profile URL is locked and cannot be changed
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default LinkedInProfile;
