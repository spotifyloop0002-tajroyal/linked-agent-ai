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
  Rocket,
  Clock,
  Search,
  FileText,
  Hash,
  Type,
  RefreshCw,
} from "lucide-react";
import { formatDateLocal, formatTimeLocal } from "@/lib/timezoneUtils";

interface CampaignPost {
  id: string;
  content: string;
  scheduled_time: string;
  status: string;
  photo_url: string | null;
}

interface CampaignDetails {
  id: string;
  topic: string;
  tone_type: string;
  duration_type: string;
  start_date: string;
  end_date: string;
  post_count: number;
  research_mode: boolean;
  auto_best_time: boolean;
  auto_approve: boolean;
  status: string;
  content_length: string;
  emoji_level: string;
  hashtag_mode: string;
  footer_text: string;
}

interface CampaignPreviewProps {
  campaignId: string;
  onClose: () => void;
  onApproveAll: () => void;
  onRegenerate?: () => void;
}

function getWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  return minutes <= 1 ? "< 1 min read" : `${minutes} min read`;
}

export function CampaignPreview({ campaignId, onClose, onApproveAll, onRegenerate }: CampaignPreviewProps) {
  const [posts, setPosts] = useState<CampaignPost[]>([]);
  const [campaign, setCampaign] = useState<CampaignDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const fetchData = async () => {
    const [postsRes, campaignRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, content, scheduled_time, status, photo_url")
        .eq("campaign_id", campaignId)
        .order("scheduled_time", { ascending: true }),
      supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single(),
    ]);

    if (!campaignRes.error && campaignRes.data) {
      setCampaign(campaignRes.data as unknown as CampaignDetails);
    }

    if (!postsRes.error && postsRes.data) {
      setPosts(postsRes.data as CampaignPost[]);
      if (postsRes.data.length > 0) {
        setIsLoading(false);
        return true; // posts found
      }
    }
    return false; // no posts yet
  };

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 20; // poll for ~60 seconds
    const pollInterval = 3000;

    const poll = async () => {
      if (cancelled) return;
      const found = await fetchData();
      if (!found && retryCount < maxRetries) {
        retryCount++;
        setTimeout(poll, pollInterval);
      } else if (!found) {
        setIsLoading(false); // stop loading after max retries
      }
    };

    poll();

    return () => { cancelled = true; };
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

  const handleRegenerate = async (postId: string) => {
    setRegeneratingId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-post", {
        body: { postId },
      });
      if (error) throw error;
      if (data?.content) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, content: data.content } : p))
        );
      }
    } catch (err) {
      console.error("Regenerate failed:", err);
    } finally {
      setRegeneratingId(null);
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

  const durationLabel = (type: string) => {
    switch (type) {
      case "7_days": return "Next 7 Days";
      case "alternate": return "Alternate Days";
      case "custom": return "Custom Range";
      default: return type;
    }
  };

  const hasDrafts = posts.some((p) => p.status === "draft");

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Campaign Details</h2>
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

      {/* Campaign Summary */}
      {campaign && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-start gap-2">
            <Rocket className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Topic</p>
              <p className="text-sm font-medium">{campaign.topic}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Duration</p>
              <p className="text-sm font-medium">{durationLabel(campaign.duration_type)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(campaign.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Tone / Posts</p>
              <p className="text-sm font-medium capitalize">{campaign.tone_type || "Auto"}</p>
              <p className="text-xs text-muted-foreground">{campaign.post_count} posts</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Settings</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {campaign.auto_best_time && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Auto Time</Badge>}
                {campaign.research_mode && <Badge variant="outline" className="text-[10px] px-1.5 py-0"><Search className="w-2.5 h-2.5 mr-0.5" />Research</Badge>}
                {campaign.auto_approve && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Auto-Approve</Badge>}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  <Type className="w-2.5 h-2.5 mr-0.5" />{campaign.content_length || "medium"}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  <Hash className="w-2.5 h-2.5 mr-0.5" />{campaign.hashtag_mode || "auto"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer preview */}
      {campaign?.footer_text && (
        <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Auto Footer:</p>
          <p className="text-xs whitespace-pre-wrap text-foreground/80">{campaign.footer_text}</p>
        </div>
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <p className="text-muted-foreground">No posts generated yet. The generation may have timed out.</p>
          {onRegenerate && (
            <Button onClick={onRegenerate} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate Posts
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Generated Posts</h3>
          {posts.map((post, index) => {
            const wordCount = getWordCount(post.content);
            const charCount = post.content.length;
            const readingTime = getReadingTime(wordCount);

            return (
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
                      ? formatDateLocal(post.scheduled_time)
                      : "Not scheduled"}
                  </div>
                </div>

                {post.photo_url && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-border cursor-pointer" onClick={() => setLightboxUrl(post.photo_url)}>
                    <img src={post.photo_url} alt="Post image" className="w-full max-h-64 object-cover hover:opacity-90 transition-opacity" title="Click to view full image" />
                  </div>
                )}

                {editingId === post.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(post.id)} className="gap-1">
                          <Save className="w-3 h-3" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>{getWordCount(editContent)} words</span>
                        <span>{editContent.length} chars</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>
                    <div className="flex items-center justify-between mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setEditingId(post.id);
                          setEditContent(post.content);
                        }}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        disabled={regeneratingId === post.id}
                        onClick={() => handleRegenerate(post.id)}
                      >
                        {regeneratingId === post.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        {regeneratingId === post.id ? "Regenerating..." : "Regenerate"}
                      </Button>
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>{wordCount} words</span>
                        <span>{charCount} chars</span>
                        <span>{readingTime}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
