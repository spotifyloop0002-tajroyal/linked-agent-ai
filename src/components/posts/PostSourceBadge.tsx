import { Badge } from "@/components/ui/badge";
import { Bot, Rocket, PenLine } from "lucide-react";

interface PostSourceBadgeProps {
  agentName?: string | null;
  campaignId?: string | null;
  className?: string;
}

/**
 * Shows the source of a post: Campaign, Agent, or Manual.
 */
export const PostSourceBadge = ({ agentName, campaignId, className = "" }: PostSourceBadgeProps) => {
  if (campaignId) {
    return (
      <Badge variant="outline" className={`bg-secondary/10 text-secondary-foreground border-secondary/30 gap-1 text-[10px] px-1.5 py-0.5 ${className}`}>
        <Rocket className="w-3 h-3" />
        Campaign
      </Badge>
    );
  }

  if (agentName) {
    return (
      <Badge variant="outline" className={`bg-primary/10 text-primary border-primary/30 gap-1 text-[10px] px-1.5 py-0.5 ${className}`}>
        <Bot className="w-3 h-3" />
        {agentName}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`bg-muted text-muted-foreground border-border gap-1 text-[10px] px-1.5 py-0.5 ${className}`}>
      <PenLine className="w-3 h-3" />
      Manual
    </Badge>
  );
};
