import { useState } from "react";
import { CampaignFormData } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, Search, Sparkles, X, Type, Smile, Hash, Image, FileSignature } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignSetupFormProps {
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const toneOptions = [
  { value: "auto", label: "Auto-detect", desc: "AI chooses based on topic" },
  { value: "professional", label: "Professional", desc: "Formal, authoritative" },
  { value: "storyteller", label: "Storyteller", desc: "Personal, narrative-driven" },
  { value: "analyst", label: "Data-Driven", desc: "Stats and insights" },
  { value: "creator", label: "Conversational", desc: "Punchy and relatable" },
  { value: "motivator", label: "Motivational", desc: "Bold and inspiring" },
  { value: "educator", label: "Educational", desc: "Structured and informative" },
  { value: "casual", label: "Casual", desc: "Friendly and relaxed" },
];

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
  const [topic, setTopic] = useState("");
  const [toneType, setToneType] = useState("auto");
  const [durationType, setDurationType] = useState<"7_days" | "alternate" | "custom">("7_days");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 6));
  const [postCount, setPostCount] = useState(7);
  const [researchMode, setResearchMode] = useState(false);
  const [autoBestTime, setAutoBestTime] = useState(true);
  const [autoApprove, setAutoApprove] = useState(false);
  const [postingTime, setPostingTime] = useState("09:00");
  const [postsPerDay, setPostsPerDay] = useState(1);

  // Content controls
  const [contentLength, setContentLength] = useState("medium");
  const [emojiLevel, setEmojiLevel] = useState("moderate");
  const [hashtagMode, setHashtagMode] = useState("auto");
  const [fixedHashtags, setFixedHashtags] = useState("");
  const [footerText, setFooterText] = useState("");
  const [imageOption, setImageOption] = useState("none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onSubmit({
      topic: topic.trim(),
      toneType,
      durationType,
      startDate,
      endDate: durationType === "custom" ? endDate : undefined,
      postCount: durationType === "custom" ? postCount : undefined,
      postsPerDay,
      researchMode,
      autoBestTime,
      autoApprove,
      postingTime: !autoBestTime ? postingTime : undefined,
      contentLength,
      emojiLevel,
      hashtagMode,
      fixedHashtags: hashtagMode === "manual" ? fixedHashtags.split(",").map(h => h.trim()).filter(Boolean) : [],
      footerText: footerText.trim(),
      imageOption,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-fade-in max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Create Smart Campaign
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Tone */}
        <div className="space-y-2">
          <Label>Writing Tone</Label>
          <Select value={toneType} onValueChange={setToneType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {opt.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Research Mode
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fetch live research daily for each post</p>
            </div>
            <Switch checked={researchMode} onCheckedChange={setResearchMode} />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border">
            <div>
              <p className="font-medium text-sm">Auto Best Time</p>
              <p className="text-xs text-muted-foreground mt-1">System picks optimal posting times</p>
            </div>
            <Switch checked={autoBestTime} onCheckedChange={setAutoBestTime} />
          </div>

          {!autoBestTime && (
            <div className="space-y-2 p-4 rounded-xl bg-muted/50 border border-border">
              <Label htmlFor="postingTime" className="font-medium text-sm">Preferred Posting Time (IST)</Label>
              <Input
                id="postingTime"
                type="time"
                value={postingTime}
                onChange={(e) => setPostingTime(e.target.value)}
                className="w-full max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">All posts will be scheduled at this time (Indian Standard Time)</p>
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
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
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
      </form>
    </div>
  );
}
