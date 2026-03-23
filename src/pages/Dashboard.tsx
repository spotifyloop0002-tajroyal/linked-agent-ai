import { useEffect, useState, useCallback, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ExtensionStatus } from "@/components/ExtensionStatus";
import { useDashboardProfile, useDashboardLinkedIn } from "@/contexts/DashboardContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardScheduledPost } from "@/hooks/useDashboardData";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePostingLimits } from "@/hooks/usePostingLimits";
import { useCampaigns } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Calendar,
  TrendingUp,
  Plus,
  FileText,
  Zap,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardPostsTable from "@/components/dashboard/DashboardPostsTable";
import PostPreviewModal from "@/components/dashboard/PostPreviewModal";
import { AGENT_TYPES, AGENT_TYPE_MAP } from "@/lib/agentTypes";

const DashboardPage = () => {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const { isConnected, isLoading: apiLoading, getAuthUrl, disconnect } = useDashboardLinkedIn();
  const { profile, isLoading: profileLoading } = useDashboardProfile();
  const { status: limitsStatus, isLoading: limitsLoading, checkLimits } = usePostingLimits(false);
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();

  // Defer limits check — not needed for initial render
  useEffect(() => {
    const timer = setTimeout(() => checkLimits(), 1500);
    return () => clearTimeout(timer);
  }, [checkLimits]);

  const {
    analyticsPosts,
    agents,
    scheduledPosts,
    isLoading: dataLoading,
    refetch: refetchData,
    setScheduledPosts,
  } = useDashboardData();

  const [selectedPost, setSelectedPost] = useState<DashboardScheduledPost | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [agentFilter, setAgentFilter] = useState("all");

  // Real-time subscription for post status changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channel = supabase
        .channel('dashboard-posts-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            setScheduledPosts(prev =>
              prev.map(post =>
                post.id === payload.new.id
                  ? { ...post, ...payload.new as DashboardScheduledPost }
                  : post
              )
            );
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [setScheduledPosts]);

  // Filtered posts by agent type
  const filteredPosts = useMemo(() => {
    if (agentFilter === "all") return scheduledPosts;
    const agentConfig = AGENT_TYPE_MAP[agentFilter];
    if (!agentConfig) return scheduledPosts;
    return scheduledPosts.filter(p =>
      p.agent_name?.toLowerCase().includes(agentConfig.label.toLowerCase())
    );
  }, [scheduledPosts, agentFilter]);

  // Calculate stats
  const totalViews = analyticsPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === "active").length;
  const totalGenerated = scheduledPosts.length;
  const queuedCount = scheduledPosts.filter(p => p.status === 'pending' || p.status === 'posting').length;
  const postedCount = scheduledPosts.filter(p => p.status === 'posted').length;

  const stats = [
    { label: "Agent Campaigns", value: campaigns.length.toString(), subtitle: `${activeCampaigns} active`, icon: Bot, color: "from-primary to-primary/60" },
    { label: "Posts Generated", value: totalGenerated.toString(), subtitle: `${postedCount} published`, icon: FileText, color: "from-secondary to-secondary/60" },
    { label: "Queued Posts", value: queuedCount.toString(), subtitle: "Awaiting schedule", icon: Clock, color: "from-warning to-warning/60" },
    { label: "Total Reach", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(), subtitle: "From synced analytics", icon: TrendingUp, color: "from-success to-success/60" },
  ];

  const showSkeletons = profileLoading || dataLoading;

  const handleViewPost = useCallback((post: DashboardScheduledPost) => {
    setSelectedPost(post);
    setShowPostModal(true);
  }, []);

  const planName = limitsStatus?.plan
    ? `${limitsStatus.plan.charAt(0).toUpperCase()}${limitsStatus.plan.slice(1)}`
    : "Free";

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="animate-fade-up">
          <ExtensionStatus isConnected={isConnected} isLoading={apiLoading} getAuthUrl={getAuthUrl} disconnect={disconnect} />
        </div>

        <div className="animate-fade-up [animation-delay:100ms] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your LinkedIn content</p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/campaigns")}>
            <Plus className="w-4 h-4" /> New Agent Campaign
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {showSkeletons ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          ) : (
            stats.map((stat, index) => (
              <div key={index} className="animate-fade-up bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow" style={{ animationDelay: `${200 + index * 80}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.subtitle}</p>
              </div>
            ))
          )}
        </div>

        {/* Plan Usage */}
        {!limitsLoading && limitsStatus && (
          <div className="animate-fade-up [animation-delay:400ms] grid sm:grid-cols-2 gap-4">
            {/* Monthly Usage */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Monthly Posts</span>
                </div>
                <span className="text-xs text-muted-foreground">{planName} Plan</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">
                  {limitsStatus.postsThisMonth}
                  <span className="text-sm font-normal text-muted-foreground"> / {limitsStatus.monthlyLimit}</span>
                </span>
                <span className="text-xs text-muted-foreground">posts used</span>
              </div>
              <Progress
                value={Math.min(100, (limitsStatus.postsThisMonth / limitsStatus.monthlyLimit) * 100)}
                className="h-2"
              />
              {limitsStatus.remainingThisMonth <= 5 && limitsStatus.remainingThisMonth > 0 && (
                <p className="text-xs text-warning mt-2">⚠️ Only {limitsStatus.remainingThisMonth} posts remaining this month</p>
              )}
              {limitsStatus.remainingThisMonth === 0 && (
                <p className="text-xs text-destructive mt-2">Monthly limit reached. <button className="underline" onClick={() => navigate("/dashboard/billing")}>Upgrade plan</button></p>
              )}
            </div>

            {/* Daily Usage */}
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-medium">Today's Posts</span>
                </div>
                <span className="text-xs text-muted-foreground">{planName} Plan</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold">
                  {limitsStatus.postsToday}
                  <span className="text-sm font-normal text-muted-foreground"> / {limitsStatus.dailyLimit}</span>
                </span>
                <span className="text-xs text-muted-foreground">posts today</span>
              </div>
              <Progress
                value={Math.min(100, (limitsStatus.postsToday / limitsStatus.dailyLimit) * 100)}
                className="h-2"
              />
              {limitsStatus.postsToday >= limitsStatus.dailyLimit && (
                <p className="text-xs text-destructive mt-2">Daily limit reached. Posts resume tomorrow.</p>
              )}
            </div>
          </div>
        )}

        {/* Agent Type Filter + Scheduled Posts */}
        <div className="animate-fade-up [animation-delay:500ms] bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-xl font-semibold">Upcoming Scheduled Posts</h2>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Agents</SelectItem>
                {AGENT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showSkeletons ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : (
            <DashboardPostsTable scheduledPosts={filteredPosts} refetchData={refetchData} onViewPost={handleViewPost} />
          )}
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-up [animation-delay:600ms] grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={() => navigate("/dashboard/campaigns")} className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left">
            <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">New Agent Campaign</h3>
            <p className="text-sm text-muted-foreground">Set up an AI agent campaign to auto-create and publish LinkedIn content</p>
          </button>
          <button onClick={() => navigate("/dashboard/calendar")} className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-secondary/50 transition-all text-left">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">View Calendar</h3>
            <p className="text-sm text-muted-foreground">Manage your scheduled posts and content calendar</p>
          </button>
          <button onClick={() => navigate("/dashboard/writing-dna")} className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-accent/50 transition-all text-left">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-7 h-7 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Writing DNA</h3>
            <p className="text-sm text-muted-foreground">Configure your personal writing style for AI-generated posts</p>
          </button>
        </div>

        {/* Enterprise CTA */}
        {limitsStatus && limitsStatus.plan !== "custom" && (
          <div className="animate-fade-up [animation-delay:700ms] bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-primary/20 p-6 text-center">
            <p className="text-sm font-medium">Need unlimited posts? <button className="text-primary underline font-semibold" onClick={() => navigate("/dashboard/billing")}>Contact us for an enterprise plan →</button></p>
          </div>
        )}
      </div>

      <PostPreviewModal
        post={selectedPost}
        open={showPostModal}
        onOpenChange={setShowPostModal}
        profile={profile ? { name: profile.name, role: profile.role, industry: profile.industry, linkedin_profile_data: profile.linkedin_profile_data as any } : null}
      />
    </DashboardLayout>
  );
};

export default DashboardPage;
