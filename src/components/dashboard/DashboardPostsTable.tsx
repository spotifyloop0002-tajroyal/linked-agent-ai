import { useState, useCallback } from "react";
import {
  Clock,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Share2,
  BarChart3,
  Image as ImageIcon,
  RotateCcw,
  Send,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { validateLinkedInPostUrl } from "@/lib/linkedinUrlUtils";
import { PostSourceBadge } from "@/components/posts/PostSourceBadge";
import type { DashboardScheduledPost } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

function getPostDisplayStatus(post: DashboardScheduledPost): 'published' | 'posted_pending' | 'posting' | 'queued' | 'failed' {
  if (post.status === 'posted') {
    if (post.linkedin_post_url) {
      const validation = validateLinkedInPostUrl(post.linkedin_post_url);
      if (validation.isValid || post.linkedin_post_url.includes('linkedin.com')) {
        return 'published';
      }
    }
    return 'posted_pending';
  }
  if (post.status === 'failed') return 'failed';
  if (post.status === 'posting') return 'posting';
  return 'queued';
}

interface Props {
  scheduledPosts: DashboardScheduledPost[];
  refetchData: () => Promise<void>;
  onViewPost: (post: DashboardScheduledPost) => void;
}

const DashboardPostsTable = ({ scheduledPosts, refetchData, onViewPost }: Props) => {
  const navigate = useNavigate();
  const [postingIds, setPostingIds] = useState<Set<string>>(new Set());

  const handleDeletePost = useCallback(async (postId: string) => {
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
  }, [refetchData]);

  const handleRetryPost = useCallback(async (postId: string) => {
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
  }, [refetchData]);

  const handlePostNow = useCallback(async (postId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const post = scheduledPosts.find(p => p.id === postId);
      if (!post) { toast.error('Post not found'); return; }

      setPostingIds(prev => new Set(prev).add(postId));
      toast.info('📤 Publishing to LinkedIn...');

      const { data, error } = await supabase.functions.invoke('linkedin-post', {
        body: { postId, content: post.content, imageUrl: post.photo_url || undefined, userId: user.id },
      });

      if (error) { toast.error(`Failed to post: ${error.message}`); }
      else if (data?.error) { toast.error(`Failed to post: ${data.error}`); }
      else {
        toast.success('✅ Post published to LinkedIn!', {
          description: data?.postUrl ? 'Click to view on LinkedIn' : undefined,
          action: data?.postUrl ? { label: 'View Post', onClick: () => window.open(data.postUrl, '_blank') } : undefined,
        });
      }
      refetchData();
    } catch (err) {
      console.error('Failed to trigger post:', err);
      toast.error('Failed to trigger post');
    } finally {
      setPostingIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
    }
  }, [scheduledPosts, refetchData]);

  const handleMarkPosted = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').update({
        status: 'posted', posted_at: new Date().toISOString(), verified: true,
      }).eq('id', postId);
      if (error) throw error;
      toast.success('Post marked as posted!');
      refetchData();
    } catch (err) {
      console.error('Failed to mark as posted:', err);
      toast.error('Failed to update post status');
    }
  }, [refetchData]);

  if (scheduledPosts.length === 0) {
    return (
      <div className="p-12 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">No scheduled posts yet</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/campaigns")}>
          New Agent Campaign
        </Button>
      </div>
    );
  }

  return (
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
          {scheduledPosts.map((post) => {
            const displayStatus = getPostDisplayStatus(post);
            return (
              <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                <td className="p-4">
                  <div className="space-y-1">
                    <p className="text-sm line-clamp-1 max-w-xs">{post.content}</p>
                    <div>
                      {post.linkedin_post_url ? (
                        <a href={post.linkedin_post_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> View on LinkedIn
                        </a>
                      ) : post.status === 'posted' ? (
                        <span className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> URL pending...</span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="p-4"><PostSourceBadge agentName={post.agent_name} campaignId={post.campaign_id} /></td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {post.posted_at ? format(new Date(post.posted_at), "MMM d, yyyy 'at' h:mm a")
                        : post.scheduled_time ? format(new Date(post.scheduled_time), "MMM d, yyyy 'at' h:mm a")
                        : 'Not scheduled'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  {displayStatus === 'published' && (
                    <Badge variant="default" className="bg-success/10 text-success border-success/20 gap-1"><CheckCircle2 className="w-3 h-3" />Published</Badge>
                  )}
                  {displayStatus === 'posted_pending' && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 gap-1"><Clock className="w-3 h-3" />Posted (verifying)</Badge>
                  )}
                  {displayStatus === 'posting' && (
                    <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Loader2 className="w-3 h-3 animate-spin" />Posting...</Badge>
                  )}
                  {displayStatus === 'queued' && (
                    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1"><Clock className="w-3 h-3" />Queued</Badge>
                  )}
                  {displayStatus === 'failed' && (
                    <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>
                  )}
                </td>
                <td className="p-4">
                  {post.status === 'posted' || post.status === 'published' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground"><Eye className="w-3 h-3" />{post.views_count || 0}</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><ThumbsUp className="w-3 h-3" />{post.likes_count || 0}</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><MessageSquare className="w-3 h-3" />{post.comments_count || 0}</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Share2 className="w-3 h-3" />{post.shares_count || 0}</span>
                      </div>
                      <div>
                        {post.last_synced_at ? (
                          <span className="text-success text-xs flex items-center gap-1"><BarChart3 className="w-3 h-3" />Synced {formatDistanceToNow(new Date(post.last_synced_at))} ago</span>
                        ) : (
                          <span className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Waiting for analytics...</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="p-4">
                  {post.photo_url ? (
                    <img src={post.photo_url} alt="Post image" className="w-12 h-12 rounded-lg object-cover border border-border" loading="lazy" />
                  ) : (
                    <span className="text-muted-foreground text-xs flex items-center gap-1"><ImageIcon className="w-4 h-4" />None</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">
                    {post.status === 'failed' && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleRetryPost(post.id)}>
                        <RotateCcw className="w-3 h-3" />Retry
                      </Button>
                    )}
                    {post.status === 'pending' && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => handlePostNow(post.id)}>
                        <Send className="w-3 h-3" />Post Now
                      </Button>
                    )}
                    {post.linkedin_post_url && post.status !== 'posted' && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-success border-success/30 hover:bg-success/10" onClick={() => handleMarkPosted(post.id)}>
                        <CheckCircle2 className="w-3 h-3" />Mark Posted
                      </Button>
                    )}
                    {post.linkedin_post_url && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(post.linkedin_post_url, '_blank')}><ExternalLink className="w-4 h-4 text-primary" /></Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewPost(post)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/dashboard/campaigns`)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeletePost(post.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default DashboardPostsTable;
