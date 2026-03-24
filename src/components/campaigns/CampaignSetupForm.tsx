import { useState, useRef, useEffect } from "react";
import { CampaignFormData } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Search, Sparkles, X, Type, Smile, Hash, Image, FileSignature, ArrowRight, ArrowLeft, Upload, Plus, AlertTriangle } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AGENT_TYPES, POSTING_DAYS, AGENT_TYPE_MAP } from "@/lib/agentTypes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CampaignSetupFormProps {
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const contentLengthOptions = [
  { value: "short", label: "Short", desc: "100–150 words" },
  { value: "medium", label: "Medium", desc: "200–300 words" },
  { value: "long", label: "Long", desc: "400+ words" },
];

const emojiLevelOptions = [
  { value: "none", label: "None", desc: "No emojis" },
  { value: "low", label: "Low", desc: "1-2 emojis" },
  { value: "moderate", label: "Medium", desc: "3-5 emojis" },
  { value: "high", label: "High", desc: "Emoji-rich" },
];

const hashtagOptions = [
  { value: "auto", label: "Auto-generate", desc: "AI picks relevant hashtags" },
  { value: "manual", label: "Manual", desc: "You specify hashtags" },
  { value: "none", label: "No Hashtags", desc: "Skip hashtags entirely" },
];

const imageOptions = [
  { value: "none", label: "No Image", desc: "Text-only posts" },
  { value: "ai", label: "AI Generate", desc: "Auto-generate images" },
  { value: "upload", label: "Upload Image", desc: "Upload your own image" },
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ["image/png", "image/jpeg", "image/jpg", "image/webp"];


export function CampaignSetupForm({ onSubmit, onCancel, isGenerating }: CampaignSetupFormProps) {
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscription expiry date cap
  const [planExpiryDate, setPlanExpiryDate] = useState<Date | null>(null);
  const [planName, setPlanName] = useState<string>("free");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("user_profiles_safe")
        .select("subscription_plan, subscription_expires_at")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data?.subscription_expires_at) {
        setPlanExpiryDate(new Date(data.subscription_expires_at));
      }
      setPlanName(data?.subscription_plan || "free");
    })();
  }, []);

  // Step 1: Agent Type
  const [agentType, setAgentType] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

  // Step 2: Campaign Details
  const [topic, setTopic] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [multiTopicMode, setMultiTopicMode] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 27));
  const [postingDays, setPostingDays] = useState<string[]>(["monday", "wednesday", "friday"]);
  const [postsPerDay, setPostsPerDay] = useState(1);

  // When plan expiry loads, cap the default end date
  useEffect(() => {
    if (planExpiryDate && endDate > planExpiryDate) {
      setEndDate(planExpiryDate);
    }
  }, [planExpiryDate]);

  // AI topic suggestions
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [isSuggestingTopics, setIsSuggestingTopics] = useState(false);

  const fetchTopicSuggestions = async () => {
    if (!agentType || isSuggestingTopics) return;
    setIsSuggestingTopics(true);
    setSuggestedTopics([]);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-topics", {
        body: { agentType },
      });
      if (error) throw error;
      if (data?.topics?.length) {
        setSuggestedTopics(data.topics);
      } else {
        toast.error("No suggestions returned. Try again.");
      }
    } catch (err) {
      console.error("Topic suggestion error:", err);
      toast.error("Failed to get topic suggestions");
    } finally {
      setIsSuggestingTopics(false);
    }
  };

  const [contentLength, setContentLength] = useState("medium");
  const [emojiLevel, setEmojiLevel] = useState("moderate");
  const [hashtagMode, setHashtagMode] = useState("auto");
  const [fixedHashtags, setFixedHashtags] = useState("");
  const [footerText, setFooterText] = useState("");
  const [imageOption, setImageOption] = useState("none");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [researchMode, setResearchMode] = useState(false);
  const [autoBestTime, setAutoBestTime] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [postingTime, setPostingTime] = useState("09:00");
  const [secondPostTime, setSecondPostTime] = useState("17:00");

  // When agent type is selected, apply suggested defaults
  const handleSelectAgentType = (typeId: string) => {
    setAgentType(typeId);
    const config = AGENT_TYPE_MAP[typeId];
    if (config) {
      setPostingTime(config.suggestedTime);
      if (typeId === "professional" || typeId === "data-analytics") setEmojiLevel("low");
      else if (typeId === "comedy" || typeId === "motivational") setEmojiLevel("high");
      else setEmojiLevel("moderate");
      if (typeId === "data-analytics" || typeId === "creative" || typeId === "news") setImageOption("ai");
      else setImageOption("none");
    }
  };

  // Calculate post count from selected days within date range
  const calculatePostCount = () => {
    let count = 0;
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      if (postingDays.includes(dayNames[current.getDay()])) {
        count += postsPerDay;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_FORMATS.includes(file.type)) {
      toast.error("Unsupported format. Use PNG, JPG, or WEBP.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be under 10MB.");
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `campaign-upload-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(fileName);
      setUploadedImageUrl(publicUrl.publicUrl);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error("Failed to upload image");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const isSubmittingRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = multiTopicMode && topics.length > 0
      ? topics.join("|||")
      : topic.trim();
    if (!finalTopic || !agentType || isGenerating || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    // Reset after a delay to allow the async flow to set isGenerating
    setTimeout(() => { isSubmittingRef.current = false; }, 3000);

    const postCount = calculatePostCount();

    onSubmit({
      topic: finalTopic,
      toneType: agentType,
      durationType: "custom",
      startDate,
      endDate,
      postCount,
      postsPerDay,
      researchMode,
      autoBestTime,
      autoApprove,
      postingTime: !autoBestTime ? postingTime : undefined,
      secondPostTime: !autoBestTime && postsPerDay === 2 ? secondPostTime : undefined,
      contentLength,
      emojiLevel,
      hashtagMode,
      fixedHashtags: hashtagMode === "manual" ? fixedHashtags.split(",").map(h => h.trim()).filter(Boolean) : [],
      footerText: footerText.trim(),
      imageOption,
      uploadedImageUrl: imageOption === "upload" ? uploadedImageUrl : undefined,
      agentType,
      postingDays,
      campaignName: campaignName.trim(),
    });
  };

  const selectedAgent = agentType ? AGENT_TYPE_MAP[agentType] : null;
  const estimatedPosts = calculatePostCount();

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-fade-in max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create Agent Campaign
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={cn(
                "h-1.5 rounded-full transition-all",
                s <= step ? "bg-primary w-12" : "bg-muted w-8"
              )} />
            ))}
            <span className="text-xs text-muted-foreground ml-2">Step {step} of 3</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ==================== STEP 1: Agent Type ==================== */}
        {step === 1 && (
          <>
            <div className="space-y-2">
              <Label>Choose Your Agent Type</Label>
              <p className="text-sm text-muted-foreground">Each agent has a unique writing style, image style, and suggested posting time</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AGENT_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = agentType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleSelectAgentType(type.id)}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                      isSelected ? "gradient-bg" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isSelected ? "text-primary-foreground" : "text-muted-foreground"
                      )} />
                    </div>
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    <p className="text-[10px] text-primary mt-1">🕐 Best at {type.suggestedTimeLabel}</p>
                  </button>
                );
              })}
            </div>

            {selectedAgent && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium text-primary mb-1">✨ {selectedAgent.label} Agent</p>
                <p className="text-xs text-muted-foreground">{selectedAgent.writingStyle}</p>
                <p className="text-xs text-muted-foreground mt-1">🖼️ Image style: {selectedAgent.imageStyle}</p>
              </div>
            )}

            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name (optional)</Label>
              <Input
                id="campaignName"
                placeholder='e.g. "Founder Insights Weekly"'
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!agentType}
                onClick={() => setStep(2)}
                className="gap-2 gradient-bg text-primary-foreground"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ==================== STEP 2: Schedule ==================== */}
        {step === 2 && (
          <>
            {/* Topic Mode Toggle */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Campaign Topic{multiTopicMode ? "s" : ""}</Label>
                <button
                  type="button"
                  onClick={() => setMultiTopicMode(!multiTopicMode)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border transition-all font-medium",
                    multiTopicMode
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {multiTopicMode ? "✓ Multi-Topic Mode" : "Enable Multi-Topic"}
                </button>
              </div>

              {multiTopicMode ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add multiple topics — each post will use a different topic in rotation
                  </p>
                  {/* Added topics */}
                  {topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {topics.map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm"
                        >
                          <span className="text-xs font-bold text-primary/60">#{i + 1}</span>
                          {t}
                          <button
                            type="button"
                            onClick={() => setTopics(prev => prev.filter((_, idx) => idx !== i))}
                            className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Add new topic input */}
                  <div className="flex gap-2">
                    <Input
                      id="topic"
                      placeholder='Type a topic and press Add'
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="text-base flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && topic.trim()) {
                          e.preventDefault();
                          setTopics(prev => [...prev, topic.trim()]);
                          setTopic("");
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5 shrink-0"
                      disabled={!topic.trim()}
                      onClick={() => {
                        if (topic.trim()) {
                          setTopics(prev => [...prev, topic.trim()]);
                          setTopic("");
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                          onClick={fetchTopicSuggestions}
                          disabled={isSuggestingTopics}
                        >
                          {isSuggestingTopics ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          {isSuggestingTopics ? "..." : "Suggest"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-2" align="end">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                          🔥 Click to add topics
                        </p>
                        {isSuggestingTopics ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Researching...
                          </div>
                        ) : suggestedTopics.length > 0 ? (
                          <div className="space-y-0.5">
                            {suggestedTopics.map((t, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => {
                                  if (!topics.includes(t)) setTopics(prev => [...prev, t]);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors",
                                  topics.includes(t) && "opacity-50"
                                )}
                              >
                                {topics.includes(t) ? "✓ " : ""}{t}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={fetchTopicSuggestions}
                              className="w-full text-left px-3 py-2 text-xs text-primary rounded-md hover:bg-primary/5 transition-colors flex items-center gap-1.5 mt-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              Refresh suggestions
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                            Click "Suggest" to get AI topics
                          </p>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {topics.length} topic{topics.length !== 1 ? "s" : ""} added · Posts will rotate through these topics
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    id="topic"
                    placeholder='e.g. "AI in Healthcare", "Startup Growth Strategies"'
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="text-base flex-1"
                    required={!multiTopicMode}
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 shrink-0 border-primary/30 text-primary hover:bg-primary/5"
                        onClick={fetchTopicSuggestions}
                        disabled={isSuggestingTopics}
                      >
                        {isSuggestingTopics ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {isSuggestingTopics ? "Loading..." : "Suggest"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="end">
                      <p className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">
                        🔥 Trending topics for {selectedAgent?.label || "agent"}
                      </p>
                      {isSuggestingTopics ? (
                        <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Researching latest trends...
                        </div>
                      ) : suggestedTopics.length > 0 ? (
                        <div className="space-y-0.5">
                          {suggestedTopics.map((t, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setTopic(t)}
                              className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                            >
                              {t}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={fetchTopicSuggestions}
                            className="w-full text-left px-3 py-2 text-xs text-primary rounded-md hover:bg-primary/5 transition-colors flex items-center gap-1.5 mt-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            Refresh suggestions
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground px-2 py-4 text-center">
                          Click "Suggest" to get AI-powered trending topics
                        </p>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Posting Days */}
            <div className="space-y-2">
              <Label>Posting Days</Label>
              <div className="flex flex-wrap gap-2">
                {POSTING_DAYS.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setPostingDays(prev =>
                        prev.includes(day.id)
                          ? prev.filter(d => d !== day.id)
                          : [...prev, day.id]
                      );
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                      postingDays.includes(day.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Select which days the agent should post</p>
            </div>

            {/* Campaign Schedule — Start & End Date */}
            <div className="space-y-2">
              <Label>Campaign Schedule</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && setStartDate(d)}
                        disabled={(d) => d < new Date()}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "PPP")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => d && setEndDate(d)}
                        disabled={(d) => d <= startDate}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Estimated posts */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-3">
                <p className="text-sm text-primary font-medium">
                  📅 {estimatedPosts} posts will be scheduled on {postingDays.length} day{postingDays.length !== 1 ? "s" : ""}/week
                </p>
              </div>
            </div>

            {/* Posts Per Day */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">📅 Posts Per Day</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 1, label: "1 Post/Day", desc: "Recommended for most campaigns" },
                  { value: 2, label: "2 Posts/Day", desc: "Maximum allowed per day" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPostsPerDay(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      postsPerDay === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={((multiTopicMode ? topics.length === 0 : !topic.trim()) || postingDays.length === 0)}
                onClick={() => setStep(3)}
                className="gap-2 gradient-bg text-primary-foreground"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {/* ==================== STEP 3: Content Settings ==================== */}
        {step === 3 && (
          <>
            {/* Content Length */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Content Length</Label>
              <div className="grid grid-cols-3 gap-3">
                {contentLengthOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContentLength(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      contentLength === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Smile className="w-4 h-4 text-primary" /> Emoji Level</Label>
              <div className="grid grid-cols-4 gap-3">
                {emojiLevelOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEmojiLevel(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border text-center transition-all",
                      emojiLevel === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Hash className="w-4 h-4 text-primary" /> Hashtags</Label>
              <div className="grid grid-cols-3 gap-3">
                {hashtagOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHashtagMode(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      hashtagMode === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {hashtagMode === "manual" && (
                <Input
                  placeholder='#AI, #StartupLife, #Growth'
                  value={fixedHashtags}
                  onChange={(e) => setFixedHashtags(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Image Option */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Image className="w-4 h-4 text-primary" /> Image Option</Label>
              <div className="grid grid-cols-3 gap-3">
                {imageOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setImageOption(opt.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all",
                      imageOption === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Upload UI */}
              {imageOption === "upload" && (
                <div className="mt-3 space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {uploadedImageUrl ? (
                    <div className="relative">
                      <img
                        src={uploadedImageUrl}
                        alt="Uploaded"
                        className="w-full max-h-48 object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => {
                          setUploadedImageUrl(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2 border-dashed h-24"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                      {isUploading ? "Uploading..." : "Click to upload image"}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Supported: PNG, JPG, WEBP • Max 10MB • This image will be used for all posts in the campaign
                  </p>
                </div>
              )}
            </div>

            {/* Footer / Signature */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><FileSignature className="w-4 h-4 text-primary" /> Auto Footer / Signature</Label>
              <Textarea
                placeholder={"— Your Name\nCEO & Founder | Company\nYour tagline here"}
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">This text will be appended to the end of every generated post</p>
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Research Mode
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">AI fetches latest research for each post</p>
                </div>
                <Switch checked={researchMode} onCheckedChange={setResearchMode} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div>
                  <p className="font-medium text-sm">Auto Best Time</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedAgent
                      ? `Suggested: ${selectedAgent.suggestedTimeLabel} for ${selectedAgent.label}`
                      : "System picks optimal posting times"}
                  </p>
                </div>
                <Switch checked={autoBestTime} onCheckedChange={setAutoBestTime} />
              </div>

              {!autoBestTime && (
                <div className="space-y-4 p-4 rounded-xl bg-muted/50 border border-border">
                  <div className="space-y-2">
                    <Label htmlFor="postingTime" className="font-medium text-sm">
                      {postsPerDay === 2 ? "1st Post Time (selected country)" : "Preferred Posting Time (selected country)"}
                    </Label>
                    <Input
                      id="postingTime"
                      type="time"
                      value={postingTime}
                      onChange={(e) => setPostingTime(e.target.value)}
                      className="w-full max-w-[200px]"
                    />
                  </div>
                  {postsPerDay === 2 && (
                    <div className="space-y-2">
                      <Label htmlFor="secondPostTime" className="font-medium text-sm">2nd Post Time (selected country)</Label>
                      <Input
                        id="secondPostTime"
                        type="time"
                        value={secondPostTime}
                        onChange={(e) => setSecondPostTime(e.target.value)}
                        className="w-full max-w-[200px]"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
                <div>
                  <p className="font-medium text-sm">Auto-Approve Posts</p>
                  <p className="text-xs text-muted-foreground mt-1">Skip review and schedule immediately</p>
                </div>
                <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={isGenerating || (multiTopicMode ? topics.length === 0 : !topic.trim())}
                className="flex-1 gradient-bg text-primary-foreground"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Posts...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Campaign ({estimatedPosts} posts)
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
