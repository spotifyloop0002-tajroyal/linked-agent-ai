import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  Edit,
  X,
  Loader2,
  Calendar,
  Save,
} from "lucide-react";
import { format } from "date-fns";

interface CampaignPost {
  id: string;
  content: string;
  scheduled_time: string;
  status: string;
}

interface CampaignPreviewProps {
  campaignId: string;
  onClose: () => void;
  onApproveAll: () => void;
}

export function CampaignPreview({ campaignId, onClose, onApproveAll }: CampaignPreviewProps) {
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, scheduled_time, status")
        .eq("campaign_id", campaignId)
        .order("scheduled_time", { ascending: true });

      if (!error && data) {
        setPosts(data as CampaignPost[]);
      }
      setIsLoading(false);
    };
    fetchPosts();
  }, [campaignId]);

  const handleSaveEdit = async (postId: string) => {
    const { error } = await supabase
      .from("posts")
      .update({ content: editContent })
      .eq("id", postId);

    if (!error) {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content: editContent } : p))
      );
      setEditingId(null);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "draft": return "bg-warning/10 text-warning";
      case "pending": return "bg-primary/10 text-primary";
      case "posted": return "bg-success/10 text-success";
      case "failed": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const hasDrafts = posts.some((p) => p.status === "draft");

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Campaign Posts Preview</h2>
        <div className="flex items-center gap-2">
          {hasDrafts && (
            <Button onClick={onApproveAll} className="gap-2 gradient-bg text-primary-foreground">
              <CheckCircle className="w-4 h-4" />
              Approve All
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No posts generated yet.</p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {posts.map((post, index) => (
            <div
              key={post.id}
              className="p-5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">Day {index + 1}</span>
                  <Badge variant="outline" className={statusColor(post.status)}>
                    {post.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {post.scheduled_time
                    ? format(new Date(post.scheduled_time), "MMM d, h:mm a")
                    : "Not scheduled"}
                </div>
              </div>

              {editingId === post.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={6}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveEdit(post.id)} className="gap-1">
                      <Save className="w-3 h-3" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => {
                      setEditingId(post.id);
                      setEditContent(post.content);
                    }}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
