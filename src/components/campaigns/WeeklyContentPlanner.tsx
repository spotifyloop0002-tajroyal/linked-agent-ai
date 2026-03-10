import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGENT_TYPES, AGENT_TYPE_MAP, POSTING_DAYS } from "@/lib/agentTypes";
import { cn } from "@/lib/utils";
import { CalendarDays, Sparkles, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export interface WeeklyPlan {
  [day: string]: string | null; // day id -> agent type id
}

interface WeeklyContentPlannerProps {
  onCreateCampaigns: (plan: WeeklyPlan) => void;
  isCreating?: boolean;
}

const SUGGESTED_PLAN: WeeklyPlan = {
  monday: "thought-leadership",
  tuesday: "storytelling",
  wednesday: "data-analytics",
  thursday: "professional",
  friday: "comedy",
  saturday: null,
  sunday: null,
};

export function WeeklyContentPlanner({ onCreateCampaigns, isCreating }: WeeklyContentPlannerProps) {
  const [plan, setPlan] = useState<WeeklyPlan>(() => {
    const initial: WeeklyPlan = {};
    POSTING_DAYS.forEach(d => { initial[d.id] = null; });
    return initial;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const assignedDays = Object.values(plan).filter(Boolean).length;

  const handleAssign = (agentId: string) => {
    if (!selectedDay) return;
    setPlan(prev => ({ ...prev, [selectedDay]: agentId }));
    // Auto-advance to next unassigned day
    const days = POSTING_DAYS.map(d => d.id);
    const currentIdx = days.indexOf(selectedDay);
    const nextEmpty = days.find((d, i) => i > currentIdx && !plan[d]);
    setSelectedDay(nextEmpty || null);
  };

  const handleRemove = (day: string) => {
    setPlan(prev => ({ ...prev, [day]: null }));
  };

  const handleUseSuggested = () => {
    setPlan({ ...SUGGESTED_PLAN });
    toast.success("Suggested weekly plan applied!");
  };

  const handleReset = () => {
    const empty: WeeklyPlan = {};
    POSTING_DAYS.forEach(d => { empty[d.id] = null; });
    setPlan(empty);
    setSelectedDay(null);
  };

  const DAY_LABELS: Record<string, string> = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };

  return (
    <Card className="p-6 border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Weekly Content Planner</h2>
            <p className="text-sm text-muted-foreground">Assign an agent type to each day of the week</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleUseSuggested} className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            Use Suggested
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {POSTING_DAYS.map((day) => {
          const agentId = plan[day.id];
          const agent = agentId ? AGENT_TYPE_MAP[agentId] : null;
          const isSelected = selectedDay === day.id;
          const Icon = agent?.icon;

          return (
            <button
              key={day.id}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : day.id)}
              className={cn(
                "flex flex-col items-center p-3 rounded-xl border-2 transition-all min-h-[120px] justify-center gap-2",
                isSelected
                  ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                  : agent
                    ? "border-primary/30 bg-primary/5"
                    : "border-dashed border-border hover:border-primary/40"
              )}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day.label}
              </span>
              {agent && Icon ? (
                <>
                  <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">{agent.label}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(day.id); }}
                    className="text-[9px] text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {isSelected ? "Pick below ↓" : "Click to set"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Agent Type Picker */}
      {selectedDay && (
        <div className="border-t border-border pt-4 mb-4">
          <p className="text-sm font-medium mb-3">
            Choose agent for <span className="text-primary font-semibold">{DAY_LABELS[selectedDay]}</span>:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AGENT_TYPES.map((type) => {
              const Icon = type.icon;
              const isAssigned = plan[selectedDay] === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleAssign(type.id)}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                    isAssigned
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4 flex-shrink-0", isAssigned ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-xs font-medium">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground">🕐 {type.suggestedTimeLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action */}
      {assignedDays > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{assignedDays}</span> days configured
          </p>
          <Button
            onClick={() => onCreateCampaigns(plan)}
            disabled={isCreating}
            className="gap-2 gradient-bg text-primary-foreground"
          >
            <Save className="w-4 h-4" />
            {isCreating ? "Creating..." : "Create Weekly Campaigns"}
          </Button>
        </div>
      )}
    </Card>
  );
}
