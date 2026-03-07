import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ExtensionStatus } from "@/components/ExtensionStatus";
import { useDashboardProfile, useDashboardLinkedIn } from "@/contexts/DashboardContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { DashboardScheduledPost } from "@/hooks/useDashboardData";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  Calendar,
  TrendingUp,
  Plus,
  Users,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardPostsTable from "@/components/dashboard/DashboardPostsTable";
import PostPreviewModal from "@/components/dashboard/PostPreviewModal";

const DashboardPage = () => {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const { isConnected, isLoading: apiLoading, getAuthUrl, disconnect } = useDashboardLinkedIn();
  const { profile, isLoading: profileLoading } = useDashboardProfile();
  
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

  // Calculate stats
  const totalViews = analyticsPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const queuedCount = scheduledPosts.filter(p => p.status === 'pending' || p.status === 'posting').length;
  const postedCount = scheduledPosts.filter(p => p.status === 'posted').length;
  const activeAgentsCount = agents.filter(a => a.is_active).length;
  const totalGeneratedFromAgents = agents.reduce((sum, a) => sum + (a.posts_created || 0), 0);
  const totalGenerated = totalGeneratedFromAgents > 0 ? totalGeneratedFromAgents : (profile?.posts_created_count || 0);

  const stats = [
    { label: "Active Agents", value: activeAgentsCount.toString(), subtitle: `${agents.length} total agents`, icon: Users, color: "from-primary to-primary/60" },
    { label: "Posts Created", value: totalGenerated.toString(), subtitle: "Total generated", icon: FileText, color: "from-secondary to-secondary/60" },
    { label: "Queued Posts", value: queuedCount.toString(), subtitle: `${postedCount} already posted`, icon: Calendar, color: "from-warning to-warning/60" },
    { label: "Total Reach", value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(), subtitle: "From synced analytics", icon: TrendingUp, color: "from-success to-success/60" },
  ];

  const showSkeletons = profileLoading || dataLoading;

  const handleViewPost = useCallback((post: DashboardScheduledPost) => {
    setSelectedPost(post);
    setShowPostModal(true);
  }, []);

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
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/agents")}>
            <Plus className="w-4 h-4" /> Create New Agent
          </Button>
        </div>

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

        <div className="animate-fade-up [animation-delay:500ms] bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Upcoming Scheduled Posts</h2>
          </div>
          {showSkeletons ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : (
            <DashboardPostsTable scheduledPosts={scheduledPosts} refetchData={refetchData} onViewPost={handleViewPost} />
          )}
        </div>

        <div className="animate-fade-up [animation-delay:600ms] grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={() => navigate("/dashboard/agents")} className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left">
            <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Create New Agent</h3>
            <p className="text-sm text-muted-foreground">Set up a new AI agent with custom posting style and topics</p>
          </button>
          <button onClick={() => navigate("/dashboard/calendar")} className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-secondary/50 transition-all text-left">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">View Calendar</h3>
            <p className="text-sm text-muted-foreground">Manage your scheduled posts and content calendar</p>
          </button>
        </div>
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
