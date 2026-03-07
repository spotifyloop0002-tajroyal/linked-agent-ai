import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
// framer-motion removed — using CSS animations for faster page load
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
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Users,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Share2,
  BarChart3,
  FileText,
  X,
  Image as ImageIcon,
  RotateCcw,
  Send,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateLinkedInPostUrl } from "@/lib/linkedinUrlUtils";
import { PostSourceBadge } from "@/components/posts/PostSourceBadge";

interface PostAnalytics {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  updatedAt?: string;
}

// ScheduledPost type now comes from useDashboardData hook

// Helper to determine display status
// Maps database status to display status
function getPostDisplayStatus(post: DashboardScheduledPost): 'published' | 'posted_pending' | 'posting' | 'queued' | 'failed' {
  // If status is posted
  if (post.status === 'posted') {
    // Use proper URL validation - if we have any URL, consider it published
    // The URL validation utility handles all formats including /feed/update/urn:li:share:XXX
    if (post.linkedin_post_url) {
      const validation = validateLinkedInPostUrl(post.linkedin_post_url);
      // If valid OR if it at least contains linkedin.com, show as published
      if (validation.isValid || post.linkedin_post_url.includes('linkedin.com')) {
        return 'published';
      }
    }
    return 'posted_pending';
  }
  
  // If status is failed
  if (post.status === 'failed') {
    return 'failed';
  }
  
  // If actively posting
  if (post.status === 'posting') {
    return 'posting';
  }
  
  // pending = queued for posting
  return 'queued';
}

const DashboardPage = () => {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const { isConnected, isLoading: apiLoading, getAuthUrl, disconnect } = useDashboardLinkedIn();
  const { profile, isLoading: profileLoading } = useDashboardProfile();
  
  // Single API call for all dashboard data (4 queries → 1 call)
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
  const [postingIds, setPostingIds] = useState<Set<string>>(new Set());

  // Delete post handler — always scope to current user
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('posts').delete().eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Post deleted');
      refetchData();
    } catch (err) {
      console.error('Failed to delete post:', err);
      toast.error('Failed to delete post');
    }
  };

  // Retry a failed post — always scope to current user
  const handleRetryPost = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const retryTime = new Date();
      retryTime.setMinutes(retryTime.getMinutes() + 1);
      const { error } = await supabase.from('posts').update({
        status: 'pending', retry_count: 0, last_error: null,
        scheduled_time: retryTime.toISOString(),
      }).eq('id', postId).eq('user_id', user.id);
      if (error) throw error;
      toast.success('Post queued for retry — will post in ~1 minute');
      refetchData();
    } catch (err) {
      console.error('Failed to retry post:', err);
      toast.error('Failed to retry post');
    }
  };

  // Post now — directly call LinkedIn posting API
  
  const handlePostNow = async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the post content
      const post = scheduledPosts.find(p => p.id === postId);
      if (!post) {
        toast.error('Post not found');
        return;
      }

      setPostingIds(prev => new Set(prev).add(postId));
      toast.info('📤 Publishing to LinkedIn...');

      // Call the linkedin-post edge function directly
      const { data, error } = await supabase.functions.invoke('linkedin-post', {
        body: {
          postId: postId,
          content: post.content,
          imageUrl: post.photo_url || undefined,
          userId: user.id,
        },
      });

      if (error) {
        console.error('LinkedIn post error:', error);
        toast.error(`Failed to post: ${error.message}`);
      } else if (data?.error) {
        console.error('LinkedIn post error:', data.error);
        toast.error(`Failed to post: ${data.error}`);
      } else {
        toast.success('✅ Post published to LinkedIn!', {
          description: data?.postUrl ? 'Click to view on LinkedIn' : undefined,
          action: data?.postUrl ? {
            label: 'View Post',
            onClick: () => window.open(data.postUrl, '_blank'),
          } : undefined,
        });
      }

      refetchData();
      setPostingIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    } catch (err) {
      console.error('Failed to trigger post:', err);
      toast.error('Failed to trigger post');
      setPostingIds(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  // Update post analytics in real-time from extension events
  const updatePostAnalytics = useCallback((trackingId: string, analytics: PostAnalytics) => {
    setScheduledPosts(prev => 
      prev.map(post => 
        post.tracking_id === trackingId 
          ? { 
              ...post, 
              views_count: analytics.views ?? post.views_count,
              likes_count: analytics.likes ?? post.likes_count,
              comments_count: analytics.comments ?? post.comments_count,
              shares_count: analytics.shares ?? post.shares_count,
              last_synced_at: analytics.updatedAt ?? new Date().toISOString(),
            }
          : post
      )
    );
  }, [setScheduledPosts]);

  // Real-time subscription for post status changes
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('dashboard-posts-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'posts',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('📡 Real-time post update:', payload);
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

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setScheduledPosts]);

  // No extension event listeners needed - using LinkedIn API directly

  // Calculate real stats - count pending + posted
  const totalViews = analyticsPosts.reduce((sum, p) => sum + (p.views || 0), 0);
  const queuedCount = scheduledPosts.filter(p => p.status === 'pending' || p.status === 'posting').length;
  const postedCount = scheduledPosts.filter(p => p.status === 'posted').length;
  const activeAgentsCount = agents.filter(a => a.is_active).length;
  
  // Calculate total posts generated from agents
  const totalGeneratedFromAgents = agents.reduce((sum, a) => sum + (a.posts_created || 0), 0);
  // Fallback to profile count if agent stats are 0
  const totalGenerated = totalGeneratedFromAgents > 0 
    ? totalGeneratedFromAgents 
    : (profile?.posts_created_count || 0);

  const stats = [
    {
      label: "Active Agents",
      value: activeAgentsCount.toString(),
      subtitle: `${agents.length} total agents`,
      icon: Users,
      color: "from-primary to-primary/60",
    },
    {
      label: "Posts Created",
      value: totalGenerated.toString(),
      subtitle: "Total generated",
      icon: FileText,
      color: "from-secondary to-secondary/60",
    },
    {
      label: "Queued Posts",
      value: queuedCount.toString(),
      subtitle: `${postedCount} already posted`,
      icon: Calendar,
      color: "from-warning to-warning/60",
    },
    {
      label: "Total Reach",
      value: totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(),
      subtitle: "From synced analytics",
      icon: TrendingUp,
      color: "from-success to-success/60",
    },
  ];

  // Never block the full page — show skeleton loaders for data sections instead
  const showSkeletons = profileLoading || dataLoading;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* LinkedIn Connection Status — shares hook with Dashboard */}
        <div className="animate-fade-up">
          <ExtensionStatus isConnected={isConnected} isLoading={apiLoading} getAuthUrl={getAuthUrl} disconnect={disconnect} />
        </div>
        
        {/* Header */}
        <div className="animate-fade-up [animation-delay:100ms] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              Welcome back{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your LinkedIn content
            </p>
          </div>
          <Button variant="gradient" className="gap-2" onClick={() => navigate("/dashboard/agents")}>
            <Plus className="w-4 h-4" />
            Create New Agent
          </Button>
        </div>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {showSkeletons ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))
          ) : (
            stats.map((stat, index) => (
              <div
                key={index}
                className="animate-fade-up bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow"
                style={{ animationDelay: `${200 + index * 80}ms` }}
              >
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

        {/* Upcoming posts */}
        <div className="animate-fade-up [animation-delay:500ms] bg-card rounded-2xl border border-border shadow-sm">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold">Upcoming Scheduled Posts</h2>
          </div>
          {showSkeletons ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scheduled posts yet</p>
              <Button variant="outline" onClick={() => navigate("/dashboard/agents")}>
                Create Your First Post
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                   <tr className="border-b border-border">
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Post Preview</th>
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Source</th>
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Scheduled</th>
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Analytics</th>
                     <th className="text-left p-4 text-sm font-medium text-muted-foreground">Image</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledPosts.map((post) => (
                    <tr 
                      key={post.id} 
                      data-tracking-id={post.tracking_id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="space-y-1">
                          <p className="text-sm line-clamp-1 max-w-xs">{post.content}</p>
                          {/* URL Status Indicator */}
                          <div className="post-url-status">
                            {post.linkedin_post_url ? (
                              <a 
                                href={post.linkedin_post_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-primary hover:underline text-xs flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View on LinkedIn
                              </a>
                            ) : post.status === 'posted' ? (
                              <span className="text-muted-foreground text-xs flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                URL pending...
                              </span>
                            ) : null}
                          </div>
                        </div>
                       </td>
                       <td className="p-4">
                         <PostSourceBadge agentName={post.agent_name} campaignId={post.campaign_id} />
                       </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {post.posted_at 
                              ? format(new Date(post.posted_at), "MMM d, yyyy 'at' h:mm a")
                              : post.scheduled_time 
                                ? format(new Date(post.scheduled_time), "MMM d, yyyy 'at' h:mm a")
                                : 'Not scheduled'
                            }
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          const displayStatus = getPostDisplayStatus(post);
                          switch (displayStatus) {
                            case 'published':
                              return (
                                <Badge variant="default" className="bg-success/10 text-success border-success/20 gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Published
                                </Badge>
                              );
                            case 'posted_pending':
                              return (
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1">
                                  <Clock className="w-3 h-3" />
                                  Posted (verifying)
                                </Badge>
                              );
                            case 'posting':
                              return (
                                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Posting...
                                </Badge>
                              );
                            case 'queued':
                              return (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                                  <Clock className="w-3 h-3" />
                                  Queued
                                </Badge>
                              );
                            case 'failed':
                              return (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Failed
                                </Badge>
                              );
                            default:
                              return (
                                <Badge variant="secondary" className="gap-1">
                                  {post.status}
                                </Badge>
                              );
                          }
                        })()}
                      </td>
                      {/* Analytics Column */}
                      <td className="p-4">
                        {post.status === 'posted' || post.status === 'published' ? (
                          <div className="space-y-1">
                            {/* Analytics Stats */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="views-count flex items-center gap-1 text-muted-foreground">
                                <Eye className="w-3 h-3" />
                                {post.views_count || 0}
                              </span>
                              <span className="likes-count flex items-center gap-1 text-muted-foreground">
                                <ThumbsUp className="w-3 h-3" />
                                {post.likes_count || 0}
                              </span>
                              <span className="comments-count flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="w-3 h-3" />
                                {post.comments_count || 0}
                              </span>
                              <span className="shares-count flex items-center gap-1 text-muted-foreground">
                                <Share2 className="w-3 h-3" />
                                {post.shares_count || 0}
                              </span>
                            </div>
                            {/* Analytics Tracking Status */}
                            <div className="analytics-status last-updated">
                              {post.last_synced_at ? (
                                <span className="text-success text-xs flex items-center gap-1">
                                  <BarChart3 className="w-3 h-3" />
                                  Synced {formatDistanceToNow(new Date(post.last_synced_at))} ago
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Waiting for analytics...
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {post.photo_url ? (
                          <img 
                            src={post.photo_url} 
                            alt="Post image" 
                            className="w-12 h-12 rounded-lg object-cover border border-border"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            None
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Retry button for failed posts */}
                          {post.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => handleRetryPost(post.id)}
                              title="Retry this post"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Retry
                            </Button>
                          )}
                          {/* Post Now button for pending/queued posts */}
                          {post.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                              onClick={() => handlePostNow(post.id)}
                              title="Post immediately"
                            >
                              <Send className="w-3 h-3" />
                              Post Now
                            </Button>
                          )}
                          {/* Mark as Posted fallback button */}
                          {post.linkedin_post_url && post.status !== 'posted' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10"
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from('posts')
                                    .update({ 
                                      status: 'posted', 
                                      posted_at: new Date().toISOString(),
                                      verified: true 
                                    })
                                    .eq('id', post.id);
                                  if (error) throw error;
                                  toast.success('Post marked as posted!');
                                  refetchData();
                                } catch (err) {
                                  console.error('Failed to mark as posted:', err);
                                  toast.error('Failed to update post status');
                                }
                              }}
                              title="Mark as posted (URL exists but status not synced)"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark Posted
                            </Button>
                          )}
                          {post.linkedin_post_url && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => window.open(post.linkedin_post_url, '_blank')}
                              title="View on LinkedIn"
                            >
                              <ExternalLink className="w-4 h-4 text-primary" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedPost(post);
                              setShowPostModal(true);
                            }}
                            title="View post preview"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => navigate(`/dashboard/agents?editPost=${post.id}`)}
                            title="Edit post"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePost(post.id)}
                            title="Delete post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="animate-fade-up [animation-delay:600ms] grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/dashboard/agents")}
            className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Create New Agent</h3>
            <p className="text-sm text-muted-foreground">
              Set up a new AI agent with custom posting style and topics
            </p>
          </button>

          <button
            onClick={() => navigate("/dashboard/calendar")}
            className="group p-6 bg-card rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-secondary/50 transition-all text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-7 h-7 text-secondary-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">View Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Manage your scheduled posts and content calendar
            </p>
          </button>
          
          {/* LinkedIn API Status */}
        </div>
      </div>

      {/* Post Preview Modal */}
      <Dialog open={showPostModal} onOpenChange={setShowPostModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Preview</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              {/* LinkedIn-style header */}
              <div className="flex items-start gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={profile?.linkedin_profile_data?.profilePhoto as string || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{profile?.name || 'User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {profile?.role || profile?.industry || 'LinkedIn User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPost.posted_at 
                      ? format(new Date(selectedPost.posted_at), "MMM d, yyyy 'at' h:mm a")
                      : selectedPost.scheduled_time 
                        ? format(new Date(selectedPost.scheduled_time), "MMM d, yyyy 'at' h:mm a")
                        : 'Not scheduled'}
                  </p>
                </div>
              </div>

              {/* Post content */}
              <div className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-primary/20 pl-4">
                {selectedPost.content}
              </div>

              {/* Analytics if posted */}
              {selectedPost.status === 'posted' && (
                <div className="flex items-center gap-6 pt-4 border-t text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {selectedPost.views_count || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" />
                    {selectedPost.likes_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {selectedPost.comments_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="w-4 h-4" />
                    {selectedPost.shares_count || 0}
                  </span>
                </div>
              )}

              {/* LinkedIn-style action buttons (non-functional, just for preview) */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled>
                  <ThumbsUp className="w-4 h-4" /> Like
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled>
                  <MessageSquare className="w-4 h-4" /> Comment
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled>
                  <Share2 className="w-4 h-4" /> Share
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                {selectedPost.linkedin_post_url && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(selectedPost.linkedin_post_url, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on LinkedIn
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setShowPostModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DashboardPage;
