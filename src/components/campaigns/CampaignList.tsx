import { Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  Pause,
  Play,
  Trash2,
  Eye,
  Calendar,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onPreview: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onActivate?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  paused: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

export function CampaignList({ campaigns, isLoading, onPreview, onPause, onResume, onDelete, onActivate }: CampaignListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
        <p className="text-muted-foreground">Create your first Smart Campaign to automate LinkedIn content.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Campaigns</h2>
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-lg">{campaign.topic}</h3>
                  <Badge variant="outline" className={statusColors[campaign.status]}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(campaign.start_date), "MMM d")} – {format(new Date(campaign.end_date), "MMM d, yyyy")}
                  </span>
                  <span>{campaign.post_count} posts</span>
                  <span className="capitalize">{campaign.tone_type} tone</span>
                  {campaign.research_mode && (
                    <span className="flex items-center gap-1 text-primary">
                      <Search className="w-3 h-3" />
                      Research Mode
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {campaign.status === "draft" && onActivate && (
                  <Button size="sm" onClick={() => onActivate(campaign.id)} className="gap-1 gradient-bg text-primary-foreground">
                    <CheckCircle className="w-4 h-4" />
                    Activate
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => onPreview(campaign.id)}>
                  <Eye className="w-4 h-4 mr-1" />
                  Preview
                </Button>
                {campaign.status === "active" && (
                  <Button variant="outline" size="sm" onClick={() => onPause(campaign.id)}>
                    <Pause className="w-4 h-4 mr-1" />
                    Pause
                  </Button>
                )}
                {campaign.status === "paused" && (
                  <Button variant="outline" size="sm" onClick={() => onResume(campaign.id)}>
                    <Play className="w-4 h-4 mr-1" />
                    Resume
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (window.confirm("Are you sure you want to delete this campaign and all its posts?")) {
                      onDelete(campaign.id);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
