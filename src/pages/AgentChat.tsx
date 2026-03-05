import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
// framer-motion removed — using CSS animations for faster page load
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Bot,
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  Linkedin,
  ImagePlus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useAgentChat, GeneratedPost } from "@/hooks/useAgentChat";
import { useAgents } from "@/hooks/useAgents";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import { usePostingLimits } from "@/hooks/usePostingLimits";
import { PostPreviewCard } from "@/components/agents/PostPreviewCard";
import { ExtensionActivityLog, useExtensionActivityLog } from "@/components/agents/ExtensionActivityLog";
import { ImageUploadPanel } from "@/components/agents/ImageUploadPanel";

import { ExtensionStatusIndicator } from "@/components/extension/ExtensionStatusIndicator";
import { toast } from "sonner";
import { useLinkedBotExtension } from "@/hooks/useLinkedBotExtension";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useExtensionEvents } from "@/hooks/useExtensionEvents";
import { supabase } from "@/integrations/supabase/client";
import { PostStatus } from "@/lib/postLifecycle";
import { extractLinkedInId } from "@/utils/linkedinVerification";

const agentTypes = [
  { id: "comedy", label: "Comedy/Humorous" },
  { id: "professional", label: "Professional" },
  { id: "storytelling", label: "Storytelling" },
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "motivational", label: "Motivational" },
  { id: "data-analytics", label: "Data/Analytics" },
  { id: "creative", label: "Creative/Design" },
  { id: "news", label: "News/Updates" },
];

const AgentChatPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const agentType = searchParams.get("type") || "professional";
  const agentId = searchParams.get("id");
  
  const [chatInput, setChatInput] = useState("");
  const [generatePhoto, setGeneratePhoto] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { agents } = useAgents();
  const { profile } = useDashboardProfile();

  // Find the agent if ID provided and LOAD its saved settings
  const currentAgent = agentId ? agents.find(a => a.id === agentId) : null;
  const displayAgentType = currentAgent?.type || agentType;
  const displayAgentName = currentAgent?.name || agentTypes.find(t => t.id === displayAgentType)?.label || "Agent";

  // Parse agent settings from saved database settings
  const savedSettings = currentAgent?.settings as {
    tone?: string;
    emojiLevel?: number;
    postLength?: string;
    voiceReference?: string;
  } | null;

  // Agent settings - NOW CONNECTED to saved DB settings!
  const currentAgentSettings = {
    type: displayAgentType,
    tone: savedSettings?.tone || "conversational",
    emojiLevel: savedSettings?.emojiLevel ?? 2,
    postLength: savedSettings?.postLength || "medium",
    voiceReference: savedSettings?.voiceReference,
  };

  // Real user context from profile
  const currentUserContext = {
    name: profile?.name || "User",
    industry: profile?.industry || "Technology",
    company: profile?.company_name,
    role: profile?.role,
    background: profile?.background,
  };

  // Agent chat hook
  const {
    messages,
    isLoading,
    generatedPosts,
    previewPost,
    sendMessage,
    resetChat,
    updatePost,
    deletePost,
    regeneratePost,
    generateImageForPost,
    confirmPreviewPost,
    clearPreview,
    savePostToDatabase,
    setGeneratedPosts, // Need this for adding approved posts
  } = useAgentChat(currentAgentSettings, currentUserContext, agentId);

  // Scheduling dialog state removed - scheduling is now agent-driven

  // Extension hook for posting to LinkedIn
  const {
    isConnected: isExtensionConnected,
    sendPendingPosts,
  } = useLinkedBotExtension();

  // Enhanced extension events with real-time status
  const extensionStatus = useExtensionEvents();

  const [isPostingNow, setIsPostingNow] = useState(false);

  // Posting limits hook
  const { canPost, limitMessage, incrementPostCount, status: limitsStatus } = usePostingLimits();

  // Extension activity log
  const { entries: activityEntries, addEntry: addActivityEntry, clearLog: clearActivityLog } = useExtensionActivityLog();

  // Image upload hook
  const {
    images: uploadedImages,
    isUploading: isUploadingImages,
    addImages,
    removeImage,
    clearImages,
    getImageUrls,
    remainingSlots,
    maxImages,
  } = useImageUpload();

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Preflight validation removed - scheduling is now fully agent-driven with validation in auto_schedule handler

  // Approve a post for scheduling/posting
  const handleApprovePost = async (postId: string) => {
    const post = generatedPosts.find(p => p.id === postId);
    if (!post) return;

    // Validate content exists before approving
    if (!post.content || post.content.trim().length < 10) {
      toast.error("Cannot approve: Post content is too short or missing");
      return;
    }

    // Ask about image if not set and not skipped
    if (!post.imageUrl && !post.imageSkipped) {
      // Mark as image skipped if user is approving without image
      updatePost(postId, { 
        approved: true, 
        imageSkipped: true,
        status: 'approved' as PostStatus,
      });
      toast.success("✅ Post approved (no image)");
    } else {
      updatePost(postId, { 
        approved: true,
        status: 'approved' as PostStatus,
      });
      toast.success("✅ Post approved and ready to schedule!");
    }
  };

  // Post execution is now FULLY agent-driven - removed postSingleNow and postNow functions
  // The auto_schedule response handler above manages all posting via extension

  const handleSendMessage = async () => {
    const hasImages = uploadedImages.length > 0;
    const hasText = chatInput.trim().length > 0;
    
    if (!hasText && !hasImages) return;
    if (isLoading || isUploadingImages) return;

    // Check posting limits before generating content
    if (!canPost) {
      toast.error(limitMessage || "Posting limit reached. Upgrade your plan for more posts.");
      return;
    }

    const message = chatInput.trim();
    const imageUrls = getImageUrls();
    setChatInput("");

    // "Post now" commands are now handled by the agent via auto_schedule
    // We inform the user to use the agent for posting
    // REMOVED: Frontend blocking of "post now" - let the agent handle it
    // The agent now manages all intent detection including "post now"
    
    // Let the agent handle the post now request naturally via message

    // If images are uploaded, include them in the message
    const finalMessage = hasImages && imageUrls.length > 0
      ? `${message || "Create posts for these images"}\n\n[UPLOADED_IMAGES: ${imageUrls.join(", ")}]`
      : message;

    // Clear uploaded images after sending
    if (hasImages) {
      clearImages();
      setShowImageUpload(false);
    }

    const response = await sendMessage(finalMessage, { generateImage: generatePhoto, uploadedImages: imageUrls });
    
    // Handle generate_image response - generate image for specific post
    if (response?.type === "generate_image" && response.postId) {
      console.log("🎨 Generating image for post:", response.postId);
      generateImageForPost(response.postId);
      return;
    }
    
    // Handle auto_schedule response - automatically save and send to extension
    // This is the ONLY way posts get added to Generated Posts (after approval)
    if (response?.type === "auto_schedule" && response.postToSchedule && response.scheduledTime) {
      console.log("🚀 Auto-scheduling post (user approved):", response);
      
      const postToSchedule = response.postToSchedule;
      const scheduledTime = new Date(response.scheduledTime);
      
      // 🔐 Verify LinkedIn account before posting
      const linkedinVerified = (profile as any)?.linkedin_verified;
      const linkedinPublicId = (profile as any)?.linkedin_public_id || extractLinkedInId(profile?.linkedin_profile_url || '');
      
      if (!linkedinVerified) {
        toast.error("🔐 LinkedIn Verification Required", {
          description: "Please verify your LinkedIn account in Settings before posting.",
          action: {
            label: "Go to Settings",
            onClick: () => navigate("/dashboard/settings"),
          },
          duration: 8000,
        });
        addActivityEntry("failed", "LinkedIn not verified", postToSchedule.id);
        return;
      }

      if (!linkedinPublicId) {
        toast.error("LinkedIn Profile Missing", {
          description: "Please add your LinkedIn profile URL in Settings.",
          action: {
            label: "Go to Settings",
            onClick: () => navigate("/dashboard/settings"),
          },
        });
        addActivityEntry("failed", "No LinkedIn profile", postToSchedule.id);
        return;
      }
      
      // If AI image is enabled but no image exists, generate one first
      let finalImageUrl = postToSchedule.imageUrl;
      if (generatePhoto && !finalImageUrl) {
        try {
          toast.info("🎨 Generating AI image for your post...");
          const { data: imgData, error: imgError } = await supabase.functions.invoke("generate-post-image", {
            body: {
              prompt: postToSchedule.imagePrompt,
              postContent: postToSchedule.content,
            },
          });
          if (!imgError && imgData?.imageUrl) {
            finalImageUrl = imgData.imageUrl;
            toast.success("✅ AI image generated!");
          } else {
            console.warn("Image generation failed, posting without image:", imgError || imgData?.error);
            toast.warning("Image generation failed, posting without image.");
          }
        } catch (imgErr) {
          console.warn("Image generation error:", imgErr);
          toast.warning("Image generation failed, posting without image.");
        }
      }

      // Save to database with status='pending' (CLEAN ARCHITECTURE)
      // Website ONLY inserts 'pending' - extension updates status
      const postToSave: GeneratedPost = {
        id: postToSchedule.id,
        content: postToSchedule.content,
        suggestedTime: postToSchedule.suggestedTime || scheduledTime.toISOString(),
        reasoning: postToSchedule.reasoning || "Auto-scheduled after approval",
        scheduledDateTime: scheduledTime.toISOString(),
        imageUrl: finalImageUrl,
        imagePrompt: postToSchedule.imagePrompt,
        status: 'pending' as PostStatus, // ✅ ALWAYS 'pending' - extension owns status
        approved: true,
        imageSkipped: !finalImageUrl,
      };
      
      const savedPost = await savePostToDatabase(postToSave, scheduledTime);
      
      if (savedPost) {
        // Add to Generated Posts panel
        const finalPost = { 
          ...savedPost, 
          status: 'pending' as PostStatus,
        };
        
        setGeneratedPosts(prev => [finalPost, ...prev.filter(p => p.id !== finalPost.id)]);
        
        // Check if posting "right now" (within 2 minutes) — call LinkedIn API directly
        const timeDiff = scheduledTime.getTime() - Date.now();
        if (timeDiff < 2 * 60 * 1000) {
          // Post immediately via LinkedIn API
          addActivityEntry("scheduled", `Publishing now...`, savedPost.id);
          toast.info('📤 Publishing to LinkedIn...');
          
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase.functions.invoke('linkedin-post', {
              body: {
                postId: savedPost.dbId || savedPost.id,
                content: savedPost.content,
                imageUrl: finalImageUrl || undefined,
                userId: user?.id,
              },
            });
            
            if (error || data?.error) {
              const errMsg = error?.message || data?.error || 'Unknown error';
              toast.error(`Failed to post: ${errMsg}`);
              addActivityEntry("failed", errMsg, savedPost.id);
            } else {
              toast.success('✅ Published to LinkedIn!', {
                description: data?.postUrl ? 'Click to view' : undefined,
                action: data?.postUrl ? {
                  label: 'View Post',
                  onClick: () => window.open(data.postUrl, '_blank'),
                } : undefined,
              });
              addActivityEntry("published", `Published to LinkedIn`, savedPost.id);
              updatePost(savedPost.id, { status: 'posted' as PostStatus });
            }
          } catch (postErr) {
            console.error('LinkedIn post error:', postErr);
            toast.error('Failed to publish to LinkedIn');
            addActivityEntry("failed", `Post error`, savedPost.id);
          }
        } else {
          addActivityEntry("scheduled", `Scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}`, savedPost.id);
          toast.success(`✅ Post scheduled for ${format(scheduledTime, 'MMM d, h:mm a')}. View it in Dashboard or Calendar.`);
        }
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // handlePostAllNow removed - posting is now fully agent-driven

  const handleBack = () => {
    resetChat();
    navigate("/dashboard/agents");
  };

  const handleClearChat = () => {
    resetChat();
    toast.success("Chat history cleared");
  };

  return (
    <DashboardLayout headerContent={
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-7 w-7">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Bot className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{displayAgentName}</span>
        </div>
        <div className="flex items-center gap-2">
          {limitsStatus && (
            <div className="hidden md:flex items-center gap-3 mr-2 text-xs text-muted-foreground">
              <span>Today: <strong className="text-foreground">{limitsStatus.postsToday}/{limitsStatus.dailyLimit}</strong></span>
              <span>Month: <strong className="text-foreground">{limitsStatus.postsThisMonth}/{limitsStatus.monthlyLimit}</strong></span>
            </div>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
            {displayAgentType.replace("-", " ")}
          </span>
          <Button variant="outline" size="sm" onClick={handleClearChat} className="gap-1 h-6 text-xs px-2">
            <RefreshCw className="w-3 h-3" />
            Clear
          </Button>
        </div>
      </div>
    }>
      <div className="-m-6 px-4 md:px-6 lg:px-8 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Limit warning banner - only when can't post */}
        {!canPost && limitsStatus && (
          <Alert variant="destructive" className="py-1.5 px-3 mt-2 flex-shrink-0">
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs ml-2">
              {limitMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Main content area - full width grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-0 min-h-0 pt-3">
          {/* Chat Section */}
          <div className="flex flex-col min-h-0 lg:pr-6 lg:border-r lg:border-border">
            {/* Chat messages */}
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-4 pb-4 max-w-4xl">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex animate-fade-in ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl ${
                        message.role === "user"
                          ? "gradient-bg text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {/* Display uploaded images as thumbnails */}
                      {message.role === "user" && message.uploadedImages && message.uploadedImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {message.uploadedImages.map((imgUrl, imgIdx) => (
                            <img
                              key={imgIdx}
                              src={imgUrl}
                              alt={`Uploaded image ${imgIdx + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-primary-foreground/20"
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Chat input */}
            <div className="flex-shrink-0 border-t border-border pt-3 pb-2 space-y-2">
              {/* Image Upload Panel */}
              {showImageUpload && (
                <div className="animate-fade-in">
                  <ImageUploadPanel
                    images={uploadedImages}
                    isUploading={isUploadingImages}
                    remainingSlots={remainingSlots}
                    maxImages={maxImages}
                    onAddImages={addImages}
                    onRemoveImage={removeImage}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Options Row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="generatePhoto"
                    checked={generatePhoto}
                    onChange={(e) => setGeneratePhoto(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="generatePhoto" className="text-sm flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    AI image
                  </label>
                </div>
                
                <Button
                  variant={showImageUpload ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className="gap-1.5 h-7 text-xs"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  Upload ({uploadedImages.length}/{maxImages})
                </Button>
              </div>

              {/* Input Row */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={uploadedImages.length > 0 ? "Describe posts for your images..." : "Say hi or ask me to create posts..."}
                  className="flex-1 h-11 px-4 text-sm"
                  disabled={isLoading}
                />
                <Button 
                  variant="gradient" 
                  size="icon" 
                  onClick={handleSendMessage}
                  disabled={isLoading || isUploadingImages || (!chatInput.trim() && uploadedImages.length === 0)}
                  className="h-11 w-11"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Generated Posts Section */}
          <div className="hidden lg:flex flex-col min-h-0 pl-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Generated Posts</h3>
              <span className="text-xs text-muted-foreground">
                {generatedPosts.length} post{generatedPosts.length !== 1 ? "s" : ""}
              </span>
            </div>
            
            {generatedPosts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No posts generated yet.</p>
                  <p className="text-xs mt-1">Ask your agent to create a post!</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="space-y-4 pr-2">
                    {generatedPosts.map((post, index) => (
                      <PostPreviewCard
                        key={post.id}
                        post={post}
                        index={index}
                        totalPosts={generatedPosts.length}
                        onUpdate={(updates) => updatePost(post.id, updates)}
                        onDelete={() => deletePost(post.id)}
                        onRegenerate={() => regeneratePost(post.id, currentAgentSettings, currentUserContext)}
                        onGenerateImage={() => generateImageForPost(post.id)}
                        onApprove={() => handleApprovePost(post.id)}
                        isLoading={isLoading}
                        isPosting={isPostingNow}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Extension Status */}
                <div className="border-t border-border pt-3 mt-3">
                  <ExtensionStatusIndicator
                    connected={isExtensionConnected || extensionStatus.connected}
                    message={extensionStatus.message}
                    postStatuses={extensionStatus.postStatuses}
                    compact={Object.keys(extensionStatus.postStatuses).length === 0}
                  />
                </div>

                {/* Extension Activity Log */}
                <div className="border-t border-border pt-3 mt-3 h-[120px]">
                  <ExtensionActivityLog entries={activityEntries} onClear={clearActivityLog} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgentChatPage;
