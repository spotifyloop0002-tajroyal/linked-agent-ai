import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCampaigns, CampaignFormData } from "@/hooks/useCampaigns";
import { CampaignSetupForm } from "@/components/campaigns/CampaignSetupForm";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { CampaignPreview } from "@/components/campaigns/CampaignPreview";
import { WeeklyContentPlanner, WeeklyPlan } from "@/components/campaigns/WeeklyContentPlanner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Bot, CalendarDays, Linkedin, AlertCircle } from "lucide-react";
import { AGENT_TYPE_MAP } from "@/lib/agentTypes";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { useDashboardLinkedIn } from "@/contexts/DashboardContext";
import { useNavigate } from "react-router-dom";
import { usePostingLimits } from "@/hooks/usePostingLimits";

const CampaignsPage = () => {
  usePageTitle("Agent Campaigns");
  const { campaigns, isLoading, isGenerating, isCreating, createCampaign, generateCampaignPosts, updateCampaignStatus, deleteCampaign, approveCampaignPosts } = useCampaigns();
  const { isConnected: linkedInConnected, isLoading: linkedInLoading } = useDashboardLinkedIn();
  const { checkLimits } = usePostingLimits(false);
  const navigate = useNavigate();
  const [showSetup, setShowSetup] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);
  const [isCreatingWeekly, setIsCreatingWeekly] = useState(false);

  const handleNewCampaignClick = async () => {
    const limits = await checkLimits();
    if (limits && !limits.canPost) {
      toast.error(limits.limitMessage || "You've reached your posting limit. Please upgrade your plan.");
      return;
    }
    setShowSetup(true);
    setShowPlanner(false);
  };

  const handleWeeklyPlannerClick = async () => {
    const limits = await checkLimits();
    if (limits && !limits.canPost) {
      toast.error(limits.limitMessage || "You've reached your posting limit. Please upgrade your plan.");
      return;
    }
    setShowPlanner(!showPlanner);
    setShowSetup(false);
  };

  const handleCreate = async (formData: CampaignFormData) => {
    const campaign = await createCampaign(formData);
    if (campaign) {
      setShowSetup(false);
      const success = await generateCampaignPosts(campaign.id);
      if (success) {
        // If user uploaded an image, apply it to all generated posts
        if (formData.imageOption === "upload" && formData.uploadedImageUrl) {
          try {
            const { data: { session } } = await (await import("@/integrations/supabase/client")).supabase.auth.getSession();
            if (session) {
              const { supabase } = await import("@/integrations/supabase/client");
              await supabase
                .from("posts")
                .update({ photo_url: formData.uploadedImageUrl })
                .eq("campaign_id", campaign.id)
                .eq("user_id", session.user.id);
            }
          } catch (e) {
            console.error("Failed to apply uploaded image:", e);
          }
        }
        setPreviewCampaignId(campaign.id);
      }
    }
  };

  const handleCreateWeeklyCampaigns = async (plan: WeeklyPlan) => {
    setIsCreatingWeekly(true);
    let created = 0;

    try {
      for (const [day, agentId] of Object.entries(plan)) {
        if (!agentId) continue;
        const agentConfig = AGENT_TYPE_MAP[agentId];
        if (!agentConfig) continue;

        const startDate = new Date();
        const formData: CampaignFormData = {
          topic: `${agentConfig.label} content`,
          toneType: agentId,
          durationType: "custom",
          startDate,
          endDate: addDays(startDate, 28), // 4 weeks
          postCount: 4, // 4 posts (one per week on this day)
          postsPerDay: 1,
          researchMode: agentId === "news" || agentId === "data-analytics",
          autoBestTime: false,
          autoApprove: false,
          postingTime: agentConfig.suggestedTime,
          contentLength: "medium",
          emojiLevel: ["comedy", "motivational"].includes(agentId) ? "high" : "moderate",
          hashtagMode: "auto",
          fixedHashtags: [],
          footerText: "",
          imageOption: ["data-analytics", "creative", "news"].includes(agentId) ? "ai" : "none",
          agentType: agentId,
          postingDays: [day],
          campaignName: `${agentConfig.label} – ${day.charAt(0).toUpperCase() + day.slice(1)}`,
        };

        const campaign = await createCampaign(formData);
        if (campaign) {
          await generateCampaignPosts(campaign.id);
          created++;
        }
      }

      if (created > 0) {
        toast.success(`Created ${created} weekly campaigns!`);
        setShowPlanner(false);
      }
    } catch (err) {
      toast.error("Failed to create some campaigns");
    } finally {
      setIsCreatingWeekly(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="w-8 h-8 text-primary" />
              Agent Campaigns
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI intern creates & posts LinkedIn content automatically
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={!linkedInConnected}
              onClick={handleWeeklyPlannerClick}
            >
              <CalendarDays className="w-4 h-4" />
              Weekly Planner
            </Button>
            <Button
              className="gap-2 gradient-bg text-primary-foreground"
              disabled={!linkedInConnected}
              onClick={handleNewCampaignClick}
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* LinkedIn connection gate */}
        {!linkedInLoading && !linkedInConnected && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <AlertDescription className="flex items-center justify-between">
              <span>Connect your LinkedIn account before creating campaigns.</span>
              <Button size="sm" variant="outline" className="gap-2 ml-4" onClick={() => navigate("/dashboard/linkedin")}>
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                Connect LinkedIn
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Weekly Content Planner */}
        {showPlanner && (
          <WeeklyContentPlanner
            onCreateCampaigns={handleCreateWeeklyCampaigns}
            isCreating={isCreatingWeekly}
          />
        )}

        {/* Campaign Setup Modal */}
        {showSetup && (
          <CampaignSetupForm
            onSubmit={handleCreate}
            onCancel={() => setShowSetup(false)}
            isGenerating={isGenerating || isCreating}
          />
        )}

        {/* Campaign Preview */}
        {previewCampaignId && (
          <CampaignPreview
            campaignId={previewCampaignId}
            onClose={() => setPreviewCampaignId(null)}
            onApproveAll={() => approveCampaignPosts(previewCampaignId)}
            onRegenerate={async () => {
              await generateCampaignPosts(previewCampaignId);
            }}
          />
        )}

        {/* Campaign List */}
        <CampaignList
          campaigns={campaigns}
          isLoading={isLoading}
          onPreview={setPreviewCampaignId}
          onPause={(id) => updateCampaignStatus(id, "paused")}
          onResume={(id) => updateCampaignStatus(id, "active")}
          onDelete={async (id) => {
            await deleteCampaign(id);
            checkLimits();
          }}
          onActivate={(id) => approveCampaignPosts(id)}
          onRegenerate={async (id) => {
            const success = await generateCampaignPosts(id);
            if (success) {
              setPreviewCampaignId(id);
            }
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default CampaignsPage;
