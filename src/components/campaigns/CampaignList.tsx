import { Campaign } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Pause,
  Play,
  Trash2,
  Eye,
  Calendar,
  Loader2,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { AGENT_TYPE_MAP } from "@/lib/agentTypes";

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatTopics(topic: string): string {
  if (!topic?.includes("|||")) return topic;
  const topics = topic.split("|||").map(t => t.trim()).filter(Boolean);
  if (topics.length <= 2) return topics.join(", ");
  return `${topics[0]}, ${topics[1]} +${topics.length - 2} more`;
}

interface CampaignListProps {
  campaigns: Campaign[];
  isLoading: boolean;
  onPreview: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onActivate?: (id: string) => void;
  onRegenerate?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  generating: "bg-warning/10 text-warning",
  active: "bg-success/10 text-success",
  paused: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary",
  failed: "bg-destructive/10 text-destructive",
};

export function CampaignList({ campaigns, isLoading, onPreview, onPause, onResume, onDelete, onActivate, onRegenerate }: CampaignListProps) {
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
          <Bot className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No agent campaigns yet</h3>
        <p className="text-muted-foreground">Create your first Agent Campaign and let your AI intern handle LinkedIn.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Your Agent Campaigns</h2>
      <div className="grid gap-4">
        {campaigns.map((campaign) => {
          const agentConfig = AGENT_TYPE_MAP[campaign.agent_type || campaign.tone_type];
          const AgentIcon = agentConfig?.icon || Bot;
          return (
            <div
              key={campaign.id}
              className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
                      <AgentIcon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {(campaign as any).campaign_name || formatTopics(campaign.topic)}
                      </h3>
                      {(campaign as any).campaign_name && (
                        <p className="text-xs text-muted-foreground">{formatTopics(campaign.topic)}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={statusColors[campaign.status]}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(parseDateOnly(campaign.start_date), "MMM d")} – {format(parseDateOnly(campaign.end_date), "MMM d, yyyy")}
                    </span>
                    <span>{campaign.post_count} posts</span>
                    {agentConfig && (
                      <span className="text-primary font-medium">{agentConfig.label} Agent</span>
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
                  {(campaign.status === "failed" || campaign.status === "generating" || campaign.status === "draft") && onRegenerate && (
                    <Button size="sm" variant="outline" onClick={() => onRegenerate(campaign.id)} className="gap-1 text-primary border-primary">
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
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
          );
        })}
      </div>
    </div>
  );
}
