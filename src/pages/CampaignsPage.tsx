import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCampaigns, CampaignFormData } from "@/hooks/useCampaigns";
import { CampaignSetupForm } from "@/components/campaigns/CampaignSetupForm";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { CampaignPreview } from "@/components/campaigns/CampaignPreview";
import { Button } from "@/components/ui/button";
import { Plus, Bot } from "lucide-react";

const CampaignsPage = () => {
  usePageTitle("Agent Campaigns");
  const { campaigns, isLoading, isGenerating, createCampaign, generateCampaignPosts, updateCampaignStatus, deleteCampaign, approveCampaignPosts } = useCampaigns();
  const [showSetup, setShowSetup] = useState(false);
  const [previewCampaignId, setPreviewCampaignId] = useState<string | null>(null);

  const handleCreate = async (formData: CampaignFormData) => {
    const campaign = await createCampaign(formData);
    if (campaign) {
      setShowSetup(false);
      const success = await generateCampaignPosts(campaign.id);
      if (success) {
        setPreviewCampaignId(campaign.id);
      }
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
          <Button className="gap-2 gradient-bg text-primary-foreground" onClick={() => setShowSetup(true)}>
            <Plus className="w-4 h-4" />
            New Agent Campaign
          </Button>
        </div>

        {/* Campaign Setup Modal */}
        {showSetup && (
          <CampaignSetupForm
            onSubmit={handleCreate}
            onCancel={() => setShowSetup(false)}
            isGenerating={isGenerating}
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
          onDelete={deleteCampaign}
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
