import { useState } from "react";
import { CampaignFormData } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Search, Sparkles, X, Type, Smile, Hash, Image, FileSignature, ArrowRight, ArrowLeft } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { AGENT_TYPES, POSTING_DAYS, AGENT_TYPE_MAP } from "@/lib/agentTypes";

interface CampaignSetupFormProps {
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const durationOptions = [
  { value: "7_days", label: "Next 7 Days", desc: "One post per day for a week" },
  { value: "alternate", label: "Alternate Days", desc: "Post every other day for 2 weeks" },
  { value: "custom", label: "Custom Range", desc: "Pick your own dates" },
];

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
  { value: "upload", label: "Upload", desc: "Upload your own (coming soon)" },
];

export function CampaignSetupForm({ onSubmit, onCancel, isGenerating }: CampaignSetupFormProps) {
  const [step, setStep] = useState(1);

  // Step 1: Agent Type
  const [agentType, setAgentType] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("");

  // Step 2: Campaign Details
  const [topic, setTopic] = useState("");
  const [durationType, setDurationType] = useState<"7_days" | "alternate" | "custom">("7_days");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 6));
  const [postCount, setPostCount] = useState(7);
  const [postingDays, setPostingDays] = useState<string[]>(POSTING_DAYS.map(d => d.id));
  const [postsPerDay, setPostsPerDay] = useState(1);

  // Step 3: Content & Settings
  const [contentLength, setContentLength] = useState("medium");
  const [emojiLevel, setEmojiLevel] = useState("moderate");
  const [hashtagMode, setHashtagMode] = useState("auto");
  const [fixedHashtags, setFixedHashtags] = useState("");
  const [footerText, setFooterText] = useState("");
  const [imageOption, setImageOption] = useState("none");
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
      // Set emoji level based on agent type
      if (typeId === "professional" || typeId === "data-analytics") setEmojiLevel("low");
      else if (typeId === "comedy" || typeId === "motivational") setEmojiLevel("high");
      else setEmojiLevel("moderate");
      // Set image option based on agent type
      if (typeId === "data-analytics" || typeId === "creative" || typeId === "news") setImageOption("ai");
      else setImageOption("none");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !agentType) return;

    onSubmit({
      topic: topic.trim(),
      toneType: agentType, // agent type drives the tone
      durationType,
      startDate,
      endDate: durationType === "custom" ? endDate : undefined,
      postCount: durationType === "custom" ? postCount : undefined,
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
      // New fields
      agentType,
      postingDays,
      campaignName: campaignName.trim(),
    });
  };

  const selectedAgent = agentType ? AGENT_TYPE_MAP[agentType] : null;

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
            {/* Topic */}
            <div className="space-y-2">
              <Label htmlFor="topic">Campaign Topic</Label>
              <Input
                id="topic"
                placeholder='e.g. "AI in Healthcare", "Startup Growth Strategies"'
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="text-base"
                required
              />
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

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {durationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationType(opt.value as any)}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      durationType === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            {durationType === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
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
                  <Label>End Date</Label>
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
                <div className="space-y-2">
                  <Label>Number of Posts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={postCount}
                    onChange={(e) => setPostCount(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            )}

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
                disabled={!topic.trim() || postingDays.length === 0}
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
                      {postsPerDay === 2 ? "1st Post Time (IST)" : "Preferred Posting Time (IST)"}
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
                      <Label htmlFor="secondPostTime" className="font-medium text-sm">2nd Post Time (IST)</Label>
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
              <Button type="submit" disabled={isGenerating || !topic.trim()} className="flex-1 gradient-bg text-primary-foreground">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Posts...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Campaign
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
