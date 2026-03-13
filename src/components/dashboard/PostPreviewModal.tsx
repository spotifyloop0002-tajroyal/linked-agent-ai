import { Eye, ThumbsUp, MessageSquare, Share2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDateLocal } from "@/lib/timezoneUtils";
import type { DashboardScheduledPost } from "@/hooks/useDashboardData";

interface Props {
  post: DashboardScheduledPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    name?: string | null;
    role?: string | null;
    industry?: string | null;
    linkedin_profile_data?: { profilePhoto?: string } | null;
  } | null;
}

const PostPreviewModal = ({ post, open, onOpenChange, profile }: Props) => {
  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Post Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={profile?.linkedin_profile_data?.profilePhoto || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{profile?.name || 'User'}</p>
              <p className="text-sm text-muted-foreground">{profile?.role || profile?.industry || 'LinkedIn User'}</p>
              <p className="text-xs text-muted-foreground">
                {post.posted_at ? formatDateLocal(post.posted_at)
                  : post.scheduled_time ? formatDateLocal(post.scheduled_time)
                  : 'Not scheduled'}
              </p>
            </div>
          </div>

          {post.photo_url && (
            <div className="rounded-lg overflow-hidden border border-border">
              <img
                src={post.photo_url}
                alt="Post image"
                className="w-full max-h-80 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(post.photo_url!, '_blank')}
                title="Click to view full image"
              />
            </div>
          )}

          <div className="text-sm whitespace-pre-wrap leading-relaxed border-l-2 border-primary/20 pl-4">
            {post.content}
          </div>

          {post.status === 'posted' && (
            <div className="flex items-center gap-6 pt-4 border-t text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{post.views_count || 0} views</span>
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" />{post.likes_count || 0}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{post.comments_count || 0}</span>
              <span className="flex items-center gap-1"><Share2 className="w-4 h-4" />{post.shares_count || 0}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 border-t">
            <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled><ThumbsUp className="w-4 h-4" /> Like</Button>
            <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled><MessageSquare className="w-4 h-4" /> Comment</Button>
            <Button variant="ghost" size="sm" className="flex-1 gap-2" disabled><Share2 className="w-4 h-4" /> Share</Button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            {post.linkedin_post_url && (
              <Button variant="outline" onClick={() => window.open(post.linkedin_post_url, '_blank')} className="gap-2">
                <ExternalLink className="w-4 h-4" /> View on LinkedIn
              </Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PostPreviewModal;
