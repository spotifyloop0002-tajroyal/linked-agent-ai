import { useState } from "react";
import { CampaignFormData } from "@/hooks/useCampaigns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Loader2, Search, Sparkles, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface CampaignSetupFormProps {
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const toneOptions = [
  { value: "auto", label: "Auto-detect", desc: "AI chooses based on topic" },
  { value: "storyteller", label: "Storyteller", desc: "Personal, narrative-driven" },
  { value: "analyst", label: "Data-Driven Analyst", desc: "Stats and insights" },
  { value: "creator", label: "Conversational Creator", desc: "Punchy and relatable" },
  { value: "motivator", label: "Motivational Builder", desc: "Bold and inspiring" },
  { value: "educator", label: "Educational Breakdown", desc: "Structured and informative" },
];

const durationOptions = [
  { value: "7_days", label: "Next 7 Days", desc: "One post per day for a week" },
  { value: "alternate", label: "Alternate Days", desc: "Post every other day for 2 weeks" },
  { value: "custom", label: "Custom Range", desc: "Pick your own dates" },
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
      researchMode,
      autoBestTime,
      autoApprove,
    });
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-fade-in">
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
              <Label htmlFor="postingTime" className="font-medium text-sm">Preferred Posting Time</Label>
              <Input
                id="postingTime"
                type="time"
                value={postingTime}
                onChange={(e) => setPostingTime(e.target.value)}
                className="w-full max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">All posts will be scheduled at this time</p>
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
